export type HelpDeskPersona = "student" | "volunteer" | "staff";

const personaPrefixes: Record<HelpDeskPersona, readonly string[]> = {
  student: ["/help-desk/access", "/help-desk/cases/"],
  volunteer: [
    "/help-desk/volunteer",
    "/help-desk/volunteer/onboarding",
    "/help-desk/volunteer/console",
  ],
  staff: ["/help-desk/admin"],
};

export function normalizeHelpDeskCaseNumber(value: unknown) {
  if (typeof value !== "string") return "";
  const normalized = value.trim().toUpperCase();
  return /^EFF-\d{4}-[A-Z0-9]{8}$/.test(normalized) ? normalized : "";
}

export function safeHelpDeskDestination(
  value: unknown,
  persona: HelpDeskPersona,
  fallback?: string,
) {
  const defaultDestination =
    fallback ??
    (persona === "student"
      ? "/help-desk/access"
      : persona === "volunteer"
        ? "/help-desk/volunteer/onboarding"
        : "/help-desk/admin");

  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f]/.test(value)
  ) {
    return defaultDestination;
  }

  try {
    const parsed = new URL(value, "https://portal.invalid");
    if (parsed.origin !== "https://portal.invalid") return defaultDestination;
    const safe = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return personaPrefixes[persona].some((prefix) =>
      prefix.endsWith("/")
        ? parsed.pathname.startsWith(prefix)
        : parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`),
    )
      ? safe
      : defaultDestination;
  } catch {
    return defaultDestination;
  }
}

export function helpDeskSignInForDestination(value: unknown) {
  if (typeof value !== "string") return null;
  if (value.startsWith("/help-desk/volunteer")) {
    return `/help-desk/volunteer/sign-in?next=${encodeURIComponent(
      safeHelpDeskDestination(value, "volunteer"),
    )}`;
  }
  if (value.startsWith("/help-desk/admin")) {
    return `/help-desk/staff/sign-in?next=${encodeURIComponent(
      safeHelpDeskDestination(value, "staff"),
    )}`;
  }
  if (value.startsWith("/help-desk/cases/")) {
    return `/help-desk/access?next=${encodeURIComponent(
      safeHelpDeskDestination(value, "student"),
    )}`;
  }
  return null;
}

export function volunteerDestination(status?: string | null, onboardingStep?: string | null) {
  switch (status) {
    case "active":
      return "/help-desk/volunteer/console";
    case "recertification_required":
      return "/help-desk/volunteer/onboarding?stage=recertification";
    case "suspended":
    case "revoked":
      return "/help-desk/volunteer/onboarding?stage=restricted";
    case "awaiting_approval":
      return "/help-desk/volunteer/onboarding?stage=approval";
    case "training":
      return `/help-desk/volunteer/onboarding?stage=${encodeURIComponent(
        onboardingStep || "training",
      )}`;
    default:
      return "/help-desk/volunteer/onboarding";
  }
}
