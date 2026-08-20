export type MatchProfile={
  academic_level?:string|null;graduation_year?:number|null;fields_of_study?:string[]|null;
  state_code?:string|null;country_code?:string|null;institution_name?:string|null;gpa_band?:string|null;
  enrollment_type?:string|null;citizenship_categories?:string[]|null;identity_tags?:string[]|null;
  affiliation_tags?:string[]|null;support_needs?:string[]|null;
};
export type ScholarshipForMatch={id:string;slug:string;title:string;sponsor?:string|null;summary?:string|null;amount_text?:string|null;amount_numeric?:number|null;deadline_kind:string;deadline?:string|null;eligibility?:Record<string,unknown>|null};
export type ScholarshipMatch={scholarship:ScholarshipForMatch;score:number;confidence:"strong"|"possible"|"broad";reasons:string[];cautions:string[]};

const list=(value:unknown)=>Array.isArray(value)?value.map(String).map(v=>v.toLowerCase().trim()).filter(Boolean):[];
const norm=(value:unknown)=>String(value??"").toLowerCase().trim();
const overlaps=(a:string[]|null|undefined,b:string[])=>{const left=(a??[]).map(norm);return b.some(item=>left.some(value=>value===item||value.includes(item)||item.includes(value)));};
const gpaFloor=(band:string|null|undefined)=>({"below-2.0":1.9,"2.0-2.49":2,"2.5-2.99":2.5,"3.0-3.49":3,"3.5-4.0":3.5}[String(band)]??null);

export function scoreScholarship(profile:MatchProfile,scholarship:ScholarshipForMatch):ScholarshipMatch{
  const e=scholarship.eligibility??{};let score=20;const reasons:string[]=[];const cautions:string[]=[];
  const levels=list(e.academic_levels??e.levels);if(levels.length){if(profile.academic_level&&overlaps([profile.academic_level],levels)){score+=22;reasons.push(`Academic level matches: ${profile.academic_level}.`);}else if(profile.academic_level){score-=45;cautions.push("The listed academic level may not match your profile.");}else cautions.push("Add your academic level to confirm this requirement.");}
  const states=list(e.states??e.residency_states);if(states.length){const state=norm(profile.state_code);if(state&&states.includes(state)){score+=18;reasons.push(`Available to students connected with ${profile.state_code}.`);}else if(state){score-=35;cautions.push("The published residency requirement may not match your state.");}else cautions.push("Add your state to check residency requirements.");}
  const countries=list(e.countries);if(countries.length){const country=norm(profile.country_code||"US");if(countries.includes(country)){score+=12;reasons.push("Country requirement matches your profile.");}else{score-=40;cautions.push("The country requirement may not match your profile.");}}
  const majors=list(e.majors??e.fields_of_study);if(majors.length){if(overlaps(profile.fields_of_study,majors)){score+=20;reasons.push("Your field of study matches a listed field.");}else if(profile.fields_of_study?.length){score-=22;cautions.push("Your saved field of study is not among the listed fields.");}else cautions.push("Add your field of study to confirm this requirement.");}
  const institutions=list(e.institutions);if(institutions.length){if(profile.institution_name&&overlaps([profile.institution_name],institutions)){score+=24;reasons.push("Your institution is specifically listed.");}else if(profile.institution_name){score-=35;cautions.push("This opportunity may be limited to other institutions.");}}
  const identities=list(e.identity_tags??e.demographics);if(identities.length){if(overlaps(profile.identity_tags,identities)){score+=14;reasons.push("An optional identity criterion matches your profile.");}else cautions.push("Review the provider's identity eligibility requirement.");}
  const affiliations=list(e.affiliations);if(affiliations.length&&overlaps(profile.affiliation_tags,affiliations)){score+=12;reasons.push("An affiliation criterion matches your profile.");}
  const minGpa=Number(e.minimum_gpa??e.min_gpa);const floor=gpaFloor(profile.gpa_band);if(Number.isFinite(minGpa)){if(floor!==null&&floor>=minGpa){score+=10;reasons.push(`Your GPA range appears to meet the ${minGpa.toFixed(1)} minimum.`);}else cautions.push(`Provider lists a minimum GPA of ${minGpa.toFixed(1)}; confirm your exact GPA.`);}
  if(scholarship.deadline){const days=Math.ceil((new Date(`${scholarship.deadline}T23:59:59Z`).getTime()-Date.now())/86400000);if(days>=0&&days<=30){score+=8;reasons.push(`Deadline is approaching in about ${days} day${days===1?"":"s"}.`);}}
  if(!levels.length&&!states.length&&!majors.length&&!institutions.length)cautions.push("Provider eligibility details are incomplete; review the official page carefully.");
  score=Math.max(0,Math.min(100,score));const confidence=score>=70&&cautions.length<=1?"strong":score>=40?"possible":"broad";
  return{scholarship,score,confidence,reasons:reasons.length?reasons:["This is a broadly available opportunity worth reviewing."],cautions};
}

export function rankScholarships(profile:MatchProfile,scholarships:ScholarshipForMatch[],limit=50){return scholarships.map(item=>scoreScholarship(profile,item)).filter(item=>item.score>=20).sort((a,b)=>b.score-a.score||(a.scholarship.deadline??"9999").localeCompare(b.scholarship.deadline??"9999")).slice(0,limit);}
