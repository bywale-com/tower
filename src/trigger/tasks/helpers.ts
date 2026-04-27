import { createClient } from "@supabase/supabase-js";
import { ApifyClient } from "apify-client";

type JsonRecord = Record<string, unknown>;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/** Token for Apify API (actors, datasets). Not the same as Trigger's TRIGGER_SECRET_KEY. */
export function getApifyToken(): string {
  const raw =
    process.env.APIFY_TOKEN ?? process.env.APIFY_API_TOKEN ?? undefined;
  if (raw === undefined) {
    throw new Error(
      "APIFY_TOKEN is not set. Add it to `.env` or `.env.local` in the project root (same folder as trigger.config.ts), restart `npx trigger.dev dev`, or add it under Environment variables in the Trigger.dev dashboard for deployed runs. Create a token in Apify: Integrations → API tokens.",
    );
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(
      "APIFY_TOKEN is set but empty (blank). Replace the value with your Apify API token from https://console.apify.com/account/integrations — then restart the Trigger dev worker.",
    );
  }
  return trimmed;
}

/** Project URL: dedicated var or the same value exposed to the browser. */
export function getSupabaseUrl(): string {
  const fromDedicated = process.env.SUPABASE_URL?.trim();
  if (fromDedicated) return fromDedicated;
  const fromPublic = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (fromPublic) return fromPublic;
  throw new Error(
    "Missing required environment variable: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)",
  );
}

export function getSupabaseAdmin() {
  return createClient(getSupabaseUrl(), getEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function apifyRunActor<TInput extends JsonRecord>(
  actor: string,
  input: TInput,
): Promise<{ runId: string; datasetId: string }> {
  const client = new ApifyClient({ token: getApifyToken() });
  const run = await client.actor(actor).call(input);
  const runId = run.id;
  const datasetId = run.defaultDatasetId;
  if (!runId || !datasetId) {
    throw new Error(`Apify run missing ids for actor: ${actor}`);
  }

  return { runId, datasetId };
}

export async function apifyGetDatasetItems(datasetId: string): Promise<unknown[]> {
  const client = new ApifyClient({ token: getApifyToken() });
  const list = await client.dataset(datasetId).listItems({ clean: true });
  return list.items;
}

export async function apifyWaitForRunCompletion(
  runId: string,
  pollMs = 2000,
  timeoutMs = 10 * 60 * 1000,
): Promise<void> {
  const client = new ApifyClient({ token: getApifyToken() });
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const run = await client.run(runId).get();
    const status = run?.status;

    if (status === "SUCCEEDED") return;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      const detail =
        run && "statusMessage" in run && typeof (run as { statusMessage?: string }).statusMessage === "string"
          ? (run as { statusMessage: string }).statusMessage
          : "";
      throw new Error(
        `Apify run ${runId} ended with status: ${status}${detail ? ` — ${detail}` : ""}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error(`Timed out waiting for Apify run completion: ${runId}`);
}

export function parseJsonObject(value: string): JsonRecord {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Parsed payload is not an object");
    }
    return parsed as JsonRecord;
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${(error as Error).message}`);
  }
}

export async function openAiJson<T>(
  system: string,
  user: string,
  guard: (payload: JsonRecord) => T,
): Promise<T> {
  const OPENAI_API_KEY = getEnv("OPENAI_API_KEY");
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonObject(content);
  return guard(parsed);
}

export function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * Closes a child jobs row with a terminal status.
 * Call on success AND in the catch block of every task so orphaned
 * "running" rows never accumulate.
 */
export async function closeJob(
  jobId: string,
  status: "completed" | "failed",
  error?: string,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("jobs")
      .update({
        status,
        completed_at: new Date().toISOString(),
        ...(error ? { error } : {}),
      })
      .eq("id", jobId);
  } catch {
    // Best-effort — never let a DB write failure mask the original error
  }
}
