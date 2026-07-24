import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {createHowardAdvocacyPacket,type HowardPacketCase} from "@/lib/howard-packet-pdf";
import {verifyHowardPacketToken} from "@/lib/howard-packet-token";

export const runtime="nodejs";
export const maxDuration=30;

const privateHeaders={
  "cache-control":"private, no-store, max-age=0",
  "x-content-type-options":"nosniff",
  "referrer-policy":"no-referrer"
};

export async function GET(request:NextRequest){
  const verified=verifyHowardPacketToken(request.nextUrl.searchParams.get("token")||"");
  if(!verified)return NextResponse.json({error:"This private packet link is invalid or expired."},{status:401,headers:privateHeaders});
  const admin=createAdminClient();
  const {data,error}=await admin.from("howard_help_cases").select("id,case_code,student_name,preferred_name,email,student_type,issue_type,enrollment_status,balance_before,balance_now,school_deadline,aid_summary,timeline,steps_taken,verified_at,advocacy_email_sent_at,status,created_at").eq("id",verified.caseId).maybeSingle();
  if(error||!data||!data.verified_at)return NextResponse.json({error:"This advocacy packet is not available."},{status:404,headers:privateHeaders});
  const bytes=await createHowardAdvocacyPacket(data as HowardPacketCase);
  const filename=`EFF-Keep-Your-Seat-${data.case_code.replace(/[^A-Za-z0-9-]/g,"")}.pdf`;
  return new NextResponse(Buffer.from(bytes),{
    headers:{
      "content-type":"application/pdf",
      "content-disposition":`attachment; filename="${filename}"`,
      ...privateHeaders
    }
  });
}
