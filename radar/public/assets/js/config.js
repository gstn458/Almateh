/**
 * Site-wide constants. Everything that changes between a draft and a launch
 * lives here so it is changed in one place, not hunted through the markup.
 */
export const SITE = {
  name: 'Radar',
  tagline: 'Every opportunity you were never told about',
  /* Set this to a real mailbox before launch. While it is null the UI points
     people at the contact form instead of printing a placeholder address. */
  contactEmail: null,
  /* Used for canonical URLs, sitemap entries and share links. */
  origin: 'https://radar.example.com',
  builtIn: 'Dubai',
  /* Paid tiers do not exist yet, so the pricing page offers a waitlist
     instead of a checkout. Flip this when billing is actually live. */
  paidTiersLive: false,
  /* Radar does not poll organiser pages on a schedule yet. The UI must not
     claim automatic monitoring while this is false. */
  automaticDeadlineMonitoring: false,
  verificationWindowDays: 90,
};

export const TYPES = [
  { value: 'competition', label: 'Competitions' },
  { value: 'research', label: 'Research' },
  { value: 'scholarship', label: 'Scholarships' },
  { value: 'fellowship', label: 'Fellowships' },
  { value: 'directory', label: 'Directories' },
];

export const LEVELS = [
  { value: 'middle-school', label: 'Middle school' },
  { value: 'high-school', label: 'High school' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'gap-year', label: 'Gap year' },
];

export const SUBJECTS = [
  'research', 'mathematics', 'physics', 'chemistry', 'biology', 'medicine',
  'engineering', 'computer-science', 'data-science', 'environment', 'economics',
  'business', 'entrepreneurship', 'finance', 'law', 'politics', 'history',
  'philosophy', 'humanities', 'social-sciences', 'writing', 'debate', 'arts',
  'design', 'media', 'leadership', 'social-impact', 'space',
];

export const GOALS = [
  { value: 'research', label: 'A research career' },
  { value: 'university-admission', label: 'Competitive university admission' },
  { value: 'funding', label: 'Funding my studies' },
  { value: 'entrepreneurship', label: 'Starting something of my own' },
  { value: 'creative-portfolio', label: 'Building a creative portfolio' },
  { value: 'public-service', label: 'Public service and policy' },
  { value: 'industry-experience', label: 'Industry experience' },
];

export const REGIONS = ['Middle East', 'Europe', 'North America', 'Asia', 'Africa', 'Oceania', 'Global'];

export const FUNDING_NEEDS = [
  { value: 'essential', label: 'Essential — I can only apply to funded opportunities' },
  { value: 'helpful', label: 'Helpful — funding widens what I can do' },
  { value: 'not-needed', label: 'Not a factor for me' },
];

export const EXPERIENCE = [
  { value: 'beginner', label: 'Just starting out' },
  { value: 'intermediate', label: 'Some projects or placements behind me' },
  { value: 'advanced', label: 'Substantial research or competition record' },
];

export const STAGES = [
  { value: 'saved', label: 'Saved', group: 'planning' },
  { value: 'researching', label: 'Researching', group: 'planning' },
  { value: 'preparing', label: 'Preparing', group: 'planning' },
  { value: 'drafting', label: 'Drafting', group: 'working' },
  { value: 'ready', label: 'Ready to submit', group: 'working' },
  { value: 'submitted', label: 'Submitted', group: 'submitted' },
  { value: 'interview', label: 'Interview', group: 'submitted' },
  { value: 'accepted', label: 'Accepted', group: 'closed' },
  { value: 'waitlisted', label: 'Waitlisted', group: 'closed' },
  { value: 'rejected', label: 'Rejected', group: 'closed' },
  { value: 'not-eligible', label: 'Not eligible', group: 'closed' },
];

export const REPORT_REASONS = [
  'The deadline is wrong or has changed',
  'The application link is broken',
  'The programme has closed or no longer exists',
  'The eligibility rules are wrong',
  'The funding information is wrong',
  'Something else',
];
