export type TechDeskUrgency =
  | "deadline_within_72_hours"
  | "fully_blocked"
  | "partially_blocked"
  | "question";

export type TechDeskDiagnosis = {
  code: string;
  title: string;
  summary: string;
  steps: string[];
  confidence: number;
  priority: "P1" | "P2" | "P3";
  requiresStaffReview: boolean;
  proposedAction?: string;
};

const officialHostnames = new Set([
  "estherfundsfoundation.org",
  "www.estherfundsfoundation.org",
  "portal.estherfundsfoundation.org",
  "my.estherfundsfoundation.org",
  "policy.estherfundsfoundation.org",
  "fundraise.estherfundsfoundation.org",
  "partner.estherfundsfoundation.org",
  "backtoschool.estherfundsfoundation.org",
  "academy.estherfundsfoundation.org",
  "estherfundsfoundation.online",
  "www.estherfundsfoundation.online",
]);

export const techDeskProducts = [
  {slug: "portal", name: "EFF Student Portal"},
  {slug: "myeff", name: "MyEFF Membership Portal"},
  {slug: "policy", name: "EFF Policy Platform"},
  {slug: "fundraise", name: "EFF Fundraising Platform"},
  {slug: "partner", name: "EFF Partnership Platform"},
  {slug: "back-to-school", name: "EFF Back to School Platform"},
  {slug: "academy", name: "EFF Leadership Academy"},
  {slug: "main-site", name: "Esther Funds Foundation Website"},
  {slug: "shop", name: "EFF Shop"},
  {slug: "other", name: "Another EFF Platform"},
] as const;

export const techDeskIssueCategories = [
  ["password_sign_in", "Password or sign-in"],
  ["verification_email", "Verification or password email did not arrive"],
  ["account_claim", "Claiming an existing account or record"],
  ["scholarship_application", "Scholarship or support application"],
  ["document_upload", "Document or profile photo upload"],
  ["website_error", "Website error or loading loop"],
  ["broken_link", "Broken link or button"],
  ["session_access", "Session expired or permission denied"],
  ["data_mismatch", "Incorrect or missing account information"],
  ["payment", "Payment page or access after payment"],
  ["deployment_outage", "Website unavailable or outage"],
  ["other", "Another technical problem"],
] as const;

export function normalizeTechTicketNumber(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toUpperCase();
  return /^EFF-TECH-\d{4}-[A-Z0-9]{8}$/.test(normalized) ? normalized : "";
}

