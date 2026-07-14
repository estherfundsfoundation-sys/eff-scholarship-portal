import { NextRequest,NextResponse } from "next/server";
export async function GET(request:NextRequest){if(request.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Unauthorized"},{status:401});return NextResponse.json({ok:true,message:"Importer run accepted",adapters:["scholarship_collective","jlv_college_counseling"]});}
