import {createServerClient, type CookieOptions} from "@supabase/ssr";
import {NextResponse, type NextRequest} from "next/server";
import {helpDeskSignInForDestination} from "@/lib/help-desk-context";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({request});
  const pathname = request.nextUrl.pathname;
  const next = request.nextUrl.searchParams.get("next");
  const hostname = request.headers.get("host")?.split(":")[0].toLowerCase();

  if (hostname === "selah.estherfundsfoundation.org" && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/resources/selah";
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith("/apply-everywhere")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/admin/student-help") {
    return NextResponse.redirect(new URL("/help-desk/admin", request.url));
  }

  if (["/sign-in", "/sign-up"].includes(pathname) && next?.startsWith("/help-desk/")) {
    const contextual = helpDeskSignInForDestination(next);
    if (contextual) return NextResponse.redirect(new URL(contextual, request.url));
  }

  const scholarshipProtected = pathname !== "/admin/sign-in" && [
    "/dashboard", "/profile", "/applications", "/portal-checkup", "/admin", "/partners/dashboard",
    "/partners/onboarding", "/careers/dashboard", "/careers/profile",
    "/careers/applications", "/careers/apply", "/careers/board-onboarding",
    "/careers/board-invite",
  ].some((path) => pathname.startsWith(path));
  const helpDeskVolunteerProtected = [
    "/help-desk/volunteer/onboarding", "/help-desk/volunteer/console",
  ].some((path) => pathname.startsWith(path));
  const helpDeskStaffProtected = pathname.startsWith("/help-desk/admin");
  const techDeskStaffProtected = pathname.startsWith("/tech-desk/admin");
  const protectedPath = scholarshipProtected || helpDeskVolunteerProtected || helpDeskStaffProtected || techDeskStaffProtected;
  const authEntryPath = ["/sign-in", "/sign-up"].includes(pathname);
  if (!protectedPath && !authEntryPath) return response;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (!protectedPath) return response;
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/tech-desk/")
      ? "/tech-desk/account-help"
      : pathname.startsWith("/help-desk/")
        ? "/help-desk/account-help"
        : "/account-help";
    url.searchParams.set("reason", "portal-unavailable");
    return NextResponse.redirect(url);
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookies: {name: string; value: string; options: CookieOptions}[]) {
        cookies.forEach(({name, value}) => request.cookies.set(name, value));
        response = NextResponse.next({request});
        cookies.forEach(({name, value, options}) => response.cookies.set(name, value, options));
      },
    },
  });
  const {data: {user}} = await supabase.auth.getUser();

  if (protectedPath && !user) {
    if (helpDeskVolunteerProtected) {
      const url = new URL("/help-desk/volunteer/sign-in", request.url);
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    if (helpDeskStaffProtected) {
      const url = new URL("/help-desk/staff/sign-in", request.url);
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    if (techDeskStaffProtected) {
      const url = new URL("/tech-desk/staff/sign-in", request.url);
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && authEntryPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
