/**
 * Homepage behaviour: the loading curtain, the scroll narrative, the globe,
 * and the live sample pulled from the catalogue.
 *
 * Everything here is decoration over content that already exists in the HTML,
 * so the page still reads correctly if this module never runs.
 */
import { get, track } from './api.js?v=1ed1068b03';
import { $, $$, esc, opportunityCard, deadlineText, formatDate, relativeDays } from './ui.js?v=1ed1068b03';
import { SITE } from './config.js?v=1ed1068b03';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ------------------------------------------------------ loading curtain */
(function loader() {
  const root = document.documentElement;
  const node = $('#page-loader');
  const bar = $('#loader-bar');
  const counter = $('#loader-counter');
  if (!node) { root.classList.remove('is-loading'); return; }

  let done = false;
  let loaded = document.readyState === 'complete';
  let minimumReached = false;
  const started = performance.now();

  const paint = (value) => {
    const rounded = Math.round(value);
    if (bar) bar.style.width = `${rounded}%`;
    if (counter) counter.textContent = `${String(rounded).padStart(2, '0')}%`;
  };

  const finish = () => {
    if (done || !loaded || !minimumReached) return;
    done = true;
    paint(100);
    setTimeout(() => {
      node.classList.add('is-done');
      root.classList.add('chapter-reveal');
      root.classList.remove('is-loading');
      setTimeout(() => node.remove(), 720);
    }, 140);
  };

  const tick = (timestamp) => {
    if (done) return;
    const eased = Math.min((timestamp - started) / 900, 1);
    paint(7 + eased * 86);
    if (eased < 1) requestAnimationFrame(tick);
    else { minimumReached = true; finish(); }
  };

  requestAnimationFrame(tick);
  if (!loaded) window.addEventListener('load', () => { loaded = true; finish(); }, { once: true });
  /* Never trap a visitor behind the curtain if `load` is slow or never fires. */
  setTimeout(() => { loaded = true; minimumReached = true; finish(); }, 2400);
}());

/* -------------------------------------------------- scroll progress bar */
(function scrollChrome() {
  const bar = $('#app-scroll-progress-bar');
  const backToTop = $('#back-to-top');
  let frame = 0;

  const paint = () => {
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / max, 0), 1);
    if (bar) bar.style.width = `${progress * 100}%`;
    backToTop?.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.75);
    frame = 0;
  };

  const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  backToTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    $('#main-content')?.focus?.();
  });
  paint();
}());

/* ------------------------------------------------------ scroll narrative */
const CHAPTERS = [
  { kicker: '00 / NOTICE', title: 'Most opportunities are hidden in plain sight.', copy: 'Scroll to move from signal to route. Radar turns a noisy internet into a next step.' },
  { kicker: '01 / MATCH', title: 'Start with the signal.', copy: 'Tell Radar what you are building toward. It reads the shape behind your ambition.' },
  { kicker: '02 / PROOF', title: 'Reasons, not rankings.', copy: 'Every match arrives with the context that makes it useful: why it fits, and what it unlocks.' },
  { kicker: '03 / DATES', title: 'The date is the product.', copy: 'Finding it is half the job. Not missing it is the other half.' },
  { kicker: '04 / TRUST', title: 'Verified, or clearly not.', copy: 'Sources, dates and links are checked, and Radar says when they have not been.' },
  { kicker: '05 / MOVE', title: 'The signal is yours now.', copy: 'Radar is free for students. Leave with a clearer direction and a reason to move.' },
];

