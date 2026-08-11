export type AnswerField = {
  name: string;
  label: string;
  type?: string;
  multiline?: boolean;
  minLength?: number;
  help?: string;
};

export type UploadField = {
  kind: string;
  label: string;
  help?: string;
  required?: boolean;
};

type ServiceApplicationConfig = {
  title: string;
  eligibility: AnswerField[];
  profile: AnswerField[];
  service: AnswerField[];
  essay: AnswerField;
  uploads: UploadField[];
};

const commonServiceEligibility: AnswerField[] = [
  {name: "full_time_student", label: "Will you be enrolled full time during the award period?"},
  {name: "active_eff_member", label: "Are you an active Esther Funds Foundation member?"},
  {name: "good_standing", label: "Are you in good standing with EFF and your school?"},
  {name: "fafsa_completed", label: "Have you completed the FAFSA for the applicable academic year?"},
];

const commonServiceProfile: AnswerField[] = [
  {name: "legal_name", label: "Full legal name"},
  {name: "personal_email", label: "Personal email", type: "email"},
  {name: "phone", label: "Phone number", type: "tel"},
  {name: "institution", label: "College or university"},
  {name: "student_id", label: "Student ID number"},
  {name: "expected_graduation", label: "Expected graduation", type: "month"},
];

export const serviceApplicationConfigs: Record<string, ServiceApplicationConfig> = {
  "collegiate-executive-board-service-scholarship": {
    title: "Executive board service",
    eligibility: commonServiceEligibility,
    profile: commonServiceProfile,
    service: [
      {name: "board_role", label: "Executive board role"},
      {name: "chapter_name", label: "EFF collegiate chapter"},
      {name: "service_start_date", label: "Date your service began", type: "date"},
      {
        name: "meeting_attendance",
        label: "Describe your meeting attendance",
        multiline: true,
        help: "Include the meetings attended and any absences or make-up work.",
      },
      {
        name: "task_completion",
        label: "Describe the responsibilities and assignments you completed",
        multiline: true,
      },
      {name: "service_hours_total", label: "Verified community-service hours", type: "number"},
      {name: "recommender_name", label: "Recommender's name"},
      {name: "recommender_role", label: "Recommender's role or relationship"},
      {name: "recommender_email", label: "Recommender's email", type: "email"},
    ],
    essay: {
      name: "leadership_essay",
      label: "Leadership essay (400–600 words)",
      multiline: true,
      minLength: 1800,
      help: "Explain how you served your chapter, followed through on responsibilities, and helped EFF fulfill its mission.",
    },
    uploads: [
      {kind: "enrollment_proof", label: "Proof of current full-time enrollment"},
      {kind: "fafsa_summary", label: "Redacted FAFSA Submission Summary"},
      {kind: "service_hours_proof", label: "Verified community-service hours"},
      {kind: "recommendation_letter", label: "Recommendation letter"},
    ],
  },
  "eff-ambassador-service-scholarship": {
    title: "Ambassador service",
    eligibility: commonServiceEligibility,
    profile: commonServiceProfile,
    service: [
      {name: "ambassador_service_start_date", label: "Date your ambassador service began", type: "date"},
      {
        name: "ambassador_work_summary",
        label: "Describe your EFF ambassador work",
        multiline: true,
        help: "Include outreach, workshops, student support, content, events, or other completed assignments.",
      },
      {name: "service_hours_total", label: "Verified community-service hours", type: "number"},
    ],
    essay: {
      name: "ambassador_essay",
      label: "Ambassador impact essay (400–600 words)",
      multiline: true,
      minLength: 1800,
      help: "Explain the work you completed, the students or community reached, and what you learned through service.",
    },
    uploads: [
      {kind: "enrollment_proof", label: "Proof of current full-time enrollment"},
      {kind: "fafsa_summary", label: "Redacted FAFSA Submission Summary"},
      {kind: "service_hours_proof", label: "Verified community-service hours"},
      {kind: "ambassador_work_proof", label: "Proof of completed ambassador work"},
    ],
  },
  "eff-members-service-scholarship": {
    title: "Member service",
    eligibility: [
      ...commonServiceEligibility.slice(0, 2),
      {name: "active_eff_chapter_member", label: "Are you an active member of an EFF collegiate chapter?"},
      {
        name: "double_good_participation",
        label: "Did you participate in the national Double Good fundraiser?",
      },
      ...commonServiceEligibility.slice(2),
    ],
    profile: commonServiceProfile,
    service: [
      {name: "chapter_name", label: "EFF collegiate chapter"},
      {name: "member_service_start_date", label: "Date your EFF service began", type: "date"},
      {
        name: "chapter_participation_summary",
        label: "Describe your chapter participation",
        multiline: true,
        help: "Include meetings, programs, service projects, and responsibilities you completed.",
      },
      {
        name: "fundraiser_participation_summary",
        label: "Describe your Double Good fundraiser participation",
        multiline: true,
        help: "No minimum sales amount is required. Describe your honest participation and outreach.",
      },
      {name: "service_hours_total", label: "Verified community-service hours", type: "number"},
    ],
    essay: {
      name: "member_service_essay",
      label: "Member service essay (400–600 words)",
      multiline: true,
      minLength: 1800,
      help: "Explain how your chapter involvement and service supported students or your community.",
    },
    uploads: [
      {kind: "enrollment_proof", label: "Proof of current full-time enrollment"},
      {kind: "fafsa_summary", label: "Redacted FAFSA Submission Summary"},
      {kind: "service_hours_proof", label: "Verified community-service hours"},
      {kind: "double_good_proof", label: "Proof of Double Good participation"},
      {kind: "chapter_verification", label: "Chapter participation verification"},
    ],
  },
};

