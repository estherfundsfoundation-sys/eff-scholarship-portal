import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {PDFDocument,StandardFonts,rgb,type PDFFont,type PDFImage,type PDFPage} from "pdf-lib";

export type HowardPacketCase={
  id:string;
  case_code:string;
  student_name:string;
  preferred_name:string|null;
  email:string;
  student_type:string;
  issue_type:string;
  enrollment_status:string;
  balance_before:number|null;
  balance_now:number|null;
  school_deadline:string|null;
  aid_summary:string;
  timeline:string;
  steps_taken:string;
  verified_at:string|null;
  advocacy_email_sent_at:string|null;
  status:string;
  created_at:string;
};

const PURPLE=rgb(66/255,18/255,127/255);
const LAVENDER=rgb(183/255,153/255,227/255);
const CREAM=rgb(245/255,240/255,230/255);
const INK=rgb(45/255,23/255,72/255);
const MUTED=rgb(101/255,90/255,112/255);
const PAGE_WIDTH=612;
const PAGE_HEIGHT=792;
const MARGIN=52;
const CONTENT_WIDTH=PAGE_WIDTH-MARGIN*2;
const FOOTER_Y=24;

function clean(value:string){
  return value
    .replace(/[’‘]/g,"'")
    .replace(/[“”]/g,'"')
    .replace(/[–—]/g,"-")
    .replace(/…/g,"...")
    .replace(/[^\x20-\x7E\n\r\t]/g," ");
}

function amount(value:number|null){
  return value===null?"Not provided":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
}

function date(value:string|null){
  if(!value)return "Not available";
  return new Date(value).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",timeZone:"America/New_York"});
}

function splitToken(token:string,font:PDFFont,size:number,maxWidth:number){
  if(font.widthOfTextAtSize(token,size)<=maxWidth)return [token];
  const pieces:string[]=[];
  let piece="";
  for(const character of token){
    if(piece&&font.widthOfTextAtSize(piece+character,size)>maxWidth){
      pieces.push(piece);
      piece=character;
    }else piece+=character;
  }
  if(piece)pieces.push(piece);
  return pieces;
}

function wrap(value:string,font:PDFFont,size:number,maxWidth:number){
  const lines:string[]=[];
  for(const paragraph of clean(value).split(/\r?\n/)){
    if(!paragraph.trim()){lines.push("");continue;}
    const words=paragraph.trim().split(/\s+/).flatMap(word=>splitToken(word,font,size,maxWidth));
    let line="";
    for(const word of words){
      const candidate=line?`${line} ${word}`:word;
      if(line&&font.widthOfTextAtSize(candidate,size)>maxWidth){
        lines.push(line);
        line=word;
      }else line=candidate;
    }
    if(line)lines.push(line);
  }
  return lines;
}

class PacketWriter{
  private readonly pdf:PDFDocument;
  private readonly regular:PDFFont;
  private readonly bold:PDFFont;
  private readonly italic:PDFFont;
  private readonly caseCode:string;
  private readonly logo:PDFImage|null;
  private page!:PDFPage;
  private y=0;
  private pageNumber=0;
  constructor(
    pdf:PDFDocument,
    regular:PDFFont,
    bold:PDFFont,
    italic:PDFFont,
    caseCode:string,
    logo:PDFImage|null
  ){
    this.pdf=pdf;
    this.regular=regular;
    this.bold=bold;
    this.italic=italic;
    this.caseCode=caseCode;
    this.logo=logo;
    this.newPage();
  }

  private header(){
    this.page.drawRectangle({x:0,y:PAGE_HEIGHT-18,width:PAGE_WIDTH,height:18,color:PURPLE});
    if(this.logo)this.page.drawImage(this.logo,{x:MARGIN,y:PAGE_HEIGHT-86,width:48,height:48});
    const titleX=this.logo?MARGIN+62:MARGIN;
    this.page.drawText("ESTHER FUNDS FOUNDATION",{x:titleX,y:PAGE_HEIGHT-56,size:15,font:this.bold,color:PURPLE});
    this.page.drawText("KEEP YOUR SEAT - STUDENT ADVOCACY PACKET",{x:titleX,y:PAGE_HEIGHT-73,size:9,font:this.bold,color:MUTED});
    this.page.drawLine({start:{x:MARGIN,y:PAGE_HEIGHT-98},end:{x:PAGE_WIDTH-MARGIN,y:PAGE_HEIGHT-98},thickness:1,color:LAVENDER});
    this.y=PAGE_HEIGHT-122;
  }

