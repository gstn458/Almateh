/**
 * Radar match engine.
 *
 * One module, used unchanged by the API server and by the browser, so a match
 * score never differs between the two. Every score comes back with the reasons
 * that produced it: a number on its own is not allowed to reach the UI.
 */

/** Weight per signal. They sum to 100 so a score reads as a percentage. */
export const WEIGHTS = {
  level: 18,
  subjects: 22,
  goals: 12,
  location: 10,
  funding: 12,
  citizenship: 8,
  deadline: 8,
  experience: 6,
  type: 4,
};

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const lower = (value) => String(value || '').toLowerCase();

const REGION_OF = {
  'united arab emirates': 'Middle East',
  'saudi arabia': 'Middle East',
  qatar: 'Middle East',
  oman: 'Middle East',
  kuwait: 'Middle East',
  bahrain: 'Middle East',
  jordan: 'Middle East',
  egypt: 'Middle East',
};

/** Days until an ISO date, or null when there is no date to count to. */
export function daysUntil(isoDate, now = new Date()) {
  if (!isoDate) return null;
  const then = new Date(`${isoDate}T23:59:59Z`);
  if (Number.isNaN(then.getTime())) return null;
  return Math.ceil((then.getTime() - now.getTime()) / 86400000);
}

/**
 * Derives the live status of a listing from its deadline, so a stale `status`
 * field in the catalogue can never make a closed programme look open.
 */
export function deriveStatus(opportunity, now = new Date()) {
  if (opportunity.type === 'directory') return 'directory';
  const days = daysUntil(opportunity.deadline, now);
  if (days === null) {
    return opportunity.status === 'closed' ? 'closed' : opportunity.status || 'pathway';
  }
  if (days < 0) return 'closed';
  if (days <= 21) return 'closing-soon';
  if (opportunity.opensAt && new Date(opportunity.opensAt) > now) return 'upcoming';
  return 'open';
}

export const STATUS_LABEL = {
  open: 'Open',
  'closing-soon': 'Closing soon',
  upcoming: 'Upcoming',
  closed: 'Closed',
  pathway: 'Pathway',
  directory: 'Directory',
};

/**
 * Scores one opportunity against one profile.
 *
 * Returns `{ score, reasons, blockers }`. `reasons` explains what earned the
 * score, `blockers` names the eligibility facts that count against it — both
 * are rendered to the student, which is the whole point of the exercise.
 */
