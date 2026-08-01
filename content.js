/* Reddit Positivity Filter — content script
 * 1) Hides posts/comments that mention filtered (negative/vulgar) topics.
 * 2) Fetches recommended communities for a keyword (same-origin, uses your session).
 */

const DEFAULTS = {
  enabled: true,
  strict: false, // false = also match variants (murder -> murders, murdered)
  hiddenSubs: [],         // communities blocked with × (hidden in feeds + page blocked + not recommended)
  allowMode: false,       // home feed: only posts from allowedSubs are shown
  allowedSubs: [],        // communities allowed on the home feed when allowMode is on
  homeBlock: false,       // block the home feed entirely (chat + notifications keep working)
  themesEnabled: true,    // master switch for concept-connection "theme" filters
  themes: [],             // concept-group theme filters (see THEME_STARTER); seeded on first run
  keywords: [
    // Violence / crime
    "murder", "kill", "homicide", "manslaughter", "stab", "shooting", "massacre",
    "genocide", "terrorist", "terrorism", "bombing", "assault", "abuse", "torture",
    "mutilat", "gore", "beheading", "lynch", "suicide", "self-harm", "self harm",
    "overdose", "kidnap", "arson",
    // Sexual violence
    "rape", "molest", "pedophile", "pedo", "incest", "groom",
    // Cheating / infidelity
    "cheating", "cheater", "infidelity", "affair", "unfaithful", "adultery", "cuckold",
    // Vulgar / profanity / slurs
    "fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy", "slut", "whore",
    "bastard", "asshole", "motherfucker", "retard", "nigger", "faggot",
    // Sexual / NSFW
    "porn", "nsfw", "nude", "blowjob", "handjob", "masturbat", "hentai",
    "onlyfans", "escort", "dildo",
    // Film industry / celebrity (Bollywood, Hollywood, etc.)
    "bollywood", "hollywood", "tollywood", "kollywood", "film industry",
    "film", "movie", "cinema", "filmmaker", "box office", "celebrity",
    "celebrities", "actor", "actress", "red carpet", "oscars", "film festival",
    // Warfare / armed conflict (specific terms — avoids matching "warm"/"warning")
    "warfare", "civil war", "world war", "nuclear war", "war crime", "warzone",
    "war zone", "invasion", "airstrike", "air strike", "missile", "artillery",
    "bombardment", "military conflict", "armed conflict", "troops", "combat",
    "insurgency", "militia", "guerrilla", "ceasefire", "battlefield",
    "frontline", "front line", "soldier", "drone strike"
  ]
};

// Starter theme, seeded once so the concept-connection filter works on install.
// A "theme" blocks a post when a majority of its concept groups appear together.
const THEME_STARTER = [
  {
    name: "Example: safety · women · country · laws",
    enabled: true,
    minGroups: 3, // block when >= 3 of the 4 concepts connect
    groups: [
      { name: "Safe",    words: ["safe", "safety", "secure", "security", "protection", "protect", "unsafe"] },
      { name: "Women",   words: ["women", "woman", "girl", "girls", "female", "females", "ladies", "lady"] },
      { name: "Country", words: ["country", "nation", "national", "state", "government", "govt"] },
      { name: "Laws",    words: ["law", "laws", "legal", "act", "bill", "policy", "rights", "court"] }
    ]
  }
];

// Related-topic map so a search expands into synonym / adjacent communities.
const RELATED = {
  "machine learning": ["data science", "deep learning", "artificial intelligence", "statistics", "computer vision", "natural language processing", "neural networks"],
  "data science": ["machine learning", "statistics", "data analysis", "python", "big data", "data engineering"],
  "artificial intelligence": ["machine learning", "deep learning", "data science", "chatgpt", "robotics"],
  "deep learning": ["machine learning", "neural networks", "artificial intelligence", "computer vision"],
  "programming": ["coding", "software engineering", "python", "javascript", "webdev", "computer science"],
  "web development": ["webdev", "javascript", "frontend", "backend", "css", "react"],
  "gaming": ["games", "pc gaming", "gamers", "esports"],
  "fitness": ["gym", "bodybuilding", "workout", "nutrition", "running", "weightlifting"],
  "finance": ["investing", "stocks", "personal finance", "economics", "financial independence"],
  "photography": ["photos", "cameras", "photocritique", "postprocessing"],
  "cooking": ["food", "recipes", "baking", "mealprep", "cookingforbeginners"],
  "cybersecurity": ["netsec", "hacking", "infosec", "privacy", "security"],
  "space": ["astronomy", "spacex", "nasa", "cosmology", "astrophotography"]
};

