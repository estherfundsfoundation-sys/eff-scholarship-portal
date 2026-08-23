import {createHash, randomUUID} from "node:crypto";
import type {BatchAuthorization, CompiledApplication, MockInstitution, PassportAnswers, StudentTask} from "./types";

export function compressQuestionCount(schools: MockInstitution[]) {
  const total = schools.reduce((sum, school)=>sum + school.questions.length, 0);
  const unique = new Set(schools.flatMap((school)=>school.questions.map((q)=>q.canonicalKey))).size;
  return {total, unique, eliminated: total - unique};
}

export function wordCount(value: unknown) { return String(value ?? "").trim().split(/\s+/).filter(Boolean).length; }

export function compileApplication(school: MockInstitution, answers: PassportAnswers): CompiledApplication {
  const missing = school.questions.filter((question)=>{
    const value = answers[question.canonicalKey];
    if (!question.required) return false;
    if (question.kind === "checkbox") return value !== true;
    return value === undefined || value === null || String(value).trim() === "" || (question.wordLimit ? wordCount(value) > question.wordLimit : false);
  }).map((question)=>question.canonicalKey);
  return {school, answers:Object.fromEntries(school.questions.filter((q)=>answers[q.canonicalKey] !== undefined).map((q)=>[q.canonicalKey,answers[q.canonicalKey]])),status:missing.length ? "PREFLIGHT_FAILED" : "BUILT",missing};
}

export function createTasks(applications: CompiledApplication[]): StudentTask[] {
  return applications.flatMap((application)=>[
    ...application.missing.map((key)=>({id:`${application.school.id}:${key}`,schoolId:application.school.id,title:`Complete ${key.split(".").at(-1)?.replaceAll("_"," ")}`,reason:"Required before this application can be authorized.",owner:"STUDENT" as const,blocking:true,completed:false})),
    ...(application.school.checkpoint === "FEE" ? [{id:`${application.school.id}:fee`,schoolId:application.school.id,title:"Choose fee payment or waiver",reason:`This demonstration route has a $${application.school.fee} fee checkpoint.`,owner:"STUDENT" as const,blocking:true,completed:false}] : []),
    ...(application.school.checkpoint === "EMAIL_VERIFICATION" ? [{id:`${application.school.id}:verify`,schoolId:application.school.id,title:"Complete email verification",reason:"Security codes must be entered by the student and are never stored.",owner:"STUDENT" as const,blocking:true,completed:false}] : []),
  ]);
}

export function snapshotApplication(application: CompiledApplication) {
  const payload = JSON.stringify({schoolId:application.school.id,routeVersion:application.school.routeVersion,answers:Object.entries(application.answers).sort(([a],[b])=>a.localeCompare(b))});
  return createHash("sha256").update(payload).digest("hex");
}

export function authorizeBatch(applications: CompiledApplication[], tasks: StudentTask[]): BatchAuthorization {
  if (applications.some((app)=>app.missing.length) || tasks.some((task)=>task.blocking && !task.completed)) throw new Error("Resolve every blocking action before authorizing this batch.");
  return {id:randomUUID(),snapshotHashes:Object.fromEntries(applications.map((app)=>[app.school.id,snapshotApplication(app)])),authorizedAt:new Date().toISOString(),revoked:false};
}

export function authorizationIsCurrent(authorization: BatchAuthorization, applications: CompiledApplication[]) {
  return !authorization.revoked && applications.every((application)=>authorization.snapshotHashes[application.school.id] === snapshotApplication(application));
}

export function submitMockBatch(applications: CompiledApplication[], authorization: BatchAuthorization, priorReceipts: Record<string,string> = {}) {
  if (!authorizationIsCurrent(authorization, applications)) throw new Error("Your application information changed. Review and authorize the updated batch.");
  return applications.map((application)=>{
    const confirmationNumber = priorReceipts[application.school.id] ?? `EFF-DEMO-${application.school.state}-${createHash("sha256").update(`${authorization.id}:${application.school.id}`).digest("hex").slice(0,8).toUpperCase()}`;
    return {...application,status:"SUBMITTED" as const,snapshotHash:snapshotApplication(application),confirmationNumber,submittedAt:new Date().toISOString()};
  });
}
