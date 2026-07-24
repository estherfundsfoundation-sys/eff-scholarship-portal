from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = [
    ROOT / "output" / "pdf" / "eff-student-emergency-mentor-guide.pdf",
    ROOT / "public" / "downloads" / "eff-student-emergency-mentor-guide.pdf",
]
LOGO = ROOT / "public" / "brand" / "eff-logo.png"

PURPLE = colors.HexColor("#42127F")
DEEP_PURPLE = colors.HexColor("#290759")
LAVENDER = colors.HexColor("#B799E3")
PALE_LAVENDER = colors.HexColor("#EEE5F7")
CREAM = colors.HexColor("#F5F0E6")
WHITE = colors.white
INK = colors.HexColor("#2D1748")
MUTED = colors.HexColor("#6B6273")
GREEN = colors.HexColor("#276749")
RED = colors.HexColor("#A52A2A")
LINE = colors.HexColor("#D8CBE4")


def find_font(*names: str) -> Path | None:
    roots = [
        Path("C:/Windows/Fonts"),
        ROOT / "assets" / "fonts",
    ]
    for root in roots:
        for name in names:
            candidate = root / name
            if candidate.exists():
                return candidate
    return None


def register_fonts() -> tuple[str, str]:
    regular = find_font("Montserrat-Regular.ttf", "arial.ttf")
    bold = find_font("Montserrat-Bold.ttf", "arialbd.ttf")
    if regular and bold:
        pdfmetrics.registerFont(TTFont("EFFBody", str(regular)))
        pdfmetrics.registerFont(TTFont("EFFBold", str(bold)))
        return "EFFBody", "EFFBold"
    return "Helvetica", "Helvetica-Bold"


BODY_FONT, BOLD_FONT = register_fonts()
styles = getSampleStyleSheet()

BODY = ParagraphStyle(
    "Body",
    parent=styles["BodyText"],
    fontName=BODY_FONT,
    fontSize=9.7,
    leading=14.2,
    textColor=INK,
    spaceAfter=7,
)
SMALL = ParagraphStyle(
    "Small",
    parent=BODY,
    fontSize=8.2,
    leading=11.5,
    textColor=MUTED,
)
H1 = ParagraphStyle(
    "H1",
    parent=styles["Heading1"],
    fontName=BOLD_FONT,
    fontSize=25,
    leading=29,
    textColor=PURPLE,
    spaceAfter=12,
)
H2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontName=BOLD_FONT,
    fontSize=16,
    leading=19,
    textColor=PURPLE,
    spaceBefore=5,
    spaceAfter=8,
)
H3 = ParagraphStyle(
    "H3",
    parent=styles["Heading3"],
    fontName=BOLD_FONT,
    fontSize=11,
    leading=14,
    textColor=INK,
    spaceAfter=5,
)
EYEBROW = ParagraphStyle(
    "Eyebrow",
    parent=BODY,
    fontName=BOLD_FONT,
    fontSize=7.8,
    leading=10,
    textColor=MUTED,
    spaceAfter=2,
)
BULLET = ParagraphStyle(
    "Bullet",
    parent=BODY,
    leftIndent=13,
    firstLineIndent=-9,
    bulletIndent=0,
    spaceAfter=5,
)
CENTER_SMALL = ParagraphStyle(
    "CenterSmall",
    parent=SMALL,
    alignment=TA_CENTER,
)
SCRIPT = ParagraphStyle(
    "Script",
    parent=BODY,
    fontSize=8.8,
    leading=13,
    backColor=CREAM,
    borderColor=LAVENDER,
    borderWidth=0.8,
    borderPadding=10,
    spaceAfter=10,
)


def link(label: str, url: str) -> str:
    return f'<link href="{url}" color="#42127F"><u>{label}</u></link>'


def bullet(text: str) -> Paragraph:
    return Paragraph(f"• {text}", BULLET)


