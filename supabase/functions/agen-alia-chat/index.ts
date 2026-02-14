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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Terlalu banyak permintaan, mohon coba lagi nanti." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Kredit AI habis, mohon hubungi admin." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Terjadi kesalahan pada AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming response from AI gateway");

    return new Response(response.body, {
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
