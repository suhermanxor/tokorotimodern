import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_SYSTEM_PROMPT = `Kamu adalah Agen Alia, asisten virtual ramah dari Toko Roti Alia.
Kamu membantu pelanggan dengan:
- Informasi tentang produk roti dan kue
- Harga produk
- Jam operasional: Senin-Minggu 07.00-21.00 WIB
- Lokasi: Jl. Raya Bakery No. 123, Jakarta Selatan
- Pemesanan dan pengiriman
- Rekomendasi produk berdasarkan kebutuhan pelanggan

Gunakan bahasa Indonesia yang ramah dan hangat. Sertakan emoji yang relevan untuk membuat percakapan lebih menyenangkan.
Jawab dengan singkat dan jelas. Jika pelanggan bertanya di luar konteks toko roti, arahkan kembali dengan sopan ke topik toko.`;

interface MatchedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  badge: string | null;
  similarity: number;
}

// Mock embedding generator - deterministic based on text
function generateMockEmbedding(text: string): number[] {
  // Create a deterministic hash-like seed from the text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Use the hash as a seed for pseudo-random number generation
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Generate 768-dimensional embedding
  const embedding: number[] = [];
  for (let i = 0; i < 768; i++) {
    // Use different seeds to avoid identical values
    const value = seededRandom(hash + i * 73);
    embedding.push(value);
  }

  // Normalize the embedding
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map((val) => val / magnitude);
}

