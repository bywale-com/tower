import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const signalId = params.id;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: existingSignal, error: signalError } = await supabase
    .from("signals")
    .select("id, status, claimed_by")
    .eq("id", signalId)
    .maybeSingle();

  if (signalError || !existingSignal) {
    return NextResponse.json({ error: "Signal not found." }, { status: 404 });
  }

  if (existingSignal.status === "claimed" && existingSignal.claimed_by && existingSignal.claimed_by !== user.id) {
    return NextResponse.json({ error: "Signal already claimed by another user." }, { status: 409 });
  }

  const { data: updatedSignal, error: updateError } = await supabase
    .from("signals")
    .update({
      status: "claimed",
      claimed_by: user.id,
    })
    .eq("id", signalId)
    .select("id, status, claimed_by")
    .single();

  if (updateError) {
    return NextResponse.json({ error: "Unable to claim signal." }, { status: 500 });
  }

  return NextResponse.json({ signal: updatedSignal }, { status: 200 });
}
