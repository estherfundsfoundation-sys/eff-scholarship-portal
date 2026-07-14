import Link from "next/link";
import {requireStaff} from "@/lib/auth/staff";

export default async function Reports() {
  await requireStaff();
  return (
    <main className="section white">
      <div className="shell" style={{maxWidth: 900}}>
        <Link href="/admin" className="card-link">← Command center</Link>
        <div className="eyebrow">Permission-scoped exports</div>
        <h2>Reports</h2>
        <p className="muted">Exports contain personal information. Download only for authorized EFF work and store them securely.</p>
        <div className="cards" style={{marginTop: 24}}>
          <Link className="card" href="/api/admin/export/applications">
            <h3>Applications</h3>
            <p>Applicant, program, cycle, status, submission date, school, and requested amount.</p>
            <span className="button">Download CSV</span>
          </Link>
          <Link className="card" href="/api/admin/export/importer-runs">
            <h3>Importer runs</h3>
            <p>Source, run status, counts, safe error, and run times.</p>
            <span className="button">Download CSV</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