export function safeTechDeskDestination(value: unknown, fallback = "/tech-desk/admin") {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    return fallback;
  }
  try {
    const parsed = new URL(value, "https://portal.invalid");
    if (parsed.origin !== "https://portal.invalid") return fallback;
    if (
      parsed.pathname !== "/tech-desk/admin" &&
      !parsed.pathname.startsWith("/tech-desk/admin/")
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function normalizeOfficialEffUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "https:" || !officialHostnames.has(parsed.hostname.toLowerCase())) {
      return null;
    }
    parsed.username = "";
    parsed.password = "";
    parsed.hash = "";
    return parsed.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export function redactSensitiveText(value: unknown, maxLength = 6000) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .slice(0, maxLength)
    .replace(
      /\b(password|passcode|verification\s*code|api\s*key|secret|access\s*token|refresh\s*token)\s*[:=]\s*[^\s,;]+/gi,
      "$1: [REDACTED]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/gi, "Bearer [REDACTED]")
    .replace(/\b(?:re|sk|pk|sb)_[A-Za-z0-9_-]{16,}\b/g, "[REDACTED KEY]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED SSN]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED NUMBER]");
}

function contains(haystack: string, terms: string[]) {
  return terms.some((term) => haystack.includes(term));
}

const common = {
  password: [
    "Confirm you are signing in on the exact EFF platform named in this ticket.",
    "Request one password-reset email and open only the newest message.",
    "Try the newest link in a private browser window.",
    "Do not create a second account or send EFF your password or verification code.",
  ],
  verification: [
    "Wait up to 10 minutes and search all mail for Esther Funds Foundation.",
    "Check Spam, Promotions, Updates, and any school quarantine folder.",
    "Confirm the submitted email address is spelled correctly.",
    "Request one fresh email; older links may become invalid.",
  ],
  session: [
    "Close duplicate EFF tabs and open a private browser window.",
    "Start from the correct EFF product home page instead of an old email link.",
    "Allow cookies for the EFF domain and sign in again.",
    "If the problem continues, record the exact page URL and time.",
  ],
  upload: [
    "Use PDF, PNG, JPG, WEBP, or plain text where accepted.",
    "Keep the file below the size shown on the page and simplify its filename.",
    "Try a small known-safe file on a stable connection.",
    "Do not upload passwords, bank details, tax returns, or unredacted identity documents.",
  ],
  outage: [
    "Confirm the address ends in an official Esther Funds Foundation domain.",
    "Try once from a private browser window or a different network.",
    "Do not repeatedly submit forms while the site is unavailable.",
    "Check the Tech Desk status page for the latest public update.",
  ],
  application: [
    "Do not create a second account or duplicate application.",
    "Record the scholarship or program name and its deadline.",
    "Save the last completed step and the exact blocking message.",
    "Continue using the email already connected to the application.",
  ],
} as const;

export function classifyTechIssue(input: {
  category: string;
  description: string;
  errorMessage?: string | null;
  urgency: TechDeskUrgency;
}) {
  const text = `${input.category} ${input.description} ${input.errorMessage ?? ""}`.toLowerCase();
  const deadlinePriority = input.urgency === "deadline_within_72_hours" ? "P1" : null;

  let diagnosis: TechDeskDiagnosis;
  if (
    contains(text, [
      "invalid api key",
      "api key",
      "configuration",
      "environment variable",
      "service role",
      "missing credential",
    ])
  ) {
    diagnosis = {
      code: "INVALID_CONFIGURATION",
      title: "System configuration needs staff review",
      summary:
        "The message points to a live configuration problem rather than a mistake in the student’s form.",
      steps: [
        "Stop retrying the form so duplicate records are not created.",
        "Keep the page URL and exact time of the error.",
        "Upload a screenshot only after removing private account information.",
        "The Tech Desk will compare the production deployment and service configuration.",
      ],
      confidence: 0.97,
      priority: "P1",
      requiresStaffReview: true,
      proposedAction: "review_production_configuration",
    };
  } else if (
    input.category === "password_sign_in" ||
    contains(text, ["password", "login", "log in", "sign in", "not recognized"])
  ) {
    diagnosis = {
      code: "PASSWORD_SIGN_IN",
      title: "Password or product sign-in path",
      summary:
        "The account may be using an old password, an older email link, or the sign-in page for a different EFF product.",
      steps: [...common.password],
      confidence: 0.9,
      priority: "P2",
      requiresStaffReview: false,
      proposedAction: "send_product_password_help",
    };
  } else if (
    input.category === "verification_email" ||
    contains(text, ["verification email", "reset email", "email did not", "never got", "didn't get"])
  ) {
    diagnosis = {
      code: "VERIFICATION_EMAIL",
      title: "Email delivery or expired-link check",
      summary:
        "The message may be delayed, filtered, addressed incorrectly, or replaced by a newer verification link.",
      steps: [...common.verification],
      confidence: 0.9,
      priority: "P2",
      requiresStaffReview: false,
      proposedAction: "review_email_delivery",
    };
  } else if (
    input.category === "session_access" ||
    contains(text, ["session expired", "loading", "permission denied", "row level security", "unauthorized"])
  ) {
    const permission = contains(text, ["permission denied", "row level security", "unauthorized"]);
    diagnosis = {
      code: permission ? "PERMISSION_DENIED" : "SESSION_EXPIRED",
      title: permission ? "Account permission or record-link review" : "Expired session or loading loop",
      summary: permission
        ? "The account is signed in, but its role or record relationship may not authorize this page."
        : "A stale browser session or old email link may be preventing the portal from loading.",
      steps: [...common.session],
      confidence: 0.93,
      priority: permission ? "P1" : "P2",
      requiresStaffReview: permission,
      proposedAction: permission ? "review_account_permissions" : "send_session_recovery",
    };
  } else if (
    input.category === "document_upload" ||
    contains(text, ["upload", "photo could not", "document could not", "file failed"])
  ) {
    diagnosis = {
      code: "UPLOAD_FAILED",
      title: "File validation or storage check",
      summary:
        "The file may be too large, unsupported, named unexpectedly, or reaching an unavailable storage service.",
      steps: [...common.upload],
      confidence: 0.88,
      priority: "P2",
      requiresStaffReview: false,
      proposedAction: "check_storage_health",
    };
  } else if (
    input.category === "deployment_outage" ||
    contains(text, ["deployment", "build failed", "site down", "503", "502", "500 error", "unavailable"])
  ) {
    diagnosis = {
      code: "DEPLOYMENT_OUTAGE",
      title: "Production website health check",
      summary:
        "The report may reflect a current deployment, hosting, or upstream-service interruption.",
      steps: [...common.outage],
      confidence: 0.88,
      priority: "P1",
      requiresStaffReview: true,
      proposedAction: "inspect_production_deployment",
    };
  } else if (
    input.category === "broken_link" ||
    contains(text, ["404", "broken link", "wrong page", "button does not work", "button isn't working"])
  ) {
    diagnosis = {
      code: "BROKEN_LINK",
      title: "Broken route or button",
      summary:
        "The source page or destination route may be outdated, mistyped, or missing from the live deployment.",
      steps: [
        "Keep the source page URL where the link or button appears.",
        "Record the button text and the page you expected.",
        "Copy the incorrect destination or error.",
        "Use only an official EFF alternate route while the link is reviewed.",
      ],
      confidence: 0.88,
      priority: "P2",
      requiresStaffReview: true,
      proposedAction: "review_production_route",
    };
  } else if (
    input.category === "scholarship_application" ||
    input.category === "account_claim" ||
    contains(text, ["application", "scholarship", "claim", "registration could not", "submit"])
  ) {
    diagnosis = {
      code: "APPLICATION_BLOCKED",
      title: "Existing application or account record review",
      summary:
        "The application may be blocked by account matching, a required field, a deadline rule, or a server-side validation error.",
      steps: [...common.application],
      confidence: 0.84,
      priority: "P2",
      requiresStaffReview: true,
      proposedAction: "review_application_record",
    };
  } else {
    diagnosis = {
      code: "GENERAL_TECH",
      title: "Technical issue needs reproducible details",
      summary:
        "The Tech Desk will use the platform, page, time, error, and reproduction steps to identify the responsible system.",
      steps: [
        "Record the exact EFF platform, page URL, and time.",
        "Copy the full error without private account information.",
        "Try one private-browser test.",
        "Keep this ticket number for every follow-up.",
      ],
      confidence: 0.58,
      priority: "P3",
      requiresStaffReview: true,
      proposedAction: "manual_technical_review",
    };
  }

  if (deadlinePriority) diagnosis.priority = deadlinePriority;
  if (input.urgency === "fully_blocked" && diagnosis.priority === "P3") {
    diagnosis.priority = "P2";
  }
  return diagnosis;
}
