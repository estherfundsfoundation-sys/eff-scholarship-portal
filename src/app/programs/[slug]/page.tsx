import {notFound} from "next/navigation";
import {CalendarDays,CheckCircle2,HeartHandshake,Users} from "lucide-react";
import {createClient} from "@/lib/supabase/server";
import {startApplication} from "./actions";

type Cycle={id:string;name:string;opens_at:string|null;closes_at:string|null;status:string;award_config:Record<string,unknown>;form_versions:Array<{id:string;version:number;published_at:string|null}>};

const needEligibility=[
  "U.S. citizen, U.S. national, or permanent resident",
  "Completed the FAFSA",
  "Demonstrated unmet financial need verified by your college or university",
  "Undergraduate student who has not earned a bachelor’s degree",
  "Enrolled at an accredited U.S. college or university",
  "No minimum GPA; open to students in every field",
];

const servicePrograms:Record<string,{title:string;subtitle:string;about:string;eligibility:string[];prepare:string[];essay:string;awardLabel:string;award:string}>={
  "collegiate-executive-board-service-scholarship":{
    title:"EFF Collegiate Executive Board Service Scholarship",
    subtitle:"Recognizing an EFF collegiate executive board member whose leadership, reliability, and service strengthen the entire chapter.",
    about:"This scholarship honors an active collegiate executive board member who fosters a respectful and encouraging chapter climate, attends required executive board meetings, completes assigned work, and demonstrates meaningful service throughout Fall 2026.",
    eligibility:[
      "Be enrolled as a full-time college student",
      "Serve as an active EFF collegiate executive board member in good standing during Fall 2026",
      "Foster a positive, respectful, inclusive, and professional chapter climate",
      "Attend required executive board meetings, with documented approval for any excused absence",
      "Complete assigned EFF tasks responsibly and by established deadlines",
      "Provide documented community-service hours",
      "Provide a recommendation letter from the chapter advisor or an EFF president",
      "Provide a redacted FAFSA Submission Summary or school financial-aid summary for secure verification",
    ],
    prepare:[
      "Keep a dated service-hour log signed or verified by the organization or chapter leader",
      "Track meetings attended, excused absences, assigned tasks, deadlines, and completed work",
      "Ask your chapter advisor or EFF president for a recommendation early",
      "Save examples that show how you supported a healthy chapter climate and helped the board succeed",
      "Use the fall semester to build a complete record; save a draft and submit only when your evidence is ready",
    ],
    essay:"In 400–600 words, explain how your leadership strengthened your EFF collegiate chapter during Fall 2026. Describe how you fostered a positive climate, fulfilled executive-board responsibilities, completed service, and handled a challenge or helped another member succeed. Use specific examples.",
    awardLabel:"$1,000 scholarship",
    award:"One selected recipient will receive a $1,000 scholarship after eligibility and documentation are verified.",
  },
  "eff-ambassador-service-scholarship":{
    title:"EFF Ambassador Service Scholarship",
    subtitle:"Recognizing an EFF ambassador who turned service, initiative, and student-centered leadership into measurable impact.",
    about:"This scholarship recognizes an active EFF ambassador who documents the work completed during Fall 2026 and demonstrates consistent community service. There is no minimum GPA requirement.",
    eligibility:[
      "Be enrolled as a full-time college student",
      "Serve as an active EFF ambassador in good standing during Fall 2026",
      "Submit documentation of the EFF ambassador work completed during the fall semester",
      "Provide documentation of completed community-service hours",
      "Provide a redacted FAFSA Submission Summary or school financial-aid summary for secure verification",
      "No minimum GPA requirement",
    ],
    prepare:[
      "Keep a dated record of ambassador assignments, events, outreach, and completed deliverables",
      "Save approved flyers, reports, attendance records, photos, or other evidence of completed work",
      "Maintain a signed or verified community-service log",
      "Reflect on who your work reached and what changed because of your service",
      "Do not rush to submit; save a draft while you build a strong Fall 2026 service record",
    ],
    essay:"In 400–600 words, explain how your work as an EFF ambassador advanced Every Future Fulfilled during Fall 2026. Describe the work you completed, the students or community you served, the impact of your service, and how the experience shaped your leadership. Use specific examples.",
    awardLabel:"$1,000 scholarship",
    award:"One selected recipient will receive a $1,000 scholarship after eligibility and documentation are verified.",
  },
  "eff-members-service-scholarship":{
    title:"EFF Members-Only Service Scholarship",
    subtitle:"Recognizing active EFF chapter members whose participation, service, and commitment strengthen their chapter and the national organization.",
    about:"This members-only scholarship recognizes three active EFF collegiate chapter members who participate in the mandatory national Double Good popcorn fundraiser, remain involved in their chapter, and document meaningful service during Fall 2026.",
    eligibility:[
      "Be enrolled as a full-time college student",
      "Be an active EFF member in good standing and belong to an official collegiate chapter during Fall 2026",
      "Participate in the national Double Good popcorn fundraiser required for EFF members",
      "Provide documentation of fundraiser participation; no minimum sales amount is required for this scholarship",
      "Participate consistently in chapter meetings, activities, assignments, and service",
      "Provide documentation of completed community-service hours",
      "Provide verification from the chapter president or advisor",
      "Provide a redacted FAFSA Submission Summary or school financial-aid summary for secure verification",
    ],
    prepare:[
      "Save your Double Good fundraiser participation record or verified screenshot",
      "Keep a dated log of chapter meetings, activities, assignments, and service",
      "Maintain a signed or verified community-service log",
      "Ask your chapter president or advisor to verify your active membership and participation",
      "Use the fall semester to build a complete record; save a draft and submit only when your evidence is ready",
    ],
    essay:"In 400–600 words, explain how your active EFF membership strengthened your chapter and community during Fall 2026. Describe your chapter participation, national Double Good fundraiser involvement, community service, and the impact you made. Explain how this scholarship would support your educational journey. Use specific examples.",
    awardLabel:"Three scholarship awards",
    award:"After eligibility and documentation are verified, first place will receive $2,000, second place will receive $1,500, and third place will receive $500.",
  },
};

