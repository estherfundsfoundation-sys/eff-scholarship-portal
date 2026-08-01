"use client";

export function PrintLetterButton(){
  return <button className="button" type="button" onClick={()=>window.print()}>Print or save as PDF</button>;
}
