import {
  needApplicationUploads,
  serviceApplicationConfigs,
  type AnswerField,
  type UploadField,
} from "@/lib/application-form-config";

type DocumentRecord = {kind: string; filename: string};

type ApplicationFieldsProps = {
  programSlug: string;
  answers: Record<string, string>;
  documents: DocumentRecord[];
  policyBody: string;
};

function answerValue(answers: Record<string, string>, name: string) {
  return answers[name] ?? "";
}

function TextField({
  field,
  value,
  required = true,
}: {
  field: AnswerField;
  value: string;
  required?: boolean;
}) {
  return (
    <label>
      {field.label}
      {field.multiline ? (
        <textarea
          name={field.name}
          required={required}
          minLength={field.minLength}
          defaultValue={value}
          rows={6}
        />
      ) : (
        <input
          name={field.name}
          type={field.type ?? "text"}
          required={required}
          defaultValue={value}
        />
      )}
      {field.help && <small>{field.help}</small>}
    </label>
  );
}

function YesNoField({
  field,
  value,
}: {
  field: AnswerField;
  value: string;
}) {
  return (
    <label>
      {field.label}
      <select name={field.name} required defaultValue={value}>
        <option value="" disabled>
          Select one
        </option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}

function UploadGrid({
  fields,
  documents,
}: {
  fields: UploadField[];
  documents: DocumentRecord[];
}) {
  return (
    <div className="upload-grid">
      {fields.map((field) => {
        const existing = documents.find((document) => document.kind === field.kind);
        return (
          <label className="upload" key={field.kind}>
            <strong>{field.label}</strong>
            {existing && <span className="uploaded">Attached: {existing.filename}</span>}
            <input
              type="file"
              name={field.kind}
              required={!existing && field.required !== false}
              accept=".pdf,.jpg,.jpeg,.png,.webp"
            />
            <small>{field.help ?? "PDF or image, up to 10 MB"}</small>
          </label>
        );
      })}
    </div>
  );
}

function Certification({
  answers,
  policyBody,
}: {
  answers: Record<string, string>;
  policyBody: string;
}) {
  return (
    <div className="agreement">
      <h3>Applicant certification</h3>
      <p>{policyBody}</p>
      <label className="check">
        <input
          type="checkbox"
          name="certification"
          value="yes"
          required
          defaultChecked={answerValue(answers, "certification") === "yes"}
        />
        <span>I have read and accept this certification and authorize electronic records.</span>
      </label>
      <TextField
        field={{
          name: "signature",
          label: "Type your full legal name as your electronic signature",
        }}
        value={answerValue(answers, "signature")}
      />
    </div>
  );
}

function ServiceApplicationFields({
  programSlug,
  answers,
  documents,
  policyBody,
}: ApplicationFieldsProps) {
  const config = serviceApplicationConfigs[programSlug];

  return (
    <>
      <section className="form-section">
        <span className="section-number">01</span>
        <h3>Eligibility screening</h3>
        <p className="muted">
          Answer every item honestly. You must meet each published requirement to submit.
        </p>
        <div className="form-grid">
          {config.eligibility.map((field) => (
            <YesNoField
              key={field.name}
              field={field}
              value={answerValue(answers, field.name)}
            />
          ))}
        </div>
      </section>

      <section className="form-section">
        <span className="section-number">02</span>
        <h3>About you</h3>
        <div className="form-grid">
          {config.profile.map((field) => (
            <TextField
              key={field.name}
              field={field}
              value={answerValue(answers, field.name)}
            />
          ))}
        </div>
      </section>

      <section className="form-section">
        <span className="section-number">03</span>
        <h3>{config.title}</h3>
        <div className="form-grid">
          {config.service.map((field) => (
            <TextField
              key={field.name}
              field={field}
              value={answerValue(answers, field.name)}
            />
          ))}
        </div>
      </section>

      <section className="form-section">
        <span className="section-number">04</span>
        <h3>Impact statement</h3>
        <TextField
          field={config.essay}
          value={answerValue(answers, config.essay.name)}
        />
      </section>

      <section className="form-section">
        <span className="section-number">05</span>
        <h3>Documents and certification</h3>
        <p className="muted">
          Upload redacted copies only. Remove Social Security numbers, FSA IDs,
          passwords, tax-return details, bank information, and full account numbers.
        </p>
        <UploadGrid fields={config.uploads} documents={documents} />
        <Certification answers={answers} policyBody={policyBody} />
      </section>
    </>
  );
}

function NeedApplicationFields({
  answers,
  documents,
  policyBody,
}: ApplicationFieldsProps) {
  const field = (
    name: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <TextField
      field={{name, label, type}}
      value={answerValue(answers, name)}
      required={required}
    />
  );

  const yesNo = (name: string, label: string) => (
    <YesNoField
      field={{name, label}}
      value={answerValue(answers, name)}
    />
  );

  return (
    <>
      <section className="form-section">
        <span className="section-number">01</span>
        <h3>Eligibility screening</h3>
        <p className="muted">You must answer yes to every requirement to submit.</p>
        <div className="form-grid">
          {yesNo(
            "residency_status",
            "Are you a U.S. citizen, U.S. national, or permanent resident?",
          )}
          {yesNo("fafsa_completed", "Have you completed the FAFSA?")}
          {yesNo(
            "unmet_need_verified",
            "Can your school verify your unmet financial need?",
          )}
          {yesNo(
            "undergraduate_no_bachelors",
            "Are you an undergraduate who has not earned a bachelor’s degree?",
          )}
          {yesNo(
            "accredited_us_institution",
            "Are you enrolled at an accredited U.S. college or university?",
          )}
        </div>
      </section>

      <section className="form-section">
        <span className="section-number">02</span>
        <h3>About you</h3>
        <div className="form-grid">
          {field("legal_name", "Full legal name")}
          {field("preferred_name", "Preferred name", "text", false)}
          {field("date_of_birth", "Date of birth", "date")}
          {field("personal_email", "Personal email", "email")}
          {field("school_email", "School email", "email", false)}
          {field("phone", "Phone number", "tel")}
          {field("address", "Mailing address")}
          {field("gender", "Gender (optional)", "text", false)}
          {field("race_ethnicity", "Race or ethnicity (optional)", "text", false)}
          {field("marital_status", "Marital status (optional)", "text", false)}
        </div>
      </section>

      <section className="form-section">
        <span className="section-number">03</span>
        <h3>Education</h3>
        <div className="form-grid">
          {field("institution", "College or university")}
          {field("student_id", "Student ID number")}
          {field("class_standing", "Class standing")}
          {field("major", "Major or area of study")}
          {field("expected_graduation", "Expected graduation", "month")}
          {field("enrollment_status", "Enrollment status")}
          {field("gpa", "Cumulative GPA (optional; no minimum)", "text", false)}
        </div>
      </section>

      <section className="form-section">
        <span className="section-number">04</span>
        <h3>Emergency contact</h3>
        <div className="form-grid">
          {field("emergency_contact_name", "Contact name")}
          {field("emergency_contact_relationship", "Relationship to you")}
          {field("emergency_contact_phone", "Contact phone", "tel")}
          {field("emergency_contact_email", "Contact email", "email")}
        </div>
      </section>

      <section className="form-section">
        <span className="section-number">05</span>
        <h3>Name your need</h3>
        <div className="form-grid">
          {field("amount_requested", "Total amount requested ($)", "number")}
          <label>
            Primary need category
            <select
              name="need_category"
              required
              defaultValue={answerValue(answers, "need_category")}
            >
              <option value="" disabled>
                Select one
              </option>
              {[
                "Tuition or fees",
                "Housing or utilities",
                "Food",
                "Transportation",
                "Books or supplies",
                "Technology",
                "Childcare",
                "Health or wellness",
                "Other",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          {field("other_need", "Other need (if applicable)", "text", false)}
        </div>
        <TextField
          field={{
            name: "financial_need_description",
            label: "Describe your financial need and how you determined this amount",
            multiline: true,
            minLength: 100,
          }}
          value={answerValue(answers, "financial_need_description")}
        />
      </section>

      <section className="form-section">
        <span className="section-number">06</span>
        <h3>Your story</h3>
        <TextField
          field={{
            name: "story",
            label:
              "Your story (200–300 words): Why are you fighting to stay in school, and what would this scholarship make possible for you?",
            multiline: true,
            minLength: 300,
          }}
          value={answerValue(answers, "story")}
        />
        <TextField
          field={{
            name: "faith_reflection",
            label: "Faith reflection: Share how your faith is carrying you through this season.",
            multiline: true,
            minLength: 80,
          }}
          value={answerValue(answers, "faith_reflection")}
        />
      </section>

      <section className="form-section">
        <span className="section-number">07</span>
        <h3>Documents and certification</h3>
        <UploadGrid fields={needApplicationUploads} documents={documents} />
        <Certification answers={answers} policyBody={policyBody} />
      </section>
    </>
  );
}

export function ApplicationFields(props: ApplicationFieldsProps) {
  return serviceApplicationConfigs[props.programSlug] ? (
    <ServiceApplicationFields {...props} />
  ) : (
    <NeedApplicationFields {...props} />
  );
}
