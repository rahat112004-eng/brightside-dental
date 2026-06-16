/* Brightside Dental — shared site script */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const pt = document.getElementById('pt');
const intro = document.getElementById('intro');

/* ---------- Intro (index, once per session) ---------- */
function playIntro() {
  const wordmark = document.getElementById('wordmark');
  'Brightside.'.split('').forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    if (ch === '.') s.classList.add('dot');
    s.style.animationDelay = (0.15 + i * 0.07) + 's';
    wordmark.appendChild(s);
  });
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    intro.classList.add('leaving');
    document.body.classList.add('revealed');
    document.body.style.overflow = '';
    setTimeout(() => intro.remove(), 1200);
  }, 3300);
}

/* ---------- Page enter (curtain lifts) ---------- */
function enterPage() {
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (pt) pt.classList.add('away');
      document.body.classList.add('revealed');
    }, 200);
  });
}

if (reduceMotion) {
  if (intro) intro.remove();
  if (pt) pt.remove();
  document.body.classList.add('revealed');
} else if (intro && !sessionStorage.getItem('introSeen')) {
  sessionStorage.setItem('introSeen', '1');
  if (pt) pt.remove();
  playIntro();
} else {
  if (intro) intro.remove();
  enterPage();
}

/* ---------- Page exit (curtain drops, then navigate) ---------- */
if (!reduceMotion && pt) {
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href || !href.includes('.html')) return;
    a.addEventListener('click', (e) => {
      e.preventDefault();
      pt.classList.add('below');
      void pt.offsetHeight;
      pt.classList.remove('below', 'away');
      setTimeout(() => { window.location.href = href; }, 1450);
    });
  });
}

/* ---------- Live reception feed ---------- */
const feedEl = document.getElementById('feed');
if (feedEl) {
  const FEED_ITEMS = [
    { icon: '⚡', urgent: true,  title: 'Emergency request triaged', sub: 'Tooth pain · flagged urgent · callback queued — 38s' },
    { icon: '🦷', urgent: false, title: 'Check-up request received', sub: 'Prefers mornings · confirmation email sent' },
    { icon: '📅', urgent: false, title: 'Appointment confirmed', sub: 'Invisalign consultation · Tuesday 9:30' },
    { icon: '✨', urgent: false, title: 'Whitening enquiry triaged', sub: 'Routine · reception call scheduled' },
    { icon: '📞', urgent: true,  title: 'Urgent callback completed', sub: 'Patient booked into today’s emergency slot' },
    { icon: '✉️', urgent: false, title: 'Confirmation email sent', sub: 'Personalised reply written automatically' }
  ];
  const MAX_VISIBLE = 4;
  let feedIndex = 0;
  function pushFeedItem() {
    const data = FEED_ITEMS[feedIndex % FEED_ITEMS.length];
    feedIndex++;
    const el = document.createElement('div');
    el.className = 'feed-item entering' + (data.urgent ? ' urgent' : '');
    el.innerHTML = '<div class="fi-icon">' + data.icon + '</div><div><strong>' + data.title + '</strong><p>' + data.sub + '</p></div>';
    feedEl.prepend(el);
    while (feedEl.children.length > MAX_VISIBLE) feedEl.removeChild(feedEl.lastChild);
  }
  pushFeedItem(); pushFeedItem(); pushFeedItem(); pushFeedItem();
  if (!reduceMotion) setInterval(pushFeedItem, 3400);
}

/* ---------- Marquee ---------- */
const track = document.getElementById('marqueeTrack');
if (track) track.innerHTML += track.innerHTML;

/* ---------- Booking form → n8n webhook ---------- */
// Production URL goes live once the n8n workflow is published.
// For editor testing use '/webhook-test/dental-lead' and click "Execute workflow" in n8n first.
const WEBHOOK_URL = 'https://rahat.app.n8n.cloud/webhook/dental-lead';

const form = document.getElementById('bookingForm');
if (form) {
  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('submitBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    statusEl.className = 'form-status';

    const data = Object.fromEntries(new FormData(form).entries());
    if (!data.name || !data.phone || !data.treatment) {
      statusEl.textContent = 'Please fill in your name, phone number and what you need.';
      statusEl.classList.add('err');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Webhook responded ' + res.status);
      form.style.display = 'none';
      document.getElementById('formSuccess').classList.add('show');
    } catch (err) {
      statusEl.textContent = 'Something went wrong sending your request — the booking system may be offline. Please try again or call us.';
      statusEl.classList.add('err');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Request appointment<span class="arrow">→</span>';
    }
  });

  const treatmentSelect = document.getElementById('f-treatment');
  if (treatmentSelect) {
    treatmentSelect.addEventListener('change', (e) => {
      document.getElementById('emergencyNote').classList.toggle('show', e.target.value.startsWith('Emergency'));
    });
  }
}

/* ---------- Headline word reveal ---------- */
document.querySelectorAll('.section-title, .page-hero h1').forEach(title => {
  const words = title.textContent.trim().split(/\s+/);
  title.textContent = '';
  words.forEach((word, i) => {
    const outer = document.createElement('span');
    outer.className = 'w';
    const inner = document.createElement('span');
    inner.className = 'wi';
    inner.style.setProperty('--d', i);
    inner.textContent = word;
    outer.appendChild(inner);
    title.appendChild(outer);
    title.appendChild(document.createTextNode(' '));
  });
});

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal, .section-title, .page-hero h1').forEach(el => io.observe(el));
