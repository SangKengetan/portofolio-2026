/**
 * MOCK DATA — placeholder content used while the API (apps/api) is not built yet.
 * Every object matches the API response types in @portfolio/shared, so switching to the
 * real backend only requires setting API_URL (see lib/api.ts).
 *
 * TODO(content): replace names, text, numbers and /placeholders/* images with real content.
 */
import type {
  Achievement,
  Certificate,
  ContributionDay,
  Experience,
  GithubContributions,
  Media,
  Profile,
  ProjectBlock,
  ProjectCategory,
  ProjectDetail,
  ProjectSummary,
  Stats,
  Technology,
} from "@portfolio/shared";

const img = (id: string, url: string, alt: string, width = 1600, height = 1000): Media => ({
  id,
  url,
  alt,
  width,
  height,
});

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */
export const mockProfile: Profile = {
  fullName: "Raka Pratama",
  shortName: "Raka",
  roles: ["Full-Stack Web Developer", "UI/UX Designer", "Data Analyst"],
  headline: "I build web systems, design clear interfaces, and turn data into decisions.",
  statement:
    "I build **web systems**, design **clear interfaces**, and turn data into **decisions**.",
  bio: "Developer and designer who owns products end to end — from the database schema and API to the interface people actually use, and the dashboards that show whether it worked.",
  location: "Indonesia",
  timezone: "Asia/Makassar",
  email: "hello@example.com",
  handle: "@rakapratama",
  availableForWork: true,
  socials: {
    github: "https://github.com/username",
    linkedin: "https://www.linkedin.com/in/username",
    dribbble: "https://dribbble.com/username",
  },
  // TODO(asset): replace with your real photo (portrait, ≥ 900×1100px).
  photo: img("m-photo", "/placeholders/portrait.svg", "Portrait of Raka Pratama", 900, 1100),
  // TODO(asset): replace with the URL of your CV PDF (served from /uploads).
  cvUrl: "/placeholders/cv-placeholder.pdf",
  seoTitle: "Raka Pratama — Web Developer, UI/UX & Data",
  seoDescription:
    "Portfolio of Raka Pratama: full-stack web projects, UI/UX case studies, data analysis, certificates and achievements.",
};

/* ------------------------------------------------------------------ */
/* Technologies                                                        */
/* ------------------------------------------------------------------ */
const techList: Array<[string, Technology["group"]]> = [
  ["React", "web"],
  ["Next.js", "web"],
  ["TypeScript", "web"],
  ["Tailwind CSS", "web"],
  ["Node.js", "web"],
  ["Express", "web"],
  ["Laravel", "web"],
  ["PostgreSQL", "web"],
  ["Figma", "uiux"],
  ["Prototyping", "uiux"],
  ["User Research", "uiux"],
  ["Usability Testing", "uiux"],
  ["Design Systems", "uiux"],
  ["Python", "data"],
  ["SQL", "data"],
  ["Pandas", "data"],
  ["Excel", "data"],
  ["Power BI", "data"],
  ["Tableau", "data"],
  ["Git", "tools"],
  ["Docker", "tools"],
  ["Postman", "tools"],
  ["Notion", "tools"],
];

export const mockTechnologies: Technology[] = techList.map(([name, group], i) => ({
  id: i + 1,
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  group,
  iconKey: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
}));

const tech = (...names: string[]) =>
  names.map((n) => {
    const t = mockTechnologies.find((x) => x.name === n);
    if (!t) throw new Error(`Unknown technology in mock data: ${n}`);
    return t;
  });

