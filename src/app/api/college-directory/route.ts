import {NextRequest,NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabase/admin";

export async function GET(request:NextRequest){
  const q=(request.nextUrl.searchParams.get("q")??"").trim().slice(0,100);
  if(q.length<2)return NextResponse.json({schools:[]},{headers:{"Cache-Control":"public, max-age=60"}});
  const admin=createAdminClient();
  const safe=q.replaceAll("%","").replaceAll("_","");
  const {data,error}=await admin.from("college_directory")
    .select("unitid,name,aliases,city,state,hbcu,website,admissions_url,financial_aid_url,veterans_url,accessibility_url")
    .eq("active",true).or(`name.ilike.%${safe}%,aliases.ilike.%${safe}%`).order("hbcu",{ascending:false}).order("name").limit(15);
  if(error)return NextResponse.json({schools:[]},{status:503,headers:{"Cache-Control":"no-store"}});
  return NextResponse.json({schools:data??[]},{headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=3600"}});
}
