export const helpDeskVolunteerModuleKeys = [
  "listen",
  "privacy",
  "boundaries",
  "routing",
  "safety",
  "quality",
] as const;

export type HelpDeskVolunteerModuleKey =
  (typeof helpDeskVolunteerModuleKeys)[number];

export function isHelpDeskVolunteerModuleKey(
  value: string,
): value is HelpDeskVolunteerModuleKey {
  return helpDeskVolunteerModuleKeys.some((key) => key === value);
}

type VolunteerApplicationInput = {
  userId: string;
  email: string;
  legalName: string;
  preferredName: string;
  timeZone: string;
  motivation: string;
  experience: string;
  availability: string;
  acceptedAt: string;
};

export function buildVolunteerApplicationRecord(
  input: VolunteerApplicationInput,
) {
  const displayName = input.preferredName || input.legalName;

  return {
    user_id: input.userId,
    // These legacy columns remain required in the upgraded production table.
    // Keeping them populated lets old Help Desk records and the new Academy
    // coexist without replacing either data model.
    display_name: displayName,
    notification_email: input.email,
    legal_name: input.legalName,
    preferred_name: input.preferredName || null,
    email: input.email,
    time_zone: input.timeZone,
    age_confirmed: true,
    personal_email_confirmed: true,
    motivation: input.motivation,
    experience: input.experience || null,
    availability_notes: input.availability,
    agreements_accepted: true,
    agreement_at: input.acceptedAt,
    status: "training",
    onboarding_step: "training",
    updated_at: input.acceptedAt,
  };
}