let cfg = { ...DEFAULTS };
let matcher = null;
let compiledThemes = []; // [{ name, minGroups, groups: [{ name, re }] }]

const SEL = "shreddit-post, shreddit-comment, .thing.link, .thing.comment";

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function buildMatcher() {
  const words = (cfg.keywords || []).map(w => w.trim().toLowerCase()).filter(Boolean);
  if (!words.length) { matcher = null; return; }
  const body = words.map(escapeRe).join("|");
  matcher = new RegExp("\\b(" + body + ")" + (cfg.strict ? "\\b" : ""), "i");
}

// A "theme" fires when a majority of its concept groups are present in one post.
// Each group is a set of seed words; a group is "hit" if any of its words appears.
// Respects the same strict/whole-word toggle as the keyword filter.
function groupRegex(words) {
  const clean = (words || []).map(w => String(w).trim().toLowerCase()).filter(Boolean);
  if (!clean.length) return null;
  const body = clean.map(escapeRe).join("|");
  return new RegExp("\\b(" + body + ")" + (cfg.strict ? "\\b" : ""), "i");
}

// Majority of N groups = more than half (4->3, 3->2, 2->2). User can override.
function majorityOf(n) { return Math.floor(n / 2) + 1; }

function buildThemes() {
  compiledThemes = [];
  if (cfg.themesEnabled === false) return;
  (cfg.themes || []).forEach(t => {
    if (!t || t.enabled === false) return;
    const groups = (t.groups || [])
      .map(g => ({ name: g.name || "", re: groupRegex(g.words) }))
      .filter(g => g.re);
    if (groups.length < 2) return; // a "connection" needs at least two concepts
    const maj = majorityOf(groups.length);
    let need = Number.isFinite(t.minGroups) ? t.minGroups : maj;
    need = Math.max(2, Math.min(groups.length, need));
    compiledThemes.push({ name: t.name || "theme", minGroups: need, groups });
  });
}

// Returns { hit, need, groupsHit:[names] } for a compiled theme against text.
function matchTheme(text, theme) {
  const groupsHit = [];
  for (const g of theme.groups) {
    if (g.re.test(text)) groupsHit.push(g.name || "concept");
  }
  return { hit: groupsHit.length >= theme.minGroups, need: theme.minGroups, groupsHit };
}

function textOf(el) {
  let t = "";
  if (el.getAttribute) {
    t = (el.getAttribute("post-title") || el.getAttribute("aria-label") || "") + " ";
  }
  return (t + (el.textContent || "")).toLowerCase();
}

function cardFor(el) {
  const art = el.closest ? el.closest("article") : null;
  return art || el;
}

// revealable=false → blocked communities: hard-hide, no "Show anyway".
function hideEl(el, word, revealable = true) {
  if (el.dataset.rpfHidden) return;
  el.dataset.rpfHidden = "1";
  const card = cardFor(el);
  card.classList.add("rpf-hidden");

  const ph = document.createElement("div");
  ph.className = "rpf-placeholder";
  const span = document.createElement("span");
  span.textContent = "🚫 Hidden — " + word + ".";
  ph.appendChild(span);
  if (revealable) {
    const btn = document.createElement("button");
    btn.className = "rpf-show";
    btn.textContent = "Show anyway";
    btn.addEventListener("click", () => {
      card.classList.remove("rpf-hidden");
      ph.remove();
    });
    ph.appendChild(btn);
  }
  if (card.parentNode) card.parentNode.insertBefore(ph, card);
}

// Communities the user blocked with the × ("hide") button on a recommendation.
let blockedSubs = new Set();
function buildBlocked() {
  blockedSubs = new Set((cfg.hiddenSubs || []).map(s => String(s).toLowerCase()));
}

