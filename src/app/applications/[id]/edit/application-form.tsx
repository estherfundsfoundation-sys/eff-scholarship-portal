"use client";

import {createBrowserClient} from "@supabase/ssr";
import {useRef,useState,type FormEvent,type ReactNode} from "react";
import {saveApplication} from "./actions";

const allowedTypes=new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
const uploadKinds=["headshot","enrollment_proof","financial_need_proof","supporting_document"];

export function ApplicationForm({applicationId,children}:{applicationId:string;children:ReactNode}){
  const bypassUpload=useRef(false);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState("");

  async function prepareSubmission(event:FormEvent<HTMLFormElement>){
    if(bypassUpload.current){bypassUpload.current=false;return}
    const form=event.currentTarget;
    const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
    const files=uploadKinds.flatMap(kind=>{
      const input=form.elements.namedItem(kind) as HTMLInputElement|null;
      const file=input?.files?.[0];
      return file?[{kind,input:input!,file}]:[];
    });
    if(!files.length)return;

    event.preventDefault();
    setError("");
    setUploading(true);
    try{
      for(const {file} of files){
        if(file.size>10485760)throw new Error(`${file.name} exceeds the 10 MB limit.`);
        if(!allowedTypes.has(file.type))throw new Error(`${file.name} must be a PDF, JPG, PNG, or WebP file.`);
      }
      const supabase=createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const {data:{user},error:userError}=await supabase.auth.getUser();
      if(userError||!user)throw new Error("Your session expired. Please sign in again before uploading.");

      for(const {kind,input,file} of files){
        const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
        const path=`${user.id}/${applicationId}/${kind}/${crypto.randomUUID()}-${safeName}`;
        const uploaded=await supabase.storage.from("application-documents").upload(path,file,{contentType:file.type,upsert:false});
        if(uploaded.error)throw new Error(`Could not upload ${file.name}. Please retry.`);
        const attached=await supabase.from("documents").insert({application_id:applicationId,owner_id:user.id,storage_path:path,kind,filename:file.name,content_type:file.type,size_bytes:file.size});
        if(attached.error){
          await supabase.storage.from("application-documents").remove([path]);
          throw new Error(`Could not attach ${file.name}. Please retry.`);
        }
        input.value="";
      }

      // The upload state change can replace the original button before the
      // browser resumes submission. Passing that detached button to
      // requestSubmit crashes the page in some browsers, so preserve the
      // intended action with a hidden field and resume without a submitter.
      form.querySelector<HTMLInputElement>('input[data-upload-intent="true"]')?.remove();
      const intent=document.createElement("input");
      intent.type="hidden";
      intent.name="intent";
      intent.value=submitter?.value??"save";
      intent.dataset.uploadIntent="true";
      form.appendChild(intent);
      bypassUpload.current=true;
      form.requestSubmit();
    }catch(cause){
      setError(cause instanceof Error?cause.message:"Your documents could not be uploaded. Please retry.");
    }finally{
      setUploading(false);
    }
  }

  return <form action={saveApplication} className="application-form" onSubmit={prepareSubmission}>
    {error&&<div className="notice" role="alert"><strong>Upload not completed.</strong><br/>{error} Your saved answers remain safe.</div>}
    {uploading&&<div className="notice" role="status"><strong>Securely uploading your documents…</strong><br/>Keep this page open. Submission will continue automatically.</div>}
    <input type="hidden" name="application_id" value={applicationId}/>
    {children}
  </form>;
}