  private footer(){
    this.page.drawLine({start:{x:MARGIN,y:48},end:{x:PAGE_WIDTH-MARGIN,y:48},thickness:.7,color:LAVENDER});
    this.page.drawText(`CONFIDENTIAL STUDENT ADVOCACY MATERIAL | ${this.caseCode}`,{x:MARGIN,y:FOOTER_Y,size:7.5,font:this.bold,color:MUTED});
    const pageText=`Page ${this.pageNumber}`;
    this.page.drawText(pageText,{x:PAGE_WIDTH-MARGIN-this.regular.widthOfTextAtSize(pageText,7.5),y:FOOTER_Y,size:7.5,font:this.regular,color:MUTED});
  }

  newPage(){
    if(this.page)this.footer();
    this.page=this.pdf.addPage([PAGE_WIDTH,PAGE_HEIGHT]);
    this.pageNumber+=1;
    this.header();
  }

  finish(){this.footer();}

  ensure(height:number){
    if(this.y-height<62)this.newPage();
  }

  space(points:number){this.ensure(points);this.y-=points;}

  title(value:string){
    const lines=wrap(value,this.bold,22,CONTENT_WIDTH);
    this.ensure(lines.length*27+8);
    for(const line of lines){
      this.page.drawText(line,{x:MARGIN,y:this.y,size:22,font:this.bold,color:PURPLE});
      this.y-=27;
    }
    this.y-=4;
  }

  eyebrow(value:string){
    this.ensure(20);
    this.page.drawText(clean(value).toUpperCase(),{x:MARGIN,y:this.y,size:8.5,font:this.bold,color:MUTED});
    this.y-=17;
  }

  section(value:string){
    this.ensure(35);
    this.page.drawRectangle({x:MARGIN,y:this.y-5,width:5,height:22,color:PURPLE});
    this.page.drawText(clean(value),{x:MARGIN+14,y:this.y,size:15,font:this.bold,color:INK});
    this.y-=29;
  }

  text(value:string,{size=10.2,font=this.regular,color=INK,indent=0,after=9,lineHeight=size*1.42}:{size?:number;font?:PDFFont;color?:ReturnType<typeof rgb>;indent?:number;after?:number;lineHeight?:number}={}){
    const lines=wrap(value,font,size,CONTENT_WIDTH-indent);
    for(const line of lines){
      this.ensure(lineHeight);
      if(line)this.page.drawText(line,{x:MARGIN+indent,y:this.y,size,font,color});
      this.y-=lineHeight;
    }
    this.y-=after;
  }

  bullet(value:string){
    const size=10;
    const indent=18;
    const lines=wrap(value,this.regular,size,CONTENT_WIDTH-indent);
    for(const [index,line] of lines.entries()){
      this.ensure(14);
      if(index===0)this.page.drawText("-",{x:MARGIN+2,y:this.y,size,font:this.bold,color:PURPLE});
      this.page.drawText(line,{x:MARGIN+indent,y:this.y,size,font:this.regular,color:INK});
      this.y-=14;
    }
    this.y-=5;
  }

  fact(label:string,value:string){
    this.ensure(30);
    this.page.drawText(clean(label).toUpperCase(),{x:MARGIN,y:this.y,size:7.8,font:this.bold,color:MUTED});
    this.y-=12;
    this.text(value,{size:10.2,after:8});
  }

  callout(title:string,value:string):void{
    const titleSize=10.5;
    const bodySize=9.5;
    const lines=wrap(value,this.regular,bodySize,CONTENT_WIDTH-28);
    const height=34+lines.length*13;
    if(height>this.y-62){this.newPage();this.callout(title,value);return;}
    this.page.drawRectangle({x:MARGIN,y:this.y-height+11,width:CONTENT_WIDTH,height,color:CREAM,borderColor:LAVENDER,borderWidth:.8});
    this.page.drawText(clean(title),{x:MARGIN+14,y:this.y-10,size:titleSize,font:this.bold,color:PURPLE});
    let lineY=this.y-27;
    for(const line of lines){
      if(line)this.page.drawText(line,{x:MARGIN+14,y:lineY,size:bodySize,font:this.regular,color:INK});
      lineY-=13;
    }
    this.y-=height+4;
  }

  signature(){
    this.space(5);
    this.text("With urgency and respect,",{font:this.italic,after:14});
    this.text("Esther Funds Foundation",{font:this.bold,size:11,after:2});
    this.text("Student Advocacy Office | Every Future Fulfilled",{size:9,color:MUTED,after:2});
    this.text("nationals@estherfundsinc.org | portal.estherfundsfoundation.org/resources/howard-help",{size:8.5,color:MUTED,after:2});
  }
}

