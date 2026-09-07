export const beyondStages = [
  "Recent graduate",
  "Graduate student",
  "Early-career professional",
  "Career transition",
  "Established professional",
] as const;

export const beyondInterests = [
  "Career growth", "Graduate school", "Entrepreneurship", "Faith", "Financial wellness",
  "New city", "Adult friendships", "Leadership", "Service", "Mentorship",
] as const;

export const beyondConnectionGoals = [
  "Meet people in my city", "Build professional friendships", "Find a mentor",
  "Mentor someone", "Join faith community", "Volunteer", "Lead a Circle",
] as const;

export const beyondCircles = [
  {slug:"new-to-the-city",name:"New to the City",kind:"Life season",description:"A soft landing for graduates building community in a new place.",accent:"01"},
  {slug:"first-gen-beyond",name:"First-Gen Beyond",kind:"Shared experience",description:"Navigate work, money, family expectations, and the unwritten rules together.",accent:"02"},
  {slug:"faith-and-work",name:"Faith & Work",kind:"Faith",description:"Honest conversation about purpose, calling, work, and spiritual rhythm.",accent:"03"},
  {slug:"career-pivot",name:"The Career Pivot",kind:"Career",description:"For members changing fields, rebuilding confidence, or deciding what comes next.",accent:"04"},
  {slug:"beyond-brotherhood",name:"Beyond Brotherhood",kind:"Community",description:"Connection, accountability, and honest support for men after college.",accent:"05"},
  {slug:"beyond-sisterhood",name:"Beyond Sisterhood",kind:"Community",description:"Friendship, faith, professional growth, and support for women after college.",accent:"06"},
] as const;

export const beyondResources = [
  {category:"Career",title:"I need a stronger résumé",description:"Turn experience into a clear, credible story before your next application.",action:"Build my career plan"},
  {category:"Workplace",title:"I need help navigating work",description:"Practical guidance for conflict, boundaries, feedback, benefits, and workplace culture.",action:"Open Workplace 101"},
  {category:"Life",title:"Nobody explained the graduation packet",description:"Start with budgeting, credit, insurance, taxes, housing, and adult routines.",action:"Open Life 101"},
  {category:"Support",title:"I need support right now",description:"Find trusted EFF and external resources without searching through scattered pages.",action:"Find support"},
] as const;
