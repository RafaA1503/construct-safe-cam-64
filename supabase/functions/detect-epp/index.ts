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
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY is not configured" }), {
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
        ? `Analiza esta imagen de construcción. IMPORTANTE: Cuenta y analiza CADA PERSONA visible individualmente.

Para CADA persona detectada, identifica estos EPP:
- Casco de seguridad
- Chaleco reflectivo
- Botas de seguridad
- Orejeras
- Mascarilla
- Gafas de seguridad
- Guantes

Responde SOLO con JSON (sin markdown):
{
  "personas": [
    {
      "id": 1,
      "equipos_detectados": {
        "casco": { "detectado": true/false, "confianza": 0-100 },
        "chaleco": { "detectado": true/false, "confianza": 0-100 },
        "botas": { "detectado": true/false, "confianza": 0-100 },
        "orejeras": { "detectado": true/false, "confianza": 0-100 },
        "mascarilla": { "detectado": true/false, "confianza": 0-100 },
        "gafas": { "detectado": true/false, "confianza": 0-100 },
        "guantes": { "detectado": true/false, "confianza": 0-100 }
      },
      "observaciones": "breve descripción"
    }
  ],
  "total_personas": X,
  "confianza_general": 0-100
}`
        : `Detecta TODAS las personas en esta imagen y su EPP de construcción. Analiza CADA persona individualmente.

EPP a detectar: casco, chaleco, botas, orejeras, mascarilla, gafas, guantes.

Responde SOLO JSON (sin markdown):
{"personas": [{"id": 1, "epp_detectado": ["casco","chaleco"], "confianza": 0.85}], "total_personas": X, "descripcion": "breve resumen"}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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
      const personas = Array.isArray(parsed.personas) ? parsed.personas : [];
      const normalizedPersonas = personas.map((persona: any) => {
        const equipos = persona.equipos_detectados || {};
        return {
          id: Number(persona.id ?? 1),
          equipos_detectados: {
            casco: { detectado: !!equipos.casco?.detectado, confianza: Number(equipos.casco?.confianza ?? 0) },
            chaleco: { detectado: !!equipos.chaleco?.detectado, confianza: Number(equipos.chaleco?.confianza ?? 0) },
            botas: { detectado: !!equipos.botas?.detectado, confianza: Number(equipos.botas?.confianza ?? 0) },
            orejeras: { detectado: !!equipos.orejeras?.detectado, confianza: Number(equipos.orejeras?.confianza ?? 0) },
            mascarilla: { detectado: !!equipos.mascarilla?.detectado, confianza: Number(equipos.mascarilla?.confianza ?? 0) },
            gafas: { detectado: !!equipos.gafas?.detectado, confianza: Number(equipos.gafas?.confianza ?? 0) },
            guantes: { detectado: !!equipos.guantes?.detectado, confianza: Number(equipos.guantes?.confianza ?? 0) },
          },
          observaciones: String(persona.observaciones ?? "")
        };
      });

      const norm = {
        personas: normalizedPersonas,
        total_personas: Number(parsed.total_personas ?? normalizedPersonas.length),
        confianza_general: Number(parsed.confianza_general ?? 85)
      };

      return new Response(JSON.stringify(norm), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // simple format - extract data for multiple people
    const personas = Array.isArray(parsed.personas) ? parsed.personas : [];
    const totalPersonas = Number(parsed.total_personas ?? personas.length);
    const descripcion = String(parsed.descripcion ?? "");

    const personasNormalizadas = personas.map((p: any) => {
      let epp_detectado: string[] = Array.isArray(p.epp_detectado) ? p.epp_detectado : [];
      epp_detectado = epp_detectado
        .map((x) => String(x).toLowerCase().trim())
        .filter((x) => ALLOWED_EPP.includes(x));
      const confianza = typeof p.confianza === "number" ? Number(p.confianza) : 0.8;
      
      return {
        id: Number(p.id ?? 1),
        epp_detectado,
        confianza: isFinite(confianza) ? confianza : 0.8
      };
    });

    return new Response(
      JSON.stringify({ 
        personas: personasNormalizadas,
        total_personas: totalPersonas,
        descripcion 
      }),
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
