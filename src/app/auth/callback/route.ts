import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description") ?? "";

  // Anonymous→Google link conflict (identity already exists): restart as a
  // normal sign-in so the user can still get in.
  if (error && /already|exists|linked/i.test(`${error} ${errorDesc}`)) {
    return NextResponse.redirect(`${origin}/?auth=retry`);
  }
  if (error) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(errorDesc || error)}`);
  }
  if (code) {
    const supabase = await createServerSupabase();
    const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr) {
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(exErr.message)}`);
    }
  }
  return NextResponse.redirect(`${origin}/`);
}
