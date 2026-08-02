# Privacy Policy — Redix

**Last updated:** 2 August 2026
**Extension:** Redix (Chrome / Edge, Manifest V3)
**Contact:** rishabhagarwal1028@gmail.com

## Short version

This extension collects nothing, sends nothing to the developer, and has no
servers. Everything it does happens inside your own browser.

## What the extension stores

Your settings are saved with Chrome's `storage.sync` API, which keeps them in
your own browser profile and syncs them through your own Google account if you
have Chrome sync enabled. The developer has no access to this data.

The stored settings are:

| Key | What it holds |
|---|---|
| `enabled`, `strict` | Whether keyword filtering is on, and whole-word mode |
| `keywords` | Your keyword list |
| `themes`, `themesEnabled` | Your concept-based theme filters |
| `allowedSubs`, `allowMode` | Communities you allow on the home feed |
| `hiddenSubs` | Communities you have blocked |
| `homeBlock` | Whether the home feed is fully blocked |

That is the complete list. No browsing history, no page content, no post text,
no identifiers, and no analytics of any kind are stored.

## Network requests

The extension makes requests to exactly one origin: **reddit.com**, and only to
Reddit's own public JSON endpoints, and only when you ask it to.

- **Community finder / name verification** — when you type a topic and press
  *Find communities*, or press *Verify names*, the extension queries
  `reddit.com/subreddits/search.json`, `reddit.com/api/subreddit_autocomplete_v2`
  and `reddit.com/r/<name>/about.json` to get real community names and
  descriptions. The only thing sent is the search term you typed.

These requests go to Reddit, not to the developer. When made from a Reddit page
they are same-origin and carry your existing Reddit session cookie, exactly as
if the page itself had made them; Reddit's own privacy policy governs what
Reddit does with them. Nothing is sent anywhere else.

## What the extension does *not* do

- No data is transmitted to the developer or any third party.
- No analytics, telemetry, crash reporting, advertising, or tracking.
- No accounts, logins, or user identifiers.
- No third-party libraries, remote scripts, or remotely hosted code — the
  extension ships only its own vanilla JavaScript, and all of it is in the
  package you install.
- Your data is never sold or transferred to anyone.
- Your data is not used for creditworthiness or lending purposes.
- Your data is not used for any purpose unrelated to the extension's single
  purpose of filtering Reddit content.

## Permissions and why they exist

- **`storage`** — to save the settings listed above.
- **Host access to `*://*.reddit.com/*`** — to read and hide posts on Reddit
  pages, and to query Reddit's public community endpoints. The extension runs on
  no other site.

## Deleting your data

Removing the extension from `chrome://extensions` deletes its stored settings.
You can also clear individual lists from the popup at any time.

## Changes

Any change to this policy will be published in this file in the extension's
public repository, with the date above updated.
