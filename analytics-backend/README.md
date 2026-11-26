# TV guide analytics
Zero-cookie aggregate measurement. The visitor-facing guide stays on GitHub Pages;
the separately deployed Google Apps Script collector accepts write-only anonymous
batches and the dashboard reads the same owner-private sheet. No Google Analytics
tag, guest consent modal, storage identifier, fingerprint, GPS, raw IP, full URL,
full referrer, free-form search text, or raw user agent is collected by our code.
No paid tiers, cloud billing, domain, add-on or API credential is needed.

## Setup
1. In the owner's Google account, create a restricted spreadsheet named TV Guide
   Analytics. Add a tab named `metrics` with row 1:
   `bucket, metric, label, count, sum` (one cell per field). Do not share the sheet.
2. Create an Apps Script project for **collector**. Add both .gs files and set the
   Script property `SPREADSHEET_ID` to the private sheet ID. Deploy the web app
   with execution as owner and access as **Anyone** so only anonymous POSTs work.
   This app offers no data-reading method. Install a daily time-driven trigger
   for `pruneMetrics_` via the editor, leaving 93 days of data.
3. Create a **separate** Apps Script project for **dashboard**. Add Code.gs and
   Index.html and set the same property. Deploy as owner, access **Only myself**.
   Never publish this project as Anyone or use its URL in the guide.
4. Add only the public write-only collector's `/exec` URL to
   `analytics-config.mjs`. An unconfigured URL leaves collection completely off.
   The URL is not a password; never commit a private sheet ID, owner address,
   credentials or dashboard URL. To turn off, remove the config and redeploy.
5. Confirm the collector answers GET with only a generic notice. Verify a
   controlled real search shows up in the private dashboard and that a separate
   signed-out browser cannot open the dashboard. Check mobile/desktop, GPC/DNT
   and opt-out, and verify the printed QR still resolves to the unchanged guide.
   Do not present local tests as proof of live data receipt.

## Interpretation and limits
- Sessions are individual page opens, not people. Tabs and reloads can count
  separately. Unique/new/returning people are deliberately not inferred.
- Foreground duration is measured per visibility segment; mean segment length
  is not a mean per identified visitor. Closed tabs can miss the last batch.
- Recent activity shows visible-tab heartbeats, not an exact live user count.
- Search results are sampled after typing pauses (800 ms). Known search terms
  are literal entries from our channel alias allowlist only. Unknown/no-result
  text, error details, and full URLs never leave the guide. Match counts are
  unambiguous result displays; selections mean observed result taps, not a TV
  changing channels. Time-to-display/tap is not time to tune.
- Source is a small fixed list of referral categories. Existing untagged QR
  codes still open the same URL but cannot be distinguished from direct traffic.
  New prints may use `?src=qr`. The source classifier never sends raw URLs.
- Apps Script exposes no reliable visitor geography. No city, map or exact
  location. Screen size is grouped. Browser version comes from its reduced
  browser string; device model and OS version are intentionally not collected.
- Hours in storage/dashboard are UTC. Blockers, privacy preferences, offline
  exits, network failures and free quotas can cause undercounting. The endpoint
  is public and validates metric names and labels, but request counts can be
  spoofed; it is not authoritative for billing or security.
- The public endpoint accepts at most 20 known events per batch, 240 per page,
  and at most 3,000 writes/day. Free provider quotas can stop ingestion
  earlier. No overage, upgrade, or payment is configured by this code.
- Guest notice at `/privacy.html` offers a browser-local opt-out without
  analytics cookies. GPC/DNT skip all collection. Activate only where this
  aggregate measurement and notice match hotel policy and applicable rules.
