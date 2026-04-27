"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/app/signup?error=Email%20and%20password%20are%20required");
  }

  const supabase = createClient();
  const origin = headers().get("origin");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const baseUrl = siteUrl || origin || "http://localhost:3000";
  const emailRedirectTo = `${baseUrl}/auth/callback?next=/app/feed`;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });

  if (error) {
    redirect(`/app/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    "/app/login?message=Check%20your%20email%20to%20confirm%20your%20account."
  );
}
