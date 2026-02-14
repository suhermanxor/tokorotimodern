import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Product {
  name: string;
  description: string;
  price: number;
  badge: string | null;
}

const productsToSeed: Product[] = [
  {
    name: "Croissant Butter",
    description: "Croissant renyah dengan lapisan butter premium",
    price: 18000,
    badge: "Bestseller",
  },
  {
    name: "Sourdough Classic",
    description: "Roti sourdough dengan tekstur lembut dan rasa khas",
    price: 35000,
    badge: null,
  },
  {
    name: "Cinnamon Rolls",
    description: "Cinnamon rolls dengan cream cheese frosting",
    price: 22000,
    badge: "New",
  },
  {
    name: "Chocolate Cake",
    description: "Kue coklat premium dengan dark chocolate ganache",
    price: 180000,
    badge: "Premium",
  },
];

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase environment variables not configured");
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Seeding ${productsToSeed.length} products...`);

    const results = [];

    for (const product of productsToSeed) {
      try {
        // Generate embedding from product name and description
        const embeddingText = `${product.name} ${product.description}`;
        console.log(`Generating embedding for: ${product.name}`);

        const embedding = generateMockEmbedding(embeddingText);
        console.log(`Generated embedding for ${product.name} (${embedding.length} dimensions)`);

        // Upsert product with embedding
        const { data, error } = await supabase
          .from("products")
          .upsert(
            {
              name: product.name,
              description: product.description,
              price: product.price,
              badge: product.badge,
              embedding: embedding,
            },
            { onConflict: "name" }
          )
          .select();

        if (error) {
          throw new Error(`Failed to upsert product ${product.name}: ${error.message}`);
        }

        results.push({
          name: product.name,
          success: true,
          id: data?.[0]?.id,
        });

        console.log(`✓ Successfully seeded: ${product.name}`);
      } catch (error) {
        console.error(`✗ Failed to seed ${product.name}:`, error);
        results.push({
          name: product.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Seed error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
