import type {Metadata} from "next";
import Link from "next/link";
import {requireAdmin} from "@/lib/auth/staff";
import {futureLinkAdminDecision,futureLinkAdminManualMatch} from "../actions";

export const metadata:Metadata={title:"FutureLink Administration"};

export default async function FutureLinkAdmin({searchParams}:{searchParams:Promise<{matched?:string;error?:string}>}){
  const params=await searchParams;const {supabase}=await requireAdmin();
  const [{data:profiles},{data:matches},{data:reports},{data:sessions}]=await Promise.all([
    supabase.from("futurelink_profiles").select("user_id,display_name,legal_name,participant_type,status,verification_status,school,academic_field,profession,school_email,submitted_at,review_note,verification_document_path,mentor_capacity").order("submitted_at",{ascending:true}),
    supabase.from("futurelink_matches").select("id,status,score,created_at,mentee_id,mentor_id"),
    supabase.from("futurelink_reports").select("id,category,status,created_at").order("created_at",{ascending:false}),
    supabase.from("futurelink_sessions").select("id,status,duration_minutes")
  ]);
  const rows=profiles??[];const pending=rows.filter(p=>["pending","additional_documents_required"].includes(p.verification_status));
  const occupied=new Set((matches??[]).filter(m=>["proposed","awaiting_mentor_acceptance","awaiting_mentee_acceptance","agreement_required","active"].includes(m.status)).flatMap(m=>[m.mentee_id,m.mentor_id]));
  const ready=rows.filter(p=>p.verification_status==="approved"&&["match_eligible","searching_for_match"].includes(p.status));
  const mentees=ready.filter(p=>["student_mentee","student_both"].includes(p.participant_type)&&!occupied.has(p.user_id));
  const mentors=ready.filter(p=>["student_peer_mentor","student_both","professional_mentor"].includes(p.participant_type));
  const stats=[
    ["Pending verification",pending.length],["Approved participants",rows.filter(p=>p.verification_status==="approved").length],
    ["Active matches",(matches??[]).filter(m=>m.status==="active").length],["Unmatched verified",ready.length],
    ["Open safety cases",(reports??[]).filter(r=>["open","reviewing"].includes(r.status)).length],["Disputed sessions",(sessions??[]).filter(s=>s.status==="disputed").length]
  ];
  return <main className="fl-page fl-admin">
    <section className="fl-dashboard-head"><div className="fl-shell"><div><div className="fl-kicker">National Office · protected</div><h1>FutureLink administration</h1><p>Verification, matching oversight, safety review, and service-hour integrity.</p></div><Link className="fl-button light" href="/admin">Main admin</Link></div></section>
    <div className="fl-shell">
      {params.matched&&<div className="fl-alert success">The match was proposed and both participants were queued for email notification.</div>}
      {params.error&&<div className="fl-alert">{params.error}</div>}
      <div className="fl-admin-stats">{stats.map(([label,value])=><article key={String(label)}><strong>{value}</strong><span>{label}</span></article>)}</div>
      <section className="fl-panel"><div className="fl-section-head"><span>Verification queue</span><h2>Review before match eligibility.</h2><p>Approval unlocks the required onboarding. Matching begins only after the participant finishes orientation and acknowledges program boundaries.</p></div>
        {pending.length?<div className="fl-review-list">{pending.map(row=><article key={row.user_id}><div><span>{row.participant_type.replaceAll("_"," ")}</span><h3>{row.legal_name} <small>({row.display_name})</small></h3><p>{row.school||row.profession||"No institution listed"} · {row.academic_field}</p><p>School email: {row.school_email||"Not provided"} · Submitted {row.submitted_at?new Date(row.submitted_at).toLocaleString():"—"}</p>{row.review_note&&<p><strong>Prior note:</strong> {row.review_note}</p>}</div><div className="fl-review-actions">{row.verification_document_path&&<a href={`/future-link/admin/verification/${row.user_id}`} target="_blank">Open private evidence</a>}<form action={futureLinkAdminDecision}><input type="hidden" name="userId" value={row.user_id}/><textarea name="note" rows={2} placeholder="Internal-safe note or applicant instruction"/><button name="decision" value="approve" className="fl-button">Approve for onboarding</button><button name="decision" value="request">Request documents</button><button name="decision" value="reject" className="fl-danger">Reject verification</button></form></div></article>)}</div>:<p className="fl-empty">No profiles are waiting for verification.</p>}
      </section>
      <section className="fl-panel fl-manual-match"><div className="fl-section-head"><span>National Office override</span><h2>Propose a reviewed match.</h2><p>The matcher remains automatic. Use this only when staff context improves on the score; capacity, eligibility, blocks, mutual acceptance, and the agreement are still enforced.</p></div>
        <form action={futureLinkAdminManualMatch} className="fl-compact-form"><label>Mentee<select name="menteeId" required><option value="">Select verified mentee</option>{mentees.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name} · {p.school||p.academic_field}</option>)}</select></label><label>Mentor<select name="mentorId" required><option value="">Select verified mentor</option>{mentors.map(p=><option key={p.user_id} value={p.user_id}>{p.display_name} · {p.profession||p.school||p.academic_field}</option>)}</select></label><button className="fl-button">Score &amp; propose match</button></form>
      </section>
      <section className="fl-admin-two"><div className="fl-panel"><div className="fl-kicker">Safety queue</div><h2>{(reports??[]).filter(r=>["open","reviewing"].includes(r.status)).length} open case(s)</h2><p>Reports freeze the match, hide contact details, preserve the record, and pause the reported account.</p></div><div className="fl-panel"><div className="fl-kicker">Matching operations</div><h2>Automatic, with oversight</h2><p>Automatic scoring handles routine pairing. National Office can review verification, make a documented match override, monitor sessions, and resolve safety cases.</p></div></section>
    </div>
  </main>;
}