(function story() {
  const system = $('#story-system');
  const caption = $('#story-caption');
  const kicker = $('#story-kicker');
  const title = $('#story-title');
  const copy = $('#story-copy');
  const rail = $('#story-progress');
  const bar = document.createElement('span');
  const scanline = $('#story-scanline');
  const sections = [$('#hero'), ...$$('.story-section')];
  if (!system || !sections.length) return;

  bar.className = 'story-progress__bar';
  rail.append(bar);

  const buttons = CHAPTERS.map((chapter, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'story-chapter';
    button.textContent = chapter.kicker;
    button.setAttribute('aria-label', `Jump to: ${chapter.title}`);
    button.addEventListener('click', () => {
      sections[index]?.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    });
    rail.append(button);
    return button;
  });

  let active = -1;
  let frame = 0;

  /* Audio state is declared up here because the first paint runs immediately
     and calls playTone; declaring it below would leave it in its dead zone. */
  const audioButton = $('#story-audio');
  let soundOn = false;
  let audioContext = null;
  let lastPlayed = 0;
  try { soundOn = localStorage.getItem('radar.sound') === 'on'; } catch { soundOn = false; }

  const setChapter = (index) => {
    if (index === active) return;
    active = index;
    const chapter = CHAPTERS[index];
    buttons.forEach((button, i) => button.classList.toggle('is-active', i === index));
    if (!chapter) return;
    caption.classList.add('is-changing');
    setTimeout(() => {
      kicker.textContent = chapter.kicker;
      title.textContent = chapter.title;
      copy.textContent = chapter.copy;
      caption.classList.remove('is-changing');
    }, reduceMotion.matches ? 0 : 180);
    playTone(index);
  };

  const paint = () => {
    frame = 0;
    const middle = window.scrollY + window.innerHeight * 0.45;
    let index = 0;
    sections.forEach((section, i) => {
      if (!section) return;
      const top = section.offsetTop;
      if (middle >= top) index = i;
      section.classList?.toggle('is-story-active', middle >= top && middle < top + section.offsetHeight);
    });
    setChapter(Math.min(index, CHAPTERS.length - 1));

    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / max, 0), 1);
    bar.style.height = `${progress * 100}%`;
    if (scanline) scanline.style.transform = `scaleX(${progress})`;

    /* The overlay steps aside once the reader is past the story sections. */
    const last = sections[sections.length - 1];
    const past = last ? window.scrollY > last.offsetTop + last.offsetHeight - window.innerHeight * 0.4 : false;
    system.classList.toggle('is-dormant', past);
  };

  const request = () => { if (!frame) frame = requestAnimationFrame(paint); };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  paint();

  /* -------------------------------------------------- chapter audio ---- */
  /* Off unless the visitor turned it on, and the choice is remembered. */
  function paintButton() {
    if (!audioButton) return;
    audioButton.textContent = soundOn ? 'Sound on' : 'Sound off';
    audioButton.setAttribute('aria-pressed', soundOn ? 'true' : 'false');
    audioButton.setAttribute('aria-label', soundOn ? 'Turn chapter sounds off' : 'Turn chapter sounds on');
  }

  function unlock() {
    if (!soundOn || audioContext || reduceMotion.matches) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    try {
      audioContext = new Ctor();
      audioContext.resume?.();
    } catch { audioContext = null; }
  }

  function playTone(index) {
    if (!soundOn || !audioContext || audioContext.state !== 'running') return;
    const stamp = performance.now();
    if (stamp - lastPlayed < 140) return;
    lastPlayed = stamp;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 220 + index * 48;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.045, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.34);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.36);
  }

  paintButton();
  audioButton?.addEventListener('click', () => {
    soundOn = !soundOn;
    try { localStorage.setItem('radar.sound', soundOn ? 'on' : 'off'); } catch { /* not critical */ }
    paintButton();
    if (soundOn) { unlock(); setTimeout(() => playTone(Math.max(active, 0)), 60); }
  });
  ['pointerdown', 'keydown'].forEach((type) => window.addEventListener(type, unlock, { once: true, passive: type !== 'keydown' }));
}());

