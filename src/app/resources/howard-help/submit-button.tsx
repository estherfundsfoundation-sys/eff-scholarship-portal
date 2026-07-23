"use client";

import {LoaderCircle,MailCheck} from "lucide-react";
import {useFormStatus} from "react-dom";

export function HowardCaseSubmitButton(){
  const {pending}=useFormStatus();

  return <div className="howard-submit-wrap" aria-live="polite">
    <button className="button" type="submit" disabled={pending} aria-disabled={pending}>
      {pending?<><LoaderCircle className="howard-submit-spinner" size={18}/> Saving your case and emailing confirmation…</>:<><MailCheck size={18}/> Submit case and email me</>}
    </button>
    {pending&&<p className="muted">Please keep this page open. This can take several seconds while we securely save your case and send your email.</p>}
  </div>;
}
