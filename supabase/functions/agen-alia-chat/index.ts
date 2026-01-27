import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Processing chat request with", messages.length, "messages");

    const systemPrompt = `Kamu adalah Agen Alia, asisten virtual ramah dari Toko Roti Alia. 
Kamu membantu pelanggan dengan:
- Informasi tentang produk roti dan kue (croissant, sourdough, cinnamon rolls, chocolate cake, dll)
- Harga produk (Croissant Rp 18.000, Sourdough Rp 35.000, Cinnamon Rolls Rp 22.000, Chocolate Cake Rp 180.000)
- Jam operasional: Senin-Minggu 07.00-21.00 WIB
- Lokasi: Jl. Raya Bakery No. 123, Jakarta Selatan
- Pemesanan dan pengiriman
- Rekomendasi produk berdasarkan kebutuhan pelanggan

Gunakan bahasa Indonesia yang ramah dan hangat. Sertakan emoji yang relevan untuk membuat percakapan lebih menyenangkan. 
Jawab dengan singkat dan jelas. Jika pelanggan bertanya di luar konteks toko roti, arahkan kembali dengan sopan ke topik toko.`;

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