/* ------------------------------------------------------------------ */
/* Experiences                                                         */
/* ------------------------------------------------------------------ */
export const mockExperiences: Experience[] = [
  {
    id: "exp-1",
    role: "Full-Stack Web Developer",
    company: "PT Example Teknologi",
    location: "Remote",
    employmentType: "internship",
    startDate: "2025-08-01",
    endDate: null,
    description:
      "Building an internal learning management system that coordinates employee training — from planning and approval to scheduling, attendance and reporting.",
    highlights: [
      "Requirements to delivery",
      "Workflow & data design",
      "Role-based access control",
      "Testing & handover",
    ],
    image: img("m-exp-1", "/placeholders/experience-1.svg", "Team working session at the office", 1200, 1200),
    technologies: tech("Laravel", "React", "PostgreSQL"),
  },
  {
    id: "exp-2",
    role: "Backend Developer",
    company: "Campus IT Directorate",
    location: "On-site",
    employmentType: "part_time",
    startDate: "2025-02-01",
    endDate: "2025-06-30",
    description:
      "Supported the development of internal system modules by building RESTful APIs, designing relational database logic, and documenting endpoints for team use.",
    highlights: [
      "RESTful API development",
      "Relational database design",
      "Daily stand-up",
      "Swagger API documentation",
    ],
    image: img("m-exp-2", "/placeholders/experience-2.svg", "Laptop showing an API dashboard in a meeting room", 1200, 1200),
    technologies: tech("Node.js", "Express", "PostgreSQL"),
  },
  {
    id: "exp-3",
    role: "UI/UX & Data Intern",
    company: "Example Digital Studio",
    location: "Hybrid",
    employmentType: "internship",
    startDate: "2024-07-01",
    endDate: "2024-12-31",
    description:
      "Designed product flows in Figma, ran usability sessions with real users, and built weekly KPI dashboards that the product team used for planning.",
    highlights: [
      "Wireframes to hi-fi",
      "Usability testing",
      "KPI dashboard in Power BI",
      "Design system tokens",
    ],
    image: img("m-exp-3", "/placeholders/experience-3.svg", "Design review with sticky notes on a wall", 1200, 1200),
    technologies: tech("Figma", "Power BI", "SQL"),
  },
];

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */
type Seed = Omit<ProjectDetail, "nextProject" | "cover" | "technologies" | "publishedAt"> & {
  tech: string[];
  publishedAt: string;
};

const cover = (slug: string, title: string) =>
  img(`m-cover-${slug}`, `/placeholders/project-${slug}.svg`, `${title} — cover screenshot`, 1600, 1000);

const screen = (slug: string, n: number, alt: string) =>
  img(`m-${slug}-s${n}`, `/placeholders/screen-${(n % 4) + 1}.svg`, alt, 1600, 1000);

const blocksWeb = (slug: string): ProjectBlock[] => [
  {
    id: `${slug}-b1`,
    type: "rich_text",
    heading: "Overview & problem",
    data: {
      html: "<p>Training at the company was planned in spreadsheets and approved over chat. Nobody could see <strong>who had been trained, on what, and when</strong> — and HR spent two days every month assembling reports by hand.</p><p>The goal: one system that covers the whole training lifecycle, from planning to the final report.</p>",
    },
  },
  {
    id: `${slug}-b2`,
    type: "gallery",
    heading: "Key features",
    data: {
      columns: 2,
      items: [
        { media: screen(slug, 0, "Dashboard with upcoming trainings"), caption: "Dashboard — upcoming sessions at a glance" },
        { media: screen(slug, 1, "Training schedule calendar"), caption: "Training schedule with approval status" },
        { media: screen(slug, 2, "Course detail page"), caption: "Course detail and materials" },
        { media: screen(slug, 3, "Attendance report"), caption: "Automatic attendance report" },
      ],
    },
  },
  {
    id: `${slug}-b3`,
    type: "list",
    heading: "Architecture & tech stack",
    data: {
      style: "bullet",
      items: [
        "Laravel 11 REST API with role-based policies (admin, HR, trainer, employee)",
        "React front-end with server-side pagination and optimistic updates",
        "PostgreSQL with audit tables for every approval step",
        "Queued email reminders so nobody misses a session",
      ],
    },
  },
  {
    id: `${slug}-b4`,
    type: "code",
    heading: "Technical challenge: overlapping schedules",
    data: {
      language: "sql",
      code: "-- Reject a session that overlaps an existing one in the same room\nSELECT 1\nFROM training_sessions\nWHERE room_id = $1\n  AND tstzrange(starts_at, ends_at) && tstzrange($2, $3)\nLIMIT 1;",
    },
  },
  {
    id: `${slug}-b5`,
    type: "rich_text",
    heading: "Lessons learned",
    data: {
      html: "<p>Shipping the approval flow first — before the nice-to-have features — meant HR used the system from week three, and their feedback shaped everything after.</p>",
    },
  },
];

