export const academicFields = [
  "Accounting", "Agriculture & Food Systems", "Architecture & Planning", "Art & Design", "Biological Sciences",
  "Business & Entrepreneurship", "Communications & Media", "Computer Science & Information Technology", "Criminal Justice",
  "Education", "Engineering", "English, Writing & Publishing", "Environmental Science", "Finance & Economics",
  "Healthcare & Allied Health", "History & Humanities", "Hospitality & Tourism", "Human Services", "Law & Pre-Law",
  "Mathematics & Statistics", "Nursing", "Political Science & Public Policy", "Psychology", "Public Health",
  "Social Work", "Sociology", "STEM — Interdisciplinary", "Trades & Vocational Studies", "Undecided"
] as const;

export const careerFields = [
  "Accounting & Audit", "Arts, Culture & Design", "Business & Entrepreneurship", "Communications, Media & Public Relations",
  "Education & Student Affairs", "Engineering & Manufacturing", "Finance & Banking", "Government & Public Policy",
  "Healthcare & Medicine", "Hospitality & Events", "Human Resources", "Law & Legal Services", "Nonprofit & Community Impact",
  "Research & Academia", "Science & Environment", "Social Services & Counseling", "Technology & Data", "Trades & Skilled Careers"
] as const;

export const supportTopics = [
  "Academic confidence", "Career exploration", "College transition", "Graduate school", "Internships",
  "Leadership development", "Networking", "Professional communication", "Scholarships & financial aid",
  "Study habits & time management", "Transfer student support", "First-generation college support", "Faith & purpose",
  "Work-life balance", "Resume & interview preparation"
] as const;

export const experienceTags = [
  "First-generation student", "Transfer student", "Student parent", "Student with a disability", "Commuter student",
  "International student", "HBCU experience", "Community college experience", "Graduate school experience",
  "Working while enrolled", "Financial-aid navigation"
] as const;

export const meetingFormats = ["Virtual", "In person", "Either"] as const;
export const communicationStyles = ["Email", "Phone", "Text", "Video call", "In-app messages"] as const;
export const meetingCadences = ["Weekly", "Every other week", "Monthly"] as const;
export const timezones = ["Eastern", "Central", "Mountain", "Pacific", "Alaska", "Hawaii"] as const;

export type FutureLinkProfile = {
  user_id:string; display_name:string; participant_type:string; status:string; school:string|null; degree_level:string|null;
  academic_field:string|null; career_fields:string[]|null; industries:string[]|null; support_needed:string[]|null;
  support_offered:string[]|null; experience_tags:string[]|null; timezone:string|null; meeting_format:string|null;
  communication_styles:string[]|null; meeting_cadence:string|null; availability:string[]|null; mentor_capacity:number|null;
};

const overlap=(left:string[]|null|undefined,right:string[]|null|undefined)=>{
  const wanted=new Set((left??[]).map(value=>value.toLowerCase()));
  return (right??[]).filter(value=>wanted.has(value.toLowerCase()));
};

/** Deterministic, explainable compatibility scoring. Verification is enforced before this is called. */
export function scoreFutureLinkMatch(mentee:FutureLinkProfile,mentor:FutureLinkProfile){
  let score=0; const reasons:string[]=[];
  const needExpertise=overlap(mentee.support_needed,mentor.support_offered);
  if(needExpertise.length){score+=Math.min(30,18+needExpertise.length*4);reasons.push(`Support fit: ${needExpertise.slice(0,2).join(", ")}`);}
  const careers=overlap(mentee.career_fields,mentor.career_fields);
  if(careers.length){score+=Math.min(20,12+careers.length*4);reasons.push(`Career alignment: ${careers.slice(0,2).join(", ")}`);}
  if(mentee.academic_field&&mentor.academic_field&&mentee.academic_field===mentor.academic_field){score+=15;reasons.push(`Shared academic field: ${mentee.academic_field}`);}
  const lived=overlap(mentee.experience_tags,mentor.experience_tags);
  if(lived.length){score+=Math.min(12,6+lived.length*3);reasons.push(`Shared experience: ${lived.slice(0,2).join(", ")}`);}
  const availability=overlap(mentee.availability,mentor.availability);
  if(availability.length){score+=10;reasons.push("Compatible availability");}
  if(mentee.timezone&&mentor.timezone&&mentee.timezone===mentor.timezone){score+=5;reasons.push("Same time zone");}
  if(mentee.meeting_format&&mentor.meeting_format&&(mentee.meeting_format===mentor.meeting_format||mentee.meeting_format==="Either"||mentor.meeting_format==="Either")){score+=4;}
  if(overlap(mentee.communication_styles,mentor.communication_styles).length){score+=3;}
  if(mentee.meeting_cadence&&mentor.meeting_cadence&&mentee.meeting_cadence===mentor.meeting_cadence){score+=1;}
  return {score:Math.min(100,score),reasons};
}

export const futureLinkAgreementVersion="2026.09";
export const futureLinkCodeVersion="2026.09";
