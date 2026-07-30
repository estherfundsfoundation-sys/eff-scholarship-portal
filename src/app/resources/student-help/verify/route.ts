import {NextRequest, NextResponse} from "next/server";

export function GET(request: NextRequest) {
  const destination = new URL("/help-desk/verify", request.url);
  const token = request.nextUrl.searchParams.get("token");
  if (token) destination.searchParams.set("token", token);
  return NextResponse.redirect(destination);
}