const blocksUiux = (slug: string): ProjectBlock[] => [
  {
    id: `${slug}-b1`,
    type: "rich_text",
    heading: "Problem statement",
    data: {
      html: "<p>First-time users abandoned the transfer flow at the confirmation step. Interviews showed they <strong>didn't trust what they were about to send</strong> — fees and the recipient's name appeared only after tapping “Confirm”.</p>",
    },
  },
  {
    id: `${slug}-b2`,
    type: "list",
    heading: "User research & insight",
    data: {
      style: "numbered",
      items: [
        "8 interviews with students and young professionals",
        "Fees shown late was the #1 reason for abandoning a transfer",
        "Users want to double-check the recipient name before entering an amount",
      ],
    },
  },
  {
    id: `${slug}-b3`,
    type: "quote",
    heading: "User persona",
    data: {
      text: "I just want to know exactly how much leaves my account before I press anything.",
      author: "Dinda, 21 — university student, persona “Careful Saver”",
    },
  },
  {
    id: `${slug}-b4`,
    type: "before_after",
    heading: "Wireframe → hi-fi",
    data: {
      before: screen(slug, 2, "Original transfer screen"),
      after: screen(slug, 0, "Redesigned transfer screen"),
      caption: "The recipient and total cost now appear before the amount is confirmed.",
    },
  },
  {
    id: `${slug}-b5`,
    type: "embed",
    heading: "Prototype",
    data: {
      provider: "figma",
      // TODO(content): replace with your Figma prototype link
      url: "https://www.figma.com/proto/example",
      title: "Transfer flow prototype",
    },
  },
  {
    id: `${slug}-b6`,
    type: "metrics",
    heading: "Usability test & iteration",
    data: {
      items: [
        { value: "5/5", label: "participants completed the task" },
        { value: "-38%", label: "time on task" },
        { value: "2", label: "iterations" },
      ],
    },
  },
];

const blocksData = (slug: string): ProjectBlock[] => [
  {
    id: `${slug}-b1`,
    type: "rich_text",
    heading: "Business question",
    data: {
      html: "<p>Which product categories and regions drive margin — and where is the company <strong>losing money on discounts</strong>?</p>",
    },
  },
  {
    id: `${slug}-b2`,
    type: "list",
    heading: "Dataset & sources",
    data: {
      style: "bullet",
      items: [
        "3 years of transactions (≈ 120k rows) exported from the POS system",
        "Product master and regional targets from Excel files",
        "Cleaned in Python (Pandas), modelled in SQL, visualised in Power BI",
      ],
    },
  },
  {
    id: `${slug}-b3`,
    type: "code",
    heading: "Process: cleaning → EDA → modelling",
    data: {
      language: "python",
      code: "df = pd.read_csv('sales.csv', parse_dates=['order_date'])\ndf = df.drop_duplicates('order_id')\ndf['margin'] = (df['revenue'] - df['cost']) / df['revenue']\nby_discount = df.groupby(pd.cut(df['discount'], [0, .1, .2, .3, 1]))['margin'].mean()",
    },
  },
  {
    id: `${slug}-b4`,
    type: "image",
    heading: "Key visualisation",
    data: {
      media: screen(slug, 3, "Dashboard showing margin by discount band"),
      caption: "Margin turns negative once discounts exceed 20%.",
      frame: "browser",
    },
  },
  {
    id: `${slug}-b5`,
    type: "list",
    heading: "Insights & recommendations",
    data: {
      style: "numbered",
      items: [
        "Cap discounts at 20% for low-margin categories",
        "Move marketing budget from the weakest region to the two fastest-growing ones",
        "Review supplier pricing for the three categories with negative margin",
      ],
    },
  },
];

const blocksFor = (category: ProjectCategory, slug: string) =>
  category === "web" ? blocksWeb(slug) : category === "uiux" ? blocksUiux(slug) : blocksData(slug);

const base = {
  team: null,
  client: null,
  demoUrl: null,
  repoUrl: null,
  figmaUrl: null,
  dashboardUrl: null,
  notebookUrl: null,
  seoDescription: null,
} satisfies Partial<Seed>;

