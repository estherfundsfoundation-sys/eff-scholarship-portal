import{readFileSync}from"node:fs";import{resolve}from"node:path";import{describe,expect,it}from"vitest";

type Row={title:string;deadline:string;canonical_url:string;institution_unitid:number;eligibility:{institutions?:string[]};source_record_key:string};
const sql=readFileSync(resolve(process.cwd(),"supabase/migrations/20260819230000_official_university_scholarships.sql"),"utf8");
const payload=sql.match(/jsonb_to_recordset\(\$eff\$(\[[^]*?\])\$eff\$/)?.[1];
if(!payload)throw new Error("Official university scholarship migration payload is missing");
const rows=JSON.parse(payload)as Row[];

describe("official university scholarship migration",()=>{
  it("contains a large individually linked catalog",()=>{expect(rows.length).toBeGreaterThanOrEqual(2700);expect(new Set(rows.map(row=>row.canonical_url)).size).toBe(rows.length);expect(new Set(rows.map(row=>row.source_record_key)).size).toBe(rows.length);});
  it("contains only opportunities that were future-dated when the catalog was generated",()=>{const catalogGeneratedOn="2026-08-19";for(const row of rows){expect(row.deadline>catalogGeneratedOn).toBe(true);expect(row.canonical_url).toMatch(/^https:\/\/[a-z0-9-]+\.academicworks\.com\/opportunities\/\d+$/);expect(row.title.trim().length).toBeGreaterThan(2);}});
  it("keeps institution restrictions for explainable matching",()=>{for(const row of rows){expect(Number.isInteger(row.institution_unitid)).toBe(true);expect(row.institution_unitid).toBeGreaterThan(0);expect(row.eligibility.institutions?.length).toBe(1);}});
});
