import {describe,expect,it} from "vitest";
import {classifyHelpDeskMessage} from "./safety";

describe("Help Desk safety classification",()=>{
  it("safety-locks direct self-harm language",()=>{
    expect(classifyHelpDeskMessage("I do not want to live if I lose school")).toMatchObject({safety:true,level:"safety"});
  });
  it("flags credentials and financial identifiers",()=>{
    expect(classifyHelpDeskMessage("Here is my password and bank account")).toMatchObject({privacy:true,level:"urgent"});
  });
  it("leaves routine scholarship questions open",()=>{
    expect(classifyHelpDeskMessage("Can you help me find a scholarship for nursing?")).toMatchObject({safety:false,privacy:false,conduct:false,level:"routine"});
  });
});
