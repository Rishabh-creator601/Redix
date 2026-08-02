# Chrome Web Store submission packet

Everything you paste into the **Developer Dashboard**, field by field, for
**Redix v1.2.0**. Assets referenced here already exist — see
[`README.md`](README.md) in this folder for the image set.

One-time cost before you start: the Chrome Web Store developer account has a
**US$5 lifetime registration fee**. Register at
<https://chrome.google.com/webstore/devconsole> with the Google account you want
to own the listing permanently — it cannot be changed later without a transfer.

---

## 0. Package

| | |
|---|---|
| Upload file | `reddit-positivity-filter.zip` (repo root) |
| Version | `1.2.0` (from `manifest.json`) |
| Contents | `manifest.json`, `content.js`, `content.css`, `popup.html`, `popup.js`, `icons/` |
| Verified | Zip contents match the working tree byte-for-byte |

The zip deliberately excludes `store/`, `docs/`, `tools/`, `README.md` and
`PRIVACY.md` — listing assets and docs are not part of the package.

**Every future update must bump `version` in `manifest.json` and re-zip.** The
store rejects an upload whose version is not higher than the published one.

---

## 1. Store listing

### Name (45 char max)

```
Redix
```

Must match `manifest.json` exactly — the store reads the name from the package,
not from this field.

### Short description (132 char max — currently 126)

```
Hides Reddit posts and comments about topics you choose, blocks communities and the home feed, and finds communities you love.
```

### Detailed description

```
Take back control of what Reddit shows you.

Redix is a positivity filter for Reddit. It hides the posts and comments you don't want to see, lets you decide which communities reach your home feed, and helps you find the ones worth following. Everything runs inside your own browser — no servers, no accounts, no tracking.

YOUR HOME FEED, YOUR RULES
• Allowlist mode — only the communities you approve appear on your home feed. Everything else is silently removed.
• Full block mode — replace the home feed with a calm block screen. Chat, chat requests and notifications keep working, and the block screen links straight to both.
• Block any community — a floating Block button on every community page. Blocked communities vanish from every feed, their pages are blocked, and they are never recommended.

FILTER OUT NEGATIVITY
• Keyword filter — hides posts and comments mentioning topics you choose. Ships with an editable starter list, plus an optional whole-word mode so "war" stops matching "warm".
• Theme filter — block a whole concept instead of a phrase. Define a theme as a few concepts, and a post is hidden when a majority of them appear together, even if you never typed that exact wording. A live test box shows you exactly why a post would be blocked.

THE PRACTICAL BITS
• Community finder — type an interest and get the most relevant communities, ranked by relevance and popularity, each with an Allow or Block button.
• Name verification — type community names and have them checked against Reddit, so a typo never silently breaks your allowlist.
• Per-section backup — export and import keywords, themes, allowed communities and blocked communities as separate files, so restoring one never overwrites another. An "Everything" file covers a move to a new machine.

WORKS WITH
• New Reddit (www.reddit.com) and old Reddit (old.reddit.com)
• Chrome and Edge, Manifest V3

PRIVACY
• No external servers — all filtering happens in your browser.
• No analytics, no telemetry, no accounts, no tracking.
• No third-party code — the extension ships only its own JavaScript.
• The community finder talks only to Reddit's own public API, using your existing session.
• Settings stay in your browser profile and sync only through your own Google account.

Open source: https://github.com/Rishabh-creator601/Reddit-filters
```

### Category

**Social Networking** — listed as **Social & Communication** in the older
dashboard taxonomy; same slot, renamed.

It's where users browse for Reddit tools, which matters more than usual here:
the coined name carries no keywords, so category browsing is one of the few
discovery paths left. *Well-being* fits "positivity filter" and is far less
crowded, but nobody looking for a Reddit extension browses it.

### Language

English (United States)

### Graphic assets

| Field | File |
|---|---|
| Store icon (128×128) | `store/icon/store-icon-128.png` |
| Screenshot 1 (thumbnail) | `store/screenshots/01-home-feed-1280x800.png` |
| Screenshot 2 | `store/screenshots/02-filters-1280x800.png` |
| Screenshot 3 | `store/screenshots/03-communities-1280x800.png` |
| Screenshot 4 | `store/screenshots/04-backup-1280x800.png` |
| Small promo tile (440×280) | `store/promo/small-tile-440x280.png` |
| Marquee (1400×560) | `store/promo/marquee-1400x560.png` |

### Support / homepage URLs

| Field | Value |
|---|---|
| Homepage URL | `https://github.com/Rishabh-creator601/Reddit-filters` |
| Support URL | `https://github.com/Rishabh-creator601/Reddit-filters/issues` |

---

## 2. Privacy tab

This is the section that gets submissions rejected. Every answer below is
accurate for v1.2.0 — do not soften any of it.

### Single purpose description

```
Redix has one purpose: to let a user control which Reddit content they see. It hides posts and comments matching the user's own keyword and theme filters, hides or blocks communities the user has chosen, and helps the user find communities to allow or block. It runs only on reddit.com and does nothing else.
```

### Permission justifications

**`storage`**

