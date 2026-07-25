"use client";
import {useFormStatus} from "react-dom";
export function StudentHelpSubmitButton(){const {pending}=useFormStatus();return <button className="button" disabled={pending}>{pending?"Opening your secure case…":"Open my EFF case"}</button>}
