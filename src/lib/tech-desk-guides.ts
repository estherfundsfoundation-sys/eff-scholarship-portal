export type TechDeskGuide = {
  category: string;
  question: string;
  answer: string;
  steps: string[];
  link?: {label: string; href: string};
};

export type TechDeskRunbook = {
  code: string;
  title: string;
  appliesTo: string;
  symptoms: string[];
  checks: string[];
  safeActions: string[];
  escalateWhen: string;
  requiredRole: "agent" | "lead" | "administrator";
};

export const techDeskCommonQuestions: TechDeskGuide[] = [
  {
    category: "Accounts",
    question: "My password is not working. What should I do?",
    answer: "Make sure you are signing in to the correct EFF platform, then use one fresh reset link.",
    steps: [
      "Open the platform home page instead of an old email link.",
      "Request one password-reset email and wait up to 10 minutes.",
      "Open only the newest message in a private browser window.",
      "Do not create a second account or send anyone your password or code.",
    ],
    link: {label: "Open a secure ticket", href: "/tech-desk/open-ticket"},
  },
  {
    category: "Accounts",
    question: "I see “login not recognized.”",
    answer: "That usually means the email is connected to another EFF product, the password is outdated, or an imported record still needs to be claimed.",
    steps: [
      "Check the address at the top of the page.",
      "Use the email that received the EFF invitation.",
      "If the page offers Claim an existing membership or application, use that path.",
      "Open one ticket if the same message appears after a fresh reset.",
    ],
  },
  {
    category: "Accounts",
    question: "My session expired or the page keeps loading.",
    answer: "A stale tab or cookie can keep returning an old session.",
    steps: [
      "Close every EFF tab.",
      "Open a private browser window.",
      "Start at the correct platform home page and sign in again.",
      "If the loop continues, save the exact page URL and time in one ticket.",
    ],
  },
  {
    category: "Email",
    question: "My verification or reset email did not arrive.",
    answer: "Delivery can be delayed, filtered, quarantined by a school, or replaced by a newer request.",
    steps: [
      "Wait up to 10 minutes.",
      "Search all mail for Esther Funds Foundation.",
      "Check Spam, Promotions, Updates, and school quarantine folders.",
      "Request one fresh message and use only that newest link.",
    ],
  },
  {
    category: "Email",
    question: "The link says it expired.",
    answer: "Invitation, reset, and secure-ticket links are time-limited. A newer request can also invalidate an older link.",
    steps: [
      "Return to the official platform.",
      "Request one new link.",
      "Open the newest email in the same browser where you started.",
      "Do not forward secure links to another person.",
    ],
  },
  {
    category: "Scholarship Portal",
    question: "The portal says an application already exists.",
    answer: "Do not create another account or application. EFF should reconnect the existing record.",
    steps: [
      "Use the email connected to the original submission.",
      "Record the scholarship or program name.",
      "Open one Tech Desk ticket with the exact message.",
      "Keep the existing record unchanged while the account relationship is checked.",
    ],
    link: {label: "Open an application-access ticket", href: "/tech-desk/open-ticket?product=portal&category=scholarship_application"},
  },
  {
    category: "Scholarship Portal",
    question: "Name Your Need is missing from my dashboard.",
    answer: "The application may exist under an imported record or a different verified email.",
    steps: [
      "Do not start a duplicate application.",
      "Confirm the email used for the original submission.",
      "Open one ticket and name the missing program.",
      "EFF will compare the verified account, imported record, and application owner.",
    ],
  },
  {
    category: "Scholarship Portal",
    question: "How do I add information to an existing application?",
    answer: "Use the application already shown in your dashboard. If editing is not available, request a record review instead of starting over.",
    steps: [
      "Open Dashboard, then select the existing application.",
      "Look for Edit, Continue, or Respond to request.",
      "If none appears, open one ticket and list the information you need to add.",
      "Do not email highly sensitive documents.",
    ],
  },
  {
    category: "REACH",
    question: "My REACH invitation opens a 404 page.",
    answer: "Use the secure REACH claim route in the EFF Student Portal.",
    steps: [
      "Open portal.estherfundsfoundation.org/reach/claim.",
      "Use the email that received the ambassador invitation.",
      "Create or connect your account only through that page.",
      "Open one ticket if the invitation is not recognized.",
    ],
    link: {label: "Open REACH claim", href: "/reach/claim"},
  },
  {
    category: "REACH",
    question: "I signed in but cannot see my REACH workspace.",
    answer: "The verified account may not yet be connected to the ambassador record.",
    steps: [
      "Confirm the account email matches the invitation email.",
      "Open the REACH claim page once.",
      "Do not create another EFF account.",
      "If the workspace remains missing, open one ticket for an account-to-record review.",
    ],
    link: {label: "Open Ambassador Workspace", href: "/reach/ambassador"},
  },
  {
    category: "MyEFF",
    question: "MyEFF says my membership record cannot load.",
    answer: "The account may be signed in without permission to the matching member profile.",
    steps: [
      "Sign out of MyEFF.",
      "Open my.estherfundsfoundation.org in a private window.",
      "Use Claim an existing membership if your record was imported.",
      "Open one ticket if permission denied or loading continues.",
    ],
  },
  {
    category: "MyEFF",
    question: "My profile photo or document will not save.",
    answer: "The file may be too large, unsupported, or reaching a storage permission issue.",
    steps: [
      "Use JPG, PNG, WEBP, or PDF where accepted.",
      "Use a simple filename and keep the file under the displayed limit.",
      "Try one smaller known-safe file.",
      "If it still fails, open one ticket with the exact page and time.",
    ],
  },
  {
    category: "Websites",
    question: "A button gives a 404 or opens the wrong page.",
    answer: "EFF needs the page containing the button and the destination it opened.",
    steps: [
      "Copy the source page URL.",
      "Write the exact button text.",
      "Copy the incorrect destination.",
      "Submit those three details in one ticket.",
    ],
  },
  {
    category: "Websites",
    question: "The page says Invalid API key or configuration error.",
    answer: "That is a system configuration problem, not a mistake in your form.",
    steps: [
      "Stop retrying so duplicate records are not created.",
      "Save the exact error, page URL, and time.",
      "Open a P1 Tech Desk ticket.",
      "Never send an API key, password, or verification code.",
    ],
  },
  {
    category: "Uploads",
    question: "What files are safe to upload to a Tech Desk ticket?",
    answer: "Use a screenshot, PDF, or plain-text error log after removing private information.",
    steps: [
      "Remove passwords, codes, keys, Social Security numbers, bank details, and full IDs.",
      "Keep the file under 5 MB.",
      "Use PNG, JPG, WEBP, PDF, or TXT.",
      "Include the page URL and time in the written ticket.",
    ],
  },
  {
    category: "Privacy",
    question: "Will EFF ever ask for my password or code?",
    answer: "No. EFF staff and volunteers do not need your password, one-time code, private API key, full bank details, or Social Security number.",
    steps: [
      "Do not send the information.",
      "Remove it from screenshots.",
      "Use the secure ticket instead of ordinary email.",
      "Report any message that asks for a secret.",
    ],
  },
  {
    category: "Tickets",
    question: "How do I check my ticket?",
    answer: "Use your EFF-TECH ticket number and verified email to request a time-limited access link.",
    steps: [
      "Open Access My Ticket.",
      "Enter the exact ticket number and email.",
      "Use the newest secure link.",
      "Reply and close the ticket from the secure workspace.",
    ],
    link: {label: "Access my ticket", href: "/tech-desk/access"},
  },
  {
    category: "Tickets",
    question: "Why did my ticket close automatically?",
    answer: "Inactive tickets close after follow-up so the live queue stays accurate; the history is preserved.",
    steps: [
      "Read the final ticket email.",
      "If the same issue continues, open one new ticket.",
      "Reference the previous ticket number.",
      "Do not submit multiple tickets for the same active problem.",
    ],
  },
  {
    category: "Status",
    question: "How do I know whether an EFF website is down?",
    answer: "Check the public status page before repeating a submission.",
    steps: [
      "Open EFF Platform Status.",
      "Find the product you are using.",
      "If it is degraded or unavailable, wait for an update.",
      "If it is operational and your issue continues, open one ticket.",
    ],
    link: {label: "View platform status", href: "/tech-desk/status"},
  },
  {
    category: "Support",
    question: "Is the Tech Desk the same as the Student Help Desk?",
    answer: "No. The Tech Desk handles website, account, email, upload, and application-access problems. The National Student Help Desk handles educational support, advocacy, and resource navigation.",
    steps: [
      "Use the Tech Desk for technology problems.",
      "Use the Student Help Desk for school, funding-navigation, and advocacy support.",
      "Keep each issue in the correct case or ticket.",
    ],
    link: {label: "Open the Student Help Desk", href: "/help-desk"},
  },
];

