// ─────────────────────────────────────────────────────────────────────────────
// ALL OF YOUR PERSONAL CONTENT LIVES IN THIS ONE FILE.
//
// Every line marked "PLACEHOLDER" is something you still need to replace with
// your own details. Keep the quotes and commas; only change the text inside the
// quotes. Save the file and the site updates on its own while `npm run dev`
// is running.
//
// Images: any public image link works (for example one copied from your
// Dribbble, Behance or Google Drive "anyone with the link" share). You can also
// put image files in a folder called `public/images/` and write the path as
// "/images/your-file.jpg".
// ─────────────────────────────────────────────────────────────────────────────

export type Project = {
  title: string;
  category: string;
  image: string;
  /** Optional. Where the card goes when clicked. Leave out to make it non-clickable. */
  href?: string;
};

export type JournalEntry = {
  title: string;
  image: string;
  readTime: string;
  date: string;
  /** Optional. Link to the full article. */
  href?: string;
};

export type Exploration = {
  title: string;
  image: string;
};

export type Stat = {
  value: string;
  label: string;
};

export type SocialLink = {
  label: string;
  href: string;
};

export type Experience = {
  role: string;
  company: string;
  period: string;
  location?: string;
  description: string;
};

export type Education = {
  school: string;
  degree: string;
  period: string;
};

export const profile = {
  name: "Your Name", // PLACEHOLDER
  initials: "YN", // PLACEHOLDER: shown inside the round logo
  city: "Your City", // PLACEHOLDER: "A Designer lives in ___."
  // PLACEHOLDER: the words that cycle in "A ___ lives in Your City."
  roles: ["Your Role", "Second Role", "Third Role"],
  // PLACEHOLDER: one plain sentence about what you do and who you do it for.
  description:
    "Replace this with one sentence about the work you do and who you do it for.",
  email: "you@example.com", // PLACEHOLDER
  availability: {
    available: true, // set to false to show a grey dot instead of a green one
    label: "Available for projects",
  },
};

export const links = {
  // PLACEHOLDER: where the "View all work" button goes.
  allWork: "https://dribbble.com/your-handle",
  // PLACEHOLDER: where the journal's "View all" button goes.
  journal: "https://medium.com/@your-handle",
  // PLACEHOLDER: the Dribbble button in the Explorations section.
  dribbble: "https://dribbble.com/your-handle",
};

export const socials: SocialLink[] = [
  { label: "Twitter", href: "https://x.com/your-handle" }, // PLACEHOLDER
  { label: "LinkedIn", href: "https://www.linkedin.com/in/your-handle" }, // PLACEHOLDER
  { label: "Dribbble", href: "https://dribbble.com/your-handle" }, // PLACEHOLDER
  { label: "GitHub", href: "https://github.com/your-handle" }, // PLACEHOLDER
];

// Exactly four projects fill the grid (wide, narrow, narrow, wide).
export const projects: Project[] = [
  {
    title: "Your Project Title", // PLACEHOLDER
    category: "Project type", // PLACEHOLDER
    image: "https://picsum.photos/seed/atlas/1200/900", // PLACEHOLDER
  },
  {
    title: "Second Project Title", // PLACEHOLDER
    category: "Project type", // PLACEHOLDER
    image: "https://picsum.photos/seed/harbor/1200/900", // PLACEHOLDER
  },
  {
    title: "Third Project Title", // PLACEHOLDER
    category: "Project type", // PLACEHOLDER
    image: "https://picsum.photos/seed/meadow/1200/900", // PLACEHOLDER
  },
  {
    title: "Fourth Project Title", // PLACEHOLDER
    category: "Project type", // PLACEHOLDER
    image: "https://picsum.photos/seed/summit/1200/900", // PLACEHOLDER
  },
];

export const journal: JournalEntry[] = [
  {
    title: "Your Journal Entry Title", // PLACEHOLDER
    image: "https://picsum.photos/seed/notebook/600/600", // PLACEHOLDER
    readTime: "5 min read", // PLACEHOLDER
    date: "Add date", // PLACEHOLDER
  },
  {
    title: "Second Journal Entry Title", // PLACEHOLDER
    image: "https://picsum.photos/seed/lantern/600/600", // PLACEHOLDER
    readTime: "4 min read", // PLACEHOLDER
    date: "Add date", // PLACEHOLDER
  },
  {
    title: "Third Journal Entry Title", // PLACEHOLDER
    image: "https://picsum.photos/seed/compass/600/600", // PLACEHOLDER
    readTime: "6 min read", // PLACEHOLDER
    date: "Add date", // PLACEHOLDER
  },
  {
    title: "Fourth Journal Entry Title", // PLACEHOLDER
    image: "https://picsum.photos/seed/horizon/600/600", // PLACEHOLDER
    readTime: "3 min read", // PLACEHOLDER
    date: "Add date", // PLACEHOLDER
  },
];

// Six images, split across two parallax columns.
export const explorations: Exploration[] = [
  { title: "Exploration 01", image: "https://picsum.photos/seed/ember/800/800" }, // PLACEHOLDER
  { title: "Exploration 02", image: "https://picsum.photos/seed/tide/800/800" }, // PLACEHOLDER
  { title: "Exploration 03", image: "https://picsum.photos/seed/prism/800/800" }, // PLACEHOLDER
  { title: "Exploration 04", image: "https://picsum.photos/seed/dune/800/800" }, // PLACEHOLDER
  { title: "Exploration 05", image: "https://picsum.photos/seed/orbit/800/800" }, // PLACEHOLDER
  { title: "Exploration 06", image: "https://picsum.photos/seed/grove/800/800" }, // PLACEHOLDER
];

export const stats: Stat[] = [
  { value: "00", label: "Years of experience" }, // PLACEHOLDER number
  { value: "00", label: "Projects completed" }, // PLACEHOLDER number
  { value: "00", label: "Clients worked with" }, // PLACEHOLDER number
];

export const resume = {
  // PLACEHOLDER: a link to a PDF of your resume. Leave as "" to hide the button.
  pdfUrl: "",
  summary:
    "Replace this with two or three sentences about your background and the kind of work you want to do next.", // PLACEHOLDER
  experience: [
    {
      role: "Your Job Title", // PLACEHOLDER
      company: "Company Name", // PLACEHOLDER
      period: "Start – End", // PLACEHOLDER, e.g. "2022 – Present"
      location: "City", // PLACEHOLDER (optional, delete the line to hide it)
      description: "One or two sentences about what you did and what came of it.", // PLACEHOLDER
    },
    {
      role: "Previous Job Title", // PLACEHOLDER
      company: "Company Name", // PLACEHOLDER
      period: "Start – End", // PLACEHOLDER
      description: "One or two sentences about what you did and what came of it.", // PLACEHOLDER
    },
  ] as Experience[],
  education: [
    {
      school: "School or University", // PLACEHOLDER
      degree: "Degree or Programme", // PLACEHOLDER
      period: "Start – End", // PLACEHOLDER
    },
  ] as Education[],
  // PLACEHOLDER: one short entry per skill.
  skills: ["Skill One", "Skill Two", "Skill Three", "Skill Four", "Skill Five", "Skill Six"],
};
