import {describe,expect,it} from "vitest";
import {assertExecutionOrigin} from "./driver";
describe("route driver security",()=>{it("blocks navigation outside the approved origin",()=>{const context={runId:"demo",routeKey:"mock.suncoast",allowedOrigin:"https://demo.local"};expect(()=>assertExecutionOrigin(context,"https://demo.local/apply")).not.toThrow();expect(()=>assertExecutionOrigin(context,"https://malicious.example/steal")).toThrow(/approved origin/);});});