const seeds: Seed[] = [
  {
    ...base,
    id: "p-1",
    slug: "learning-management-system",
    title: "Learning Management System",
    category: "web",
    summary:
      "An internal LMS that coordinates employee training — from planning and approval to scheduling, attendance and reporting.",
    impactLine: "Cut monthly training reports from 2 days to 10 minutes.",
    impactStatement:
      "Adopted across the organisation within a month, replacing spreadsheets and chat approvals with one auditable workflow.",
    role: "Full-Stack Developer",
    team: "3 developers, 1 PM",
    client: "PT Example Teknologi",
    year: 2026,
    startedAt: "2025-08-01",
    endedAt: "2026-02-28",
    contributions: [
      "Designed the database schema and approval workflow with HR",
      "Built the REST API and role-based access control",
      "Developed the dashboard, calendar and reporting screens",
      "Wrote automated tests for every approval transition",
    ],
    demoUrl: "https://example.com",
    repoUrl: "https://github.com/username/lms",
    metrics: [
      { value: "300", label: "active employees" },
      { value: "15", label: "departments onboarded" },
      { value: "99%", label: "report time saved" },
    ],
    isFeatured: true,
    tech: ["Laravel", "React", "PostgreSQL", "Tailwind CSS"],
    publishedAt: "2026-03-01",
    blocks: [],
  },
  {
    ...base,
    id: "p-2",
    slug: "banking-app-redesign",
    title: "Mobile Banking Transfer Redesign",
    category: "uiux",
    summary:
      "Redesigned the money-transfer flow of a mobile banking app so first-time users trust what they send.",
    impactLine: "Task completion up from 3/5 to 5/5 participants.",
    impactStatement:
      "Showing the recipient and total cost up front removed the biggest reason users abandoned a transfer.",
    role: "UI/UX Designer",
    team: "Solo project",
    year: 2025,
    startedAt: "2025-09-01",
    endedAt: "2025-11-15",
    contributions: [
      "Interviewed 8 users and mapped the current journey",
      "Defined two personas and the core problem statement",
      "Designed wireframes, hi-fi screens and an interactive prototype",
      "Ran two rounds of moderated usability tests",
    ],
    figmaUrl: "https://www.figma.com/file/example",
    metrics: [
      { value: "-38%", label: "time on task" },
      { value: "8", label: "user interviews" },
      { value: "2", label: "test iterations" },
    ],
    isFeatured: true,
    tech: ["Figma", "Prototyping", "User Research", "Usability Testing"],
    publishedAt: "2025-11-20",
    blocks: [],
  },
  {
    ...base,
    id: "p-3",
    slug: "retail-sales-dashboard",
    title: "Retail Sales & Margin Analysis",
    category: "data",
    summary:
      "Analysed three years of retail transactions to find where discounts erode margin, and built a dashboard for weekly reviews.",
    impactLine: "Found a discount band losing 4% margin on every sale.",
    impactStatement:
      "The analysis led to a discount cap on low-margin categories and became the basis of the weekly sales review.",
    role: "Data Analyst",
    team: "2 analysts",
    year: 2025,
    startedAt: "2025-03-01",
    endedAt: "2025-05-30",
    contributions: [
      "Cleaned and merged 120k transactions from three sources",
      "Explored margin drivers with Python and SQL",
      "Built the Power BI dashboard used in weekly reviews",
      "Presented recommendations to the sales lead",
    ],
    dashboardUrl: "https://app.powerbi.com/example",
    notebookUrl: "https://github.com/username/retail-analysis",
    metrics: [
      { value: "120k", label: "rows analysed" },
      { value: "4%", label: "margin recovered" },
      { value: "12", label: "KPIs tracked weekly" },
    ],
    isFeatured: true,
    tech: ["Python", "Pandas", "SQL", "Power BI"],
    publishedAt: "2025-06-02",
    blocks: [],
  },
  {
    ...base,
    id: "p-4",
    slug: "flight-booking-platform",
    title: "Flight Booking & E-Ticketing Platform",
    category: "web",
    summary:
      "A booking platform with seat selection, payment gateway integration and e-tickets delivered by email.",
    impactLine: "Checkout in under 90 seconds on mobile.",
    impactStatement: "Built as a capstone project and demoed to 40+ reviewers with zero failed bookings.",
    role: "Front-End Lead",
    team: "5 developers",
    year: 2025,
    startedAt: "2025-01-10",
    endedAt: "2025-04-20",
    contributions: [
      "Led the front-end architecture and component library",
      "Built search, seat selection and checkout",
      "Integrated the payment sandbox and e-ticket emails",
    ],
    demoUrl: "https://example.com",
    repoUrl: "https://github.com/username/flight-booking",
    metrics: [
      { value: "90s", label: "mobile checkout" },
      { value: "40+", label: "demo reviewers" },
    ],
    isFeatured: true,
    tech: ["Next.js", "TypeScript", "Node.js", "PostgreSQL"],
    publishedAt: "2025-04-25",
    blocks: [],
  },
  {
    ...base,
    id: "p-5",
    slug: "campus-event-app",
    title: "Campus Event App",
    category: "uiux",
    summary: "A mobile app concept that helps students discover, register for and remember campus events.",
    impactLine: "SUS score of 82 in the final usability round.",
    impactStatement: "Validated with 12 students; the design was handed over to the student council's dev team.",
    role: "UI/UX Designer",
    team: "2 designers",
    year: 2024,
    startedAt: "2024-09-01",
    endedAt: "2024-11-01",
    contributions: ["Ran a survey with 60 students", "Designed the event discovery flow", "Built the design system"],
    figmaUrl: "https://www.figma.com/file/example",
    metrics: [
      { value: "82", label: "SUS score" },
      { value: "60", label: "survey responses" },
    ],
    isFeatured: false,
    tech: ["Figma", "Design Systems", "User Research"],
    publishedAt: "2024-11-05",
    blocks: [],
  },
  {
    ...base,
    id: "p-6",
    slug: "customer-churn-analysis",
    title: "Customer Churn Analysis",
    category: "data",
    summary: "Identified the behaviours that predict churn for a subscription service and segmented at-risk customers.",
    impactLine: "Flagged 18% of customers as high churn risk.",
    impactStatement: "The segmentation fed a targeted retention campaign for the highest-risk group.",
    role: "Data Analyst",
    year: 2024,
    startedAt: "2024-04-01",
    endedAt: "2024-05-15",
    contributions: ["Feature engineering on usage logs", "Logistic regression baseline", "Tableau story for stakeholders"],
    notebookUrl: "https://github.com/username/churn-analysis",
    metrics: [
      { value: "0.84", label: "ROC-AUC" },
      { value: "18%", label: "high-risk customers" },
    ],
    isFeatured: false,
    tech: ["Python", "SQL", "Tableau"],
    publishedAt: "2024-05-20",
    blocks: [],
  },
  {
    ...base,
    id: "p-7",
    slug: "clinic-queue-system",
    title: "Clinic Queue System",
    category: "web",
    summary: "A real-time queue and appointment system for a small clinic, with a TV display and WhatsApp notifications.",
    impactLine: "Average waiting-room time down by 25 minutes.",
    impactStatement: "Patients now wait at home until their turn is near instead of in a crowded room.",
    role: "Full-Stack Developer",
    year: 2024,
    startedAt: "2024-01-15",
    endedAt: "2024-03-30",
    contributions: ["Built the queue API and admin panel", "Real-time TV display", "WhatsApp notification integration"],
    repoUrl: "https://github.com/username/clinic-queue",
    metrics: [
      { value: "25m", label: "less waiting" },
      { value: "1.2k", label: "patients / month" },
    ],
    isFeatured: false,
    tech: ["Laravel", "React", "Docker"],
    publishedAt: "2024-04-02",
    blocks: [],
  },
];

