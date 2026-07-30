import {PDFDocument, StandardFonts, rgb, type PDFFont} from "pdf-lib";

export type ReachAcceptanceLetterDetails = {
  fullName: string;
  institution: string;
  acceptedAt: string;
  logoBytes?: Uint8Array;
};

const purple = rgb(0.259, 0.071, 0.498);
const deepPurple = rgb(0.145, 0.025, 0.31);
const lavender = rgb(0.718, 0.6, 0.89);
const cream = rgb(0.961, 0.941, 0.902);
const ink = rgb(0.13, 0.09, 0.16);
const muted = rgb(0.37, 0.32, 0.4);
const white = rgb(1, 1, 1);

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) current = next;
    else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawParagraph(page: ReturnType<PDFDocument["addPage"]>, text: string, font: PDFFont, size: number, y: number) {
  const lines = wrap(text, font, size, 490);
  for (const line of lines) {
    page.drawText(line, {x: 62, y, size, font, color: ink});
    y -= 17;
  }
  return y - 10;
}

export async function buildReachAcceptanceLetter(details: ReachAcceptanceLetterDetails) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`REACH Campus Ambassador Acceptance - ${details.fullName}`);
  pdf.setAuthor("Esther Funds Foundation");
  pdf.setSubject("Official REACH Campus Ambassador acceptance letter");
  pdf.setCreator("Esther Funds Foundation National Office");

  const page = pdf.addPage([612, 792]);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);

  page.drawRectangle({x: 0, y: 0, width: 612, height: 792, color: white});
  page.drawRectangle({x: 0, y: 718, width: 612, height: 74, color: deepPurple});
  page.drawRectangle({x: 0, y: 0, width: 612, height: 28, color: purple});
  page.drawRectangle({x: 44, y: 48, width: 524, height: 650, color: cream, opacity: 0.34});
  page.drawLine({start: {x: 44, y: 699}, end: {x: 568, y: 699}, thickness: 3, color: lavender});

  if (details.logoBytes) {
    try {
      const logo = await pdf.embedPng(details.logoBytes);
      const size = logo.scaleToFit(56, 56);
      page.drawImage(logo, {x: 50, y: 727, width: size.width, height: size.height});
    } catch {
      // The letter remains official and usable if the optional logo cannot load.
    }
  }

  page.drawText("ESTHER FUNDS FOUNDATION", {x: 118, y: 758, size: 18, font: sansBold, color: white});
  page.drawText("R.E.A.C.H. CAMPUS AMBASSADOR PROGRAM", {x: 118, y: 740, size: 9, font: sansBold, color: lavender});
  page.drawText("Every Future Fulfilled", {x: 434, y: 758, size: 10, font: serifItalic, color: cream});

  const accepted = new Date(details.acceptedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  page.drawText(accepted, {x: 62, y: 670, size: 10, font: sans, color: muted});
  page.drawText("OFFICIAL ACCEPTANCE", {x: 62, y: 632, size: 10, font: sansBold, color: purple});
  page.drawText(`Welcome, ${details.fullName}`, {x: 62, y: 594, size: 26, font: sansBold, color: deepPurple});
  page.drawText(details.institution, {x: 62, y: 572, size: 11, font: sansBold, color: purple});

  let y = 532;
  y = drawParagraph(page, `Congratulations! Esther Funds Foundation is pleased to welcome you as a REACH Campus Ambassador. Your willingness to serve students and strengthen your campus community reflects the heart of our mission to help students overcome barriers that can interrupt their education.`, sans, 10.5, y);
  y = drawParagraph(page, `Your acceptance gives you access to the secure ambassador workspace, official training, workshop materials, outreach tools, and the REACH community. Before representing REACH in an activity or receiving program materials, complete the self-paced certification course and pass the final assessment.`, sans, 10.5, y);
  y = drawParagraph(page, `Ambassadors serve as peer connectors—not counselors, financial-aid administrators, or emergency responders. Protect student privacy, use only approved materials, communicate professionally, and refer urgent or specialized needs to the correct trained resource.`, sans, 10.5, y);
  y = drawParagraph(page, `Brand reminder: you may share approved REACH content from your personal accounts, but you may not create an EFF or REACH social-media page, account, fundraiser, group, logo, or public statement without written approval from the EFF National Office.`, sansBold, 10, y);

  page.drawRectangle({x: 62, y: y - 74, width: 488, height: 62, color: cream});
  page.drawText("YOUR NEXT THREE STEPS", {x: 78, y: y - 32, size: 10, font: sansBold, color: purple});
  page.drawText("1. Claim your account   2. Complete training   3. Introduce yourself with the official template", {
    x: 78,
    y: y - 52,
    size: 8.8,
    font: sans,
    color: ink,
  });

  page.drawText("With excitement,", {x: 62, y: 122, size: 10.5, font: sans, color: ink});
  page.drawText("The REACH Team", {x: 62, y: 102, size: 12, font: sansBold, color: purple});
  page.drawText("Esther Funds Foundation National Office", {x: 62, y: 86, size: 9, font: sans, color: muted});
  page.drawText("portal.estherfundsfoundation.org  |  reach.estherfundsfoundation.org", {x: 62, y: 56, size: 8, font: sansBold, color: purple});
  page.drawText("For such a time as this. — Esther 4:14", {x: 374, y: 10, size: 8, font: serifItalic, color: white});

  return pdf.save();
}
