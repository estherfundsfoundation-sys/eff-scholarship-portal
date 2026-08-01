"use client";

import {useEffect,useState} from "react";

const checkboxes=()=>Array.from(document.querySelectorAll<HTMLInputElement>('input[name="application_ids"]'));

export function BulkSelectionControls({count}:{count:number}){
  const [selected,setSelected]=useState(0);
  const [action,setAction]=useState("");
  useEffect(()=>{
    const update=()=>setSelected(checkboxes().filter(item=>item.checked).length);
    document.addEventListener("change",update);
    update();
    return()=>document.removeEventListener("change",update);
  },[]);
  const setAll=(checked:boolean)=>{checkboxes().forEach(item=>{item.checked=checked});setSelected(checked?count:0)};
  const destructive=action==="approved"||action==="denied";
  return <div className="bulk-review-panel">
    <div className="bulk-selection-bar">
      <strong>{selected} selected</strong>
      <button className="button outline" type="button" onClick={()=>setAll(true)}>Select all {count} displayed</button>
      <button className="button outline" type="button" onClick={()=>setAll(false)}>Clear</button>
    </div>
    <div className="bulk-review-fields">
      <label>Action
        <select name="new_status" required value={action} onChange={event=>setAction(event.target.value)}>
          <option value="" disabled>Choose an action</option>
          <option value="review_by_admin">Start review</option>
          <option value="additional_information_needed">Request the same correction</option>
          <option value="approved">Approve and send acceptance letter</option>
          <option value="denied">Deny and send decision notice</option>
          <option value="archived">Archive completed records</option>
        </select>
      </label>
      <label>Private internal reason
        <textarea name="reason" required rows={3} placeholder="Why this batch action is appropriate (never shown to students)"/>
      </label>
      <label>{action==="additional_information_needed"?"Correction or upload request":"Message to students"}
        <textarea name="applicant_note" required={action==="additional_information_needed"||action==="denied"} rows={3} placeholder={action==="additional_information_needed"?"Exactly what each selected student needs to correct or upload":"Clear, compassionate message shown in each student portal"}/>
      </label>
      {action==="additional_information_needed"&&<label>Response deadline (optional)<input name="due_at" type="datetime-local"/></label>}
      {destructive&&<label className="bulk-confirmation">Type {action==="approved"?"APPROVE":"DENY"} to confirm
        <input name="confirmation" autoComplete="off" required placeholder={action==="approved"?"APPROVE":"DENY"}/>
      </label>}
      <button className="button" disabled={!selected}>{selected?`Apply to ${selected} selected`:"Select applications first"}</button>
    </div>
    <p className="muted">Every successful change is audited. Student messages are queued once through the protected email system.</p>
  </div>;
}
