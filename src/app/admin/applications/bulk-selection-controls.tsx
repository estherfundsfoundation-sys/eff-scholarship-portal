"use client";

const checkboxes=()=>Array.from(document.querySelectorAll<HTMLInputElement>('input[name="application_ids"]'));

export function BulkSelectionControls({count}:{count:number}){
  return <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginBottom:14}}>
    <button className="button outline" type="button" onClick={()=>checkboxes().forEach(item=>item.checked=true)}>Select all {count} displayed</button>
    <button className="button outline" type="button" onClick={()=>checkboxes().forEach(item=>item.checked=false)}>Clear selection</button>
    <span className="muted">Only checked applications will be updated.</span>
  </div>;
}