export function scoreOpportunity(opportunity, profile, now = new Date()) {
  if (!profile || !Object.keys(profile).length) {
    return { score: null, reasons: [], blockers: [], complete: false };
  }

  let earned = 0;
  let available = 0;
  const reasons = [];
  const blockers = [];

  const award = (key, ratio, reason) => {
    available += WEIGHTS[key];
    earned += WEIGHTS[key] * ratio;
    if (reason && ratio >= 0.5) reasons.push(reason);
  };

  /* Education level ------------------------------------------------------ */
  if (profile.level) {
    const levels = list(opportunity.levels);
    if (!levels.length) {
      award('level', 0.5, null);
    } else if (levels.includes(profile.level)) {
      award('level', 1, `You are ${LEVEL_LABEL[profile.level] || profile.level} and this programme is open at that level.`);
    } else {
      available += WEIGHTS.level;
      blockers.push(`Listed for ${levels.map((l) => LEVEL_LABEL[l] || l).join(', ')}, and you selected ${LEVEL_LABEL[profile.level] || profile.level}.`);
    }
  }

  /* Subjects and interests ----------------------------------------------- */
  const interests = list(profile.subjects).map(lower);
  if (interests.length) {
    const subjects = list(opportunity.subjects).map(lower);
    const overlap = interests.filter((s) => subjects.includes(s));
    const ratio = subjects.length ? Math.min(overlap.length / Math.min(interests.length, 3), 1) : 0.4;
    award(
      'subjects',
      ratio,
      overlap.length
        ? `It covers ${overlap.slice(0, 3).map(titleCase).join(', ')}, which you listed as an interest.`
        : null,
    );
  }

  /* Long-term goals ------------------------------------------------------ */
  const goals = list(profile.goals).map(lower);
  if (goals.length) {
    const haystack = lower(`${opportunity.title} ${opportunity.field} ${opportunity.summary} ${list(opportunity.tags).join(' ')} ${opportunity.type}`);
    const hits = goals.filter((goal) => GOAL_TERMS[goal]?.some((term) => haystack.includes(term)));
    award(
      'goals',
      hits.length ? 1 : 0.35,
      hits.length ? `It supports your stated goal: ${hits.map((g) => GOAL_LABEL[g] || g).join(', ')}.` : null,
    );
  }

  /* Location ------------------------------------------------------------- */
  if (profile.country || list(profile.regions).length) {
    const country = lower(profile.country);
    const prefers = list(profile.regions);
    const oppCountry = lower(opportunity.country);
    const oppRegion = opportunity.region;
    let ratio = 0.4;
    let reason = null;
    if (oppCountry === 'international' || oppRegion === 'Global') {
      ratio = 1;
      reason = 'It is open internationally, so your location does not limit you.';
    } else if (country && oppCountry === country) {
      ratio = 1;
      reason = `It is based in ${opportunity.country}, where you are.`;
    } else if (prefers.includes(oppRegion)) {
      ratio = 0.9;
      reason = `It is in ${oppRegion}, one of the regions you are open to.`;
    } else if (REGION_OF[country] && REGION_OF[country] === oppRegion) {
      ratio = 0.8;
      reason = `It is in your region (${oppRegion}).`;
    } else if (profile.willingToTravel === false) {
      ratio = 0.1;
      blockers.push(`Based in ${opportunity.country}, and you said you are not looking to travel.`);
    }
    award('location', ratio, reason);
  }

  /* Funding -------------------------------------------------------------- */
  if (profile.fundingNeed) {
    const funding = lower(opportunity.funding);
    const needsFunding = profile.fundingNeed === 'essential' || profile.fundingNeed === 'helpful';
    let ratio = 0.5;
    let reason = null;
    if (!needsFunding) {
      ratio = 1;
    } else if (funding === 'full' || funding === 'free') {
      ratio = 1;
      reason = funding === 'free'
        ? 'It is free to take part, and you said cost matters.'
        : 'It is fully funded, and you said funding is important to you.';
    } else if (funding === 'award') {
      ratio = 0.7;
      reason = 'It carries prize or award funding.';
    } else if (funding === 'partial') {
      ratio = 0.6;
      reason = 'It offers partial funding.';
    } else if (profile.fundingNeed === 'essential') {
      ratio = 0.2;
      blockers.push('Funding is not confirmed for this listing, and you said funding is essential.');
    }
    award('funding', ratio, reason);
  }

  /* Citizenship and residency -------------------------------------------- */
  if (profile.citizenship) {
    const rule = lower(opportunity.citizenship);
    const mine = lower(profile.citizenship);
    let ratio = 0.6;
    let reason = null;
    if (!rule || rule.includes('open worldwide') || rule.includes('internationally') || rule.includes('international students')) {
      ratio = 1;
      reason = 'Open to international applicants, including yours.';
    } else if (mine && rule.includes(mine)) {
      ratio = 1;
      reason = `The eligibility rules name ${titleCase(profile.citizenship)}.`;
    } else if (/^u\.?s\.?|united states/.test(rule) && !/united states|u\.s\./.test(mine)) {
      ratio = 0.15;
      blockers.push('Eligibility appears to be limited to U.S. citizens or residents.');
    } else if (rule.includes('uae national') && !mine.includes('united arab emirates')) {
      ratio = 0.15;
      blockers.push('Eligibility appears to be limited to UAE nationals.');
    }
    award('citizenship', ratio, reason);
  }

  /* Deadline reachability ------------------------------------------------- */
  const days = daysUntil(opportunity.deadline, now);
  if (days === null) {
    award('deadline', 0.6, null);
  } else if (days < 0) {
    available += WEIGHTS.deadline;
    blockers.push('This cycle has closed. Radar keeps it listed so you can plan for the next one.');
  } else if (days < 10) {
    award('deadline', 0.55, `Closing in ${days} ${days === 1 ? 'day' : 'days'} — tight, but still open.`);
  } else {
    award('deadline', 1, `You have ${days} days before the deadline.`);
  }

  /* Experience ------------------------------------------------------------ */
  if (profile.experience) {
    const order = { beginner: 0, intermediate: 1, advanced: 2 };
    const mine = order[profile.experience] ?? 0;
    const needed = order[opportunity.experienceLevel] ?? 0;
    const gap = needed - mine;
    let ratio = 1;
    let reason = 'Your experience level lines up with what this expects.';
    if (gap === 1) { ratio = 0.6; reason = 'A step up from your current experience — reachable with preparation.'; }
    if (gap >= 2) { ratio = 0.25; reason = null; blockers.push('This usually expects more prior experience than you have recorded.'); }
    if (gap < 0) { ratio = 0.85; reason = 'Comfortably within your experience level.'; }
    award('experience', ratio, reason);
  }

  /* Preferred opportunity types ------------------------------------------- */
  const types = list(profile.types);
  if (types.length) {
    const match = types.includes(opportunity.type);
    award('type', match ? 1 : 0.3, match ? `You said you are looking for ${opportunity.type} opportunities.` : null);
  }

  const score = available > 0 ? Math.round((earned / available) * 100) : null;
  return {
    score,
    reasons: reasons.slice(0, 5),
    blockers,
    complete: available >= 60,
  };
}