function actionSteps(record:HowardPacketCase){
  const steps=[
    "Check BisonHub now. Save a dated screenshot of enrollment, courses, holds, tasks, aid, housing, and the balance shown.",
    "Keep a simple contact log with the date, office, staff member, case number, instructions, and promised response time.",
    "Reply to the EFF email with REINSTATED, HOWARD RESPONDED, NO CHANGE, or NEW DEADLINE whenever the record changes."
  ];
  if(record.student_type==="Incoming first-year")steps.push("Email enrollmentmanagement@howard.edu with the EFF case number and ask for written confirmation of the enrollment review.");
  else if(record.student_type==="Incoming transfer")steps.push("Contact transfer@howard.edu and request the staff member, case number, remaining action, and written decision deadline.");
  else steps.push("Contact registrar@howard.edu and the appropriate academic adviser about enrollment status, registration, and restoration of courses.");
  if(/aid|waiver|discount/i.test(record.issue_type))steps.push("Contact finaid@howard.edu about general financial aid and any missing action item.");
  if(/scholarship|balance|payment/i.test(record.issue_type))steps.push("Contact BursarHelp@howard.edu about pending scholarships, payments, plans, or account reconciliation.");
  if(/housing/i.test(`${record.issue_type} ${record.enrollment_status}`))steps.push("Contact hureslife@howard.edu immediately and request preservation or restoration of housing while the case is reviewed.");
  return steps;
}

function contacts(record:HowardPacketCase){
  const rows=[
    ["Howard Student Advocacy and Support","studentsupport@howard.edu | 202-238-2423"],
    ["Howard Student Financial Services","financialservices.howard.edu/contact"],
    ["BisonHub student information","bisonhub.howard.edu/bisonhub-information-students"],
    ["FERPA permission guidance","howard.edu/registrar/FERPA"]
  ];
  if(record.student_type==="Incoming first-year")rows.unshift(["Enrollment Management","enrollmentmanagement@howard.edu"]);
  else if(record.student_type==="Incoming transfer")rows.unshift(["Transfer Admissions","transfer@howard.edu"]);
  else rows.unshift(["Office of the Registrar","registrar@howard.edu"]);
  if(/aid|waiver|discount/i.test(record.issue_type))rows.push(["Financial Aid","finaid@howard.edu"]);
  if(/scholarship|balance|payment/i.test(record.issue_type))rows.push(["Office of the Bursar","BursarHelp@howard.edu | 855-490-2875"]);
  if(/housing/i.test(`${record.issue_type} ${record.enrollment_status}`))rows.push(["Residence Life","hureslife@howard.edu | 202-806-9045"]);
  return rows;
}

function issueAddendum(record:HowardPacketCase){
  if(/scholarship/i.test(record.issue_type))return {
    title:"Pending Scholarship Addendum",
    bullets:[
      "Keep the official award notice, scholarship-provider contact, amount, and expected disbursement date in your private records.",
      "Ask the scholarship provider to confirm where and when funds were or will be sent. Do not send private banking or tax information to EFF.",
      "Ask the Bursar to confirm receipt, anticipated posting, and whether the award can be considered during the enrollment review.",
      "Ask Financial Aid whether any action item must be completed before the outside award can be reflected."
    ]
  };
  if(/payment/i.test(record.issue_type))return {
    title:"Payment Plan Addendum",
    bullets:[
      "Save the plan enrollment confirmation, scheduled payment dates, completed-payment receipts, and current plan status.",
      "Ask the Bursar to confirm in writing whether the plan is active and what, if anything, remains incomplete.",
      "If the plan was accepted before courses were removed, include that date in every follow-up.",
      "Do not email full bank, debit-card, or account numbers."
    ]
  };
  if(/aid|waiver|discount/i.test(record.issue_type))return {
    title:"Financial Aid, Waiver, or Discount Addendum",
    bullets:[
      "Review BisonHub for incomplete tasks, holds, loan steps, and changes to the aid package.",
      "Keep notices showing accepted, pending, adjusted, or removed aid in your private evidence packet.",
      "Ask Financial Aid to identify the exact outstanding action and whether an individual review is available.",
      "If family financial circumstances changed, ask Howard whether its Special Circumstances process applies."
    ]
  };
  if(/housing/i.test(`${record.issue_type} ${record.enrollment_status}`))return {
    title:"Housing Protection Addendum",
    bullets:[
      "Save the original housing assignment, cancellation notice, deposit receipt, and move-in information.",
      "Tell Residence Life that enrollment review is pending and request written preservation or restoration of housing.",
      "Ask whether a temporary hold, equivalent placement, or waitlist priority is available while the review is active.",
      "Document any move-in deadline or immediate safety concern."
    ]
  };
  if(/class|course/i.test(`${record.issue_type} ${record.enrollment_status}`))return {
    title:"Course Restoration Addendum",
    bullets:[
      "Save the original schedule, current schedule, course section numbers, and the date each change appeared.",
      "Contact the appropriate adviser and Registrar about restoration or equivalent placement.",
      "Ask whether instructors should be notified while the enrollment review is pending.",
      "Request a written answer about seat preservation, waitlists, and missed academic activity."
    ]
  };
  return {
    title:"Enrollment Review Addendum",
    bullets:[
      "Keep the cancellation or status notice and a dated BisonHub screenshot.",
      "Ask for the name of the staff member reviewing the case and a written list of any remaining action.",
      "Request a written decision and deadline before seats, courses, or housing are reassigned.",
      "Continue checking BisonHub because a record may change before a separate email arrives."
    ]
  };
}

