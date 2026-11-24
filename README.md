# Beaver Creek Lodge | TV Channel Finder

A mobile-first, bilingual guide to in-room television. No account, build step, network API, ads, trackers, or runtime dependencies.

## Update the lineup

1. Edit **`channels.mjs`**. Each record has an `id` (TV channel number, stored as a string to preserve zeros), `identifier` (exactly as shown on the in-room TV guide), `name` (display name), `category` (controls which optional category filter includes the channel), and `aliases` (optional abbreviations and alternative names for search).
2. Verify lineup changes on the hotel TVs. Keep channels with identical names but different channel numbers as separate records. The initial lineup has 74 entries; channels 02, 06, 33, 48, 68, 75 and 76 are intentionally absent.
3. Channel 80 is displayed as **HDMI 1**. For this special entry, edit the guest-facing label and its search aliases (Roku, Netflix and YouTube) in `search.mjs`, and the front-desk note in both languages in `app.mjs`. Keep its original guide record and identifier in `channels.mjs`.
4. Preview with `python3 -m http.server 8000`, then open `http://localhost:8000`. JavaScript modules require an HTTP server, not a double-click on the HTML file.
5. Commit to `main`. GitHub Pages publishes the root of that branch. Under **Settings → Pages**, the source is **Deploy from a branch → main / (root)**.

The initial lineup and the archived combined Beaver Creek Lodge / Autograph Collection Hotels wordmark were retained from the [original TV guide](https://beaver-creek-lodge-tv.paulintintin.chatgpt.site). Names and identifiers describe the property's guide, not a guarantee of a particular network feed or programming. Brand assets are not licensed for unrelated reuse.

## Files

- `index.html`, `styles.css`: the guest-facing page and themes.
- `app.mjs`: English/Spanish, saved preferences, and rendering.
- `channels.mjs`, `search.mjs`: original lineup and search index/matching.
- `beaver-creek-lodge-transparent.png`: the supplied transparent wordmark, used unchanged in light mode and recolored on screen in dark mode.
- `beaver-creek-lodge.jpeg`, `tv.svg`: the archived original combined lockup and the site's TV icon.
