import { NextResponse } from "next/server";
export async function GET(){return NextResponse.json({status:"ok",services:{database:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),email:Boolean(process.env.RESEND_API_KEY)},timestamp:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}})}
