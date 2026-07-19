import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ALLOWED_MODELS = [
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
];

// Returns { globalModel, isOwner, hasOwner }. If no owner yet, current user becomes owner.
export const getOwnerAndModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: ownerRow } = await supabase
      .from("app_owner")
      .select("user_id")
      .eq("id", true)
      .maybeSingle();

    let ownerId = ownerRow?.user_id as string | undefined;

    // Bootstrap: first authenticated visitor becomes owner.
    if (!ownerId) {
      const { data: inserted, error } = await supabase
        .from("app_owner")
        .insert({ id: true, user_id: userId })
        .select("user_id")
        .single();
      if (!error && inserted) ownerId = inserted.user_id as string;
    }

    const { data: settingRow } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "global_model")
      .maybeSingle();

    return {
      globalModel: (settingRow?.value as string) ?? "google/gemini-3.5-flash",
      isOwner: !!ownerId && ownerId === userId,
      hasOwner: !!ownerId,
    };
  });

export const setGlobalModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ model: z.string().min(3).max(120) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    if (!ALLOWED_MODELS.includes(data.model)) {
      throw new Error(`Modelo não permitido. Use um de: ${ALLOWED_MODELS.join(", ")}`);
    }
    // RLS enforces that only the owner can write.
    const { error } = await context.supabase
      .from("app_settings")
      .upsert({ key: "global_model", value: data.model, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true, model: data.model };
  });
