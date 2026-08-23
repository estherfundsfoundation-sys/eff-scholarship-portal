import type {BatchAuthorization, CompiledApplication} from "./types";

export interface DriverContext {runId:string; routeKey:string; allowedOrigin:string; signal?:AbortSignal}
export interface RouteDetectionResult {matched:boolean; version:string}
export interface RouteChangeResult {classification:"NO_CHANGE"|"COSMETIC_CHANGE"|"SEMANTICALLY_EQUIVALENT_CHANGE"|"STRUCTURAL_CHANGE"|"MATERIAL_REQUIREMENT_CHANGE"|"SECURITY_CHANGE"|"UNKNOWN_CHANGE";safeToContinue:boolean}
export interface ApplicationDriver {
  readonly routeKey:string;
  readonly version:string;
  detect(context:DriverContext):Promise<RouteDetectionResult>;
  inspect(context:DriverContext):Promise<unknown>;
  compareVersion(expected:string,live:unknown):Promise<RouteChangeResult>;
  build(context:DriverContext,snapshot:CompiledApplication):Promise<{complete:boolean;exceptions:string[]}>;
  validate(context:DriverContext):Promise<{ready:boolean;errors:string[]}>;
  submit(context:DriverContext,authorization:BatchAuthorization):Promise<{submitted:boolean}>;
  captureReceipt(context:DriverContext):Promise<{confirmationNumber:string;submittedAt:string}>;
  cleanup(context:DriverContext):Promise<void>;
}

export function assertExecutionOrigin(context:DriverContext,url:string){
  const expected=new URL(context.allowedOrigin);
  const actual=new URL(url);
  if(actual.origin!==expected.origin) throw new Error("Application driver attempted to leave its approved origin.");
}