// Home-feed allowlist: when on, ONLY these communities may appear on the home
// feed — every other community's posts are removed (no placeholder).
let allowedSubs = new Set();
function buildAllowed() {
  allowedSubs = new Set(
    (cfg.allowedSubs || [])
      .map(s => String(s).trim().replace(/^\/?r\//i, "").toLowerCase())
      .filter(Boolean)
  );
}

function allowModeActive() {
  return !!cfg.allowMode && allowedSubs.size > 0;
}

// The home feed = reddit.com root and its sort variants (new + old Reddit).
// Community pages, search, profiles etc. are untouched by the allowlist.
// The hostname guard matters: chat.reddit.com's path is also "/" — chat and
// chat requests must NEVER be treated as the home feed (nor mod./ads. tools).
function isHomeFeed() {
  if (!/^(www\.|old\.|new\.)?reddit\.com$/i.test(location.hostname)) return false;
  const p = location.pathname.replace(/\/+$/, "") || "/";
  return p === "/" || /^\/(best|hot|new|rising|top|controversial)$/i.test(p);
}

// Remove a post outright — a home feed 90% made of placeholders would be noise.
function hideSilently(el) {
  if (el.dataset.rpfHidden) return;
  el.dataset.rpfHidden = "1";
  cardFor(el).classList.add("rpf-hidden");
}

function subredditOf(el) {
  if (!el.getAttribute) return "";
  const n = el.getAttribute("subreddit-name") ||       // new reddit
            el.getAttribute("data-subreddit") || "";   // old reddit
  return n.toLowerCase();
}

// Full-page block for communities you blocked with ×.
function checkSubredditGate() {
  removeBlock(); // clear any stale block when navigating
  if (cfg.homeBlock && isHomeFeed()) { blockHomePage(); return; }
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9_]+)/);
  if (!m) return;
  const sub = m[1].toLowerCase();
  if (sub === "all" || sub === "popular") return;

  if (blockedSubs.has(sub)) blockPage(sub);
}

function blockPage(sub) {
  if (document.getElementById("rpf-block")) return;
  const heading = "Community blocked";
  const reason = "You blocked r/" + sub +
    ". Viewing and joining it are turned off. Unblock it from the extension's Discover tab.";
  const div = document.createElement("div");
  div.id = "rpf-block";
  div.innerHTML =
    '<div class="rpf-block-card">' +
    '<div class="rpf-block-emoji">🔒</div>' +
    '<h2>' + heading + '</h2>' +
    '<p>' + reason + '</p>' +
    '<a class="rpf-block-btn" href="https://www.reddit.com/">Go to a safe feed</a>' +
    '</div>';
  document.documentElement.appendChild(div);
  document.documentElement.style.overflow = "hidden";
}

// Full-screen block for the home feed. Deliberately NOT a dead end: chat
// (including chat requests, which live on chat.reddit.com), notifications and
// community search all keep working — only the feed itself is off.
function fmtSubCount(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "k";
  return String(n || 0);
}

function blockHomePage() {
  if (document.getElementById("rpf-block")) return;
  const div = document.createElement("div");
  div.id = "rpf-block";
  div.innerHTML =
    '<div class="rpf-block-card">' +
    '<div class="rpf-block-emoji">🏡</div>' +
    '<h2>Home feed blocked</h2>' +
    '<p>You turned the Reddit home feed off. You can still search communities, chat and read notifications.</p>' +
    '<div class="rpf-block-search">' +
    '<input id="rpf-search-in" type="text" placeholder="Search communities…" maxlength="80" />' +
    '<button id="rpf-search-btn" type="button">Search</button>' +
    '</div>' +
    '<div id="rpf-search-results"></div>' +
    '<div class="rpf-block-actions">' +
    '<a class="rpf-block-btn" href="https://chat.reddit.com/">💬 Open chat</a>' +
    '<a class="rpf-block-btn rpf-block-btn2" href="https://www.reddit.com/notifications">🔔 Notifications</a>' +
    '</div>' +
    '<p class="rpf-block-note">Turn this off from the extension popup any time.</p>' +
    '</div>';
  document.documentElement.appendChild(div);
  document.documentElement.style.overflow = "hidden";

  // Search runs through the same recommender as the popup's finder, so blocked
  // communities never show up. Opening a community page is fine — the block
  // covers only the home feed.
  const input = div.querySelector("#rpf-search-in");
  const btn = div.querySelector("#rpf-search-btn");
  const out = div.querySelector("#rpf-search-results");
  let searching = false;
  async function go() {
    const q = input.value.trim();
    if (!q || searching) return;
    searching = true;
    out.textContent = "";
    const p = document.createElement("p");
    p.className = "rpf-muted";
    p.textContent = "Searching…";
    out.appendChild(p);
    const res = await recommend(q).catch(() => null);
    searching = false;
    const list = (res && res.list) || [];
    out.textContent = "";
    if (!list.length) {
      const none = document.createElement("p");
      none.className = "rpf-muted";
      none.textContent = "No communities found. Try a different term.";
      out.appendChild(none);
      return;
    }
    list.slice(0, 8).forEach(s => {
      const a = document.createElement("a");
      a.className = "rpf-sr";
      a.href = s.url;
      const name = document.createElement("span");
      name.className = "rpf-sr-name";
      name.textContent = "r/" + s.name;
      const subs = document.createElement("span");
      subs.className = "rpf-sr-subs";
      subs.textContent = fmtSubCount(s.subs) + " members";
      a.appendChild(name);
      a.appendChild(subs);
      out.appendChild(a);
    });
  }
  btn.addEventListener("click", go);
  input.addEventListener("keydown", e => { if (e.key === "Enter") go(); });
  input.focus();
}