async function generateQueryEmbedding(text: string): Promise<number[]> {
  // For mock embeddings, just use the deterministic function
  return generateMockEmbedding(text);
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

async function getMatchingProducts(
  userMessage: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<MatchedProduct[]> {
  try {
    // Generate embedding for user message
    const embedding = await generateQueryEmbedding(userMessage);

    // Call match_products RPC
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.rpc("match_products", {
      query_embedding: embedding,
      match_count: 3,
      match_threshold: 0.2,
    });

    if (error) {
      console.error("RPC error:", error);
      return [];
    }

    const products = data as MatchedProduct[] | null;
    if (products && products.length > 0) {
      console.log(`Found ${products.length} matching products`);
      return products;
    }

    return [];
  } catch (error) {
    console.error("Error getting matching products:", error);
    // Non-fatal: fallback to base prompt if RAG fails
    return [];
  }
}

function buildSystemPrompt(matchedProducts: MatchedProduct[]): string {
  if (matchedProducts.length === 0) {
    return BASE_SYSTEM_PROMPT;
  }

  const productsInfo = matchedProducts
    .map((p) => {
      const badge = p.badge ? ` (${p.badge})` : "";
      return `- ${p.name}${badge}: ${p.description} - Harga: ${formatPrice(p.price)}`;
    })
    .join("\n");

  return `${BASE_SYSTEM_PROMPT}

Produk yang relevan dengan pertanyaan pelanggan:
${productsInfo}`;
}

function generateKeywordResponse(userMessage: string, matchedProducts: MatchedProduct[]): string {
  const msg = userMessage.toLowerCase();

  // Harga queries
  if (msg.includes("harga") || msg.includes("berapa") || msg.includes("price")) {
    if (matchedProducts.length > 0) {
      const prices = matchedProducts
        .map((p) => `${p.name}: ${formatPrice(p.price)}`)
        .join(", ");
      return `Harga ${matchedProducts[0].name}: ${formatPrice(matchedProducts[0].price)} 💰\n\nProduk lainnya: ${prices}`;
    }
    return "Silakan tanyakan produk spesifik untuk mengetahui harganya! 😊";
  }

  // Deskripsi/Info queries
  if (msg.includes("apa itu") || msg.includes("apa sih") || msg.includes("bagaimana") || msg.includes("describe")) {
    if (matchedProducts.length > 0) {
      const p = matchedProducts[0];
      const badge = p.badge ? ` (${p.badge})` : "";
      return `${p.name}${badge} adalah: ${p.description}\n\nHarga: ${formatPrice(p.price)} 🥐`;
    }
    return "Produk yang Anda tanyakan tidak ada di menu kami. Silakan lihat menu lengkap! 📋";
  }

  // Availability/Ada queries
  if (msg.includes("ada") || msg.includes("tersedia") || msg.includes("punya")) {
    if (matchedProducts.length > 0) {
      const names = matchedProducts.map((p) => p.name).join(", ");
      return `Iya, kami punya ${names}! ✅ Berapa yang mau kamu pesan? 🛒`;
    }
    return "Maaf, produk itu tidak tersedia saat ini. Coba tanya produk lain ya! 😊";
  }

  // Rekomendasi
  if (msg.includes("rekomendasi") || msg.includes("recommend") || msg.includes("suggest")) {
    return `Saya rekomendasikan Croissant Butter kami! 🥐 Renyah, lezat, dan harga terjangkau ${formatPrice(18000)}. Atau kalau suka coklat, Chocolate Cake kami juga super enak! 🍰`;
  }

  // Jam operasional
  if (msg.includes("jam") || msg.includes("buka") || msg.includes("tutup") || msg.includes("operation")) {
    return `Toko kami buka setiap hari:\n⏰ Senin - Minggu: 07:00 - 21:00 WIB\n\nSilakan kunjungi kami! 😊`;
  }

  // Lokasi
  if (msg.includes("lokasi") || msg.includes("alamat") || msg.includes("dimana") || msg.includes("location")) {
    return `📍 Lokasi kami:\nJl. Raya Bakery No. 123, Jakarta Selatan\n\nTunggu kunjunganmu! 🎉`;
  }

  // Salam
  if (msg.includes("halo") || msg.includes("hi") || msg.includes("hello") || msg.includes("pagi") || msg.includes("sore") || msg.includes("malam")) {
    return `Halo! 👋 Selamat datang di Toko Roti Alia! Aku Agen Alia, siap membantu kamu menemukan produk terbaik kami. Ada yang bisa aku bantu? 😊`;
  }

  // Default response
  if (matchedProducts.length > 0) {
    return `Kamu tertarik dengan ${matchedProducts[0].name}? ${matchedProducts[0].description}\n\nHarga: ${formatPrice(matchedProducts[0].price)} 💰\n\nMau pesan? 🛒`;
  }

  return `Terima kasih atas pertanyaanmu! 😊 Aku bisa membantu dengan:\n- Informasi harga produk\n- Deskripsi produk\n- Jam operasional (07:00-21:00 WIB)\n- Lokasi toko\n\nAda yang bisa aku bantu? 🤔`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    console.log("Processing chat request with", messages.length, "messages");

    // Get last user message for RAG
    let matchedProducts: MatchedProduct[] = [];
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m: any) => m.role === "user");

    if (lastUserMessage) {
      matchedProducts = await getMatchingProducts(
        lastUserMessage.content,
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
    }

    const systemPrompt = buildSystemPrompt(matchedProducts);

    console.log("Calling Groq API with system prompt and RAG products");

    // Call Groq API (OpenAI compatible)
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);

      return new Response(
        JSON.stringify({
          error: "Terjadi kesalahan pada AI",
          details: errorText,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Streaming response from Groq API");

    // Transform Groq's OpenAI-compatible streaming format to SSE
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const encoder = new TextEncoder();
    let buffer = "";

    const transformStream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += new TextDecoder().decode(value);
            const lines = buffer.split("\n");
            buffer = lines[lines.length - 1];

            for (let i = 0; i < lines.length - 1; i++) {
              const line = lines[i].trim();
              if (!line || !line.startsWith("data:")) continue;

              try {
                const dataStr = line.substring(5).trim();
                if (dataStr === "[DONE]") continue;

                const data = JSON.parse(dataStr);

                // Extract text from OpenAI-compatible format
                if (data.choices?.[0]?.delta?.content) {
                  const text = data.choices[0].delta.content;
                  const sseEvent = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
                  controller.enqueue(encoder.encode(sseEvent));
                }
              } catch (e) {
                // Silently ignore parsing errors
              }
            }
          }

          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(transformStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
