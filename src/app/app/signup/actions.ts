"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/app/signup?error=Email%20and%20password%20are%20required");
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/app/signup?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/app/login?message=Signup%20successful.%20Please%20log%20in.");
}
