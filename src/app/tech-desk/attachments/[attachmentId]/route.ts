import {NextRequest, NextResponse} from "next/server";
import {validateTechTicketAccess} from "@/lib/tech-desk-access";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  {params}: {params: Promise<{attachmentId: string}>},
) {
  const {attachmentId} = await params;
  const ticketNumber = request.nextUrl.searchParams.get("ticketNumber");
  const access = request.nextUrl.searchParams.get("access");
  const {admin, ticket} = await validateTechTicketAccess(ticketNumber, access);
  if (!ticket) {
    return NextResponse.redirect(
      new URL("/tech-desk/access?expired=1", request.url),
    );
  }
  const {data: attachment} = await admin
    .from("tech_desk_attachments")
    .select("storage_path")
    .eq("id", attachmentId)
    .eq("ticket_id", ticket.id)
    .eq("quarantined", false)
    .maybeSingle();
  if (!attachment) return new NextResponse("Not found", {status: 404});
  const {data, error} = await admin.storage
    .from("tech-desk-attachments")
    .createSignedUrl(attachment.storage_path, 60);
  if (error || !data.signedUrl) {
    return new NextResponse("The attachment is temporarily unavailable.", {
      status: 503,
    });
  }
  return NextResponse.redirect(data.signedUrl);
}
