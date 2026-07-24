import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {PDFDocument} from "pdf-lib";
import {createHowardAdvocacyPacket,type HowardPacketCase} from "./howard-packet-pdf";
import {createHowardPacketToken,verifyHowardPacketToken} from "./howard-packet-token";

const caseId="11111111-2222-4333-8444-555555555555";

beforeEach(()=>{process.env.HOWARD_PACKET_SECRET="test-only-howard-packet-secret";});
afterEach(()=>{delete process.env.HOWARD_PACKET_SECRET;});

describe("Howard packet access",()=>{
  it("accepts an untampered, unexpired token",()=>{
    const expires=Date.now()+60_000;
    const token=createHowardPacketToken(caseId,expires);
    expect(verifyHowardPacketToken(token,Date.now())).toMatchObject({caseId});
  });

  it("rejects tampered and expired tokens",()=>{
    const token=createHowardPacketToken(caseId,Date.now()+60_000);
    expect(verifyHowardPacketToken(`${token.slice(0,-1)}x`,Date.now())).toBeNull();
    expect(verifyHowardPacketToken(createHowardPacketToken(caseId,Date.now()-60_000),Date.now())).toBeNull();
  });
});

describe("Howard advocacy PDF",()=>{
  it("creates a branded multi-page packet",async()=>{
    const record:HowardPacketCase={
      id:caseId,
      case_code:"HU-2026-TEST1234",
      student_name:"Jordan Student",
      preferred_name:"Jordan",
      email:"jordan@example.edu",
      student_type:"Incoming first-year",
      issue_type:"Pending external scholarship",
      enrollment_status:"Admission canceled",
      balance_before:1500,
      balance_now:2400,
      school_deadline:"August 3, 2026",
      aid_summary:"An external scholarship is approved and expected to be disbursed after the enrollment deadline.",
      timeline:"The student accepted admission, completed listed tasks, and later saw the admission status change while scholarship funding remained pending.",
      steps_taken:"The student contacted Financial Aid and the Bursar and saved the available confirmation numbers.",
      verified_at:new Date().toISOString(),
      advocacy_email_sent_at:new Date().toISOString(),
      status:"advocacy_sent",
      created_at:new Date().toISOString()
    };
    const bytes=await createHowardAdvocacyPacket(record);
    expect(Buffer.from(bytes).subarray(0,4).toString("ascii")).toBe("%PDF");
    const document=await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(5);
    expect(document.getTitle()).toContain(record.case_code);
  });
});
