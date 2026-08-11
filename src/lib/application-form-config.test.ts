import {describe, expect, it} from "vitest";
import {
  allApplicationAnswerKeys,
  allApplicationUploadKinds,
  friendlySubmissionError,
  serviceApplicationConfigs,
} from "./application-form-config";

const requirements = {
  "collegiate-executive-board-service-scholarship": {
    answers: [
      "full_time_student",
      "active_eff_member",
      "good_standing",
      "fafsa_completed",
      "legal_name",
      "personal_email",
      "phone",
      "institution",
      "student_id",
      "expected_graduation",
      "board_role",
      "chapter_name",
      "service_start_date",
      "meeting_attendance",
      "task_completion",
      "service_hours_total",
      "recommender_name",
      "recommender_role",
      "recommender_email",
      "leadership_essay",
    ],
    uploads: [
      "enrollment_proof",
      "fafsa_summary",
      "service_hours_proof",
      "recommendation_letter",
    ],
  },
  "eff-ambassador-service-scholarship": {
    answers: [
      "full_time_student",
      "active_eff_member",
      "good_standing",
      "fafsa_completed",
      "legal_name",
      "personal_email",
      "phone",
      "institution",
      "student_id",
      "expected_graduation",
      "ambassador_service_start_date",
      "ambassador_work_summary",
      "service_hours_total",
      "ambassador_essay",
    ],
    uploads: [
      "enrollment_proof",
      "fafsa_summary",
      "service_hours_proof",
      "ambassador_work_proof",
    ],
  },
  "eff-members-service-scholarship": {
    answers: [
      "full_time_student",
      "active_eff_member",
      "active_eff_chapter_member",
      "double_good_participation",
      "good_standing",
      "fafsa_completed",
      "legal_name",
      "personal_email",
      "phone",
      "institution",
      "student_id",
      "expected_graduation",
      "chapter_name",
      "member_service_start_date",
      "chapter_participation_summary",
      "fundraiser_participation_summary",
      "service_hours_total",
      "member_service_essay",
    ],
    uploads: [
      "enrollment_proof",
      "fafsa_summary",
      "service_hours_proof",
      "double_good_proof",
      "chapter_verification",
    ],
  },
} as const;

describe("service scholarship application configuration", () => {
  for (const [slug, required] of Object.entries(requirements)) {
    it(`renders and saves every required field for ${slug}`, () => {
      const config = serviceApplicationConfigs[slug];
      const configuredAnswers = [
        ...config.eligibility,
        ...config.profile,
        ...config.service,
        config.essay,
      ].map((field) => field.name);
      const configuredUploads = config.uploads.map((field) => field.kind);

      expect(configuredAnswers).toEqual(expect.arrayContaining([...required.answers]));
      expect(configuredUploads).toEqual(expect.arrayContaining([...required.uploads]));
      expect(allApplicationAnswerKeys).toEqual(
        expect.arrayContaining([...required.answers, "certification", "signature"]),
      );
      expect(allApplicationUploadKinds).toEqual(
        expect.arrayContaining([...required.uploads]),
      );
    });
  }

  it("turns database field keys into useful applicant guidance", () => {
    expect(
      friendlySubmissionError("A required answer is missing: full_time_student"),
    ).toBe(
      "Please complete the required field: Will you be enrolled full time during the award period?",
    );
  });

  it("explains the commonly misunderstood undergraduate eligibility question", () => {
    expect(friendlySubmissionError("All eligibility requirements must be met.")).toContain(
      "Are you an undergraduate who has not earned a bachelor’s degree?",
    );
  });
});
