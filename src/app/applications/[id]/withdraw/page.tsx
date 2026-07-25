import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {withdrawApplication} from "../actions";

const withdrawableStatuses=new Set(["draft","applied","review_by_admin","additional_information_needed"]);

export default async function WithdrawApplicationPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:application}=await supabase
    .from("applications")
    .select("id,status,program_cycles(name,programs(name))")
    .eq("id",id)
    .maybeSingle();

  if(!application)notFound();
  if(!withdrawableStatuses.has(application.status))redirect(`/applications/${encodeURIComponent(id)}`);

  const cycle=application.program_cycles as unknown as {name:string;programs:{name:string}}|null;
  const programName=cycle?.programs?.name??"EFF application";

  return <main className="section"><div className="shell" style={{maxWidth:640}}>
    <Link className="card-link" href={`/applications/${id}`}>← Return to application</Link>
    <section className="card" style={{marginTop:18}}>
      <div className="eyebrow">Final confirmation</div>
      <h2>Withdraw {programName}?</h2>
      <div className="notice">
        <strong>This will stop consideration of this application.</strong><br/>
        The application and its status history will remain in EFF&apos;s audited records. If you withdraw by mistake, contact EFF for help.
      </div>
      <form action={withdrawApplication} className="stack">
        <input type="hidden" name="application_id" value={id}/>
        <label>Reason (optional)<textarea name="reason" rows={3}/></label>
        <label className="check">
          <input type="checkbox" name="warning_confirmed" value="yes" required/>
          <span>I understand that this application will no longer be considered.</span>
        </label>
        <label>Type <strong>WITHDRAW</strong> to confirm
          <input name="confirmation" required pattern="WITHDRAW" autoComplete="off"/>
        </label>
        <button className="button outline" type="submit">Withdraw application</button>
      </form>
    </section>
  </div></main>;
}
