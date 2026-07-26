import Image from "next/image";
import Link from "next/link";
import {createAdminClient} from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ReachImpactPage() {
  const admin = createAdminClient();
  const {data: submissions} = await admin.from("reach_activity_submissions")
    .select("id,title,activity_type,campus,activity_date,description,students_reached,public_photo_paths")
    .eq("status","published")
    .order("activity_date",{ascending:false});
  const cards = (submissions??[]).map(item=>({
    ...item,
    photos:(Array.isArray(item.public_photo_paths)?item.public_photo_paths:[]).filter((path):path is string=>typeof path==="string").map(path=>admin.storage.from("reach-impact-media").getPublicUrl(path).data.publicUrl),
  }));
  return <main className="section white"><div className="shell">
    <div className="eyebrow">REACH in action</div><h1>Campus impact, led by students</h1><p>Approved stories from EFF REACH Ambassadors helping students find resources, navigate barriers, and keep moving toward graduation.</p>
    <div className="cards" style={{marginTop:28}}>{cards.length?cards.map(item=><article className="card" key={item.id}><div className="eyebrow">{item.activity_type.replaceAll("_"," ")}</div><h3>{item.title}</h3><p className="muted">{item.campus} Â· {new Date(`${item.activity_date}T12:00:00`).toLocaleDateString()}</p>{item.photos.length?<div style={{display:"grid",gridTemplateColumns:item.photos.length>1?"repeat(2,minmax(0,1fr))":"1fr",gap:8}}>{item.photos.map((url,index)=><Image key={url} src={url} alt={`${item.title} photo ${index+1}`} width={720} height={540} style={{width:"100%",height:"auto",borderRadius:12}} unoptimized/>)}</div>:null}<p>{item.description}</p>{item.students_reached!==null&&<p><strong>{item.students_reached} students reached</strong></p>}</article>):<div className="card"><h3>Impact stories are coming soon.</h3><p>Ambassador submissions appear here only after National Office review and publication approval.</p></div>}</div>
    <div className="notice" style={{marginTop:24}}>Are you an approved ambassador? <Link className="card-link" href="/reach/claim">Claim your secure account</Link>.</div>
  </div></main>;
}

