import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseAuth = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );
        const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        const form = await request.formData();
        const file = form.get("file");
        if (!(file instanceof File)) return new Response("Missing file", { status: 400 });
        if (file.size > 25 * 1024 * 1024) return new Response("File too large", { status: 413 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const mime = (file.type || "audio/webm").split(";")[0];
        const ext =
          mime === "audio/mp4" ? "mp4" :
          mime === "audio/mpeg" ? "mp3" :
          mime === "audio/wav" ? "wav" :
          mime === "audio/ogg" ? "ogg" : "webm";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, `recording.${ext}`);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          return new Response(text || "Transcription failed", { status: res.status });
        }

        const json = (await res.json()) as { text?: string };
        return new Response(JSON.stringify({ text: json.text ?? "" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
