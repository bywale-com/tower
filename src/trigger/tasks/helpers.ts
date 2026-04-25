import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getTaskEnv() {
  return {
    APIFY_TOKEN: getEnv("APIFY_TOKEN"),
    OPENAI_API_KEY: getEnv("OPENAI_API_KEY"),
    SUPABASE_URL: getEnv("SUPABASE_URL"),
    SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getSupabaseAdmin() {
  const env = getTaskEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function apifyRunActor<TInput extends JsonRecord>(
  actor: string,
  input: TInput,
): Promise<{ runId: string; datasetId: string }> {
  const { APIFY_TOKEN } = getTaskEnv();
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${actor}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    },
  );

  if (!runResponse.ok) {
    const body = await runResponse.text();
    throw new Error(`Apify run failed (${actor}): ${runResponse.status} ${body}`);
  }

  const runJson = (await runResponse.json()) as {
    data?: { id?: string; defaultDatasetId?: string };
  };
  const runId = runJson.data?.id;
  const datasetId = runJson.data?.defaultDatasetId;
  if (!runId || !datasetId) {
    throw new Error(`Apify run missing ids for actor: ${actor}`);
  }

  return { runId, datasetId };
}

export async function apifyGetDatasetItems(datasetId: string): Promise<unknown[]> {
  const { APIFY_TOKEN } = getTaskEnv();
  const response = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&token=${APIFY_TOKEN}`,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Apify dataset fetch failed: ${response.status} ${body}`);
  }

  const data = (await response.json()) as unknown;
  return Array.isArray(data) ? data : [];
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
  const { OPENAI_API_KEY } = getTaskEnv();
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

export function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}