// The subreddit currently being viewed (null on home / all / popular / non-sub pages).
function currentSub() {
  const m = location.pathname.match(/^\/r\/([A-Za-z0-9_]+)/);
  if (!m) return null;
  const low = m[1].toLowerCase();
  if (low === "all" || low === "popular") return null;
  return m[1]; // keep display casing for the label
}

// A floating "Block this community" button injected onto every subreddit page.
function updateBlockButton() {
  const sub = currentSub();
  let btn = document.getElementById("rpf-block-btn");
  if (!sub || blockedSubs.has(sub.toLowerCase())) {
    if (btn) btn.remove();
    return;
  }
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "rpf-block-btn";
    btn.addEventListener("click", () => {
      const s = currentSub();
      if (!s) return;
      chrome.storage.sync.get({ hiddenSubs: [] }, v => {
        const set = new Set(v.hiddenSubs || []);
        set.add(s);
        chrome.storage.sync.set({ hiddenSubs: [...set] }); // triggers block via storage.onChanged
      });
    });
    document.body.appendChild(btn);
  }
  btn.textContent = "🚫 Block r/" + sub;
}

function removeBlock() {
  const b = document.getElementById("rpf-block");
  if (b) b.remove();
  document.documentElement.style.overflow = "";
}

function processOne(el) {
  if (!el.dataset || el.dataset.rpfSeen) return;
  el.dataset.rpfSeen = "1";
  if (allowModeActive() && isHomeFeed()) {
    const sub = subredditOf(el);
    // Only posts carry a subreddit attribute; anything without one is left alone.
    if (sub && !allowedSubs.has(sub)) { hideSilently(el); return; }
  }
  if (blockedSubs.size) {
    const sub = subredditOf(el);
    if (sub && blockedSubs.has(sub)) { hideEl(el, "blocked community r/" + sub, false); return; }
  }
  if (cfg.enabled && matcher) {
    const m = matcher.exec(textOf(el));
    if (m) { hideEl(el, 'mentions "' + m[1] + '"'); return; }
  }
  if (compiledThemes.length) {
    const txt = textOf(el);
    for (const t of compiledThemes) {
      const r = matchTheme(txt, t);
      if (r.hit) {
        // Hard-hide (no "Show anyway"): the user asked for these to be blocked/banned.
        hideEl(el, 'theme "' + t.name + '" (' + r.groupsHit.join(" + ") + ')', false);
        return;
      }
    }
  }
}

function filteringActive() {
  return blockedSubs.size > 0 || (cfg.enabled && matcher) ||
         compiledThemes.length > 0 || (allowModeActive() && isHomeFeed());
}

function scan(root) {
  if (!filteringActive()) return;
  if (root.nodeType === 1 && root.matches && root.matches(SEL)) processOne(root);
  const nodes = root.querySelectorAll ? root.querySelectorAll(SEL) : [];
  nodes.forEach(processOne);
}

function unhideAll() {
  document.querySelectorAll(".rpf-placeholder").forEach(n => n.remove());
  document.querySelectorAll(".rpf-hidden").forEach(n => n.classList.remove("rpf-hidden"));
  document.querySelectorAll("[data-rpf-seen]").forEach(n => {
    delete n.dataset.rpfSeen;
    delete n.dataset.rpfHidden;
  });
}

function applyAll() {
  buildMatcher();
  buildThemes();
  buildBlocked();
  buildAllowed();
  unhideAll();
  scan(document); // scan() checks its own gates (keywords, themes, blocked subs)
}

