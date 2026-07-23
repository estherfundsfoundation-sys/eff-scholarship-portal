import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const protectedPath = ["/dashboard","/profile","/applications","/admin","/careers/dashboard","/careers/profile","/careers/applications","/careers/apply"].some(path=>request.nextUrl.pathname.startsWith(path));
  const authEntryPath = ["/sign-in","/sign-up"].includes(request.nextUrl.pathname);
  if (!protectedPath && !authEntryPath) return response;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (!protectedPath) return response;
    const url=request.nextUrl.clone();
    url.pathname="/account-help";
    url.searchParams.set("reason","portal-unavailable");
    return NextResponse.redirect(url);
  }
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    { cookies: { getAll: () => request.cookies.getAll(), setAll(cookies:{name:string;value:string;options:CookieOptions}[]) { cookies.forEach(({name,value}) => request.cookies.set(name,value)); response=NextResponse.next({request}); cookies.forEach(({name,value,options}) => response.cookies.set(name,value,options)); } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (protectedPath && !user) { const url=request.nextUrl.clone(); url.pathname="/sign-in"; url.searchParams.set("next",request.nextUrl.pathname); return NextResponse.redirect(url); }
  if (user && ["/sign-in","/sign-up"].includes(request.nextUrl.pathname)) { const url=request.nextUrl.clone(); url.pathname="/dashboard"; url.search=""; return NextResponse.redirect(url); }
  return response;
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]};