/** Scores a whole catalogue and sorts it best-first. */
export function rankOpportunities(opportunities, profile, now = new Date()) {
  return opportunities
    .map((opportunity) => ({ ...opportunity, match: scoreOpportunity(opportunity, profile, now) }))
    .sort((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1));
}

/** Listings closest in subject and type — used by "similar opportunities". */
export function similarOpportunities(opportunity, catalogue, limit = 3) {
  const subjects = list(opportunity.subjects);
  return catalogue
    .filter((o) => o.id !== opportunity.id)
    .map((o) => {
      const overlap = list(o.subjects).filter((s) => subjects.includes(s)).length;
      const sameType = o.type === opportunity.type ? 1.5 : 0;
      const sameRegion = o.region === opportunity.region ? 0.75 : 0;
      return { o, weight: overlap + sameType + sameRegion };
    })
    .filter((entry) => entry.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, limit)
    .map((entry) => entry.o);
}

export const LEVEL_LABEL = {
  'middle-school': 'in middle school',
  'high-school': 'a high school student',
  undergraduate: 'an undergraduate',
  graduate: 'a graduate student',
  'gap-year': 'on a gap year',
};

export const GOAL_LABEL = {
  research: 'a research career',
  'university-admission': 'competitive university admission',
  funding: 'funding your studies',
  entrepreneurship: 'starting something of your own',
  'creative-portfolio': 'building a creative portfolio',
  'public-service': 'public service and policy',
  'industry-experience': 'industry experience',
};

const GOAL_TERMS = {
  research: ['research', 'laboratory', 'fellowship', 'science', 'phd'],
  'university-admission': ['scholarship', 'admission', 'university', 'diploma', 'college'],
  funding: ['scholarship', 'funded', 'stipend', 'award', 'bursary', 'tuition'],
  entrepreneurship: ['entrepreneur', 'business', 'startup', 'innovation', 'investment', 'venture'],
  'creative-portfolio': ['art', 'design', 'photography', 'writing', 'media', 'games', 'creative'],
  'public-service': ['policy', 'leadership', 'public', 'social', 'debate', 'global affairs'],
  'industry-experience': ['internship', 'placement', 'industry', 'company', 'sponsorship'],
};

function titleCase(value) {
  return String(value)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
