import Link from "next/link";
import { requireAdmin } from "@/lib/auth/staff";
import { deleteDraftOnlyAccount } from "./actions";

type App = {
  id: string;
  status: string;
  submitted_at: string | null;
  program_cycles: { programs: { name: string } };
};

export default async function Applicants({ searchParams }: { searchParams: Promise<{ q?: string; message?: string }> }) {
  const { q, message } = await searchParams;
  const { supabase, roles } = await requireAdmin();
  const isSuperAdmin = roles.some((item) => item.role === "super_admin");
  let query = supabase
    .from("profiles")
    .select("id,legal_name,preferred_name,primary_email,phone,institution,degree_level,major,created_at,applications(id,status,submitted_at,program_cycles(name,programs(name))),user_roles!user_roles_user_id_fkey(role)")
    .order("created_at", { ascending: false })
    .limit(250);
  if (q) query = query.or(`legal_name.ilike.%${q.replace(/[%_,()]/g, "")}%,primary_email.ilike.%${q.replace(/[%_,()]/g, "")}%,institution.ilike.%${q.replace(/[%_,()]/g, "")}%`);
  const { data: profiles } = await query;

  return <main className="section white"><div className="shell">
    <Link className="card-link" href="/admin">← Command center</Link>
    <div className="section-head"><div><div className="eyebrow">Restricted applicant directory</div><h2>Applicants</h2></div><form className="admin-filter"><input name="q" defaultValue={q} placeholder="Name, email, or school"/><button className="button">Search</button></form></div>
    {message && <p className="notice notice--success">{message}</p>}
    <div className="table-wrap"><table><thead><tr><th>Applicant</th><th>Education</th><th>Applications</th><th>Joined</th><th>Privacy actions</th></tr></thead><tbody>
      {profiles?.map((profile) => {
        const apps = (profile.applications as unknown as App[]) ?? [];
        const hasStaffRole = ((profile.user_roles as unknown as Array<{ role: string }>) ?? []).length > 0;
        const draftOnly = apps.every((app) => app.status === "draft" && !app.submitted_at);
        return <tr key={profile.id}>
          <td><strong>{profile.legal_name ?? "Profile incomplete"}</strong><br/><small>{profile.primary_email}<br/>{profile.phone}</small></td>
          <td>{profile.institution}<br/><small>{profile.degree_level} · {profile.major}</small></td>
          <td>{apps.map((app) => <p key={app.id}><Link className="card-link" href={`/admin/applications/${app.id}`}>{app.program_cycles?.programs?.name}</Link><br/><small>{app.status.replaceAll("_", " ")}</small></p>)}</td>
          <td>{new Date(profile.created_at).toLocaleDateString()}</td>
          <td>{isSuperAdmin && draftOnly && !hasStaffRole ? <details><summary>Delete draft-only account</summary><p className="muted">Use only after the student confirms permanent deletion from the account email. Submitted records require retention review.</p><form action={deleteDraftOnlyAccount} className="stack"><input type="hidden" name="user_id" value={profile.id}/><input name="email_confirmation" type="email" required placeholder="Confirm account email"/><input name="confirmation" required pattern="DELETE ACCOUNT" placeholder="Type DELETE ACCOUNT" autoComplete="off"/><button className="button outline">Delete account permanently</button></form></details> : <small>{hasStaffRole ? "Staff account protected" : draftOnly ? "Super-admin only" : "Retention review required"}</small>}</td>
        </tr>;
      })}
    </tbody></table></div>
  </div></main>;
}
