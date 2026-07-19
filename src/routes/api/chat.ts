import { createFileRoute } from "@tanstack/react-router";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { RARO_SYSTEM_PROMPT } from "@/lib/raro-prompt";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";

type ChatRequestBody = { messages?: unknown; threadId?: string; model?: string };

const ALLOWED_MODELS = new Set([
  "google/gemini-3.5-flash",
  "google/gemini-3-flash-preview",
  "google/gemini-3.1-flash-lite",
  "google/gemini-3.1-pro-preview",
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
]);
const DEFAULT_MODEL = "google/gemini-3.5-flash";

async function persistAssistantMessage(opts: {
  token: string;
  threadId: string;
  userId: string;
  message: UIMessage;
}) {
  const supabase = createClient(process.env.SUPABASE_URL!, opts.token, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${opts.token}` } },
  });
  await supabase.from("messages").insert({
    thread_id: opts.threadId,
    user_id: opts.userId,
    role: opts.message.role,
    parts: opts.message.parts as unknown as object,
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        const threadId = body.threadId;
        if (!Array.isArray(messages) || !threadId) {
          return new Response("Bad Request", { status: 400 });
        }

        // Validate user via Supabase
        const supabaseAuth = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );
        const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        // Persist the last user message
        const userSupabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: { autoRefreshToken: false, persistSession: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const lastUser = [...(messages as UIMessage[])].reverse().find((m) => m.role === "user");
        if (lastUser) {
          // Avoid duplicate insert: check if last persisted message in thread has same id stored in parts metadata is hard;
          // we rely on the client only sending the new user message once before assistant response.
          await userSupabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "user",
            parts: lastUser.parts as unknown as object,
          });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        // Multimodal (texto + imagem) com modelo mais forte: Gemini 3.1 Pro Preview.
        const model = gateway("google/gemini-3.1-pro-preview");

        const result = streamText({
          model,
          system: RARO_SYSTEM_PROMPT,
          messages: await convertToModelMessages(messages as UIMessage[]),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages as UIMessage[],
          onFinish: async ({ responseMessage }) => {
            try {
              await persistAssistantMessage({
                token,
                threadId,
                userId,
                message: responseMessage,
              });
            } catch (e) {
              console.error("persist assistant failed", e);
            }
          },
        });
      },
    },
  },
});
