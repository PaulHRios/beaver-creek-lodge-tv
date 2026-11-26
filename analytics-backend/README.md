# TV guide analytics
Zero-cookie aggregate measurement. The visitor-facing guide stays on GitHub Pages;
a separately deployed Google Apps Script service. The public writer cannot read
stats; the dashboard is a **different, owner-only version** of the same project
so they share private Script Properties. No Google Sheets or Drive permissions,
Google Analytics tag, guest consent modal, storage identifier, fingerprint, GPS,
raw IP, full URL, full referrer, free-form search text or raw user agent.

## Setup
1. Create a private Apps Script project in the owner's account. Add both
   collector .gs files; deploy the web app, execute as owner, access **Anyone**.
   Record this write-only deployment. Its immutable version must contain no
   dashboard or read function. Disable uncaught exception logging.
2. After pinning the public version, replace its `doGet` definition in the
   **editor source** with the dashboard Code.gs definitions, leaving doPost and
   the allowlist in place. Add the dashboard Index.html. Create a **new**
   deployment, execute as owner, access **Only myself**. Never change the
   public deployment to this version, never publish the private version as
   Anyone, and do not share the Apps Script project. A future collector update
   must publish a new write-only version (remove dashboard definitions and
   files before versioning). The two deployments share only aggregated values
   stored on the server.
3. Add only the public collector's `/exec` URL to `analytics-config.mjs`
   after it receives a test and the owner-only dashboard is verified. Missing
   URL disables all collection. Do not commit the private dashboard URL or
   credentials. To turn off, clear the client config and redeploy.
4. Confirm the collector GET returns only the generic write-only notice.
   Verify a controlled real search appears in the dashboard, and that a
   separately signed-out browser cannot open the private dashboard. Check
   desktop/mobile, GPC/DNT and opt-out. Test the unchanged printed QR target.

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
- The public endpoint accepts at most 20 known events per batch and 240 per
  page. It stores bounded hourly aggregates. Up to 93 days are retained under
  the storage cap; busy periods can exhaust a bucket or shorten retention. Free
  provider limits can stop ingestion. No billing account or overage is configured.
- Guest notice at `/privacy.html` offers a browser-local opt-out without
  analytics cookies. GPC/DNT skip all collection. Activate only where this
  aggregate measurement and notice match hotel policy and applicable rules.
