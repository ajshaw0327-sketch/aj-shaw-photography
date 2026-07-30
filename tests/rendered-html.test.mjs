import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repositoryRoot, ".site");
const pages = [
  ["index.html", "home"],
  ["travel.html", "travel"],
  ["events.html", "events"],
  ["sports.html", "sports"],
  ["about.html", "about"],
];
const routePanels = {
  home: ["HOME / 00", "Home"],
  travel: ["TRV / 01", "Travel"],
  events: ["EVT / 02", "Events"],
  sports: ["SPT / 03", "Sports"],
  about: ["ABOUT / 04", "About"],
};

test("every rendered route includes the shared launch experience and local typography", async () => {
  for (const [filename, route] of pages) {
    const html = await readFile(path.join(outputRoot, filename), "utf8");
    assert.match(html, new RegExp(`<body[^>]+data-page="${route}"`));
    assert.match(html, /content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/);
    assert.match(html, /id="launch-dialog"/);
    assert.match(html, /id="launch-title"/);
    assert.match(html, /Enter Portfolio/);
    assert.match(html, /Skip intro/);
    assert.match(html, /aj-shaw-launch-seen-v1/);
    assert.match(html, /id="critical-route-colors"/);
    assert.match(html, /name="theme-color" content="#f2eddd"/);
    assert.match(html, /rel="icon" type="image\/png" sizes="32x32" href="favicon\.png"/);
    assert.match(html, /:root \{ --route-panel-top: 72px; color-scheme: light; background: #f2eddd; \}/);
    assert.match(html, /--route-panel-top: calc\(64px \+ env\(safe-area-inset-top, 0px\)\)/);
    assert.match(html, /id="route-curtain"/);
    assert.match(html, /aj-shaw-route-transition-v1/);
    assert.match(html, /aj-shaw-route-transition-started-v1/);
    assert.match(html, /data-route-curtain-code/);
    assert.match(html, /data-route-curtain-title/);
    assert.match(html, /class="route-curtain-progress-track"/);
    assert.match(html, /data-route-curtain-retry/);
    assert.ok(html.includes(routePanels[route][0]));
    assert.ok(html.includes(`data-route-curtain-title>${routePanels[route][1]}`));
    assert.ok(
      html.indexOf('id="critical-route-colors"') < html.indexOf('<link rel="stylesheet"'),
      `${filename} must paint cream before loading the external stylesheet`,
    );
    assert.ok(
      html.indexOf('id="route-curtain"') < html.indexOf('id="launch-dialog"'),
      `${filename} must create the transition surface before visible page content`,
    );
    assert.match(html, /fonts\/cormorant-garamond-latin\.woff2/);
    assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
    assert.match(html, /data-route="home"/);
    assert.match(html, /data-route="travel"/);
    assert.match(html, /data-route="events"/);
    assert.match(html, /data-route="sports"/);
    assert.match(html, /data-route="about"/);
    assert.match(html, /About \/ Contact/);
    assert.doesNotMatch(html, /data-route="contact"/);
    assert.equal((html.match(/data-route=/g) || []).length, 5);
  }
});

test("about and contact form one route while the legacy contact URL redirects", async () => {
  const about = await readFile(path.join(outputRoot, "about.html"), "utf8");
  const legacyContact = await readFile(path.join(outputRoot, "contact.html"), "utf8");
  const home = await readFile(path.join(outputRoot, "index.html"), "utf8");

  assert.match(about, /id="contact"/);
  assert.match(about, /Bookings &amp; collaborations/);
  assert.match(about, /@aj\.phots_/);
  assert.match(about, /class="profile-portrait"/);
  assert.match(about, /class="booking-envelope"/);
  assert.doesNotMatch(about, /class="story-chapter/);
  assert.doesNotMatch(about, /class="field-kit-chapter/);
  assert.match(legacyContact, /url=about\.html\?from=contact#contact/);
  assert.match(legacyContact, /location\.replace\("about\.html\?from=contact#contact"\)/);
  assert.match(legacyContact, /id="critical-route-colors"/);
  assert.match(legacyContact, /content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/);
  assert.match(legacyContact, /background-color: #f2eddd/);
  assert.match(legacyContact, /rel="icon" type="image\/png" sizes="32x32" href="favicon\.png"/);
  assert.doesNotMatch(home, /Recent work/);
  assert.doesNotMatch(home, /class="route-cards home-route-cards"/);
  assert.doesNotMatch(home, /class="route-card-label"/);
  assert.doesNotMatch(home, /class="living-contact"/);
  assert.doesNotMatch(home, /id="hero-mosaic"/);
  assert.doesNotMatch(home, /class="hero home-cover"/);
  assert.doesNotMatch(home, /An archive that/);
  assert.equal((home.match(/data-category-preview=/g) || []).length, 3);
  assert.match(home, /Choose a field file\./);
  assert.doesNotMatch(home, /Layered like postcards collected on the way/);
  assert.doesNotMatch(home, /Invitations, programs, gestures, and shared traditions/);
  assert.doesNotMatch(home, /Contact frames from the seconds before and after the play/);
  assert.match(home, /class="character-sprite character-home-file"/);
  assert.match(home, /data-character="walk"/);
  assert.doesNotMatch(home, /Three ways into the archive/);
  assert.doesNotMatch(home, /class="archive-closing"/);
  assert.doesNotMatch(home, /<footer class="site-footer">/);
});

test("portfolio routes retain generated galleries and the themed lightbox", async () => {
  for (const route of ["travel", "events", "sports"]) {
    const html = await readFile(path.join(outputRoot, `${route}.html`), "utf8");
    assert.match(html, new RegExp(`data-gallery-view="${route}"`));
    assert.match(html, /id="photo-grid"/);
    assert.match(html, /id="lightbox"/);
    assert.match(html, /class="lightbox-backdrop"/);
    assert.match(html, /aria-describedby="lightbox-detail"/);
    assert.match(html, /gallery-manifest\.js/);
    assert.match(html, /app\.js/);
  }
});

test("interaction styles use content-sized archive drawers and reduced-motion fallbacks", async () => {
  const css = await readFile(path.join(outputRoot, "style.css"), "utf8");
  const script = await readFile(path.join(outputRoot, "app.js"), "utf8");

  assert.match(css, /\.gallery-subsection:not\(\.is-expanded\) \.photo-grid\s*\{[\s\S]*overflow-x:\s*auto/);
  assert.match(css, /scroll-snap-type:\s*inline mandatory/);
  assert.match(css, /touch-action:\s*pan-x pan-y/);
  assert.match(css, /\.gallery-subsection-panel\.is-layout-transitioning\s*\{[\s\S]*transition:\s*height/);
  assert.doesNotMatch(css, /\.gallery-subsection-panel[\s\S]{0,240}max-height/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.photo-surface/);
  assert.match(css, /\.photo-metadata/);
  assert.match(css, /\.route-preview/);
  assert.match(css, /\.living-print/);
  assert.match(css, /\.category-portal/);
  assert.match(css, /\.lightbox-object-labels/);
  assert.doesNotMatch(css, /\.archive-cursor/);
  assert.match(css, /\.route-curtain::before/);
  assert.match(css, /\.route-curtain::after/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.route-curtain\s*\{[\s\S]*transition:\s*opacity 140ms ease/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*body\[data-page="home"\] \.category-portal-grid/);
  assert.match(css, /min-height:\s*calc\(64px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(css, /padding-top:\s*calc\(7px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(css, /\.site-header\s*\{[\s\S]*background:\s*var\(--paper\);[\s\S]*backdrop-filter:\s*none;/);
  assert.doesNotMatch(css, /@view-transition|::view-transition|view-transition-name/);
  assert.doesNotMatch(css, /\.route-leaving \.page/);
  assert.doesNotMatch(css, /body:not\(\.route-ready\)[\s\S]{0,180}\.page/);
  assert.doesNotMatch(css, /\.nav-marker/);
  assert.match(script, /setSubsectionExpanded/);
  assert.match(script, /aria-expanded/);
  assert.match(script, /Expand collection/);
  assert.match(script, /Close collection/);
  assert.match(script, /previewScrollPositions/);
  assert.match(script, /getBoundingClientRect\(\)\.height/);
  assert.match(script, /ResizeObserver/);
  assert.match(script, /scrollBy/);
  assert.doesNotMatch(script, /panel\.hidden = true/);
  assert.match(script, /history\.replaceState/);
  assert.match(script, /openLightbox\(selected, localIndex, button\)/);
  assert.match(script, /event\.key !== "Escape" \|\| !navigation\?\.classList\.contains\("is-open"\)/);
  assert.doesNotMatch(script, /setupArchiveCursor|cursorLabel|data-cursor-label/);
  assert.match(script, /const routeTransitionKey = "aj-shaw-route-transition-v1"/);
  assert.match(script, /function beginRouteNavigation/);
  assert.match(script, /routeNavigationLocked/);
  assert.match(script, /function syncRouteCurtainBoundary/);
  assert.match(script, /getBoundingClientRect\(\)\.bottom/);
  assert.match(script, /setRouteCurtainLoading/);
  assert.match(script, /showRouteCurtainError/);
  assert.match(script, /fetch\(destination\.href/);
  assert.match(script, /response\.text\(\)/);
  assert.match(script, /window\.history\.pushState/);
  assert.match(script, /focusNewRouteHeading/);
  assert.match(script, /classList\.add\("is-covering"\)/);
  assert.match(script, /classList\.add\("is-revealing"\)/);
  assert.match(script, /"transitionend"/);
  assert.match(script, /window\.location\.assign\(destination\.href\)/);
  assert.match(script, /"pagehide"/);
  assert.match(script, /lightboxSwapTimer/);
  assert.match(script, /element\.inert = true/);
  assert.doesNotMatch(script, /positionNavigationMarker|nav-proximity/);
  assert.match(script, /function randomPhotoSelection/);
  assert.match(script, /Math\.random\(\)/);
  assert.match(css, /body\[data-page="home"\][\s\S]{0,220}overflow:\s*hidden/);
  assert.match(css, /body\[data-page="home"\] \.category-portal-travel\s*\{[\s\S]*grid-column:\s*1 \/ 8/);
  assert.match(css, /body\[data-page="home"\] \.category-portal-sports\s*\{[\s\S]*grid-column:\s*2 \/ 12/);
});
