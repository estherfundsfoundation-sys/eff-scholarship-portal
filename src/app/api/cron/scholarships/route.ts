import { NextRequest,NextResponse } from "next/server";
import { runAllSources } from "@/lib/importers/run";
export const maxDuration=60;
export async function GET(request:NextRequest){if(request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});const results=await runAllSources();return NextResponse.json({ok:results.every(result=>result.status==="succeeded"||result.status==="paused"),results});}
