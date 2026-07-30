import {NextResponse} from "next/server";
import {getPublicReachAmbassadors} from "@/lib/reach/public";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ambassadors = await getPublicReachAmbassadors();
    return NextResponse.json({ambassadors}, {
      headers: {"Cache-Control": "no-store, max-age=0"},
    });
  } catch {
    return NextResponse.json({ambassadors: [], error: "Directory unavailable"}, {status: 503});
  }
}