const toSummary = (s: Seed): ProjectSummary => ({
  id: s.id,
  slug: s.slug,
  title: s.title,
  category: s.category,
  summary: s.summary,
  impactLine: s.impactLine,
  year: s.year,
  cover: cover(s.slug, s.title),
  isFeatured: s.isFeatured,
  technologies: s.tech,
  publishedAt: s.publishedAt,
});

/** Sorted like the API: newest first. */
export const mockProjects: ProjectSummary[] = seeds
  .map(toSummary)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function mockProjectDetail(slug: string): ProjectDetail | null {
  const index = mockProjects.findIndex((p) => p.slug === slug);
  if (index === -1) return null;
  const s = seeds.find((x) => x.slug === slug)!;
  const { tech: techNames, blocks, ...rest } = s;
  return {
    ...rest,
    cover: cover(s.slug, s.title),
    technologies: tech(...techNames),
    blocks: blocks.length ? blocks : blocksFor(s.category, s.slug),
    nextProject: mockProjects[(index + 1) % mockProjects.length],
  };
}

/* ------------------------------------------------------------------ */
/* Certificates & achievements                                         */
/* ------------------------------------------------------------------ */
const cert = (
  n: number,
  title: string,
  issuer: string,
  category: Certificate["category"],
  issuedAt: string,
  verified: boolean,
  isFeatured: boolean,
): Certificate => ({
  id: `c-${n}`,
  title,
  issuer,
  category,
  issuedAt,
  expiresAt: null,
  credentialId: verified ? `EX-${1000 + n}` : null,
  credentialUrl: verified ? "https://example.com/credential" : null,
  image: img(`m-cert-${n}`, `/placeholders/certificate-${((n - 1) % 3) + 1}.svg`, `${title} certificate`, 1400, 990),
  issuerLogo: null, // TODO(asset): upload issuer logos; a monogram is shown meanwhile
  isFeatured,
});

