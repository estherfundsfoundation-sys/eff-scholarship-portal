export const nameYourNeedReceiptTemplateKey =
  "name_your_need_application_receipt_2026";

export const nameYourNeedReceiptSubject =
  "We received your EFF Name Your Need application";

export const nameYourNeedReceiptBody = `<p>Hello {{name}},</p>
<p><strong>We received your Name Your Need application.</strong></p>
<p>It is now under review.</p>
<p>Because of high application volume, please allow 6–8 weeks after the July 31, 2026 deadline for review.</p>
<p>Submission does not guarantee funding or an award.</p>
<p><a href="{{portal_url}}">View your submitted application in the secure Esther Funds Foundation Portal</a>.</p>`;

export function renderNameYourNeedReceiptFallback(name: string, portalUrl: string) {
  const escapedName = escapeHtml(name || "Applicant");
  const escapedPortalUrl = escapeHtml(portalUrl);
  return {
    subject: nameYourNeedReceiptSubject,
    html: `<p>Hello ${escapedName},</p><p><strong>We received your Name Your Need application.</strong></p><p>It is now under review.</p><p>Because of high application volume, please allow 6–8 weeks after the July 31, 2026 deadline for review.</p><p>Submission does not guarantee funding or an award.</p><p><a href="${escapedPortalUrl}">View your submitted application in the secure Esther Funds Foundation Portal</a>.</p>`,
  };
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      (
        {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        } as Record<string, string>
      )[character],
  );
}