const dateText=(value:string|null)=>value?new Intl.DateTimeFormat("en-US",{dateStyle:"long",timeStyle:"short",timeZone:"America/New_York"}).format(new Date(value)):"Not published";

export default async function ProgramDetail({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const supabase=await createClient();
  const {data:program}=await supabase.from("programs").select("id,slug,name,description,program_cycles(id,name,opens_at,closes_at,status,award_config,form_versions(id,version,published_at))").eq("slug",slug).single();
  if(!program)notFound();
  const cycles=(program.program_cycles as unknown as Cycle[])??[];
  const cycle=cycles.find(item=>item.status==="open");
  const form=cycle?.form_versions.find(item=>item.published_at);
  const service=servicePrograms[slug];

  if(service){
    return <main><section className="program-hero"><div className="shell"><div className="eyebrow">Official EFF scholarship</div><h1>{service.title}</h1><p>{service.subtitle}</p>{cycle&&form?<form action={startApplication}><input type="hidden" name="cycle_id" value={cycle.id}/><input type="hidden" name="form_version_id" value={form.id}/><input type="hidden" name="program_slug" value={slug}/><button className="button tan" type="submit"><HeartHandshake size={19}/> Start or continue application</button></form>:<div className="notice">Applications are currently closed.</div>}</div></section><section className="section white"><div className="shell"><div className="split" style={{alignItems:"start"}}><div><div className="eyebrow">About this scholarship</div><h2>Service completed with excellence</h2><p>{service.about}</p><div className="deadline-card"><CalendarDays/><div><strong>Application window</strong><br/>{dateText(cycle?.opens_at??null)} through {dateText(cycle?.closes_at??null)}</div></div><div className="deadline-card"><Users/><div><strong>{service.awardLabel}</strong><br/>{service.award}</div></div><div className="notice"><strong>Build your record before you submit.</strong><br/>The application stays open through December 31, 2026. Use the semester to complete your work, document your impact, and prepare clear proof. A rushed or early submission does not receive preference.</div></div><div className="card"><h3>Eligibility — you must meet all</h3><ul className="check-list">{service.eligibility.map(item=><li key={item}><CheckCircle2 size={19}/><span>{item}</span></li>)}</ul></div></div><div className="split" style={{alignItems:"start",marginTop:32}}><div className="card"><h3>How to prepare</h3><ul>{service.prepare.map(item=><li key={item}>{item}</li>)}</ul></div><div className="card"><h3>Essay prompt</h3><p>{service.essay}</p><p className="muted"><strong>FAFSA privacy:</strong> Upload only the requested redacted summary through the secure portal. Remove Social Security numbers, FSA IDs, passwords, tax-return details, bank information, and full financial account numbers.</p></div></div></div></section></main>;
  }

  const rolling=slug==="for-such-a-time-as-this";
  if(!rolling&&slug!=="name-your-need")return <main className="section"><div className="shell" style={{maxWidth:850}}><div className="eyebrow">EFF-administered program</div><h2>{program.name}</h2><p className="muted">{program.description}</p><div className="notice"><strong>Applications are not currently open.</strong><br/>Program details will be published after EFF approves the cycle’s eligibility, award terms, and deadline.</div></div></main>;
  const title=rolling?"For Such a Time as This Scholarship":"The “Name Your Need” Scholarship";
  return <main><section className="program-hero"><div className="shell"><div className="eyebrow">Official EFF application</div><h1>{title}</h1><p className="scripture">“For such a time as this.” — Esther 4:14</p><p>{rolling?"Support for students facing a defining season when timely financial help can protect their path to graduation.":"You tell us, in your own words, what you need most to stay enrolled—and our team steps in to help."}</p>{cycle&&form?<form action={startApplication}><input type="hidden" name="cycle_id" value={cycle.id}/><input type="hidden" name="form_version_id" value={form.id}/><input type="hidden" name="program_slug" value={slug}/><button className="button tan" type="submit"><HeartHandshake size={19}/> Start or continue application</button></form>:<div className="notice">Applications are currently closed.</div>}</div></section><section className="section white"><div className="shell split" style={{alignItems:"start"}}><div><div className="eyebrow">About this scholarship</div><h2>{rolling?"Help for the season you’re in":"Name what you need"}</h2><p>This need-based award helps undergraduate students address verified unmet financial needs that could interrupt enrollment.</p>{rolling?<><div className="deadline-card"><CalendarDays/><div><strong>Rolling application period</strong><br/>There is no fixed deadline. Applications are reviewed as funding and capacity allow.</div></div><div className="deadline-card"><Users/><div><strong>Multiple recipients</strong><br/>EFF expects to select multiple qualified recipients. Award amounts may vary based on verified need and available funds.</div></div></>:<div className="deadline-card"><CalendarDays/><div><strong>Application deadline</strong><br/>July 31, 2026 at 11:59 p.m. Eastern</div></div>}<p className="muted"><strong>Early application is strongly encouraged.</strong> Awards are not guaranteed and are determined by EFF after review and verification.</p></div><div className="card"><h3>Eligibility — you must meet all</h3><ul className="check-list">{needEligibility.map(item=><li key={item}><CheckCircle2 size={19}/><span>{item}</span></li>)}</ul><p><strong>If you do not meet every requirement, please do not apply.</strong></p></div></div></section></main>;
}
