import type {EvidenceSource} from "./schema";

export type AskEffProgram = {
  programId: string;
  officialName: string;
  description: string;
  audience: string;
  canonicalUrl: string;
  contact?: string;
  eligibilitySummary: string;
  costDescription: string;
  status: "open" | "paused" | "closed" | "coming_soon" | "unknown";
  approvalStatus: "approved";
  sourceReference: string;
  version: number;
  searchTerms: string[];
};

export const ownerApprovedPrograms: AskEffProgram[] = [
  {
    programId: "student-resources",
    officialName: "EFF Student Resources",
    description: "EFF's public collection of education, persistence, basic-needs, wellness, and student-support resources.",
    audience: "Students and caregivers",
    canonicalUrl: "https://portal.estherfundsfoundation.org/resources",
    eligibilitySummary: "Public resource navigation; individual providers may set their own eligibility rules.",
    costDescription: "Free to browse.",
    status: "open",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["resource", "food", "housing", "transportation", "help", "wellness", "prayer", "faith"],
  },
  {
    programId: "scholarship-directory",
    officialName: "EFF Scholarship Directory",
    description: "A public directory of scholarship opportunities with links to the original providers.",
    audience: "Students seeking scholarships",
    canonicalUrl: "https://portal.estherfundsfoundation.org/scholarships",
    eligibilitySummary: "Each scholarship provider determines eligibility, deadlines, and selection.",
    costDescription: "Free to browse.",
    status: "open",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["scholarship", "grant", "funding", "money", "award"],
  },
  {
    programId: "mentoring",
    officialName: "EFF Mentoring",
    description: "EFF's mentoring destination for students and prospective mentors.",
    audience: "Students and mentors",
    canonicalUrl: "https://mentor.estherfundsfoundation.org",
    eligibilitySummary: "Current participation and matching rules must be confirmed on the official site.",
    costDescription: "Not confirmed in the approved record.",
    status: "unknown",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["mentor", "mentee", "guidance", "future link"],
  },
  {
    programId: "reach",
    officialName: "REACH",
    description: "EFF's response to educational barriers connected to basic needs and college persistence.",
    audience: "College students navigating basic-needs barriers",
    canonicalUrl: "https://reach.estherfundsfoundation.org",
    eligibilitySummary: "Current services and access rules must be confirmed on the official site.",
    costDescription: "Not confirmed in the approved record.",
    status: "unknown",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["reach", "food", "hygiene", "basic needs", "dropout"],
  },
  {
    programId: "beyond",
    officialName: "EFF Beyond",
    description: "EFF's approved community destination for graduates and people navigating education-to-career transitions.",
    audience: "Graduates and emerging professionals",
    canonicalUrl: "https://beyond.estherfundsfoundation.org",
    eligibilitySummary: "Current opportunities must be confirmed on the official site.",
    costDescription: "Not confirmed in the approved record.",
    status: "unknown",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["after graduation", "alumni", "career", "beyond", "graduate"],
  },
  {
    programId: "k12",
    officialName: "EFF K–12",
    description: "A planned EFF pathway for K–12 students, families, and school communities.",
    audience: "K–12 students, families, and educators",
    canonicalUrl: "https://k12.estherfundsfoundation.org",
    eligibilitySummary: "The program is not yet accepting participants through Ask EFF.",
    costDescription: "Not applicable while coming soon.",
    status: "coming_soon",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["k12", "k-12", "high school", "middle school", "parent"],
  },
  {
    programId: "recommendation-letters",
    officialName: "Free Scholarship Recommendation Letter Requests",
    description: "Students may request a scholarship recommendation letter through the approved National Office email process.",
    audience: "Students requesting scholarship recommendation letters",
    canonicalUrl: "mailto:nationals@estherfundsinc.org?subject=Free%20Scholarship%20Recommendation%20Letter%20Request",
    contact: "nationals@estherfundsinc.org",
    eligibilitySummary: "Acceptance and turnaround time are not guaranteed; the National Office confirms requests.",
    costDescription: "Free request process.",
    status: "open",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["recommendation", "letter", "reference", "sign"],
  },
  {
    programId: "start-eff-chapter",
    officialName: "Start an EFF Chapter",
    description: "The only approved interest process for starting an Esther Funds Foundation chapter.",
    audience: "Students interested in founding an EFF chapter",
    canonicalUrl: "https://form.jotform.com/261806820999067",
    eligibilitySummary: "Applicants should use the official interest form; current chapter status should be confirmed before starting a new chapter.",
    costDescription: "Any dues or costs require confirmation from the National Office.",
    status: "open",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["chapter", "start", "founder", "campus", "leadership"],
  },
  {
    programId: "pgws",
    officialName: "Pretty Girls Who Serve",
    description: "A distinct service and sisterhood community within the broader EFF ecosystem; its chapter process is separate from EFF's chapter form.",
    audience: "People interested in PGWS service, sisterhood, and leadership",
    canonicalUrl: "https://prettygirlswhoserve.org",
    eligibilitySummary: "Use the official PGWS site for current participation requirements.",
    costDescription: "Current costs or dues must be confirmed on the official site.",
    status: "unknown",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["pgws", "pretty girls", "sisterhood", "serve"],
  },
  {
    programId: "black-girls-read-rise",
    officialName: "Black Girls Read & Rise",
    description: "An approved EFF ecosystem destination focused on reading and community.",
    audience: "People interested in the Black Girls Read & Rise community",
    canonicalUrl: "https://blackgirlsreadandrise.org",
    eligibilitySummary: "Use the official site for current participation requirements.",
    costDescription: "Not confirmed in the approved record.",
    status: "unknown",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["black girls read", "read and rise", "reading", "book"],
  },
  {
    programId: "financial-assistance",
    officialName: "EFF Financial Assistance",
    description: "General financial assistance is paused until a separately approved reopening; separately announced giveaways may operate under their own terms.",
    audience: "Students seeking financial assistance",
    canonicalUrl: "https://portal.estherfundsfoundation.org/resources",
    eligibilitySummary: "No general award is promised. Current status must come from the approved Ask EFF registry.",
    costDescription: "Not applicable.",
    status: "paused",
    approvalStatus: "approved",
    sourceReference: "Owner-supplied Ask EFF project brief",
    version: 1,
    searchTerms: ["pay rent", "financial assistance", "emergency money", "balance", "grant today"],
  },
];

export function relevantPrograms(text: string, limit = 4) {
  const query = text.toLowerCase();
  const matches = ownerApprovedPrograms
    .map((program) => ({program, score: program.searchTerms.reduce((score, term) => score + (query.includes(term) ? term.length : 0), 0)}))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || ownerApprovedPrograms.indexOf(left.program) - ownerApprovedPrograms.indexOf(right.program))
    .map((item) => item.program);
  return (matches.length ? matches : ownerApprovedPrograms.filter((program) => ["student-resources", "scholarship-directory"].includes(program.programId))).slice(0, limit);
}

export function programSources(programs: AskEffProgram[], accessedAt = new Date().toISOString()): EvidenceSource[] {
  return programs.map((program, index) => ({
    id: `EFF${index + 1}`,
    title: program.officialName,
    url: program.canonicalUrl,
    sourceType: program.programId === "scholarship-directory" ? "scholarship_directory" : "eff_program",
    accessedAt,
  }));
}
