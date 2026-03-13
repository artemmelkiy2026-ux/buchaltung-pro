// Supabase Edge Function: bon-scanner
// Разместить в: supabase/functions/bon-scanner/index.ts
// Ключ хранится в Supabase Secrets — клиент его никогда не видит

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { image_base64, image_type, prompt } = await req.json();

    if (!image_base64 || !prompt) {
      return new Response(
        JSON.stringify({ error: "Fehlende Parameter: image_base64, prompt" }),
        { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_KEY) {
      return new Response(
        JSON.stringify({ error: "API-Schlüssel nicht konfiguriert" }),
        { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image_type || "image/jpeg",
                data: image_base64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.message || `HTTP ${response.status}` }),
        { status: response.status, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const text = (data.content || []).map((b: any) => b.text || "").join("").trim();
    return new Response(
      JSON.stringify({ result: text }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
});
