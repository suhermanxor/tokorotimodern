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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
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

    // Convert messages to Google Generative AI format
    const googleMessages = messages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:streamGenerateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: googleMessages,
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Generative AI error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Terlalu banyak permintaan, mohon coba lagi nanti." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 400) {
        return new Response(JSON.stringify({ error: "Permintaan tidak valid. Silakan coba lagi." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Terjadi kesalahan pada AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming response from Google Generative AI");

    // Transform Google's JSON lines format to Server-Sent Events
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
              if (!line) continue;

              try {
                const data = JSON.parse(line);
                if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                  const text = data.candidates[0].content.parts[0].text;
                  const sseEvent = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
                  controller.enqueue(encoder.encode(sseEvent));
                }
              } catch (e) {
                console.error("Error parsing line:", line, e);
              }
            }
          }

          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const data = JSON.parse(buffer);
              if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const text = data.candidates[0].content.parts[0].text;
                const sseEvent = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
                controller.enqueue(encoder.encode(sseEvent));
              }
            } catch (e) {
              console.error("Error parsing final buffer:", buffer, e);
            }
          }

          controller.close();
        } catch (error) {
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
