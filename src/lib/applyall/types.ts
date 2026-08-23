export type JourneyStage = "SCHOOL_SELECTION" | "APPLICATION_INTERVIEW" | "APPLICATION_BUILD" | "APPLICATION_ACTIONS" | "APPLICATION_REVIEW" | "APPLICATION_SUBMISSION" | "FAFSA" | "SCHOLARSHIPS";
export type ApplicationStatus = "DRAFT" | "READY_TO_BUILD" | "BUILDING" | "ACTION_REQUIRED" | "BUILT" | "PREFLIGHT_FAILED" | "READY_TO_AUTHORIZE" | "AUTHORIZED" | "SUBMITTING" | "SUBMITTED";
export type TaskOwner = "STUDENT" | "PARENT" | "COUNSELOR" | "RECOMMENDER" | "EFF" | "INSTITUTION";
export type FieldKind = "text" | "email" | "date" | "number" | "select" | "textarea" | "checkbox";

export interface RouteQuestion {
  id: string;
  canonicalKey: string;
  label: string;
  help: string;
  kind: FieldKind;
  required: boolean;
  options?: string[];
  schoolSpecific?: boolean;
  sensitive?: boolean;
  wordLimit?: number;
}

export interface MockInstitution {
  id: string;
  name: string;
  state: "FL" | "GA" | "AL";
  type: string;
  hbcu: boolean;
  readiness: "APPLYALL_READY";
  routeKey: string;
  routeVersion: string;
  fee: number;
  questions: RouteQuestion[];
  checkpoint: "NONE" | "FEE" | "EMAIL_VERIFICATION";
}

export interface PassportAnswers { [canonicalKey: string]: string | boolean | number }
export interface StudentTask { id: string; schoolId: string; title: string; reason: string; owner: TaskOwner; blocking: boolean; completed: boolean }
export interface CompiledApplication { school: MockInstitution; answers: PassportAnswers; status: ApplicationStatus; missing: string[]; snapshotHash?: string; confirmationNumber?: string; submittedAt?: string }
export interface BatchAuthorization { id: string; snapshotHashes: Record<string, string>; authorizedAt: string; revoked: boolean }