```
Used to save the user's own settings: their keyword list, theme filters, the communities they have allowed on their home feed, the communities they have blocked, and the on/off state of each filter. These settings must persist between browsing sessions and across the user's devices, which is what storage.sync provides. No browsing data or page content is stored.
```

**Host permission `*://*.reddit.com/*`**

```
The extension's entire function is filtering reddit.com. The content script needs access to reddit.com pages to read post and comment text, compare it against the user's filters, and hide matching items in the page. The same host access lets the extension query Reddit's own public JSON endpoints (subreddits/search.json, subreddit_autocomplete_v2, r/<name>/about.json) so the community finder can return real communities and so typed community names can be verified against Reddit instead of silently failing. reddit.com is the only host the extension requests, and the only site it runs on.
```

**Remote code**

```
No. The extension executes no remote code. It contains only its own JavaScript, all of it included in the uploaded package. There are no third-party libraries, no remotely hosted scripts, no eval() of fetched content, and no WebAssembly. The only network requests are to Reddit's public JSON API, and the responses are parsed as data (community names, titles, subscriber counts) and never executed.
```

### Data usage disclosures

Tick **nothing** in the data-collection list. For each of the categories
offered — personally identifiable information, health information, financial
information, authentication information, personal communications, location, web
history, user activity, website content — the answer is **not collected**. The
extension transmits no user data to the developer or anyone else; settings never
leave the user's own browser profile.

### Certifications

All three must be checked, and all three are true:

- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

```
https://github.com/Rishabh-creator601/Reddit-filters/blob/main/PRIVACY.md
```

[`PRIVACY.md`](../PRIVACY.md) exists at the repo root. **Commit and push it
before submitting** — reviewers open this URL, and a 404 here is an instant
rejection.

---

## 3. Account type — trader / non-trader

Asked once per developer account, not per extension. It comes from the EU
Digital Services Act.

**Declare: non-trader.**

The test is your purpose in publishing, not the extension's quality or reach.
As of v1.2.0 this extension is free, has no in-app purchases, no ads, no sponsor
or donation links, no company behind it, and does not promote any paid product
or professional service. That is "acting for purposes outside its trade,
business, craft or profession".

**Why this is not a safe-by-default choice.** Declaring **trader** obliges you
to supply verified contact details — name, physical address, phone, email — and
Google **publishes them on the public listing page**. For an individual
publishing from home, that means a home address on a public web page.
Non-trader carries no such disclosure, and still allows EU distribution.

**Revisit the declaration if any of these become true:**

- the extension is paid, or gains in-app purchases or ads
- it is published under a company or registered business
- it promotes services or products you sell
- publishing extensions becomes an ongoing income-generating activity

A donation link alone generally does not make you a trader; paid tiers or a
"Pro" version do.

---

## 4. Distribution

| Field | Value |
|---|---|
| Visibility | **Public** (use *Unlisted* first if you want a private trial run) |
| Distribution | All regions |
| Pricing | Free |

---

## 5. Pre-submission checklist

- [ ] Account type declared as **non-trader** (§3)
- [ ] `PRIVACY.md` committed and pushed; the URL in §2 loads publicly
- [ ] `manifest.json` version is higher than any previously published version
- [ ] `reddit-positivity-filter.zip` re-zipped from the current working tree
- [ ] Package loads clean via **Load unpacked** with no console errors
- [ ] Screenshot captions still describe features that actually exist
- [ ] Detailed description claims nothing the extension no longer does
- [ ] Developer account email verified and the $5 fee paid
- [ ] Listing name matches `manifest.json` (`Redix`)

---

## 6. Review-risk notes

**Trademark risk: resolved.** The extension publishes as **Redix**, a coined
name. Chrome Web Store branding policy objects to names that lead with, or
largely consist of, another product's trademark; "Redix" does neither, so the
branding objection that applied to the old name no longer exists. "Reddit"
appears only in the description, as a factual statement of what the extension
works with — which the policy permits.

If you want the disclaimer anyway, add to the end of the detailed description:

```
Not affiliated with or endorsed by Reddit, Inc.
```

**Discoverability is now the trade-off.** A coined name carries no keywords, so
store search has to find you through the descriptions instead. Both already lead
with the right terms — the short description opens "Hides Reddit posts and
comments…", and the detailed description's first line is "Redix is a positivity
filter for Reddit." Keep it that way; if you ever rewrite them, keep "Reddit",
"filter" and "block" in the first sentence of each.

**Secondary notes:**

- **Broad host permission is fine here.** `*://*.reddit.com/*` is narrow and
  obviously necessary for the stated single purpose. Reviewers push back on
  `<all_urls>`, not on a single-site match.
- **Credentialed requests.** `content.js` fetches Reddit's API with
  `credentials: "include"`. That's same-origin from a Reddit page and is
  disclosed in the privacy policy — legitimate, but it's the one behaviour a
  reviewer might question. §2's host-permission justification already covers it.
- **First review takes longer.** A first submission typically takes a few days;
  updates are usually faster. Extensions requesting sensitive permissions can
  take several weeks — this one shouldn't.
