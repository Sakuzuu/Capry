"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return null;
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || normalizedEmail.length > 254 || password.length < 8 || password.length > 128) {
    return null;
  }
  return { email: normalizedEmail, password };
}

export async function signIn(formData: FormData) {
  const input = credentials(formData);
  if (!input) redirect("/acceder?error=datos");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) redirect("/acceder?error=acceso");
  redirect("/");
}

export async function signUp(formData: FormData) {
  const input = credentials(formData);
  if (!input) redirect("/acceder?modo=registro&error=datos");

  const supabase = await createClient();
  const appUrl = process.env.APP_URL;
  const { data, error } = await supabase.auth.signUp({
    ...input,
    options: appUrl ? { emailRedirectTo: new URL("/auth/callback", appUrl).toString() } : undefined,
  });
  if (error) redirect("/acceder?modo=registro&error=registro");
  if (data.session) redirect("/");
  redirect("/acceder?mensaje=correo");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
