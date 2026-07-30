import {NextResponse} from "next/server";
import {getPublicReachAmbassador} from "@/lib/reach/public";

export const dynamic = "force-dynamic";

export async function GET(_: Request, {params}: {params: Promise<{slug: string}>}) {
  try {
    const {slug} = await params;
    const ambassador = await getPublicReachAmbassador(slug);
    if (!ambassador) return NextResponse.json({error: "Profile not found"}, {status: 404});
    return NextResponse.json({ambassador}, {
      headers: {"Cache-Control": "no-store, max-age=0"},
    });
  } catch {
    return NextResponse.json({error: "Profile unavailable"}, {status: 503});
  }
}
