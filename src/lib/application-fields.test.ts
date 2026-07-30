import {describe,expect,it} from "vitest";
import {
  ALL_ANSWER_FIELDS,
  ALL_UPLOAD_KINDS,
  AMBASSADOR_REQUIRED_ANSWERS,
  AMBASSADOR_REQUIRED_UPLOADS,
  EXECUTIVE_BOARD_REQUIRED_ANSWERS,
  EXECUTIVE_BOARD_REQUIRED_UPLOADS,
} from "./application-fields";

describe("application field coverage",()=>{
  const answers=new Set<string>(ALL_ANSWER_FIELDS);
  const uploads=new Set<string>(ALL_UPLOAD_KINDS);

  it("saves every required Ambassador Service Scholarship answer",()=>{
    expect(AMBASSADOR_REQUIRED_ANSWERS.every((field)=>answers.has(field))).toBe(true);
  });

  it("uploads every required Ambassador Service Scholarship document",()=>{
    expect(AMBASSADOR_REQUIRED_UPLOADS.every((field)=>uploads.has(field))).toBe(true);
  });

  it("saves every required Executive Board Service Scholarship answer",()=>{
    expect(EXECUTIVE_BOARD_REQUIRED_ANSWERS.every((field)=>answers.has(field))).toBe(true);
  });

  it("uploads every required Executive Board Service Scholarship document",()=>{
    expect(EXECUTIVE_BOARD_REQUIRED_UPLOADS.every((field)=>uploads.has(field))).toBe(true);
  });
});
