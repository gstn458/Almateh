// ─────────────────────────────────────────────────────────────────────────────
// ALL SITE CONTENT LIVES IN THIS ONE FILE.
//
// Edit text inside the quotes and save; the dev server updates by itself.
//
// TODOs: search this file for "TODO". A field left as `undefined` shows up on
// the dev server (`npm run dev`) as a dashed amber "TODO" chip, and is simply
// left out of the production build, so an unfinished detail never ships.
//
// Screenshots: put image files in `public/images/` and set `image` to
// "/images/your-file.png" (plus a short `imageAlt` describing it). Until then
// each card shows a generated placeholder visual.
//
// Privacy: this is a public site. Keep location to city level ("Dubai, UAE")
// and do not add a phone number, home address or date of birth.
// ─────────────────────────────────────────────────────────────────────────────

export type Status = "Live" | "Published" | "In development" | "In progress" | "Upcoming";

/** Placeholder artwork drawn in code, used until a real screenshot is added. */
export type VisualKind = "lattice" | "orbit" | "paper" | "radar" | "layout" | "devlog";

export type Link = { label: string; href: string };

export type Project = {
  id: string;
  /** Full title, used in the detail view. */
  title: string;
  /** Optional shorter title for the card. */
  cardTitle?: string;
  /** One line shown on the card. */
  summary: string;
  status: Status;
  tags?: string[];
  links: Link[];
  visual: VisualKind;
  image?: string;
  imageAlt?: string;
  details: {
    problem?: string;
    built?: string;
    how?: string;
    learned?: string;
    /** Extra facts shown as a short list, e.g. publication details. */
    facts?: string[];
    /** Small plain note at the bottom of the detail view. */
    note?: string;
  };
};

export type ResearchItem = {
  kind: string;
  title: string;
  summary: string;
  status?: Status;
  link?: Link;
  note?: string;
};

export type Activity = {
  title: string;
  detail?: string;
  dates?: string;
  status?: Status;
};

export type Internship = {
  company: string;
  role?: string;
  dates?: string;
  summary?: string;
};

export type WritingEntry = {
  title: string;
  /** Set to true once the piece is out. The Writing section stays hidden until at least one is. */
  published: boolean;
  href?: string;
  readTime?: string;
  date?: string;
};

export type SideProject = {
  title: string;
  summary: string;
  visual: VisualKind;
  image?: string;
  imageAlt?: string;
  link?: Link;
};

// ── Site and metadata ────────────────────────────────────────────────────────

export const site = {
  title: "Tehzeeb Basha | Mathematics and Cryptography",
  description:
    "Tehzeeb Ali Gows Basha is an IB Diploma student in Dubai working on post quantum cryptography, mathematics and software.",
  // TODO: the public address of this site once it is deployed, e.g. "https://yourdomain.com"
  // (no trailing slash). Used for the sitemap, social previews and search metadata.
  url: "",
  ogImage: "/og.png", // TODO (optional): replace public/og.png with your own 1200 × 630 image
  ogImageAlt: "Tehzeeb Basha. Mathematics and cryptography.",
};

export const person = {
  name: "Tehzeeb Basha",
  fullName: "Tehzeeb Ali Gows Basha",
  chineseName: "白泽博",
  initials: "TB",
  location: "Dubai, UAE",
  school: "Dwight School Dubai",
  email: undefined as string | undefined, // TODO: the email address you want public
  availability: { open: true, label: "Open to opportunities" },
};

