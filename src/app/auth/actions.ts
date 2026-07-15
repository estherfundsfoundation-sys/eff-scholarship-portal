"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { emailFrom, getResend } from "@/lib/email";
import {safeInternalPath} from "@/lib/security";

const safeNext=(value:FormDataEntryValue|null)=>safeInternalPath(value);
export async function signIn(formData:FormData){const supabase=await createClient();const email=String(formData.get("email")??"").trim();const password=String(formData.get("password")??"");const next=safeNext(formData.get("next"));const {error}=await supabase.auth.signInWithPassword({email,password});if(error)redirect(`/sign-in?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);redirect(next);}
export async function signUp(formData:FormData){
  const supabase=await createClient();
  const legalName=String(formData.get("legalName")??"").trim();
  const preferredName=String(formData.get("preferredName")??"").trim();
  const email=String(formData.get("email")??"").trim().toLowerCase();
  const password=String(formData.get("password")??"");
  const next=safeNext(formData.get("next"));
  const explicitClaimToken=String(formData.get("claimToken")??"").trim();
  if(legalName.length<2||password.length<10)redirect(`/sign-up?error=Please+enter+your+legal+name+and+a+password+of+at+least+10+characters.&next=${encodeURIComponent(next)}`);

  // A private legacy claim link already proves control of the invited inbox.
  // Create these accounts as confirmed so a surge of imported students is not
  // blocked by an authentication-email quota.
  const claimMatch=next.match(/^\/claim\/([A-Za-z0-9_-]+)$/);
  const claimToken=/^[A-Za-z0-9_-]+$/.test(explicitClaimToken)?explicitClaimToken:claimMatch?.[1];
  if(claimToken){
    const admin=createAdminClient();
    const {data:invitedEmail,error:claimError}=await admin.rpc("legacy_claim_invitation_email",{p_token:claimToken});
    if(claimError||!invitedEmail||String(invitedEmail).toLowerCase()!==email)redirect(`/sign-up?error=${encodeURIComponent("Use the same email address that received this private invitation.")}&next=${encodeURIComponent(next)}`);
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{legal_name:legalName,preferred_name:preferredName}});
    if(created.error){
      // A prior rate-limited signup may have left an unconfirmed user behind.
      // The private claim token proves inbox control, so safely finish that user.
      const existing=await admin.auth.admin.generateLink({type:"recovery",email});
      const existingUser=existing.data?.user;
      if(existing.error||!existingUser)redirect(`/sign-in?message=${encodeURIComponent("An account already exists for this invitation. Sign in or choose Forgot your password.")}&next=${encodeURIComponent(next)}`);
      const repaired=await admin.auth.admin.updateUserById(existingUser.id,{password,email_confirm:true,user_metadata:{legal_name:legalName,preferred_name:preferredName}});
      if(repaired.error)redirect(`/sign-in?message=${encodeURIComponent("Your account exists, but we could not finish its setup. Choose Forgot your password.")}&next=${encodeURIComponent(next)}`);
      const repairedSignIn=await supabase.auth.signInWithPassword({email,password});
      if(repairedSignIn.error)redirect(`/sign-in?message=${encodeURIComponent("Your account is ready. Sign in with the password you just created.")}&next=${encodeURIComponent(next)}`);
    }else{
      const signedIn=await supabase.auth.signInWithPassword({email,password});
      if(signedIn.error)redirect(`/sign-in?message=${encodeURIComponent("Your account is ready. Sign in with the password you just created.")}&next=${encodeURIComponent(next)}`);
    }
    redirect(`/claim/${encodeURIComponent(claimToken)}`);
  }

  // Generate the verification link server-side and deliver it through Resend.
  // Supabase's hosted email quota is intentionally not used, so a public launch
  // surge cannot block otherwise-valid student registrations.
  const requestHeaders=await headers();
  const origin=requestHeaders.get("origin")??"https://portal.estherfundsfoundation.org";
  const admin=createAdminClient();
  const generated=await admin.auth.admin.generateLink({type:"signup",email,password,options:{data:{legal_name:legalName,preferred_name:preferredName}}});
  if(generated.error){
    // A prior quota-limited attempt may already have created the user. Prove
    // inbox control with a recovery link and let them finish account setup.
    const recovery=await admin.auth.admin.generateLink({type:"recovery",email});
    const tokenHash=recovery.data?.properties?.hashed_token;
    if(recovery.error||!tokenHash)redirect(`/sign-in?message=${encodeURIComponent("An account already exists for this email. Sign in or choose Forgot your password.")}&next=${encodeURIComponent(next)}`);
    const resetUrl=new URL("/auth/confirm",origin);
    resetUrl.searchParams.set("token_hash",tokenHash);
    resetUrl.searchParams.set("type","recovery");
    resetUrl.searchParams.set("next","/reset-password");
    const {error:deliveryError}=await getResend().emails.send({from:emailFrom,to:email,subject:"Finish setting up your EFF Scholarship Portal account",html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2d1748"><h1 style="color:#42127F">Finish setting up your portal account</h1><p>An earlier registration attempt started an account for this email. Use the secure button below to verify your inbox and create your password.</p><p><a href="${resetUrl.toString()}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Finish my account</a></p><p>Use only the newest email. Questions? nationals@estherfundsinc.org</p></div>`,text:`Finish setting up your EFF Scholarship Portal account: ${resetUrl.toString()}\n\nUse only the newest email.`});
    if(deliveryError)redirect(`/sign-up?error=${encodeURIComponent("We could not send your secure setup email. Please try again shortly.")}&next=${encodeURIComponent(next)}`);
    redirect(`/sign-in?message=${encodeURIComponent("Check your email for a secure link to finish setting up your account. Use only the newest message.")}&next=${encodeURIComponent(next)}`);
  }
  const tokenHash=generated.data.properties?.hashed_token;
  if(!tokenHash)redirect(`/sign-up?error=${encodeURIComponent("We could not create your secure verification link. Please try again.")}&next=${encodeURIComponent(next)}`);
  const verifyUrl=new URL("/auth/confirm",origin);
  verifyUrl.searchParams.set("token_hash",tokenHash);
  verifyUrl.searchParams.set("type","signup");
  verifyUrl.searchParams.set("next",next);
  const {error:deliveryError}=await getResend().emails.send({from:emailFrom,to:email,subject:"Verify your EFF Scholarship Portal account",html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2d1748"><h1 style="color:#42127F">Verify your portal account</h1><p>Welcome to the Esther Funds Foundation Scholarship Portal. Verify your email address to securely enter your account.</p><p><a href="${verifyUrl.toString()}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Verify my email</a></p><p>Use only the newest email. Questions? nationals@estherfundsinc.org</p></div>`,text:`Verify your EFF Scholarship Portal account: ${verifyUrl.toString()}\n\nUse only the newest email.`});
  if(deliveryError)redirect(`/sign-up?error=${encodeURIComponent("We could not send your verification email. Please try again shortly.")}&next=${encodeURIComponent(next)}`);
  redirect(`/sign-in?message=${encodeURIComponent("Check your email to verify your account, then sign in. Use only the newest message.")}&next=${encodeURIComponent(next)}`);
}
export async function requestPasswordReset(formData:FormData){const email=String(formData.get("email")??"").trim().toLowerCase();const requestHeaders=await headers();const origin=requestHeaders.get("origin")??process.env.NEXT_PUBLIC_APP_URL!;try{const admin=createAdminClient();const {data,error}=await admin.auth.admin.generateLink({type:"recovery",email});if(error)throw error;const tokenHash=data.properties?.hashed_token;if(!tokenHash)throw new Error("Recovery token was not generated");const resetUrl=new URL("/auth/confirm",origin);resetUrl.searchParams.set("token_hash",tokenHash);resetUrl.searchParams.set("type","recovery");resetUrl.searchParams.set("next","/reset-password");const {error:emailError}=await getResend().emails.send({from:emailFrom,to:email,subject:"Create your Esther Funds Foundation portal password",html:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#2d1748"><h1 style="color:#42127F">Create your portal password</h1><p>Use the secure button below to create your password for the Esther Funds Foundation Scholarship Portal.</p><p><a href="${resetUrl.toString()}" style="display:inline-block;background:#42127F;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Create my password</a></p><p>This one-time link expires. If you requested more than one email, use only the newest message.</p><p>Questions? nationals@estherfundsinc.org</p></div>`,text:`Create your Esther Funds Foundation Scholarship Portal password: ${resetUrl.toString()}\n\nThis one-time link expires. If you requested more than one email, use only the newest message.`});if(emailError)throw emailError;}catch(error){console.error("Password recovery email could not be sent",error);}redirect(`/forgot-password?message=${encodeURIComponent("If that email has an account, a secure reset link is on its way. Use only the newest email; earlier links expire automatically.")}`);}
export async function updatePassword(formData:FormData){const supabase=await createClient();const password=String(formData.get("password")??"");if(password.length<10)redirect("/reset-password?error=Password+must+be+at+least+10+characters.");const {error}=await supabase.auth.updateUser({password});if(error)redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);redirect("/dashboard?message=Password+updated.");}
export async function signOut(){const supabase=await createClient();await supabase.auth.signOut();redirect("/");}