export const needApplicationAnswerKeys = [
  "residency_status",
  "fafsa_completed",
  "unmet_need_verified",
  "undergraduate_no_bachelors",
  "accredited_us_institution",
  "legal_name",
  "preferred_name",
  "date_of_birth",
  "gender",
  "race_ethnicity",
  "marital_status",
  "personal_email",
  "school_email",
  "phone",
  "address",
  "institution",
  "student_id",
  "class_standing",
  "major",
  "expected_graduation",
  "enrollment_status",
  "gpa",
  "emergency_contact_name",
  "emergency_contact_relationship",
  "emergency_contact_phone",
  "emergency_contact_email",
  "amount_requested",
  "need_category",
  "other_need",
  "financial_need_description",
  "story",
  "faith_reflection",
  "certification",
  "signature",
];

const serviceAnswerKeys = Object.values(serviceApplicationConfigs).flatMap((config) => [
  ...config.eligibility.map((field) => field.name),
  ...config.profile.map((field) => field.name),
  ...config.service.map((field) => field.name),
  config.essay.name,
]);

export const allApplicationAnswerKeys = [
  ...new Set([...needApplicationAnswerKeys, ...serviceAnswerKeys]),
];

export const needApplicationUploads: UploadField[] = [
  {kind: "headshot", label: "Headshot photo"},
  {kind: "enrollment_proof", label: "Proof of enrollment or acceptance"},
  {kind: "financial_need_proof", label: "Proof of financial need"},
  {kind: "supporting_document", label: "Optional supporting document", required: false},
];

export const allApplicationUploadKinds = [
  ...new Set([
    ...needApplicationUploads.map((field) => field.kind),
    ...Object.values(serviceApplicationConfigs).flatMap((config) =>
      config.uploads.map((field) => field.kind),
    ),
  ]),
];

export function friendlySubmissionError(message: string) {
  if (/all eligibility requirements must be met/i.test(message)) {
    return "Review the eligibility section: every answer must be Yes to submit. Pay special attention to ‘Are you an undergraduate who has not earned a bachelor’s degree?’ If you are an undergraduate and do not already have a bachelor’s degree, the accurate answer is Yes.";
  }
  const match = message.match(/A required answer is missing:\s*([a-z0-9_]+)/i);
  if (!match) return message;

  const fieldName = match[1];
  const field = Object.values(serviceApplicationConfigs)
    .flatMap((config) => [...config.eligibility, ...config.profile, ...config.service, config.essay])
    .find((item) => item.name === fieldName);

  return field
    ? `Please complete the required field: ${field.label}`
    : `Please complete the required field: ${fieldName.replaceAll("_", " ")}.`;
}
