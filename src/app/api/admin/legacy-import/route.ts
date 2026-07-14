import {createHash} from "node:crypto";
import {NextRequest, NextResponse} from "next/server";
import {z} from "zod";
import {createAdminClient} from "@/lib/supabase/admin";

const rowSchema = z.object({
  rowNumber: z.number().int().min(2),
  sourceRecordId: z.string().min(1).max(200),
  email: z.string().email(),
  submittedAt: z.string().nullable(),
  raw: z.record(z.string(), z.unknown()),
  normalized: z.record(z.string(), z.string()),
  status: z.enum(["committed", "excluded", "error"]),
  exclusionReason: z.string().max(500).nullable(),
  errors: z.array(z.string().max(500)).max(10),
});
const bodySchema = z.object({fileHash: z.string().length(64), rows: z.array(rowSchema).min(1).max(250), finalBatch: z.boolean().default(false)});

export async function POST(request: NextRequest) {
  if (!process.env.LEGACY_IMPORT_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.LEGACY_IMPORT_SECRET}`) return NextResponse.json({error: "Unauthorized"}, {status: 401});
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({error: "Invalid import batch", issues: parsed.error.issues.map(issue => issue.path.join("."))}, {status: 400});
  const db = createAdminClient();
  let job = await db.from("import_jobs").select("id,status").eq("file_hash", parsed.data.fileHash).maybeSingle();
  if (!job.data) {
    const program = await db.from("programs").select("id").eq("slug", "name-your-need").single();
    const created = await db.from("import_jobs").insert({program_id: program.data!.id, file_hash: parsed.data.fileHash, mapping: {version: 2, source: "EFF supplied XLSX"}, status: "staged", created_by: null}).select("id,status").single();
    if (created.error) return NextResponse.json({error: "Could not create import job"}, {status: 500});
    job = created;
  }
  const importRows = parsed.data.rows.map(row => ({job_id: job.data!.id, row_number: row.rowNumber, raw_data: row.raw, normalized_data: row.normalized, action: row.status === "committed" ? "commit" : "exclude", errors: row.errors}));
  const staged = await db.from("import_rows").upsert(importRows, {onConflict: "job_id,row_number"});
  if (staged.error) return NextResponse.json({error: "Batch staging failed"}, {status: 500});
  const records = parsed.data.rows.map(row => ({source_system: "name_your_need_legacy_2026", source_record_id: row.sourceRecordId, email: row.email, original_submitted_at: row.submittedAt || null, raw_data: row.raw, normalized_data: row.normalized, status: row.status, exclusion_reason: row.exclusionReason, import_job_id: job.data!.id, updated_at: new Date().toISOString()}));
  const upsert = await db.from("legacy_application_records").upsert(records, {onConflict: "source_system,source_record_id"});
  if (upsert.error) return NextResponse.json({error: "Batch import failed"}, {status: 500});
  if (parsed.data.finalBatch) await db.from("import_jobs").update({status: "committed", committed_at: new Date().toISOString()}).eq("id", job.data!.id);
  return NextResponse.json({ok: true, accepted: records.length, jobId: job.data!.id, checksum: createHash("sha256").update(records.map(row => row.source_record_id).join("|")).digest("hex").slice(0, 12)});
}
