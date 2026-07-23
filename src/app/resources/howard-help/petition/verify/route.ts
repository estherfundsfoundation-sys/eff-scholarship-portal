import {createHash} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {emailFrom,getResend} from "@/lib/email";
import {createAdminClient} from "@/lib/supabase/admin";

export async function GET(request:NextRequest){
  const token=request.nextUrl.searchParams.get("token")||"";const destination=new URL("/resources/howard-help",request.url);destination.hash="petition";
  if(!/^[a-f0-9]{64}$/.test(token)){destination.searchParams.set("petitionError","That verification link is invalid.");return NextResponse.redirect(destination);}
  const tokenHash=createHash("sha256").update(token).digest("hex");const admin=createAdminClient();const {data:record}=await admin.from("howard_petition_signatures").select("*").eq("verification_token_hash",tokenHash).maybeSingle();
  if(!record){destination.searchParams.set("petitionError","That verification link is invalid or no longer available.");return NextResponse.redirect(destination);}
  if(record.verified_at){destination.searchParams.set("petition","verified");return NextResponse.redirect(destination);}
  if(!record.verification_expires_at||new Date(record.verification_expires_at).getTime()<Date.now()){destination.searchParams.set("petitionError","That verification link expired. Please sign again with a different email or contact EFF.");return NextResponse.redirect(destination);}
  const verifiedAt=new Date().toISOString();const updated=await admin.from("howard_petition_signatures").update({verified_at:verifiedAt,verification_token_hash:null}).eq("id",record.id).is("verified_at",null).select("id").maybeSingle();
  if(updated.data){
    try{const sent=await getResend().emails.send({from:emailFrom,to:record.email,replyTo:"nationals@estherfundsinc.org",subject:"Your EFF Howard reinstatement petition signature is verified",text:`Hello ${record.full_name},

Your signature is verified. Thank you for joining Esther Funds Foundation’s call for Howard University to reinstate affected students, restore their classes and housing, protect pending aid, and provide a fair individual review process.

Your email will not be displayed publicly.

Esther Funds Foundation
Every Future Fulfilled`});if(sent.error)throw new Error(sent.error.message);}catch(error){console.error("Petition thank-you email could not be sent",error);}
    await admin.from("audit_events").insert({actor_id:null,action:"howard_petition_signature_verified",target_type:"howard_petition_signature",target_id:record.id,metadata_safe:{affiliation:record.affiliation}});
  }
  destination.searchParams.set("petition","verified");return NextResponse.redirect(destination);
}