export const mockCertificates: Certificate[] = [
  cert(1, "Front-End Web Developer Expert", "Dicoding", "web", "2025-09-12", true, true),
  cert(2, "Google UX Design Professional Certificate", "Google · Coursera", "uiux", "2025-05-20", true, true),
  cert(3, "Google Data Analytics Professional Certificate", "Google · Coursera", "data", "2025-02-11", true, true),
  cert(4, "Back-End Developer with JavaScript", "Dicoding", "web", "2024-11-03", true, true),
  cert(5, "SQL for Data Analysis", "Example Academy", "data", "2024-08-19", false, false),
  cert(6, "Responsive Web Design", "freeCodeCamp", "web", "2024-03-02", true, false),
  cert(7, "Design Thinking Bootcamp", "Example Institute", "uiux", "2024-01-15", false, false),
  cert(8, "English Proficiency (TOEFL ITP)", "ETS", "other", "2023-10-10", false, false),
];

export const mockAchievements: Achievement[] = [
  {
    id: "a-1",
    title: "1st Place — UI/UX Design Competition",
    organizer: "Example National Tech Week",
    level: "national",
    rankLabel: "1st Place",
    achievedAt: "2025-10-18",
    description: "Designed a public-service app for reporting broken street lights.",
    linkUrl: "https://example.com",
  },
  {
    id: "a-2",
    title: "Finalist — Data Analytics Challenge",
    organizer: "Example Data Community",
    level: "national",
    rankLabel: "Finalist",
    achievedAt: "2024-12-07",
    description: "Top 10 out of 180 teams with a public-transport ridership analysis.",
    linkUrl: null,
  },
  {
    id: "a-3",
    title: "Best App — Campus Hackathon",
    organizer: "University Student Council",
    level: "university",
    rankLabel: "Best App",
    achievedAt: "2024-05-25",
    description: "Built a clinic queue prototype in 36 hours.",
    linkUrl: null,
  },
  {
    id: "a-4",
    title: "Scholarship Awardee",
    organizer: "Example Foundation",
    level: "regional",
    rankLabel: "Awardee",
    achievedAt: "2023-09-01",
    description: null,
    linkUrl: null,
  },
];

/* ------------------------------------------------------------------ */
/* Stats (computed like GET /stats)                                    */
/* ------------------------------------------------------------------ */
export const mockStats: Stats = {
  projects: {
    web: mockProjects.filter((p) => p.category === "web").length,
    uiux: mockProjects.filter((p) => p.category === "uiux").length,
    data: mockProjects.filter((p) => p.category === "data").length,
    total: mockProjects.length,
  },
  certificates: mockCertificates.length,
  achievements: mockAchievements.length,
  yearsExperience: 2,
};

/* ------------------------------------------------------------------ */
/* GitHub contributions — deterministic fake heatmap                   */
/* ------------------------------------------------------------------ */
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

function buildContributions(): GithubContributions {
  const rand = seeded(42);
  const end = new Date("2026-10-24T00:00:00Z"); // a Saturday
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 52 * 7 - 6); // Sunday, 53 columns
  const weeks: ContributionDay[][] = [];
  let total = 0;
  let active = 0;
  let streak = 0;
  let longest = 0;
  for (let w = 0; w < 53; w++) {
    const week: ContributionDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + w * 7 + d);
      const weekend = d === 0 || d === 6;
      const busy = Math.sin(w / 5) * 0.25 + 0.55;
      const r = rand();
      const count = r < (weekend ? 0.55 : 0.28) ? 0 : Math.round(rand() * 9 * busy + 1);
      const level = (count === 0 ? 0 : count < 3 ? 1 : count < 5 ? 2 : count < 7 ? 3 : 4) as ContributionDay["level"];
      total += count;
      if (count > 0) {
        active++;
        streak++;
        longest = Math.max(longest, streak);
      } else streak = 0;
      week.push({ date: date.toISOString().slice(0, 10), count, level });
    }
    weeks.push(week);
  }
  return {
    username: "username",
    profileUrl: "https://github.com/username",
    totalLastYear: total,
    longestStreak: longest,
    activeDaysPercent: Math.round((active / (53 * 7)) * 100),
    weeks,
  };
}

export const mockContributions: GithubContributions = buildContributions();
