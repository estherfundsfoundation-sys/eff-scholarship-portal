import {PDFDocument, StandardFonts, rgb, type PDFFont} from "pdf-lib";

export type FinancialAidCertificateDetails = {
  learnerName: string;
  score: number;
  completedAt: string;
  certificateCode: string;
  logoBytes?: Uint8Array;
  courseName?: string;
  courseScope?: string;
  disclaimer?: string;
};

const COLORS = {
  royalPurple: rgb(0.259, 0.071, 0.498),
  deepPurple: rgb(0.12, 0.025, 0.27),
  lavender: rgb(0.718, 0.6, 0.89),
  lightLavender: rgb(0.91, 0.86, 0.96),
  cream: rgb(0.961, 0.941, 0.902),
  warmWhite: rgb(0.995, 0.989, 0.976),
  ink: rgb(0.12, 0.085, 0.15),
  muted: rgb(0.36, 0.31, 0.39),
  gold: rgb(0.77, 0.61, 0.25),
  white: rgb(1, 1, 1),
};

function centeredX(text: string, font: PDFFont, size: number, pageWidth: number) {
  return (pageWidth - font.widthOfTextAtSize(text, size)) / 2;
}

function fitTextSize(text: string, font: PDFFont, maxSize: number, minSize: number, maxWidth: number) {
  let size = maxSize;
  while (font.widthOfTextAtSize(text, size) > maxWidth && size > minSize) size -= 1;
  return size;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function buildFinancialAidPeerMentorCertificate(details: FinancialAidCertificateDetails) {
  const courseName = details.courseName ?? "EFF FINANCIAL AID PEER MENTOR";
  const courseScope = details.courseScope ?? "A student-safe, official-source course in FAFSA navigation, financial-aid literacy, and responsible referral.";
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${courseName} Certificate - ${details.learnerName}`);
  pdf.setAuthor("Esther Funds Foundation");
  pdf.setSubject(`${courseName} course-completion certificate`);
  pdf.setKeywords(["Esther Funds Foundation", "financial aid", "peer mentor", "course completion"]);
  pdf.setCreator("Esther Funds Foundation Leadership Training Academy");
  pdf.setProducer("Esther Funds Foundation");

  const page = pdf.addPage([792, 612]);
  const width = page.getWidth();
  const height = page.getHeight();
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({x: 0, y: 0, width, height, color: COLORS.cream});
  page.drawRectangle({x: 16, y: 16, width: width - 32, height: height - 32, color: COLORS.deepPurple});
  page.drawRectangle({x: 25, y: 25, width: width - 50, height: height - 50, color: COLORS.warmWhite});
  page.drawRectangle({x: 33, y: 33, width: width - 66, height: height - 66, borderColor: COLORS.lavender, borderWidth: 1.5});

  // Minimal corner detailing keeps the certificate polished when printed.
  const corners = [
    {x: 33, y: height - 67, sx: 1, sy: -1},
    {x: width - 33, y: height - 67, sx: -1, sy: -1},
    {x: 33, y: 67, sx: 1, sy: 1},
    {x: width - 33, y: 67, sx: -1, sy: 1},
  ];
  for (const corner of corners) {
    page.drawLine({
      start: {x: corner.x, y: corner.y},
      end: {x: corner.x + 44 * corner.sx, y: corner.y},
      thickness: 5,
      color: COLORS.royalPurple,
    });
    page.drawLine({
      start: {x: corner.x, y: corner.y},
      end: {x: corner.x, y: corner.y + 44 * corner.sy},
      thickness: 5,
      color: COLORS.royalPurple,
    });
  }

  if (details.logoBytes) {
    try {
      const logo = await pdf.embedPng(details.logoBytes);
      const logoSize = logo.scaleToFit(66, 66);
      page.drawImage(logo, {
        x: 54,
        y: height - 105,
        width: logoSize.width,
        height: logoSize.height,
      });
      const watermark = logo.scaleToFit(245, 245);
      page.drawImage(logo, {
        x: (width - watermark.width) / 2,
        y: 185,
        width: watermark.width,
        height: watermark.height,
        opacity: 0.035,
      });
    } catch {
      // A missing or unreadable optional logo must never block a valid credential.
    }
  }

  page.drawText("ESTHER FUNDS FOUNDATION", {
    x: 126,
    y: height - 68,
    size: 14,
    font: sansBold,
    color: COLORS.deepPurple,
  });
  page.drawText("LEADERSHIP TRAINING ACADEMY", {
    x: 126,
    y: height - 84,
    size: 8.5,
    font: sansBold,
    color: COLORS.royalPurple,
  });
  page.drawText("EVERY FUTURE FULFILLED", {
    x: width - 226,
    y: height - 68,
    size: 9,
    font: sansBold,
    color: COLORS.royalPurple,
  });
  page.drawText("FOR SUCH A TIME AS THIS. - ESTHER 4:14", {
    x: width - 276,
    y: height - 84,
    size: 7.5,
    font: serifItalic,
    color: COLORS.muted,
  });
  page.drawLine({
    start: {x: 54, y: height - 115},
    end: {x: width - 54, y: height - 115},
    thickness: 1,
    color: COLORS.lightLavender,
  });

  const title = "Certificate of Completion";
  page.drawText(title, {
    x: centeredX(title, serifBold, 31, width),
    y: 443,
    size: 31,
    font: serifBold,
    color: COLORS.deepPurple,
  });
  const presented = "PROUDLY PRESENTED TO";
  page.drawText(presented, {
    x: centeredX(presented, sansBold, 9, width),
    y: 416,
    size: 9,
    font: sansBold,
    color: COLORS.royalPurple,
  });

  const learnerName = details.learnerName.trim();
  const nameSize = fitTextSize(learnerName, serifItalic, 38, 21, 610);
  page.drawText(learnerName, {
    x: centeredX(learnerName, serifItalic, nameSize, width),
    y: 354,
    size: nameSize,
    font: serifItalic,
    color: COLORS.royalPurple,
  });
  page.drawLine({
    start: {x: 112, y: 342},
    end: {x: width - 112, y: 342},
    thickness: 1.25,
    color: COLORS.gold,
  });

  const completionLine = "for successfully completing the training requirements for";
  page.drawText(completionLine, {
    x: centeredX(completionLine, serif, 12.5, width),
    y: 311,
    size: 12.5,
    font: serif,
    color: COLORS.muted,
  });
  const courseNameSize = fitTextSize(courseName, sansBold, 23, 16, 650);
  page.drawText(courseName, {
    x: centeredX(courseName, sansBold, courseNameSize, width),
    y: 270,
    size: courseNameSize,
    font: sansBold,
    color: COLORS.deepPurple,
  });
  const courseScopeSize = fitTextSize(courseScope, serifItalic, 10.5, 7.2, 650);
  page.drawText(courseScope, {
    x: centeredX(courseScope, serifItalic, courseScopeSize, width),
    y: 247,
    size: courseScopeSize,
    font: serifItalic,
    color: COLORS.muted,
  });

  const result = `Completed ${formatDate(details.completedAt)}  |  Passing score ${details.score}%`;
  page.drawText(result, {
    x: centeredX(result, sansBold, 9.5, width),
    y: 213,
    size: 9.5,
    font: sansBold,
    color: COLORS.royalPurple,
  });

  page.drawLine({start: {x: 115, y: 148}, end: {x: 314, y: 148}, thickness: 1, color: COLORS.deepPurple});
  page.drawText("SHAYNA VINCENT", {x: 159, y: 131, size: 10, font: sansBold, color: COLORS.deepPurple});
  page.drawText("Founder & Chief Executive Officer", {x: 143, y: 117, size: 8.5, font: sans, color: COLORS.muted});

  page.drawCircle({
    x: 600,
    y: 143,
    size: 48,
    color: COLORS.royalPurple,
    borderColor: COLORS.gold,
    borderWidth: 3,
  });
  page.drawCircle({x: 600, y: 143, size: 39, borderColor: COLORS.lavender, borderWidth: 1});
  page.drawText("EFF", {x: 578, y: 142, size: 22, font: serifBold, color: COLORS.white});
  page.drawText("CERTIFIED", {x: 580, y: 128, size: 7, font: sansBold, color: COLORS.white});

  page.drawRectangle({x: 54, y: 53, width: width - 108, height: 32, color: COLORS.lightLavender, opacity: 0.55});
  page.drawText(`CERTIFICATE ID  ${details.certificateCode}`, {
    x: 65,
    y: 69,
    size: 8,
    font: sansBold,
    color: COLORS.deepPurple,
  });
  const website = "portal.estherfundsfoundation.org";
  page.drawText(website, {
    x: width - 65 - sans.widthOfTextAtSize(website, 8),
    y: 69,
    size: 8,
    font: sans,
    color: COLORS.deepPurple,
  });
  const disclaimer = details.disclaimer ?? "EFF course-completion credential. Not a U.S. Department of Education certification or financial-aid administrator license.";
  page.drawText(disclaimer, {
    x: centeredX(disclaimer, sans, 6.9, width),
    y: 40,
    size: 6.9,
    font: sans,
    color: COLORS.muted,
  });

  return pdf.save();
}
