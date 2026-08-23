import {describe,expect,it} from "vitest";
import {authorizeBatch,authorizationIsCurrent,compileApplication,compressQuestionCount,createTasks,snapshotApplication,submitMockBatch} from "./engine";
import {MOCK_INSTITUTIONS} from "./mock-routes";

const completeAnswers = Object.fromEntries(MOCK_INSTITUTIONS.flatMap((s)=>s.questions).map((q)=>[q.canonicalKey,q.kind === "checkbox" ? true : q.kind === "number" ? 3.2 : q.options?.[0] ?? "A complete student-owned answer"]));

describe("EFF ApplyAll engine",()=>{
  it("compresses repeated questions",()=>{ const counts=compressQuestionCount(MOCK_INSTITUTIONS); expect(counts.total).toBeGreaterThan(counts.unique); expect(counts.eliminated).toBeGreaterThan(0); });
  it("fails preflight when required answers are missing",()=>{ expect(compileApplication(MOCK_INSTITUTIONS[0],{}).missing.length).toBeGreaterThan(0); });
  it("creates student checkpoints for fees and verification",()=>{ const apps=MOCK_INSTITUTIONS.map((s)=>compileApplication(s,completeAnswers)); const tasks=createTasks(apps); expect(tasks.map((t)=>t.id)).toContain("peach-demo:fee"); expect(tasks.map((t)=>t.id)).toContain("heartland-demo:verify"); });
  it("invalidates authorization after a material answer changes",()=>{ const apps=MOCK_INSTITUTIONS.map((s)=>compileApplication(s,completeAnswers)); const tasks=createTasks(apps).map((t)=>({...t,completed:true})); const auth=authorizeBatch(apps,tasks); const changed=apps.map((app,i)=>i?app:{...app,answers:{...app.answers,"education_goals.primary_major":"Business"}}); expect(authorizationIsCurrent(auth,apps)).toBe(true); expect(authorizationIsCurrent(auth,changed)).toBe(false); });
  it("makes repeat submission idempotent",()=>{ const apps=MOCK_INSTITUTIONS.map((s)=>compileApplication(s,completeAnswers)); const auth=authorizeBatch(apps,createTasks(apps).map((t)=>({...t,completed:true}))); const first=submitMockBatch(apps,auth); const prior=Object.fromEntries(first.map((r)=>[r.school.id,r.confirmationNumber!])); const second=submitMockBatch(apps,auth,prior); expect(second.map((r)=>r.confirmationNumber)).toEqual(first.map((r)=>r.confirmationNumber)); expect(first[0].snapshotHash).toBe(snapshotApplication(apps[0])); });
});
