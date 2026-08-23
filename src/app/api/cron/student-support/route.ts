import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";
import {matchOpenHelpDeskCases,verifyDueSupportResources} from "@/lib/student-support-automation";

export const dynamic="force-dynamic";
export const maxDuration=300;

export async function GET(request:NextRequest){
  if(!process.env.CRON_SECRET||request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});
  const admin=createAdminClient();
  const {data:run}=await admin.from("student_support_discovery_runs").insert({source_key:"official-resource-verification",status:"running"}).select("id").single();
  try{
    const verification=await verifyDueSupportResources(admin);
    const matching=await matchOpenHelpDeskCases(admin);
    if(run)await admin.from("student_support_discovery_runs").update({status:"succeeded",verified_count:verification.verified,quarantined_count:verification.quarantined,discovered_count:matching.matched,finished_at:new Date().toISOString()}).eq("id",run.id);
    return NextResponse.json({ok:true,verification,matching});
  }catch{
    if(run)await admin.from("student_support_discovery_runs").update({status:"failed",safe_error:"Scheduled support discovery did not complete.",finished_at:new Date().toISOString()}).eq("id",run.id);
    return NextResponse.json({error:"Support discovery did not complete"},{status:500});
  }
}
