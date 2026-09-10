import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";
import {safeInternalPath} from "@/lib/security";
import type {EmailOtpType} from "@supabase/supabase-js";

const message="That secure link is invalid or expired. Request a new link and use only the newest email.";

function escapeHtml(value:string){
  return value.replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[character]||character));
}

function failure(url:URL,type:EmailOtpType|null){
  const destination=type==="recovery"?"/forgot-password":"/sign-up";
  return NextResponse.redirect(new URL(`${destination}?error=${encodeURIComponent(message)}`,url.origin));
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const tokenHash=url.searchParams.get("token_hash");
  const type=url.searchParams.get("type") as EmailOtpType|null;
  const next=safeInternalPath(url.searchParams.get("next"));
  if(!tokenHash||!type)return failure(url,type);

  // Do not consume the one-time Supabase token on GET. Enterprise email
  // security scanners often open links before the recipient does, which used
  // to invalidate otherwise-fresh reset emails. Verification now happens only
  // after the person intentionally presses Continue.
  const title=type==="recovery"?"Continue to reset your password":"Continue to your account";
  const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f5f0e6;color:#241334;font-family:Arial,sans-serif"><main style="min-height:100vh;display:grid;place-items:center;padding:24px"><section style="width:min(520px,100%);background:#fff;border:1px solid #e4d9ef;border-radius:24px;box-shadow:0 20px 60px rgba(66,18,127,.16);overflow:hidden"><div style="height:10px;background:#42127f"></div><div style="padding:40px"><p style="margin:0 0 12px;color:#6b36a8;font-size:12px;font-weight:800;letter-spacing:.16em">ESTHER FUNDS FOUNDATION</p><h1 style="margin:0 0 16px;color:#42127f;font-family:Georgia,serif;font-size:36px;font-weight:500;line-height:1.08">${title}</h1><p style="margin:0 0 28px;font-size:16px;line-height:1.65">For your security, confirm that you opened this email before we use its one-time link.</p><form method="post" action="/auth/confirm"><input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}"><input type="hidden" name="type" value="${escapeHtml(type)}"><input type="hidden" name="next" value="${escapeHtml(next)}"><button type="submit" style="width:100%;border:0;border-radius:10px;background:#42127f;color:#fff;padding:15px 20px;font-size:16px;font-weight:800;cursor:pointer">Continue securely</button></form><p style="margin:22px 0 0;color:#756b7c;font-size:13px;line-height:1.55">If you did not request this email, you can safely close this page.</p></div></section></main></body></html>`;
  return new Response(html,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store, max-age=0","X-Robots-Tag":"noindex, nofollow"}});
}

export async function POST(request:Request){
  const url=new URL(request.url);
  const form=await request.formData();
  const tokenHash=String(form.get("token_hash")||"");
  const type=String(form.get("type")||"") as EmailOtpType;
  const next=safeInternalPath(form.get("next"));
  if(!tokenHash||!type)return failure(url,type||null);
  const supabase=await createClient();
  const {error}=await supabase.auth.verifyOtp({type,token_hash:tokenHash});
  if(!error)return NextResponse.redirect(new URL(next,url.origin));
  return failure(url,type);
}
