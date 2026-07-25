import {describe,expect,it} from "vitest";
import {buildAutomaticStudentRouting,contactKeysForIssue} from "./student-help-routing";

describe("automatic student help routing",()=>{
  it("routes balance holds to student accounts and financial aid",()=>{
    expect(contactKeysForIssue("Past-due balance or registration hold")).toEqual(["student_accounts","financial_aid"]);
  });

  it("gives verified contacts and sends larger needs to scholarships",()=>{
    const text=buildAutomaticStudentRouting({
      case_code:"EFF-2026-TEST",
      school_name:"Albany State University",
      issue_type:"Past-due balance or registration hold",
      school_deadline:"August 1",
      essentials_requested:true,
      essentials_term:"Fall"
    },[{
      department_key:"student_accounts",
      department_name:"Student Accounts",
      contact_url:"https://school.example/accounts",
      email:"bursar@school.example",
      phone:"555-0100",
      source_url:"https://school.example/accounts"
    }]);
    expect(text).toContain("bursar@school.example");
    expect(text).toContain("maximum of $100");
    expect(text).toContain("apply for an eligible EFF scholarship");
    expect(text).toContain("not approved or guaranteed");
  });

  it("falls back to an official school page when no department contact exists",()=>{
    const text=buildAutomaticStudentRouting({
      case_code:"EFF-2026-TEST",
      school_name:"Example College",
      issue_type:"Financial aid or FAFSA",
      school_deadline:null,
      essentials_requested:false,
      essentials_term:null
    },[],{financial_aid_url:"https://school.example/aid"});
    expect(text).toContain("https://school.example/aid");
    expect(text).toContain("No Student Essentials request");
  });
});
