import {NextResponse} from "next/server";
import {getPublicReachAmbassadors} from "@/lib/reach/public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ambassadors = await getPublicReachAmbassadors();
    return NextResponse.json({ambassadors}, {
      headers: {"Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600"},
    });
  } catch {
    return NextResponse.json({ambassadors: [], error: "Directory unavailable"}, {status: 503});
  }
}