export const socials: Link[] = [
  { label: "GitHub", href: "https://github.com/gstn458" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/tehzeeb-ali" },
  { label: "cryptomath.org", href: "https://cryptomath.org" },
];

// ── Navigation and loader ────────────────────────────────────────────────────

export const nav = {
  home: "Home",
  work: "Work",
  resume: "Resume",
  contact: "Say hi",
};

export const loader = {
  label: "Portfolio",
  words: ["Research", "Build", "Teach"],
};

// ── Hero ─────────────────────────────────────────────────────────────────────

export const hero = {
  eyebrow: "Portfolio 2026",
  roleLine: {
    before: "A mathematics and ",
    emphasis: "cryptography",
    after: " student building in Dubai.",
  },
  description:
    "I research post quantum cryptography, build tools that make it usable, and teach the maths behind it.",
  primaryCta: "See my work",
  secondaryCta: "Get in touch",
  scrollLabel: "Scroll",
};

// ── Selected work ────────────────────────────────────────────────────────────

const paperTitle =
  "Quantum Resistant Cryptography and Its Implications for Blockchain and Cryptocurrency: A Comprehensive Mathematical Analysis";
const paperDoi = "https://doi.org/10.65161/reciVMFDoYuEGfYeh";
const paperCitation =
  "Oxford Journal of Student Scholarship, Vol. 10, Issue 4, August 2026, pp. 329–345.";
const journalNote =
  "The Oxford Journal of Student Scholarship is an independent publication. It is not affiliated with the University of Oxford.";

export const work = {
  eyebrow: "Selected work",
  title: "Featured",
  titleEmphasis: "projects",
  subtext: "What I'm building and what I've published.",
  allLink: { label: "More on GitHub", href: "https://github.com/gstn458" },
  detailsLabel: "Details",
};

// Shown in this order. The grid alternates wide and narrow cards.
export const projects: Project[] = [
  {
    id: "ratchet",
    title: "Ratchet",
    summary:
      "Scans a codebase for cryptography that quantum computers will break and produces a CycloneDX cryptographic bill of materials (CBOM).",
    status: "In development",
    tags: ["Post quantum cryptography", "Security tooling", "Open source"],
    links: [{ label: "GitHub", href: "https://github.com/gstn458/ratchet" }],
    visual: "lattice",
    image: undefined, // TODO: screenshot, e.g. "/images/ratchet.png"
    imageAlt: undefined, // TODO: describe the screenshot
    details: {
      problem: undefined, // TODO: the problem Ratchet solves, in your words
      built:
        "The scanner and its CycloneDX CBOM output. Automated migration pull requests are on the roadmap.",
      how: undefined, // TODO: how the scanner works
      learned: undefined, // TODO: what you learned
    },
  },
  {
    id: "cryptomath",
    title: "cryptomath.org",
    summary:
      "A bilingual English and Arabic interactive platform that teaches the mathematics of cryptography.",
    status: "Live",
    tags: ["Education", "Three.js", "Bilingual", "Cryptography"],
    links: [{ label: "Visit site", href: "https://cryptomath.org" }],
    visual: "orbit",
    image: undefined, // TODO: screenshot, e.g. "/images/cryptomath.png"
    imageAlt: undefined, // TODO: describe the screenshot
    details: {
      problem: undefined, // TODO: why you built it
      built:
        "I built it as my IB Personal Project, which was graded in the top band. Every page works in English and Arabic.",
      how: "One Three.js animated background runs across the whole site.",
      learned: undefined, // TODO: what you learned
    },
  },
  {
    id: "paper",
    title: paperTitle,
    cardTitle: "Quantum Resistant Cryptography and Blockchain",
    summary: "Published paper. A mathematical analysis of quantum resistant cryptography for blockchain and cryptocurrency.",
    status: "Published",
    tags: ["Research", "Post quantum cryptography", "Blockchain"],
    links: [{ label: "Read via DOI", href: paperDoi }],
    visual: "paper",
    image: undefined, // TODO (optional): image of the first page, e.g. "/images/paper.png"
    imageAlt: undefined,
    details: {
      problem: undefined, // TODO: the question the paper answers
      built: undefined, // TODO: a two line summary of the paper's argument
      how: undefined, // TODO: the method
      learned: undefined, // TODO: what you learned
      facts: [paperCitation, "DOI: 10.65161/reciVMFDoYuEGfYeh"],
      note: journalNote,
    },
  },
  {
    id: "radar",
    title: "Radar",
    summary:
      "Matches students to competitions, internships, research programs and summer schools, with a match score, a plain explanation of why, and a personal deadline tracker.",
    status: "In development",
    tags: undefined, // TODO: tags, e.g. tech used or field
    links: [], // TODO: link to Radar once it is public
    visual: "radar",
    image: undefined, // TODO: screenshot, e.g. "/images/radar.png"
    imageAlt: undefined,
    details: {
      problem: undefined, // TODO: the problem Radar solves
      built:
        "Every match comes with a score and a plain explanation of why it fits. A personal deadline tracker keeps the dates in one place.",
      how: undefined, // TODO: how the matching works
      learned: undefined, // TODO: what you learned
    },
  },
];

// ── Research ─────────────────────────────────────────────────────────────────

export const research = {
  eyebrow: "Research",
  title: "Questions I'm",
  titleEmphasis: "working on",
  subtext: "A published paper, a research proposal and two pieces of IB coursework.",
  items: [
    {
      kind: "Published paper",
      title: paperTitle,
      summary: paperCitation,
      status: "Published",
      link: { label: "DOI: 10.65161/reciVMFDoYuEGfYeh", href: paperDoi },
      note: journalNote,
    },
    {
      kind: "Research proposal",
      title: "LaVA: Lattice VRF with Aggregation",
      summary: "A post quantum, aggregatable verifiable random function for proof of stake consensus.",
      status: "In progress",
    },
    {
      kind: "IB Extended Essay, Mathematics HL",
      title: "Asset weighting and impermanent loss",
      summary:
        "How asset weighting in a constant product market maker affects a liquidity provider's impermanent loss, and which weighting minimises it.",
      status: "In progress",
    },
    {
      kind: "IB Mathematics AA HL Internal Assessment",
      title: "Modelling shuttlecock flight with drag",
      summary:
        "Uses real drop test data and numerical simulation to test whether aerodynamic drag explains the 13.4 m badminton court length. Written in LaTeX.",
      status: undefined, // TODO: status, e.g. "In progress"
    },
  ] as ResearchItem[],
};

// ── Experience ───────────────────────────────────────────────────────────────

export const experience: Internship[] = [
  {
    company: "DP World",
    role: undefined, // TODO: internship role
    dates: undefined, // TODO: dates
    summary: undefined, // TODO: one line on what you did
  },
  {
    company: "Beldex",
    role: undefined, // TODO: internship role
    dates: undefined, // TODO: dates
    summary: undefined, // TODO: one line on what you did
  },
  {
    company: "Zeru",
    role: undefined, // TODO: internship role
    dates: undefined, // TODO: dates
    summary: undefined, // TODO: one line on what you did
  },
];

// ── Leadership and competitions ──────────────────────────────────────────────

export const activities = {
  eyebrow: "Leadership and competitions",
  title: "School and",
  titleEmphasis: "competitions",
  subtext: "Leadership roles at Dwight School Dubai, then competitions and service.",
  leadershipHeading: "Leadership at Dwight School Dubai",
  competitionsHeading: "Competitions and service",
  // I am a prefect. Do not use Head Boy or Deputy Head anywhere.
  leadership: [
    { title: "Prefect Team member", dates: "2026 to 2027" },
    {
      title: "Student Council member",
      detail: undefined, // TODO: Student Council role
      dates: undefined, // TODO: years
    },
    {
      title: "House Captain",
      detail: undefined, // TODO: house name
      dates: undefined, // TODO: years
    },
    {
      title: "Dwight Ambassador",
      dates: undefined, // TODO: years
    },
  ] as Activity[],
  // No results are listed. Only change a status when there is a real result.
  competitions: [
    {
      title: "HMMT November 2026",
      detail: "Organised and registered an independent four person team (team DWIGHT).",
      status: "Upcoming",
    },
    {
      title: "Wharton Global High School Investment Competition",
      detail: "Team TAAD.",
      dates: "2026 to 2027",
      status: "In progress",
    },
    { title: "AMC 12A and 12B", dates: "November 2026", status: "Upcoming" },
    {
      title: "Junior Coach volunteer, Heroes of Hope UAE",
      detail: "Inclusive sport sessions.",
      dates: "Term 1, 2026 to 2027",
      status: "In progress",
    },
    {
      title: "Immerse Education Essay Competition",
      detail: "Mathematics essay on symmetry.",
      status: "In progress",
    },
  ] as Activity[],
};

// ── Writing ──────────────────────────────────────────────────────────────────

export const writing = {
  eyebrow: "Writing",
  title: "Notes on",
  titleEmphasis: "the maths",
  subtext: "Short explainers on the ideas behind my projects.",
  comingSoon: "Coming soon",
  // The whole section is hidden on the live site until one entry has published: true.
  entries: [
    { title: "Why Shor's algorithm breaks the signatures on your crypto wallet", published: false },
    { title: "What a cryptographic bill of materials is, and why every codebase needs one", published: false },
    { title: "The calculus of impermanent loss", published: false },
    { title: "What a falling shuttlecock taught me about drag", published: false },
  ] as WritingEntry[],
};

// ── Side projects ────────────────────────────────────────────────────────────

export const sideProjects = {
  eyebrow: "Experiments",
  title: "Side",
  titleEmphasis: "projects",
  subtext: "Smaller things I build and write outside the main projects.",
  cta: { label: "See more on GitHub", href: "https://github.com/gstn458" },
  items: [
    {
      title: "Three.js background experiments",
      summary: "Animated background studies from building cryptomath.org.",
      visual: "orbit",
      image: undefined, // TODO: screenshot or still
      imageAlt: undefined,
      link: undefined, // TODO (optional): link
    },
    {
      title: "Web design studies",
      summary: "Agency style layout and motion studies, inspired by studios like Monopo and Noomo.",
      visual: "layout",
      image: undefined, // TODO: screenshot
      imageAlt: undefined,
      link: undefined, // TODO (optional): link
    },
    {
      title: "Z Battlegrounds devlog",
      summary: "A YouTube devlog series I script for Z Battlegrounds, a Roblox game made by a friend.",
      visual: "devlog",
      image: undefined, // TODO: thumbnail
      imageAlt: undefined,
      link: undefined, // TODO: link to the YouTube series
    },
  ] as SideProject[],
};

// ── Stats (computed from the lists above, so they stay correct) ──────────────

const publishedPapers = research.items.filter((item) => item.status === "Published").length;

export const stats = [
  { value: publishedPapers, label: publishedPapers === 1 ? "Published paper" : "Published papers" },
  { value: experience.length, label: experience.length === 1 ? "Internship" : "Internships" },
  { value: projects.length, label: projects.length === 1 ? "Project built" : "Projects built" },
];

// ── Contact ──────────────────────────────────────────────────────────────────

export const contact = {
  marquee: ["Post quantum cryptography", "Mathematics", "Blockchain", "Research", "Web development"],
  eyebrow: "Get in touch",
  title: "Want to work on something",
  titleEmphasis: "together?",
  subtext: "Open to research collaborations, internships and interesting problems.",
  // Shown instead of the email button until person.email is set.
  fallbackCta: { label: "Message me on LinkedIn", href: "https://www.linkedin.com/in/tehzeeb-ali" },
  footer: "© 2026 Tehzeeb Basha",
};

// ── Resume page ──────────────────────────────────────────────────────────────

export const resume = {
  pageTitle: "Resume | Tehzeeb Ali Gows Basha",
  eyebrow: "Resume",
  headline: "IB Diploma student, Class of 2028",
  summary:
    "I am an IB Diploma student (DP1, Class of 2028) at Dwight School Dubai. My work sits where mathematics, cryptography and building software meet. I want to study Applied Mathematics at university.",
  // TODO: put your resume PDF at public/resume.pdf. The live site only shows
  // the button once that file exists.
  pdf: { label: "Download PDF", href: "/resume.pdf" },
  education: {
    school: "Dwight School Dubai",
    programme: "IB Diploma Programme",
    period: "Class of 2028",
    subjects: [
      "Mathematics Analysis and Approaches HL",
      "Physics HL",
      "Economics HL",
      "History HL",
      "English SL",
      "Mandarin ab initio",
      "Islamic B",
    ],
    core: ["Theory of Knowledge", "Extended Essay", "CAS"],
  },
  skills: [
    {
      group: "Mathematics and cryptography",
      items: [
        "Modular arithmetic",
        "Elliptic curves",
        "Lattice based cryptography",
        "Hash functions",
        "Zero knowledge proofs",
      ],
    },
    {
      group: "Web",
      items: ["Three.js"],
      todo: "confirm your stack, e.g. React, TypeScript, Vite", // TODO
    },
    { group: "Writing", items: ["LaTeX"] },
  ] as { group: string; items: string[]; todo?: string }[],
  closingTitle: "Want to work on something",
  closingEmphasis: "together?",
};
