import {NextResponse} from "next/server";
import {getPublicReachAmbassador} from "@/lib/reach/public";

export const dynamic = "force-dynamic";

export async function GET(_: Request, {params}: {params: Promise<{slug: string}>}) {
  try {
    const {slug} = await params;
    const ambassador = await getPublicReachAmbassador(slug);
    if (!ambassador) return NextResponse.json({error: "Profile not found"}, {status: 404});
    return NextResponse.json({ambassador}, {
      headers: {"Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"},
    });
  } catch {
    return NextResponse.json({error: "Profile unavailable"}, {status: 503});
  }
}