def section_title(eyebrow: str, title: str, intro: str | None = None):
    items = [
        Paragraph(eyebrow.upper(), EYEBROW),
        Paragraph(title, H1),
    ]
    if intro:
        items.append(Paragraph(intro, BODY))
    return items


def callout(title: str, text: str, background=CREAM, accent=PURPLE):
    content = [
        Paragraph(title.upper(), ParagraphStyle("CalloutTitle", parent=H3, textColor=accent)),
        Paragraph(text, BODY),
    ]
    table = Table([[content]], colWidths=[6.55 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), background),
                ("BOX", (0, 0), (-1, -1), 0.8, LAVENDER),
                ("LINEBEFORE", (0, 0), (0, -1), 5, accent),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def card(title: str, body: str, tag: str | None = None):
    content = []
    if tag:
        content.append(Paragraph(tag.upper(), EYEBROW))
    content.extend([Paragraph(title, H3), Paragraph(body, SMALL)])
    table = Table([[content]], colWidths=[3.08 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.8, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def page_header_footer(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(PURPLE)
    canvas.rect(0, height - 0.18 * inch, width, 0.18 * inch, stroke=0, fill=1)
    if LOGO.exists():
        canvas.drawImage(
            str(LOGO),
            0.68 * inch,
            height - 0.83 * inch,
            width=0.48 * inch,
            height=0.48 * inch,
            preserveAspectRatio=True,
            mask="auto",
        )
    canvas.setFont(BOLD_FONT, 10)
    canvas.setFillColor(PURPLE)
    canvas.drawString(1.25 * inch, height - 0.52 * inch, "ESTHER FUNDS FOUNDATION")
    canvas.setFont(BODY_FONT, 7.2)
    canvas.setFillColor(MUTED)
    canvas.drawString(1.25 * inch, height - 0.68 * inch, "STUDENT EMERGENCY MENTOR GUIDE")
    canvas.setStrokeColor(LAVENDER)
    canvas.setLineWidth(0.6)
    canvas.line(0.68 * inch, 0.61 * inch, width - 0.68 * inch, 0.61 * inch)
    canvas.setFont(BOLD_FONT, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.68 * inch, 0.39 * inch, "EVERY FUTURE FULFILLED")
    canvas.drawRightString(width - 0.68 * inch, 0.39 * inch, f"Page {doc.page}")
    canvas.restoreState()


def cover_page(canvas, doc):
    canvas.saveState()
    width, height = letter
    canvas.setFillColor(DEEP_PURPLE)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setFillColor(PURPLE)
    canvas.circle(width - 0.75 * inch, height - 1.0 * inch, 1.35 * inch, stroke=0, fill=1)
    canvas.setFillColor(LAVENDER)
    canvas.circle(0.55 * inch, 0.65 * inch, 1.15 * inch, stroke=0, fill=1)
    canvas.setFillColor(CREAM)
    canvas.roundRect(0.65 * inch, 1.05 * inch, 7.2 * inch, 8.7 * inch, 10, stroke=0, fill=1)
    if LOGO.exists():
        canvas.drawImage(
            str(LOGO),
            1.05 * inch,
            8.9 * inch,
            width=0.85 * inch,
            height=0.85 * inch,
            preserveAspectRatio=True,
            mask="auto",
        )
    canvas.setFillColor(PURPLE)
    canvas.setFont(BOLD_FONT, 14)
    canvas.drawString(2.05 * inch, 9.36 * inch, "ESTHER FUNDS FOUNDATION")
    canvas.setFont(BOLD_FONT, 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(2.05 * inch, 9.12 * inch, "EVERY FUTURE FULFILLED")
    canvas.setFillColor(PURPLE)
    canvas.setFont(BOLD_FONT, 33)
    canvas.drawString(1.05 * inch, 7.82 * inch, "STUDENT")
    canvas.drawString(1.05 * inch, 7.30 * inch, "EMERGENCY")
    canvas.drawString(1.05 * inch, 6.78 * inch, "MENTOR GUIDE")
    canvas.setFont(BODY_FONT, 13)
    canvas.setFillColor(INK)
    canvas.drawString(1.08 * inch, 6.22 * inch, "A calm, practical plan when school and life feel urgent.")
    canvas.setFillColor(WHITE)
    canvas.setStrokeColor(LAVENDER)
    canvas.roundRect(1.05 * inch, 4.2 * inch, 6.45 * inch, 1.45 * inch, 8, stroke=1, fill=1)
    canvas.setFillColor(PURPLE)
    canvas.setFont(BOLD_FONT, 14)
    canvas.drawString(1.35 * inch, 5.18 * inch, "YOU DO NOT HAVE TO FIGURE THIS OUT ALONE.")
    canvas.setFillColor(INK)
    canvas.setFont(BODY_FONT, 10.2)
    canvas.drawString(1.35 * inch, 4.77 * inch, "Use this guide to stabilize the emergency, protect your education,")
    canvas.drawString(1.35 * inch, 4.52 * inch, "contact the right office, and document the next step.")
    canvas.setFont(BOLD_FONT, 10)
    canvas.setFillColor(PURPLE)
    canvas.drawString(1.05 * inch, 3.35 * inch, "INSIDE")
    canvas.setFont(BODY_FONT, 9.5)
    canvas.setFillColor(INK)
    lines = [
        "• A 15-minute emergency triage",
        "• A personalized 24-72 hour action plan",
        "• Ready-to-use email and phone scripts",
        "• Funding, food, housing, aid, and enrollment routes",
        "• A seven-day progress tracker and privacy checklist",
    ]
    y = 3.02 * inch
    for line in lines:
        canvas.drawString(1.12 * inch, y, line)
        y -= 0.29 * inch
    canvas.setFont(BODY_FONT, 8)
    canvas.setFillColor(MUTED)
    canvas.drawCentredString(width / 2, 1.33 * inch, "Free educational mentoring and advocacy support")
    canvas.restoreState()


def tracker_table():
    rows = [["DAY", "ACTION / OFFICE", "CASE # / CONTACT", "NEXT STEP + DATE"]]
    rows += [[str(day), "", "", ""] for day in range(1, 8)]
    table = Table(rows, colWidths=[0.48 * inch, 2.2 * inch, 1.7 * inch, 2.2 * inch], rowHeights=[0.34 * inch] + [0.54 * inch] * 7)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
                ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
                ("FONTNAME", (0, 0), (-1, 0), BOLD_FONT),
                ("FONTSIZE", (0, 0), (-1, 0), 7),
                ("FONTNAME", (0, 1), (-1, -1), BODY_FONT),
                ("FONTSIZE", (0, 1), (-1, -1), 7.5),
                ("TEXTCOLOR", (0, 1), (-1, -1), INK),
                ("GRID", (0, 0), (-1, -1), 0.55, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def build_story():
    story = [PageBreak()]

    story += section_title(
        "Start here",
        "Pause. Protect. Prioritize.",
        "An emergency can make everything feel equally urgent. Your first job is to identify what must happen now, what could interrupt your education next, and what can wait until you have support.",
    )
    story.append(callout(
        "If you are in suicidal crisis or emotional distress",
        f"Call or text {link('988', 'tel:988')} or use the {link('988 Lifeline chat', 'https://988lifeline.org/chat/')}. If you face immediate physical danger, contact local emergency services. EFF is not a crisis-response provider.",
        background=PALE_LAVENDER,
    ))
    story.append(Spacer(1, 9))
    story.append(Paragraph("THE 15-MINUTE STABILIZATION", H2))
    stabilize = [
        ("1. Name the emergency", "Write one sentence: “I may lose ___ by ___ because ___.” Use the exact deadline or consequence."),
        ("2. Protect tonight", "Address immediate safety, food, shelter, medication, childcare, and transportation before paperwork that can wait."),
        ("3. Protect your education", "Save the notice, portal screen, bill, class schedule, housing message, or aid status before it changes."),
        ("4. Contact one responsible office", "Start with the office that controls the record. Ask for a case number, written next steps, required documents, and a follow-up date."),
        ("5. Tell one trusted person", "Choose a mentor, adviser, family member, counselor, faith leader, or EFF contact who can help you stay organized."),
    ]
    for title, body in stabilize:
        story.append(KeepTogether([Paragraph(title, H3), Paragraph(body, BODY)]))
    story.append(callout(
        "Your mentor rule",
        "You do not need to solve your entire life today. You need one safe next step, one documented request, and one follow-up date.",
    ))

    story.append(PageBreak())
    story += section_title(
        "Find your lane",
        "Emergency Triage Map",
        "Choose the lane with the most immediate consequence. If more than one applies, protect safety and housing first, then enrollment and money.",
    )
    triage_rows = [
        [
            card("Enrollment, Classes, or Holds", "Save the exact portal status. Contact the Registrar, academic adviser, or Enrollment Management. Ask whether a temporary hold, late registration, course restoration, or individual review is possible.", "Education"),
            card("Tuition or Unexpected Balance", "Ask Student Accounts or the Bursar for an itemized reconciliation. Ask Financial Aid about pending aid, emergency completion support, professional judgment, and temporary hold relief.", "Money"),
        ],
        [
            card("FAFSA or Financial Aid", "Review the FAFSA Submission Summary and school action items. Ask for the exact missing item. If family finances changed, ask whether a special-circumstances or professional-judgment review applies.", "Aid"),
            card("Food, Housing, or Transportation", "Contact the Dean of Students, student-support or basic-needs office, campus pantry, housing office, and trusted local resource directory. State whether the need affects tonight, attendance, or enrollment.", "Essentials"),
        ],
        [
            card("Medical or Mental-Health Barrier", "Use campus health or counseling services and tell the Dean of Students if the situation threatens attendance or enrollment. Ask what documentation is required through a secure process.", "Well-being"),
            card("Scholarship or Payment Delay", "Keep the award or payment confirmation. Ask the provider where and when funds were sent. Ask the school when the credit will post and whether the pending amount can be considered during review.", "Documentation"),
        ],
    ]
    triage = Table(triage_rows, colWidths=[3.18 * inch, 3.18 * inch], hAlign="LEFT")
    triage.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 9)]))
    story.append(triage)
    story.append(callout(
        "Do not start with a promise of money",
        "Start with the record: the exact balance, deadline, aid status, hold, notice, and office responsible. Funding may be one part of the solution, but clear documentation protects every option.",
    ))

    story.append(PageBreak())
    story += section_title(
        "Mentor plan",
        "Your Next 24-72 Hours",
        "This is the same structure a good mentor would use with you: clarify, contact, document, follow up, and escalate respectfully.",
    )
    steps = [
        ("TODAY", "Save dated screenshots or PDFs. Write the exact deadline. Contact the responsible office. Ask for a case number and written instructions."),
        ("WITHIN 24 HOURS", "Complete only verified requirements through the school’s secure portal. Ask what can be preserved while the request is reviewed: enrollment, courses, housing, aid, or access."),
        ("WITHIN 48 HOURS", "If no response timeline was given, follow up. Copy the appropriate adviser, Dean of Students, student-advocacy office, or ombuds office only when relevant."),
        ("WITHIN 72 HOURS", "Compare the portal with your saved record. Document any new balance, hold, dropped course, housing change, or deadline. Update EFF if you requested mentoring."),
    ]
    step_table = Table(
        [[Paragraph(label, ParagraphStyle("StepLabel", parent=H3, textColor=WHITE)), Paragraph(text, BODY)] for label, text in steps],
        colWidths=[1.22 * inch, 5.2 * inch],
    )
    step_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), PURPLE),
                ("BACKGROUND", (1, 0), (1, -1), CREAM),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(step_table)
    story.append(Spacer(1, 12))
    story.append(Paragraph("WHAT TO GATHER", H2))
    for item in [
        "The notice, error message, or exact portal status.",
        "A dated account statement, aid offer, class schedule, or housing notice.",
        "The deadline and the consequence stated by the school or provider.",
        "A simple timeline of calls, emails, forms, offices, names, and case numbers.",
        "Only the minimum supporting record requested through a secure channel.",
    ]:
        story.append(bullet(item))
    story.append(callout(
        "Protect your privacy",
        "Never email Social Security numbers, passwords, verification codes, tax returns, full bank or card details, medical records, complete loan documents, or unredacted student IDs. Ask for a secure upload method.",
    ))

    story.append(PageBreak())
    story += section_title(
        "Use these words",
        "School Advocacy Scripts",
        "Clear, respectful language makes it easier for a school office to identify the record, the requested review, and the next action.",
    )
    story.append(Paragraph("EMAIL TEMPLATE", H2))
    story.append(Paragraph(
        "<b>Subject: Urgent student support request - [issue] - [deadline]</b><br/><br/>"
        "Hello [Office or Staff Member],<br/><br/>"
        "My name is [name], and I am a student at [school]. I am asking for an urgent review because [state the exact issue] may interrupt my enrollment or ability to continue school by [deadline].<br/><br/>"
        "The portal or notice currently shows: [exact status]. I have already [list the steps taken].<br/><br/>"
        "Please confirm: (1) the office or staff member responsible, (2) my case number, (3) any remaining action or secure document request, (4) whether enrollment, courses, housing, or aid can be preserved while the review is pending, and (5) the date I should expect a written decision.<br/><br/>"
        "Thank you,<br/>[name]",
        SCRIPT,
    ))
    story.append(Paragraph("PHONE OR VIRTUAL-QUEUE SCRIPT", H2))
    story.append(Paragraph(
        "“Hello, my name is [name]. I am calling because [issue] may interrupt my enrollment by [deadline]. The current record shows [status]. Could you review the account, tell me the exact next step, and explain what can be preserved while the review is pending? Before we finish, may I have your name, a case number, and the date I should follow up?”",
        SCRIPT,
    ))
    story.append(Paragraph("RESPECTFUL ESCALATION LADDER", H2))
    for item in [
        "<b>Level 1:</b> The office that controls the record: Financial Aid, Bursar or Student Accounts, Registrar, Housing, or Admissions.",
        "<b>Level 2:</b> Academic adviser, student-success team, or program administrator.",
        "<b>Level 3:</b> Dean of Students, student-advocacy office, case-management office, or ombuds office.",
        "<b>Level 4:</b> A written appeal, grievance, or institutional review process when the school publishes one.",
    ]:
        story.append(bullet(item))
    story.append(Paragraph("Escalation means asking the next responsible office to review the documented record. It does not mean threatening, mass-emailing unrelated staff, or sharing private information publicly.", SMALL))

    story.append(PageBreak())
    story += section_title(
        "Practical resource map",
        "Money, Aid, and Essential Needs",
        "Start with campus resources because they can affect school records directly. Use outside directories to widen the search, and verify every requirement with the original provider.",
    )
    resources = [
        ("Federal Student Aid", "FAFSA status, corrections, aid basics, and repayment information.", "https://studentaid.gov"),
        ("School Financial Aid Office", "Pending aid, verification, professional judgment, unusual circumstances, emergency or completion grants, and institutional aid.", None),
        ("School Student Accounts or Bursar", "Itemized balances, charges, credits, payment plans, refunds, and temporary hold review.", None),
        ("USDA SNAP State Directory", "Official state application routes for food assistance.", "https://www.fns.usda.gov/snap/state-directory"),
        ("Benefits.gov", "Government benefit categories and official agency links.", "https://www.benefits.gov"),
        ("HUD State Information", "Housing agencies and local HUD resources by state.", "https://www.hud.gov/states"),
        ("Legal Services Corporation", "Find nonprofit civil legal aid for qualifying people.", "https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help"),
        ("Campus Basic-Needs Support", "Food pantry, emergency housing, transportation, childcare, technology, clothing, and hygiene support.", None),
    ]
    rows = []
    for title, description, url in resources:
        title_text = link(title, url) if url else title
        rows.append([Paragraph(title_text, H3), Paragraph(description, SMALL)])
    table = Table(rows, colWidths=[2.1 * inch, 4.32 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [WHITE, CREAM]),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 10))
    story.append(callout(
        "Before paying or sharing documents",
        "Confirm that the website, email domain, application, and payment instructions belong to the official school, government agency, or provider. No legitimate helper needs your password or verification code.",
    ))

    story.append(PageBreak())
    story += section_title(
        "EFF walks beside you",
        "Your Esther Funds Foundation Support Menu",
        "Use the resource that matches the problem. EFF will not dump every link on you when one clear next step is more useful.",
    )
    eff_resources = [
        ("Student Help Center", "FAFSA, balances, emergency expenses, food, housing, transportation, state aid, and trusted next steps.", "https://portal.estherfundsfoundation.org/resources"),
        ("Finish Line Support", "Build a school-advocacy email, phone script, and follow-up plan privately in your browser.", "https://portal.estherfundsfoundation.org/resources/finish-line"),
        ("Scholarship Directory", "Search current scholarship opportunities and verify requirements with the original provider.", "https://portal.estherfundsfoundation.org/scholarships"),
        ("EFF Programs", "See current EFF program availability and published deadlines. An application never guarantees an award.", "https://portal.estherfundsfoundation.org/programs"),
        ("Account Help", "Portal login, invitation, claim, password, duplicate-account, and access guidance.", "https://portal.estherfundsfoundation.org/account-help"),
        ("National Student Support", "Email the EFF team with your school, exact deadline, page or office involved, steps already tried, and a redacted screenshot when relevant.", "mailto:nationals@estherfundsinc.org?subject=Student%20Emergency%20Mentor%20Support"),
    ]
    rows = []
    for title, description, url in eff_resources:
        rows.append([Paragraph(link(title, url), H3), Paragraph(description, SMALL)])
    eff_table = Table(rows, colWidths=[2.0 * inch, 4.42 * inch])
    eff_table.setStyle(
        TableStyle(
            [
                ("ROWBACKGROUNDS", (0, 0), (-1, -1), [CREAM, WHITE]),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(eff_table)
    story.append(Spacer(1, 10))
    story.append(callout(
        "What EFF can do",
        "Help you organize the facts, identify the responsible office, create a clear request, prepare questions, find legitimate resources, and maintain a follow-up plan.",
        background=PALE_LAVENDER,
        accent=GREEN,
    ))
    story.append(Spacer(1, 7))
    story.append(callout(
        "What EFF cannot promise",
        "EFF cannot guarantee funding, enrollment, housing, aid, a decision date, outside assistance, or a particular result. This guide is educational mentoring and advocacy support, not legal, medical, tax, or financial advice.",
        background=CREAM,
        accent=RED,
    ))

    story.append(PageBreak())
    story += section_title(
        "Keep the record moving",
        "Seven-Day Progress Tracker",
        "Write down every contact and promised follow-up. A simple log helps you avoid repeating the entire story and makes respectful escalation easier.",
    )
    story.append(tracker_table())
    story.append(Spacer(1, 14))
    story.append(Paragraph("BEFORE YOU SEND ANYTHING", H2))
    for item in [
        "[ ] I removed passwords, codes, full account numbers, tax records, and unredacted IDs.",
        "[ ] I used the school or provider’s secure portal when documents were required.",
        "[ ] I stated the exact issue, deadline, and consequence in a few sentences.",
        "[ ] I asked for a case number, responsible office, remaining action, and follow-up date.",
        "[ ] I saved a copy of what I submitted and the confirmation.",
        "[ ] I told one trusted person what I need help remembering or completing.",
    ]:
        story.append(bullet(item))
    story.append(Spacer(1, 8))
    story.append(callout(
        "Your next sentence",
        "“Today I will protect my education by completing one safe, documented next step: ______________________________.”",
        background=PALE_LAVENDER,
    ))

    story.append(PageBreak())
    story += section_title(
        "A mentor beside you",
        "You Are More Than This Emergency.",
        "EFF created this guide because urgent circumstances can make capable students feel alone, ashamed, or frozen. Asking for help is not failure. It is a step toward staying enrolled and protecting your future.",
    )
    story.append(callout(
        "When you email EFF, include only what helps us guide the next step",
        "Your name, school, exact deadline, the page or office involved, the exact error or consequence, what you already tried, and a redacted screenshot when relevant. Never include passwords, codes, tax returns, full account details, or an unredacted student ID.",
        background=PALE_LAVENDER,
    ))
    story.append(Spacer(1, 12))
    story.append(Paragraph("WHAT YOU CAN EXPECT FROM EFF", H2))
    expectations = [
        ("A calm first response", "We will acknowledge the urgency and help separate the immediate need from the next administrative step."),
        ("A practical plan", "We will point you to the most relevant resource, help you organize questions, and ask for the exact error, office, and deadline when needed."),
        ("Honest boundaries", "We will not promise funding, enrollment, eligibility, or an outcome controlled by a school, agency, or outside provider."),
        ("Privacy-centered support", "We will ask you to redact sensitive information and use secure institutional channels when records are required."),
    ]
    for title, body in expectations:
        story.append(KeepTogether([Paragraph(title, H3), Paragraph(body, BODY)]))
    story.append(Spacer(1, 8))
    contact = Table(
        [[
            Paragraph("READY FOR YOUR NEXT STEP?", ParagraphStyle("ContactTitle", parent=H2, textColor=WHITE)),
            Paragraph(
                '<link href="https://portal.estherfundsfoundation.org/resources" color="#FFFFFF"><u>Open the EFF Student Help Center</u></link><br/>'
                '<link href="mailto:nationals@estherfundsinc.org?subject=Student%20Emergency%20Mentor%20Support" color="#FFFFFF"><u>Email nationals@estherfundsinc.org</u></link>',
                ParagraphStyle("ContactLinks", parent=BODY, textColor=WHITE, leading=17),
            ),
        ]],
        colWidths=[2.45 * inch, 3.95 * inch],
    )
    contact.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), PURPLE),
                ("BOX", (0, 0), (-1, -1), 0.8, DEEP_PURPLE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 13),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ]
        )
    )
    story.append(contact)
    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "Keep the record clear. Keep the next step small. Let someone trustworthy walk beside you.",
        ParagraphStyle("Closing", parent=BODY, fontName=BOLD_FONT, fontSize=14, leading=19, textColor=PURPLE, alignment=TA_CENTER),
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph("EVERY FUTURE FULFILLED.", ParagraphStyle("Tagline", parent=EYEBROW, fontSize=9, alignment=TA_CENTER, textColor=MUTED)))

    return story


def build_pdf(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(path),
        pagesize=letter,
        leftMargin=0.78 * inch,
        rightMargin=0.78 * inch,
        topMargin=1.02 * inch,
        bottomMargin=0.82 * inch,
        title="EFF Student Emergency Mentor Guide",
        author="Esther Funds Foundation",
        subject="Practical mentoring and advocacy guide for students facing urgent educational barriers",
    )
    content_frame = Frame(
        doc.leftMargin,
        doc.bottomMargin,
        doc.width,
        doc.height,
        id="content",
        leftPadding=0,
        rightPadding=0,
        topPadding=0,
        bottomPadding=0,
    )
    cover_frame = Frame(0, 0, letter[0], letter[1], id="cover")
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[cover_frame], onPage=cover_page, autoNextPageTemplate="content"),
            PageTemplate(id="content", frames=[content_frame], onPage=page_header_footer),
        ]
    )
    doc.build(build_story())


if __name__ == "__main__":
    for output in OUTPUTS:
        build_pdf(output)
    print("\n".join(str(path) for path in OUTPUTS))