export async function createHowardAdvocacyPacket(record:HowardPacketCase){
  const pdf=await PDFDocument.create();
  pdf.setTitle(`EFF Keep Your Seat Advocacy Packet - ${record.case_code}`);
  pdf.setAuthor("Esther Funds Foundation");
  pdf.setSubject("Consent-based student enrollment advocacy packet");
  pdf.setKeywords(["Esther Funds Foundation","Howard University","student advocacy","enrollment"]);
  pdf.setCreationDate(new Date());
  const regular=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic=await pdf.embedFont(StandardFonts.HelveticaOblique);
  let logo:PDFImage|null=null;
  try{logo=await pdf.embedPng(await readFile(join(process.cwd(),"public","brand","eff-logo.png")));}catch{}
  const writer=new PacketWriter(pdf,regular,bold,italic,record.case_code,logo);
  const addendum=issueAddendum(record);

  writer.eyebrow("Personalized advocacy letter");
  writer.title("Urgent Enrollment Review and Reinstatement Request");
  writer.fact("Date",date(new Date().toISOString()));
  writer.fact("To","Howard University Enrollment Management and Student Support Team");
  writer.fact("Re",`${record.student_name} | EFF Case ${record.case_code} | Fall 2026`);
  writer.text("Esther Funds Foundation submits this student advocacy packet with the student's verified consent. The facts summarized here were reported by the student and are provided to support an organized, timely review.");
  writer.text(`${record.student_name} reports a current status of "${record.enrollment_status}" and identifies the primary issue as "${record.issue_type}." The student has documented steps already taken and information concerning pending aid, scholarships, waivers, discounts, payment arrangements, or account corrections.`);
  writer.callout("EFF'S REQUESTED RELIEF","Please complete an individualized review; restore or preserve admission, enrollment, courses, housing, and accepted or pending aid where appropriate; provide an itemized account reconciliation; identify any remaining student action; and communicate the written decision and deadline directly to the student.");
  writer.text("Please reply directly to the student with a Howard case number, the office or staff member responsible for the review, any remaining action, and the written outcome. Howard may require its own identity-verification or FERPA process before discussing protected education records with EFF.");
  writer.text("EFF is providing nonprofit educational advocacy. This packet is not legal representation, a financial guarantee, or an eligibility decision.");
  writer.signature();

  writer.newPage();
  writer.eyebrow("Student-reported case summary");
  writer.title("Your Case at a Glance");
  writer.callout("IMPORTANT","Review this summary before sharing it. If anything is inaccurate, reply to nationals@estherfundsinc.org with the correction and your case number. Never send passwords, verification codes, tax returns, full financial-account details, or unredacted student IDs.");
  writer.fact("Student",`${record.student_name} (${record.email})`);
  writer.fact("EFF case",record.case_code);
  writer.fact("Student type",record.student_type);
  writer.fact("Reported enrollment status",record.enrollment_status);
  writer.fact("Primary issue",record.issue_type);
  writer.fact("Balance previously shown",amount(record.balance_before));
  writer.fact("Balance currently shown",amount(record.balance_now));
  writer.fact("Deadline communicated",record.school_deadline||"Not provided");
  writer.section("Pending aid or account information");
  writer.text(record.aid_summary);
  writer.section("Factual timeline");
  writer.text(record.timeline);
  writer.section("Steps already taken");
  writer.text(record.steps_taken);

  writer.newPage();
  writer.eyebrow("Personalized navigation");
  writer.title("Your 24-72 Hour Action Plan");
  for(const step of actionSteps(record))writer.bullet(step);
  writer.section("Howard Contact Map");
  for(const [label,value] of contacts(record))writer.fact(label,value);
  writer.section("Your Evidence Checklist");
  for(const item of [
    "Dated BisonHub screenshots showing enrollment, courses, holds, tasks, aid, housing, and balance.",
    "Admission or enrollment-status notices and every communicated deadline.",
    "Original and current class schedules and housing assignment information.",
    "Aid, scholarship, waiver, discount, or payment-plan confirmations.",
    "A chronological contact log with names, offices, case numbers, and instructions.",
    "A redacted copy of any written decision or requested follow-up."
  ])writer.bullet(`[ ] ${item}`);

  writer.newPage();
  writer.eyebrow("Issue-specific support");
  writer.title(addendum.title);
  for(const bullet of addendum.bullets)writer.bullet(bullet);
  writer.section("Phone or Virtual Queue Script");
  writer.text(`Hello, my name is ${record.student_name}. I am calling about my Fall 2026 enrollment review. My primary issue is ${record.issue_type.toLowerCase()}, and my current portal status is ${record.enrollment_status.toLowerCase()}. Esther Funds Foundation case ${record.case_code} helped me organize my request. Please confirm the Howard case number, the staff member or office responsible, any remaining action I must take, and the date I should expect a written decision.`);
  writer.section("Follow-Up Email Template");
  writer.text(`Subject: Follow-up on Fall 2026 enrollment review - ${record.student_name}`);
  writer.text(`Hello,\n\nI am following up on my Fall 2026 enrollment review. My current issue is ${record.issue_type.toLowerCase()}, and BisonHub currently shows ${record.enrollment_status.toLowerCase()}.\n\nPlease confirm:\n1. My Howard case number and the office or staff member reviewing it;\n2. Any remaining action I must complete;\n3. Whether my admission, courses, housing, and pending aid are being preserved during review; and\n4. The date I should expect a written decision.\n\nEFF advocacy case: ${record.case_code}\n\nThank you,\n${record.student_name}`);
  writer.newPage();
  writer.eyebrow("Document every update");
  writer.title("Student Progress Log");
  writer.text("Use this page during calls, virtual queues, and follow-up. Keep confirmation numbers and private documents in your own secure records.");
  for(const label of ["Date / time","Office / staff member","Howard case number","What changed in BisonHub","Required action and deadline","Next follow-up date"])writer.fact(label,"____________________________________________________________");
  writer.callout("PRIVACY RULE","Keep full records in your private files. Share only what the receiving office needs through a secure method. Do not send sensitive financial, tax, identity, medical, or authentication information to EFF by ordinary email.");

  writer.newPage();
  writer.eyebrow("Formal case participation verification");
  writer.title("EFF Student Advocacy and Case Verification Letter");
  writer.fact("Date",date(new Date().toISOString()));
  writer.fact("Student",record.student_name);
  writer.fact("EFF case",record.case_code);
  writer.text("To Whom It May Concern:");
  writer.text(`Esther Funds Foundation confirms that ${record.student_name} opened Howard Help Desk case ${record.case_code}, verified the associated email address, authorized EFF educational advocacy, and submitted a factual account of the enrollment issue and steps taken.`);
  if(record.advocacy_email_sent_at)writer.text(`EFF transmitted an advocacy request concerning this case on ${date(record.advocacy_email_sent_at)} and provided the student with an organized action plan for continued follow-up.`);
  else writer.text("EFF is assisting the student with an organized action plan and a request for timely institutional review.");
  writer.text("This letter verifies participation in EFF's advocacy process only. It is not a character recommendation and does not independently verify the student's enrollment, account balance, financial aid, scholarship status, eligibility, or entitlement to a particular outcome.");
  writer.text("EFF respectfully asks institutions and education partners to communicate clear requirements and deadlines directly to the student and to provide a fair, timely, written review of the student's documented circumstances.");
  writer.signature();
  writer.callout("STUDENT USE","You may share this verification letter when an adviser, scholarship provider, housing office, employer, or other appropriate party needs confirmation that you are actively pursuing resolution. Share the full packet only when necessary.");

  writer.finish();
  return pdf.save();
}
