import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {safeInternalPath} from "@/lib/security";
import type {EmailOtpType} from "@supabase/supabase-js";

export async function GET(request:Request){
  const url=new URL(request.url);
  const tokenHash=url.searchParams.get("token_hash");
  const type=url.searchParams.get("type") as EmailOtpType|null;
  const next=safeInternalPath(url.searchParams.get("next"));
  if(tokenHash&&type){
    const supabase=await createClient();
    const {error}=await supabase.auth.verifyOtp({type,token_hash:tokenHash});
    if(!error)return NextResponse.redirect(new URL(next,url.origin));
  }
  const destination=type==="recovery"?"/forgot-password":"/sign-up";
  return NextResponse.redirect(new URL(`${destination}?error=${encodeURIComponent("That secure link is invalid or expired. Request a new link and use only the newest email.")}`,url.origin));
}
