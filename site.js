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

/* ---------- AI chat assistant (n8n + Claude) ---------- */
(function () {
  const CHAT_WEBHOOK = 'https://rahat.app.n8n.cloud/webhook/fd55cb4c-bb2f-4f01-9354-ef66263275fd/chat';

  // Brand the widget to match the site (teal) + smooth fade-in entrance
  const brand = document.createElement('style');
  brand.textContent =
    ':root{--chat--color-primary:#0e7569;--chat--color-primary-shade-50:#0a5a50;--chat--color-primary-shade-100:#0a5a50;--chat--color-secondary:#0e7569;--chat--toggle--background:#0e7569;--chat--toggle--hover--background:#0a5a50;--chat--header--background:#0e7569;--chat--header--color:#ffffff;--chat--message--user--background:#0e7569;--chat--border-radius:14px;}'
    + '.chat-window-toggle{animation:bsChatIn .6s cubic-bezier(0.16,1,0.3,1) both;}'
    + '@keyframes bsChatIn{from{opacity:0;transform:translateY(16px) scale(.82);}to{opacity:1;transform:none;}}';
  document.head.appendChild(brand);

  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css';
  document.head.appendChild(css);

  function initChat() {
    import('https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js')
      .then(({ createChat }) => {
        createChat({
          webhookUrl: CHAT_WEBHOOK,
          mode: 'window',
          showWelcomeScreen: false,
          initialMessages: [
            'Hi! 👋 I’m Brightside Dental’s assistant.',
            'Ask me about treatments or opening hours — or tell me what you need and I’ll help you book.'
          ],
          i18n: {
            en: {
              title: 'Brightside Dental',
              subtitle: 'Ask a question or book an appointment',
              getStarted: 'New conversation',
              inputPlaceholder: 'Type your message…',
              footer: ''
            }
          }
        });
      })
      .catch(() => {});
  }

  // Don't show the bubble during the intro / page transition — wait for it to finish, then fade it in.
  const introPlaying = !!document.getElementById('intro');
  const delay = reduceMotion ? 0 : (introPlaying ? 3900 : 700);
  setTimeout(initChat, delay);
})();