/* ---------------------------------------------------------------- globe */
(function globe() {
  const node = $('#globe');
  const sphere = $('#globe-sphere');
  const hero = $('#hero');
  if (!node || !sphere || !hero) return;

  /* The globe is the heaviest thing on the page. On a low-power device, a
     data-saver connection, the page drops it entirely — the layout is designed
     to still read as Radar without it. Four cores is an ordinary phone, so the
     bar sits below that rather than cutting off half of real devices. */
  const lowPower = (navigator.hardwareConcurrency || 8) < 4
    || navigator.connection?.saveData === true
    || /2g/.test(navigator.connection?.effectiveType || '');
  if (lowPower) { node.classList.add('is-disabled'); return; }

  let progress = 0;
  let target = 0;
  let rotation = 0;
  let running = true;

  const read = () => {
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(hero.offsetHeight - window.innerHeight, 1);
    progress = Math.min(Math.max(-rect.top / travel, 0), 1);
    target = progress * 720;
  };

  const frame = () => {
    if (!running) return;
    requestAnimationFrame(frame);
    rotation += ((reduceMotion.matches ? 0 : target) - rotation) * 0.14;
    const wave = Math.sin(progress * Math.PI * 2.15);
    const counter = Math.cos(progress * Math.PI * 1.35);
    const tiltX = 8 + progress * 18 + wave * 7;
    const scale = 1 + Math.sin(progress * Math.PI) * 0.045;
    sphere.style.transform =
      `translate3d(${wave * 22}px,${counter * 10}px,0) rotateX(${tiltX}deg) rotateY(${rotation}deg) rotateZ(${wave * 8}deg) scale(${scale})`;
  };

  window.addEventListener('scroll', read, { passive: true });
  window.addEventListener('resize', read);

  /* Stop the loop entirely once the hero is off screen, and when the tab is
     hidden: an invisible animation should not be costing anyone battery. */
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !running) { running = true; requestAnimationFrame(frame); }
    running = entry.isIntersecting;
  }, { rootMargin: '120px' });
  observer.observe(hero);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) running = false;
    else if (!running) { running = true; requestAnimationFrame(frame); }
  });

  read();
  requestAnimationFrame(frame);
}());

/* ------------------------------------------- live catalogue on the page */
(async function catalogue() {
  const results = $('#featured-results');
  const count = $('#hero-count');
  const strip = $('#deadline-strip');

  const monitoring = SITE.automaticDeadlineMonitoring
    ? 'Radar re-reads organiser pages on a schedule and tells you when a date moves.'
    : 'Radar does not watch organiser pages automatically yet. Every listing shows the date a person last checked it, and the organiser’s page is always the final word.';
  const note = $('#monitoring-note');
  if (note) note.textContent = monitoring;

  try {
    const data = await get('/api/opportunities', { sort: 'match' });
    const open = data.results.filter((o) => o.liveStatus !== 'closed');

    if (count) {
      const verified = data.results.filter((o) => o.verificationStatus === 'verified').length;
      count.textContent = `${data.total} listings · ${verified} verified`;
    }

    if (results) {
      results.innerHTML = open.slice(0, 4).map((o) => opportunityCard(o, { showWhy: data.personalised })).join('')
        || '<div class="empty"><p>The catalogue is empty right now.</p></div>';
    }

    if (strip) {
      const dated = open
        .filter((o) => o.deadline)
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .slice(0, 5);
      strip.innerHTML = dated.length
        ? `<ol class="timeline">${dated.map((o) => `
            <li>
              <b><a href="/opportunity.html?id=${esc(o.id)}">${esc(o.title)}</a></b>
              <time datetime="${esc(o.deadline)}">${esc(formatDate(o.deadline))} · ${esc(relativeDays(o.deadline))}</time>
            </li>`).join('')}</ol>`
        : '<p class="lede">No dated deadlines in the catalogue right now.</p>';
    }
  } catch {
    if (results) results.innerHTML = '<div class="empty"><h3>The catalogue did not load</h3><p>Check your connection, or open the directory directly.</p><a class="btn btn--ghost" href="/opportunities.html">Open the directory</a></div>';
    if (count) count.textContent = 'Catalogue unavailable';
  }
  track('detail-view', 'home', 'home');
}());
