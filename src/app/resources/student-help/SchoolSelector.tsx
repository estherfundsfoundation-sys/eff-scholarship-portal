"use client";
import {useEffect,useRef,useState} from "react";
import {CheckCircle2,Search} from "lucide-react";

type School={unitid:number;name:string;aliases:string|null;city:string;state:string;hbcu:boolean;website:string|null;admissions_url:string|null;financial_aid_url:string|null;veterans_url:string|null;accessibility_url:string|null};
const states=["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export function SchoolSelector(){
  const [query,setQuery]=useState("");const [schools,setSchools]=useState<School[]>([]);const [selected,setSelected]=useState<School|null>(null);const [loading,setLoading]=useState(false);const [manual,setManual]=useState(false);const request=useRef(0);
  useEffect(()=>{if(selected||manual||query.trim().length<2){setSchools([]);return;}const timer=setTimeout(async()=>{const id=++request.current;setLoading(true);try{const response=await fetch(`/api/college-directory?q=${encodeURIComponent(query.trim())}`);const json=await response.json();if(id===request.current)setSchools(json.schools??[]);}finally{if(id===request.current)setLoading(false);}},250);return()=>clearTimeout(timer);},[query,selected,manual]);
  const choose=(school:School)=>{setSelected(school);setQuery(school.name);setSchools([]);};
  const reset=()=>{setSelected(null);setQuery("");setManual(false);setSchools([]);};
  return <fieldset className="school-selector"><legend>College or university</legend>
    {!manual&&<div className="school-search-wrap"><label className="full-field">Search the official U.S. college directory<div className="school-search-input"><Search size={18}/><input value={query} onChange={e=>{setSelected(null);setQuery(e.target.value)}} required={!selected} autoComplete="off" placeholder="Start typing the school’s name" role="combobox" aria-expanded={schools.length>0} aria-controls="college-directory-results" aria-autocomplete="list"/></div></label>
      {loading&&<small>Searching 6,000+ official institutions…</small>}
      {schools.length>0&&<div className="school-results" id="college-directory-results" role="listbox">{schools.map(s=><button type="button" role="option" aria-selected={false} key={s.unitid} onClick={()=>choose(s)}><strong>{s.name}</strong><span>{s.city}, {s.state}{s.hbcu?" · HBCU":""}</span></button>)}</div>}
      {selected&&<div className="school-selected"><CheckCircle2/><div><strong>{selected.name}</strong><span>{selected.city}, {selected.state} · {selected.hbcu?"HBCU":"U.S. college"} · NCES {selected.unitid}</span><small>{[selected.admissions_url&&"Admissions",selected.financial_aid_url&&"Financial aid",selected.veterans_url&&"Veterans",selected.accessibility_url&&"Accessibility"].filter(Boolean).join(" · ")} official routes available</small></div><button type="button" onClick={reset}>Change</button></div>}
      {!selected&&query.length>=2&&!loading&&schools.length===0&&<button type="button" className="card-link" onClick={()=>setManual(true)}>My school is not listed—enter it manually</button>}
    </div>}
    {manual&&<div className="form-grid"><label className="full-field">College name<input name="schoolName" required maxLength={180}/></label><label>School state<select name="schoolState" required defaultValue=""><option value="" disabled>Select</option>{states.map(s=><option key={s}>{s}</option>)}</select></label><label>Institution type<select name="schoolType" required defaultValue="Unsure"><option>HBCU</option><option>PWI or other institution</option><option>Unsure</option></select></label><button type="button" className="card-link" onClick={reset}>Return to directory search</button></div>}
    {selected&&<><input type="hidden" name="collegeUnitid" value={selected.unitid}/><input type="hidden" name="schoolName" value={selected.name}/><input type="hidden" name="schoolState" value={selected.state}/><input type="hidden" name="schoolType" value={selected.hbcu?"HBCU":"PWI or other institution"}/></>}
  </fieldset>;
}
