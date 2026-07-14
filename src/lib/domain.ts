import { z } from "zod";

export const applicationStatuses = ["draft","applied","review_by_admin","additional_information_needed","approved","denied","withdrawn","archived"] as const;
export type ApplicationStatus = typeof applicationStatuses[number];
export const applicantLabels: Record<ApplicationStatus,string> = { draft:"Draft", applied:"Submitted", review_by_admin:"In review", additional_information_needed:"Action needed", approved:"Approved", denied:"Decision available", withdrawn:"Withdrawn", archived:"Archived" };

export const profileSchema = z.object({ legalName:z.string().trim().min(2).max(120), preferredName:z.string().trim().max(80).optional(), phone:z.string().trim().max(30).optional(), institution:z.string().trim().max(160).optional(), communicationConsent:z.boolean() });
export const submissionSchema = z.object({ applicationId:z.string().uuid(), formVersionId:z.string().uuid(), agreementVersionId:z.string().uuid(), answers:z.record(z.string(),z.unknown()) });
export const sourceListingSchema = z.object({ title:z.string().trim().min(2), originalUrl:z.string().url().refine(v=>/^https?:/.test(v)), sourceUrl:z.string().url(), deadlineKind:z.enum(["date","rolling","recurring","varies"]), deadline:z.string().date().nullable(), amountText:z.string().max(100).nullable(), sponsor:z.string().max(200).nullable() });

export function canTransition(from:ApplicationStatus,to:ApplicationStatus){ const transitions:Record<ApplicationStatus,ApplicationStatus[]>={draft:["applied","withdrawn"],applied:["review_by_admin","withdrawn"],review_by_admin:["additional_information_needed","approved","denied","withdrawn"],additional_information_needed:["review_by_admin","withdrawn"],approved:["archived"],denied:["archived"],withdrawn:["archived"],archived:[]}; return transitions[from].includes(to); }
export function normalizeScholarshipTitle(value:string){ return value.toLowerCase().replace(/\b(the|scholarship|award|fund)\b/g," ").replace(/[^a-z0-9]+/g," ").trim(); }
export function canonicalizeUrl(value:string){ const url=new URL(value); url.hash=""; ["utm_source","utm_medium","utm_campaign","ref"].forEach(k=>url.searchParams.delete(k)); return `${url.hostname.replace(/^www\./,"")}${url.pathname.replace(/\/$/,"")}`.toLowerCase(); }
