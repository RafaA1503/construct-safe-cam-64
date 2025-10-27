import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EPP = [
  "casco",
  "chaleco",
  "botas",
  "orejeras",
  "mascarilla",
  "gafas",
  "guantes",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { imageData, customPrompt, format = "simple" } = await req.json();

    if (!imageData || typeof imageData !== "string") {
      return new Response(JSON.stringify({ error: "imageData (data URL) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const basePrompt =
      format === "detailed"
        ? `Analiza esta imagen y detecta equipos de protección personal de construcción. Identifica específicamente: cascos de seguridad, chalecos reflectivos, botas de seguridad, orejeras de seguridad, mascarillas, gafas de seguridad, y guantes de protección.

Responde ÚNICAMENTE en formato JSON válido con esta estructura exacta:
{
  "equipos_detectados": {
    "casco": { "detectado": true/false, "confianza": 0-100 },
    "chaleco": { "detectado": true/false, "confianza": 0-100 },
    "botas": { "detectado": true/false, "confianza": 0-100 },
    "orejeras": { "detectado": true/false, "confianza": 0-100 },
    "mascarilla": { "detectado": true/false, "confianza": 0-100 },
    "gafas": { "detectado": true/false, "confianza": 0-100 },
    "guantes": { "detectado": true/false, "confianza": 0-100 }
  },
  "confianza_general": 0-100,
  "observaciones": "descripción de lo observado"
}
No incluyas explicaciones adicionales, solo el JSON.`
        : `Analiza esta imagen y devuelve SOLO JSON con esta forma exacta: {"persona_detectada": true/false, "epp_detectado": ["casco","chaleco","botas","orejeras","mascarilla","gafas","guantes"], "confianza": 0.0-1.0, "descripcion": "breve descripción"}. Devuelve solo EPP claramente visibles. Sin texto adicional.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Eres un analista experto en seguridad industrial. Devuelve SIEMPRE JSON válido sin texto adicional." },
          {
            role: "user",
            content: [
              { type: "text", text: customPrompt ? String(customPrompt) : basePrompt },
              { type: "image_url", image_url: { url: imageData } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content: string = data.choices?.[0]?.message?.content ?? "";

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to parse JSON safely
    const tryParseJson = (text: string) => {
      const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
        return null;
      }
    };

    const parsed = tryParseJson(content);

    if (!parsed) {
      return new Response(JSON.stringify({ error: "Failed to parse AI JSON" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize output
    if (format === "detailed") {
      const equipos = parsed.equipos_detectados || {};
      const norm = {
        equipos_detectados: {
          casco: { detectado: !!equipos.casco?.detectado, confianza: Number(equipos.casco?.confianza ?? 0) },
          chaleco: { detectado: !!equipos.chaleco?.detectado, confianza: Number(equipos.chaleco?.confianza ?? 0) },
          botas: { detectado: !!equipos.botas?.detectado, confianza: Number(equipos.botas?.confianza ?? 0) },
          orejeras: { detectado: !!equipos.orejeras?.detectado, confianza: Number(equipos.orejeras?.confianza ?? 0) },
          mascarilla: { detectado: !!equipos.mascarilla?.detectado, confianza: Number(equipos.mascarilla?.confianza ?? 0) },
          gafas: { detectado: !!equipos.gafas?.detectado, confianza: Number(equipos.gafas?.confianza ?? 0) },
          guantes: { detectado: !!equipos.guantes?.detectado, confianza: Number(equipos.guantes?.confianza ?? 0) },
        },
        confianza_general: Number(parsed.confianza_general ?? 85),
        observaciones: String(parsed.observaciones ?? ""),
      };

      return new Response(JSON.stringify(norm), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // simple format
    let persona_detectada = Boolean(parsed.persona_detectada);
    let epp_detectado: string[] = Array.isArray(parsed.epp_detectado) ? parsed.epp_detectado : [];
    epp_detectado = epp_detectado
      .map((x) => String(x).toLowerCase().trim())
      .filter((x) => ALLOWED_EPP.includes(x));
    const confianza = typeof parsed.confianza === "number" ? Number(parsed.confianza) : Number(parsed.confianza_general ?? 0) / 100;
    const descripcion = String(parsed.descripcion ?? parsed.observaciones ?? "");

    // If no explicit persona_detectada but EPP present, infer true
    if (!persona_detectada && epp_detectado.length > 0) persona_detectada = true;

    return new Response(
      JSON.stringify({ persona_detectada, epp_detectado, confianza: isFinite(confianza) ? confianza : 0.8, descripcion }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("detect-epp error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
