const feedGrid = document.getElementById('feedGrid');
const briefText = document.getElementById('briefText');
const briefDate = document.getElementById('brief-date');
const briefSourceCount = document.getElementById('briefSourceCount');
const briefStoryCount = document.getElementById('briefStoryCount');
const refreshBtn = document.getElementById('refreshBtn');
const clockEl = document.getElementById('clock');
const tickerItems = document.querySelectorAll('.ticker__item');

let allStories = [];
let activeCategory = 'ALL';

const FEEDS = [
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/feeds/feed.rss' },
  { name: 'EE Times', url: 'https://www.eetimes.com/feed/' },
  { name: 'Semiconductor Engineering', url: 'https://semiengineering.com/feed/' },
];

function tickClock() {
  clockEl.textContent = new Date().toLocaleTimeString([], { hour12: false });
}
tickClock();
setInterval(tickClock, 1000);

// Cyberpunk Glitch Effect
function glitchText(element, finalString) {
  const chars = '!<>-_\\/[]{}—=+*^?#_01';
  let iter = 0;
  
  const interval = setInterval(() => {
    element.textContent = finalString.split('').map((char, index) => {
      if(index < iter) return char;
      return chars[Math.floor(Math.random() * chars.length)]
    }).join('');
    
    if(iter >= finalString.length) clearInterval(interval);
    iter += 1/2;
  }, 30);
}

// Terminal Typing Effect
function typeText(element, text) {
  element.innerHTML = '';
  const chars = text.split('').map(c => `<span class="char" style="opacity:0">${c===' '?'&nbsp;':c}</span>`).join('');
  element.innerHTML = chars;
  
  anime({
    targets: element.querySelectorAll('.char'),
    opacity: [0, 1],
    translateY: [-3, 0],
    delay: anime.stagger(12),
    easing: 'easeOutQuad',
    duration: 100
  });
}

document.addEventListener('DOMContentLoaded', () => {
  anime({
    targets: '.topbar__inner > *',
    translateY: [-15, 0],
    opacity: [0, 1],
    delay: anime.stagger(80),
    duration: 700,
    easing: 'easeOutExpo'
  });

  anime({
    targets: '.scope__content > *',
    translateY: [15, 0],
    opacity: [0, 1],
    delay: anime.stagger(100),
    duration: 700,
    easing: 'easeOutCubic'
  });

  anime({
    targets: '#tracePath',
    strokeDashoffset: [anime.setDashoffset, 0],
    easing: 'linear',
    duration: 2500,
    loop: true
  });
});

tickerItems.forEach(btn => {
  btn.addEventListener('click', () => {
    tickerItems.forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    activeCategory = btn.dataset.cat;
    
    anime({
      targets: '.feed__grid .card',
      opacity: [1, 0],
      translateY: [0, 15],
      duration: 150,
      easing: 'easeInQuad',
      complete: renderCards
    });
  });
});

function categorizeStory(title, excerpt) {
  const text = (title + ' ' + excerpt).toLowerCase();
  if (/power|battery|gan|sic|grid|voltage|converter|inverter|energy/i.test(text)) return 'POWER';
  if (/rf|5g|6g|wireless|antenna|radar|microwave|spectrum|telecom/i.test(text)) return 'RF';
  if (/embed|mcu|microcontroller|iot|firmware|rtos|sensor|arduino|raspberry/i.test(text)) return 'EMBED';
  if (/dsp|signal|algorithm|audio|filter|fourier|fft|image processing/i.test(text)) return 'DSP';
  if (/vlsi|chip|fpga|risc-v|eda|architecture|cpu|gpu|soc|asic|wafer/i.test(text)) return 'VLSI';
  return 'SEMI'; 
}

function cleanExcerpt(text) {
  if (!text) return '';
  let cleaned = text.replace(/<[^>]*>?/gm, '').trim();
  const words = cleaned.split(/\s+/);
  if (words.length > 35) {
    return words.slice(0, 35).join(' ') + '...';
  }
  return cleaned;
}

