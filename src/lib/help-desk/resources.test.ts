import {describe,expect,it} from "vitest";
import {matchHelpDeskResources} from "./resources";

describe("Help Desk deterministic resource matching",()=>{
  it("routes FAFSA questions to the FAFSA resource",()=>{
    expect(matchHelpDeskResources("My FAFSA says action required").map(item=>item.key)).toContain("fafsa");
  });
  it("routes housing emergencies to housing and local help",()=>{
    const keys=matchHelpDeskResources("I may be evicted from my apartment tonight").map(item=>item.key);
    expect(keys).toContain("housing");
  });
  it("routes portal errors to Account Help",()=>{
    expect(matchHelpDeskResources("My claim invitation link is invalid and shows 404").map(item=>item.key)).toContain("account-help");
  });
});
