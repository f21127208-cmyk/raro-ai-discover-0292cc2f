import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/music")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.ELEVENLABS_API_KEY;
        if (!apiKey) {
          return new Response("ELEVENLABS_API_KEY não configurada", { status: 500 });
        }
        let body: { prompt?: string; durationSeconds?: number };
        try {
          body = await request.json();
        } catch {
          return new Response("JSON inválido", { status: 400 });
        }
        const prompt = (body.prompt ?? "").trim();
        if (!prompt) return new Response("prompt obrigatório", { status: 400 });
        const duration = Math.min(Math.max(body.durationSeconds ?? 30, 10), 60);

        const upstream = await fetch("https://api.elevenlabs.io/v1/music", {
          method: "POST",
          headers: {
            "xi-api-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            music_length_ms: duration * 1000,
          }),
        });

        if (!upstream.ok) {
          const err = await upstream.text().catch(() => "");
          return new Response(err || `Falha ao gerar música (${upstream.status})`, {
            status: upstream.status,
          });
        }

        const buf = await upstream.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