function renderCards() {
  const stories = activeCategory === 'ALL'
    ? allStories
    : allStories.filter(s => s.category === activeCategory);

  if (!stories.length) {
    feedGrid.innerHTML = `<div class="feed__empty">No stories in this category yet. Try "ALL" or refresh.</div>`;
    return;
  }

  feedGrid.innerHTML = stories.map(s => `
    <a class="card" href="${s.link}" target="_blank" rel="noopener noreferrer" style="opacity: 0;">
      <div class="card__tags">
        <span class="card__tag">${s.category}</span>
        <span class="card__source">${s.source}</span>
      </div>
      <h3 class="card__title">${escapeHtml(s.title)}</h3>
      <p class="card__summary">${escapeHtml(s.summary || '')}</p>
      <div class="card__footer">
        <span>${s.date || ''}</span>
        <span>Read →</span>
      </div>
    </a>
  `).join('');

  // Clean, professional slide-up card entry (No 3D flips)
  anime({
    targets: '.feed__grid .card',
    translateY: [25, 0],
    opacity: [0, 1],
    delay: anime.stagger(50),
    duration: 500,
    easing: 'easeOutCubic'
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

async function loadFeed() {
  glitchText(briefDate, 'CALIBRATING INSTRUMENTS…');
  
  if (feedGrid.children.length > 0 && !feedGrid.querySelector('.skeleton')) {
      anime({
          targets: '.feed__grid .card',
          opacity: 0,
          translateY: 10,
          duration: 200,
          easing: 'easeInQuad'
      });
  }

  setTimeout(() => {
      feedGrid.innerHTML = `
        <div class="skeleton"></div><div class="skeleton"></div>
        <div class="skeleton"></div><div class="skeleton"></div>`;
  }, 200);

  anime({
    targets: '#refreshBtn',
    rotate: '+=360deg',
    duration: 600,
    easing: 'easeInOutSine'
  });

  try {
    let rawStories = [];
    let workingSources = 0;

    const requests = FEEDS.map(async (feed) => {
      const apiEndpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
      try {
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        
        if (data.status === 'ok') {
          workingSources++;
          const items = (data.items || []).slice(0, 10).map(item => {
             const itemDate = (item.pubDate || '').split(' ')[0] || '';
             return {
                 source: feed.name,
                 title: item.title?.trim() || 'Untitled',
                 link: item.link,
                 date: itemDate,
                 excerpt: (item.description || item.content || '').slice(0, 400)
             };
          });
          rawStories.push(...items);
        }
      } catch (e) {
        console.warn(`Failed to fetch ${feed.name}`, e);
      }
    });

    await Promise.all(requests);

    if (rawStories.length === 0) {
        throw new Error('No stories retrieved from feeds.');
    }

    allStories = rawStories.map(s => ({
        ...s,
        category: categorizeStory(s.title, s.excerpt),
        summary: cleanExcerpt(s.excerpt) || s.title,
    })).sort((a, b) => new Date(b.date) - new Date(a.date));

    const amusingBriefs = [
      "Warning: Prolonged exposure to semiconductor news may induce a spontaneous urge to redesign your PCB. Proceed with caution.",
      "Magic smoke contained successfully. Decrypting the latest signals from the ether...",
      "Coffee-to-code conversion operating at 99.9% efficiency. Oscillators are stable. Please stop shorting the power rails.",
      "Scanning frequencies... 99% of today's news is about AI. We filtered out the noise to bring you the actual hardware updates.",
      "Maxwell's equations remain undefeated. Here is today's proof.",
      "Vcc is stable. Ground loop isolated. Downloading today's dose of engineering existential dread...",
      "The flux capacitor is fully charged. Parsing today's data stream before it collapses.",
      "Wait, did you remember to attach the pull-up resistor? Oh well, here's the news anyway."
    ];

    const randomBrief = amusingBriefs[Math.floor(Math.random() * amusingBriefs.length)];

    typeText(briefText, randomBrief);
    
    const finalDateStr = `SIGNAL BRIEF — ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`;
    glitchText(briefDate, finalDateStr);

    const statsObj = { sources: 0, stories: 0 };
    anime({
      targets: statsObj,
      sources: workingSources,
      stories: allStories.length,
      round: 1,
      duration: 1200,
      easing: 'easeOutExpo',
      update: function() {
        briefSourceCount.textContent = `${statsObj.sources} sources`;
        briefStoryCount.textContent = `${statsObj.stories} stories analyzed`;
      }
    });

    setTimeout(renderCards, 200);
  } catch (err) {
    glitchText(briefDate, 'FEED UNAVAILABLE');
    typeText(briefText, 'Could not fetch RSS feeds. Someone tripped over the server cord again.');
    feedGrid.innerHTML = `<div class="feed__empty">Feed fetching failed. Please check your network connection and try again later.</div>`;
    console.error(err);
  }
}

refreshBtn.addEventListener('click', loadFeed);

loadFeed();
