import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, createClient } from "@/lib/supabase/server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  const authSupabase = createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { query } = await req.json() as { query?: string };
  if (!query?.trim()) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  const slug = slugify(query.trim());
  const title = query.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  const supabase = createServiceClient();

  // Return existing active topic if already present
  const { data: existing } = await supabase
    .from("topics")
    .select("id, slug")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ exists: true, topicSlug: existing.slug });
  }

  // Return in-progress job if one is already running for this slug
  const { data: runningJob } = await supabase
    .from("jobs")
    .select("id, stage, status")
    .eq("target_table", "topics")
    .eq("status", "running")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Check if this running job is for the same slug by joining to topics
  if (runningJob) {
    const { data: jobTopic } = await supabase
      .from("topics")
      .select("slug")
      .eq("id", runningJob.id)
      .maybeSingle();
    if (jobTopic?.slug === slug) {
      return NextResponse.json({ jobId: runningJob.id, topicSlug: slug, resumed: true });
    }
  }

  // Create a pending topic row
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .insert({ slug, title, query: query.trim(), status: "pending" })
    .select("id")
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Failed to create topic" }, { status: 500 });
  }

  // Create the job row
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      target_table: "topics",
      target_record_id: topic.id,
      status: "running",
      stage: "queued",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }

  // TODO(@trigger.dev): Fire enrichment task once #13 (Trigger.dev migration) is complete.
  // await tasks.trigger("enrich-topic", { jobId: job.id, topicId: topic.id, slug, query });

  return NextResponse.json({ jobId: job.id, topicSlug: slug });
}