// ---- Community recommender (runs same-origin on reddit.com) ----
async function fetchJson(url) {
  try {
    const r = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

async function recommend(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return { ok: false, error: "Empty query", list: [] };

  const words = q.split(/\s+/).filter(w => w.length > 2);
  const related = RELATED[q] || [];
  const byName = new Map();

  // Communities the user permanently dismissed with the × button.
  const hiddenSet = await new Promise(resolve =>
    chrome.storage.sync.get({ hiddenSubs: [] }, v =>
      resolve(new Set((v.hiddenSubs || []).map(s => String(s).toLowerCase())))));

  // Blend relevance (rank in Reddit's own ordering) with popularity and how
  // well the community's name/description matches the query words.
  function add(d, weight, rank) {
    if (!d || d.over18) return;
    const name = d.display_name;
    if (!name || /^u_/i.test(name)) return;   // skip user profiles
    if (d.subreddit_type === "private") return;
    if (hiddenSet.has(name.toLowerCase())) return; // user dismissed this one
    const subs = d.subscribers || 0;

    const rel = weight / (rank + 1);                 // earlier = more relevant
    const pop = Math.log10(subs + 10);               // gentle popularity nudge
    const hay = (name + " " + (d.title || "") + " " + (d.public_description || "")).toLowerCase();
    let textMatch = 0;
    words.forEach(w => { if (hay.includes(w)) textMatch += 1; });
    if (name.toLowerCase().replace(/[^a-z]/g, "").includes(q.replace(/[^a-z]/g, ""))) textMatch += 2;

    const base = rel * 10 + pop + textMatch * 3;
    const ex = byName.get(name);
    if (ex) {
      // showing up under multiple related terms is a strong relevance signal
      ex.score = Math.max(ex.score, base) + rel * 4;
    } else {
      byName.set(name, {
        name,
        title: d.title || "",
        subs,
        url: "https://www.reddit.com/r/" + name + "/",
        desc: (d.public_description || "").slice(0, 140),
        score: base
      });
    }
  }

  // Two complementary endpoints: autocomplete is topical/name-aware,
  // subreddits/search is relevance-ranked. Word-splitting is intentionally gone.
  async function pull(term, weight) {
    const ac = await fetchJson(
      "https://www.reddit.com/api/subreddit_autocomplete_v2?query=" +
      encodeURIComponent(term) +
      "&include_over_18=false&include_profiles=false&limit=10&raw_json=1"
    );
    ((ac && ac.data && ac.data.children) || []).forEach((c, i) => add(c.data, weight, i));

    const sr = await fetchJson(
      "https://www.reddit.com/subreddits/search.json?q=" +
      encodeURIComponent(term) + "&sort=relevance&limit=15&include_over_18=off&raw_json=1"
    );
    ((sr && sr.data && sr.data.children) || []).forEach((c, i) => add(c.data, weight, i));
  }

  await pull(q, 3);                                            // primary topic
  await Promise.allSettled(related.slice(0, 6).map(t => pull(t, 1))); // related topics

  const all = [...byName.values()].sort((a, b) => b.score - a.score);
  // Prefer real, active communities; relax if that leaves too few.
  let list = all.filter(s => s.subs >= 200).slice(0, 20);
  if (list.length < 8) list = all.slice(0, 20);
  return { ok: true, list };
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg && msg.type === "recommend") {
    recommend(msg.query).then(send);
    return true; // async response
  }
});

// ---- Boot ----
// Seed the default keyword list into storage on first run so the popup and the
// export/import feature always see the real list (not an empty placeholder).
chrome.storage.sync.get(null, (raw) => {
  const patch = {};
  if (!raw || !Array.isArray(raw.keywords) || raw.keywords.length === 0) {
    patch.keywords = DEFAULTS.keywords;
  }
  // Seed the starter theme only if `themes` has never been set (an empty array
  // means the user deliberately cleared them — don't re-seed).
  if (!raw || raw.themes === undefined) {
    patch.themes = THEME_STARTER;
  }
  if (Object.keys(patch).length) chrome.storage.sync.set(patch);
});

chrome.storage.sync.get(DEFAULTS, (stored) => {
  cfg = { ...DEFAULTS, ...stored };
  applyAll();
  checkSubredditGate();
  updateBlockButton();

  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (filteringActive()) scan(n);
      }
    }
  });
  mo.observe(document.documentElement, { childList: true, subtree: true });

  // Reddit is a single-page app: the URL changes without a reload, so poll it
  // to re-check the blocked-community gate when you move between communities.
  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      checkSubredditGate();
      updateBlockButton();
      // The allowlist only applies on the home feed, so entering/leaving it
      // must re-evaluate everything already on the page.
      if (allowModeActive()) applyAll();
    }
  }, 700);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  chrome.storage.sync.get(DEFAULTS, (stored) => {
    cfg = { ...DEFAULTS, ...stored };
    applyAll();
    checkSubredditGate();
    updateBlockButton();
  });
});
