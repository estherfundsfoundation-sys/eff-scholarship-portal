import {readFile} from "node:fs/promises";
import path from "node:path";
import {requireReachAmbassador} from "@/lib/reach/ambassador";
import {buildReachAcceptanceLetter} from "@/lib/reach/acceptance-letter";

export const dynamic = "force-dynamic";

export async function GET() {
  const {ambassador} = await requireReachAmbassador("/reach/ambassador/acceptance-letter");
  if (!ambassador) return new Response("Ambassador access required.", {status: 403});
  let logoBytes: Uint8Array | undefined;
  try {
    logoBytes = new Uint8Array(await readFile(path.join(process.cwd(), "public", "brand", "eff-logo.png")));
  } catch {}
  const bytes = await buildReachAcceptanceLetter({
    fullName: ambassador.full_name || "REACH Campus Ambassador",
    institution: ambassador.institution || "Campus Community",
    acceptedAt: ambassador.accepted_at || ambassador.invited_at || new Date().toISOString(),
    logoBytes,
  });
  const safeName = (ambassador.full_name || "Ambassador").replace(/[^A-Za-z0-9]+/g, "-");
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="EFF-REACH-Acceptance-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