export const techDeskVolunteerRunbooks: TechDeskRunbook[] = [
  {
    code: "RUN-01",
    title: "Password and login triage",
    appliesTo: "All EFF platforms",
    symptoms: ["Login not recognized", "Password rejected", "Reset link expired"],
    checks: ["Confirm the product hostname", "Confirm one exact verified email", "Check delivery-event status", "Check whether the record is imported and unclaimed"],
    safeActions: ["Send the approved reset instructions", "Resend one newest link", "Ask the requester to test in a private window", "Document the result in the ticket"],
    escalateWhen: "A verified newest link fails, the account is missing, or ownership would need to change.",
    requiredRole: "agent",
  },
  {
    code: "RUN-02",
    title: "Verification email delivery",
    appliesTo: "Supabase Auth and Resend email flows",
    symptoms: ["No email", "Message in spam", "Expired link", "Delivery failure"],
    checks: ["Verify recipient spelling", "Review Tech Desk email events", "Check provider status without exposing secrets", "Confirm the newest link was used"],
    safeActions: ["Resend once", "Share safe-sender guidance", "Record provider acceptance or failure", "Set waiting-on-student follow-up"],
    escalateWhen: "The provider rejects delivery, the domain is unverified, or environment configuration is missing.",
    requiredRole: "agent",
  },
  {
    code: "RUN-03",
    title: "Imported account or application claim",
    appliesTo: "Student Portal and MyEFF",
    symptoms: ["Application already exists", "Claim not recognized", "Membership missing"],
    checks: ["Search exact email", "Compare profile and imported record", "Check claim token status", "Check existing owner before any change"],
    safeActions: ["Resend a single valid claim invitation", "Share the correct claim route", "Prevent duplicate-account instructions", "Record the matched systems"],
    escalateWhen: "Ownership differs, emails do not match, or a submitted record would be reassigned.",
    requiredRole: "lead",
  },
  {
    code: "RUN-04",
    title: "REACH ambassador access",
    appliesTo: "Student Portal REACH workspace",
    symptoms: ["REACH 404", "Workspace missing", "Invitation not recognized"],
    checks: ["Open /reach/claim publicly", "Confirm ambassador record", "Confirm account email relationship", "Check latest invitation event"],
    safeActions: ["Resend the approved REACH claim invitation", "Direct to /reach/claim", "Rerun ticket diagnosis", "Verify /reach/ambassador after claim"],
    escalateWhen: "The ambassador record is absent or an account relationship must be changed.",
    requiredRole: "lead",
  },
  {
    code: "RUN-05",
    title: "Application missing from dashboard",
    appliesTo: "EFF Student Portal",
    symptoms: ["Program missing", "Wrong program shown", "Existing application loop"],
    checks: ["Search verified profile", "List applications and program slugs", "Check imported legacy record", "Check application owner ID"],
    safeActions: ["Explain the matched status", "Resend a valid claim link when unclaimed", "Preserve the existing application", "Document the program and deadline"],
    escalateWhen: "A submitted application needs owner correction or program-cycle data is inconsistent.",
    requiredRole: "lead",
  },
  {
    code: "RUN-06",
    title: "Permission denied or endless loading",
    appliesTo: "Supabase-backed EFF portals",
    symptoms: ["Permission denied", "RLS error", "Loading forever", "Unauthorized"],
    checks: ["Reproduce with a role-appropriate test account", "Review public health", "Check profile-to-user relationship", "Review the relevant RLS policy in source"],
    safeActions: ["Send session reset steps", "Rerun diagnostics", "Collect exact page and time", "Create an approval-controlled remediation proposal"],
    escalateWhen: "A role, RLS policy, or production data relationship must change.",
    requiredRole: "lead",
  },
  {
    code: "RUN-07",
    title: "Upload and storage failure",
    appliesTo: "Profile photos, documents, and ticket attachments",
    symptoms: ["Upload failed", "Photo could not save", "Storage permission error"],
    checks: ["Validate type and size", "Test one safe small file", "Check bucket public health/configuration", "Confirm authenticated owner path"],
    safeActions: ["Send file-validation guidance", "Record the failing object type", "Rerun after a fresh session", "Keep the ticket active if the optional attachment fails"],
    escalateWhen: "A bucket policy, quota, or owner path must change.",
    requiredRole: "lead",
  },
  {
    code: "RUN-08",
    title: "Broken link or 404",
    appliesTo: "All public EFF websites",
    symptoms: ["404", "Wrong destination", "Dead download", "Protected Vercel screen"],
    checks: ["Record source page and button text", "Check destination HTTP status", "Verify the stable public domain", "Check the latest production route map"],
    safeActions: ["Share a verified alternate route", "Create a source-repository issue or patch proposal", "Add the finding to known issues", "Retest after deployment"],
    escalateWhen: "Production source, domain, or deployment protection must change.",
    requiredRole: "agent",
  },
  {
    code: "RUN-09",
    title: "Vercel deployment failure",
    appliesTo: "All Vercel-hosted EFF sites",
    symptoms: ["Latest build failed", "Old version still live", "500 or 503"],
    checks: ["Read the latest production build log", "Identify repository, branch, and commit", "Run the same build locally", "Check public alias and protection status"],
    safeActions: ["Create a reproducible repair branch", "Run tests and route audit", "Record a privileged remediation proposal", "Monitor the new deployment"],
    escalateWhen: "A deploy, environment, domain, or access-control change is required.",
    requiredRole: "administrator",
  },
  {
    code: "RUN-10",
    title: "GitHub source and workflow failure",
    appliesTo: "Connected EFF repositories",
    symptoms: ["Failing check", "Unmerged feature", "Deployment not triggered"],
    checks: ["Identify the connected repository", "Review branch/commit status", "Read failing workflow logs", "Compare live deployment commit"],
    safeActions: ["Prepare a tested repair branch", "Document the exact diff", "Open a reviewable pull request", "Link the result to the ticket"],
    escalateWhen: "Merging, pushing, permissions, or workflow secrets are required.",
    requiredRole: "administrator",
  },
  {
    code: "RUN-11",
    title: "Supabase data, auth, or RLS issue",
    appliesTo: "EFF portals using Supabase",
    symptoms: ["Record mismatch", "Permission denied", "Auth email failure", "Database error"],
    checks: ["Use read-only exact-email lookup", "Review applied migration history", "Compare user, profile, and record IDs", "Confirm the failure in a safe test"],
    safeActions: ["Prepare an auditable migration or admin action", "Back up the exact target", "Require approval for ownership or policy changes", "Verify with least-privilege accounts"],
    escalateWhen: "Any production data, role, policy, key, or authentication setting would change.",
    requiredRole: "administrator",
  },
  {
    code: "RUN-12",
    title: "Closing and learning from a ticket",
    appliesTo: "All Tech Desk tickets",
    symptoms: ["Issue resolved", "No response", "Recurring problem"],
    checks: ["Confirm the fix and affected scope", "Retest the original steps", "Record the production version", "Identify whether a help article needs updating"],
    safeActions: ["Send resolution confirmation", "Let the requester close the ticket", "Auto-close only after configured reminders", "Add a sanitized known-answer update"],
    escalateWhen: "The issue recurs across multiple users or indicates a systemic outage.",
    requiredRole: "agent",
  },
];
