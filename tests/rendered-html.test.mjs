import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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
  travel: ["TRV / 02", "Travel"],
  events: ["EVT / 01", "Events"],
  sports: ["SPT / 03", "Sports"],
  about: ["ABOUT / 04", "About"],
};

test("every rendered route includes the minimal automatic typewriter introduction", async () => {
  for (const [filename, route] of pages) {
    const html = await readFile(path.join(outputRoot, filename), "utf8");
    assert.match(html, new RegExp(`<body[^>]+data-page="${route}"`));
    assert.match(html, /content="width=device-width, initial-scale=1\.0, viewport-fit=cover"/);
    assert.match(html, /id="launch-sequence"/);
    assert.match(html, /id="launch-title"/);
    assert.match(html, /aria-label="AJ Shaw Photography"/);
    assert.match(html, /data-typewriter-name/);
    assert.match(html, /data-launch-photography[^>]*>Photography/);
    assert.doesNotMatch(html, /data-typewriter-title/);
    assert.match(html, /data-intro-announcement aria-live="polite" aria-atomic="true"/);
    assert.match(html, /class="launch-typewriter-cursor"/);
    assert.match(html, /navigationEntry\?\.type === "reload"/);
    assert.match(html, /arrivingFromSite && !isReload/);
    assert.match(html, /window\.__ajSimpleIntroFailSafe = reveal/);
    assert.match(html, /window\.setTimeout\(reveal, 3500\)/);
    assert.doesNotMatch(html, /Enter Portfolio|Skip intro|<dialog/);
    assert.doesNotMatch(html, /data-typewriter-archive|data-typewriter-tagline|launch-contact-frames|launch-document-meta/);
    assert.doesNotMatch(html, /data-face=|launch-camera-burst|launch-character|AJ SHAW PHOTOGRAPHIC ARCHIVE/);
    assert.doesNotMatch(html, /aj-shaw-archive-intro-seen/);
    assert.doesNotMatch(html, /Places\. People\. Motion\./);
    assert.doesNotMatch(html, /aj-shaw-launch-seen-v1/);
    assert.match(html, /id="critical-route-colors"/);
    assert.match(html, /name="theme-color" content="#f2eddd"/);
    assert.match(html, /rel="icon" type="image\/png" sizes="32x32" href="favicon\.png"/);
    assert.match(html, /rel="preload" href="fonts\/playfair-display-variable\.ttf" as="font" type="font\/ttf" crossorigin/);
    assert.match(html, /:root \{ --route-panel-top: 72px; color-scheme: light; background: #f2eddd; \}/);
    assert.match(html, /--route-panel-top: calc\(64px \+ env\(safe-area-inset-top, 0px\)\)/);
    assert.match(html, /id="route-curtain"/);
    assert.match(html, /aj-shaw-route-transition-v1/);
    assert.match(html, /aj-shaw-route-transition-started-v1/);
    assert.match(html, /navigationEntry\?\.type === "back_forward"/);
    assert.match(html, /document\.documentElement\.dataset\.routeHistory = "true"/);
    assert.match(html, /Math\.max\(0, 650 - \(Date\.now\(\) - started\)\)/);
    assert.match(html, /data-route-curtain-code/);
    assert.match(html, /data-route-curtain-title/);
    assert.match(html, /class="route-curtain-progress-track"/);
    assert.doesNotMatch(html, /data-route-curtain-retry|route-curtain-error/);
    assert.ok(html.includes(routePanels[route][0]));
    assert.ok(html.includes(`data-route-curtain-title>${routePanels[route][1]}`));
    assert.ok(
      html.indexOf('id="critical-route-colors"') < html.indexOf('<link rel="stylesheet"'),
      `${filename} must paint cream before loading the external stylesheet`,
    );
    assert.ok(
      html.indexOf('id="route-curtain"') < html.indexOf('id="launch-sequence"'),
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

test("theme preference is applied before paint and exposed through a shared switch", async () => {
  for (const [filename] of pages) {
    const html = await readFile(path.join(outputRoot, filename), "utf8");
    assert.match(html, /name="color-scheme" content="light dark"/);
    assert.match(html, /id="theme-bootstrap"/);
    assert.match(html, /aj-shaw-color-theme/);
    assert.match(html, /prefers-color-scheme: dark/);
    assert.match(html, /root\.dataset\.theme = theme/);
    assert.match(html, /:root\[data-theme="dark"\] \{ color-scheme: dark; background: #142b23; \}/);
    assert.ok(
      html.indexOf('id="theme-bootstrap"') < html.indexOf('<link rel="stylesheet"'),
      `${filename} must choose its theme before the external stylesheet loads`,
    );
    assert.equal((html.match(/data-theme-toggle/g) || []).length, 1);
    assert.match(html, /role="switch" aria-checked="false" aria-label="Dark mode"/);
    assert.match(html, /data-theme-label>Light/);
  }

  const legacyContact = await readFile(path.join(outputRoot, "contact.html"), "utf8");
  assert.match(legacyContact, /id="theme-bootstrap"/);
  assert.match(legacyContact, /:root\[data-theme="dark"\]/);
});

test("about and contact form one route while the legacy contact URL redirects", async () => {
  const about = await readFile(path.join(outputRoot, "about.html"), "utf8");
  const legacyContact = await readFile(path.join(outputRoot, "contact.html"), "utf8");
  const home = await readFile(path.join(outputRoot, "index.html"), "utf8");

  assert.match(about, /id="contact"/);
  assert.match(about, /Bookings &amp; collaborations/);
  assert.match(about, /@aj\.phots_/);
  assert.match(about, /class="profile-portrait"/);
  assert.match(
    about,
    /I’m AJ Shaw, a Massachusetts-based photographer drawn to honest color, quick gestures, and the moments that make a place or gathering feel real\./,
  );
  assert.doesNotMatch(about, /the clues that make a place or gathering feel real/);
  assert.match(about, /class="booking-envelope"/);
  assert.doesNotMatch(about, /editorial assignments/i);
  assert.doesNotMatch(about, />Editorial</);
  assert.doesNotMatch(about, /of the story\./);
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

test("Events precedes Travel in navigation and on the home archive", async () => {
  for (const [filename] of pages) {
    const html = await readFile(path.join(outputRoot, filename), "utf8");
    assert.ok(
      html.indexOf('data-route="events"') < html.indexOf('data-route="travel"'),
      `${filename} must place Events before Travel in the navigation`,
    );
  }

  const home = await readFile(path.join(outputRoot, "index.html"), "utf8");
  assert.ok(
    home.indexOf('data-category-preview="events"') < home.indexOf('data-category-preview="travel"'),
    "the Events archive card must precede the Travel archive card",
  );
  assert.match(home, /EVT \/ 01/);
  assert.match(home, /TRV \/ 02/);
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
    assert.doesNotMatch(html, /class="gallery-subsection is-expanded"/);
    assert.doesNotMatch(html, /class="gallery-subsection-toggle"[^>]+aria-expanded="true"/);
    assert.match(html, /class="gallery-subsection-toggle"[^>]+aria-expanded="false"/);
    assert.match(html, /data-default-expanded="false"/);
    assert.match(html, />Expand collection</);
    assert.match(html, /class="photo-trigger" href="photos\//);
    assert.match(html, /<figure class="photo-card/);
    assert.match(html, /<picture><source type="image\/webp" srcset=/);
    assert.match(html, /<img[^>]+srcset=[^>]+sizes=[^>]+width="\d+" height="\d+"/);
    assert.match(html, /loading="(?:eager|lazy)" decoding="async"/);
    assert.match(html, /alt="Photograph of/);
    assert.match(html, /<figcaption><strong>[^<]+<\/strong><span>[^<]+<\/span><\/figcaption>/);
    assert.doesNotMatch(html, /<div class="gallery-groups" id="photo-grid">\s*<\/div>/);
  }
});

test("homepage covers are curated, responsive, and present without JavaScript", async () => {
  const html = await readFile(path.join(outputRoot, "index.html"), "utf8");
  const manifest = JSON.parse(await readFile(path.join(outputRoot, "gallery-manifest.json"), "utf8"));

  assert.match(html, /Photography by AJ Shaw · Massachusetts/);
  assert.match(html, /href="about\.html#contact">Book \/ Contact/);
  assert.equal((html.match(/data-cover-id=/g) || []).length, 9);
  assert.equal((html.match(/class="category-portal-print"/g) || []).length, 9);
  assert.equal((html.match(/category-portal-preview"><span/g) || []).length, 3);
  assert.match(html, /photos\/responsive\/covers\/events\//);
  assert.match(html, /photos\/responsive\/covers\/travel\//);
  assert.match(html, /photos\/responsive\/covers\/sports\//);
  assert.deepEqual(Object.keys(manifest.covers), ["events", "travel", "sports"]);
  Object.values(manifest.covers).forEach((covers) => assert.equal(covers.length, 3));
});

test("major pages include canonical sharing metadata and photographer data", async () => {
  for (const [filename] of pages) {
    const html = await readFile(path.join(outputRoot, filename), "utf8");
    assert.match(html, /<link rel="canonical" href="https:\/\/ajshaw0327-sketch\.github\.io\/aj-shaw-photography\//);
    assert.match(html, /<meta property="og:url" content="https:\/\/ajshaw0327-sketch\.github\.io\/aj-shaw-photography\//);
    assert.match(html, /<meta property="og:type" content="(?:website|profile)"/);
    assert.match(html, /<meta property="og:image" content="https:\/\//);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image"/);
    assert.match(html, /<script type="application\/ld\+json">[\s\S]*"@type":"Person"[\s\S]*"name":"AJ Shaw"/);
  }
});

test("all built page links and image candidates resolve inside the Pages artifact", async () => {
  const localTargets = [];

  for (const [filename] of pages) {
    const html = await readFile(path.join(outputRoot, filename), "utf8");
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      localTargets.push([filename, match[1]]);
    }
    for (const match of html.matchAll(/srcset="([^"]+)"/g)) {
      for (const candidate of match[1].split(",")) {
        localTargets.push([filename, candidate.trim().split(/\s+/)[0]]);
      }
    }
  }

  for (const [filename, rawTarget] of localTargets) {
    if (
      !rawTarget ||
      rawTarget.startsWith("#") ||
      /^(?:https?:|mailto:|data:)/.test(rawTarget)
    ) {
      continue;
    }

    assert.ok(!rawTarget.startsWith("/"), `${filename} must keep ${rawTarget} subdirectory-safe`);
    const target = decodeURIComponent(rawTarget.split(/[?#]/)[0] || ".");
    await assert.doesNotReject(
      stat(path.resolve(outputRoot, target)),
      `${filename} references missing local target ${rawTarget}`,
    );
  }
});

test("interaction styles use content-sized archive drawers and reduced-motion fallbacks", async () => {
  const css = await readFile(path.join(outputRoot, "style.css"), "utf8");
  const script = await readFile(path.join(outputRoot, "app.js"), "utf8");
  const playfair = await readFile(path.join(outputRoot, "fonts", "playfair-display-variable.ttf"));
  const playfairLicense = await readFile(path.join(outputRoot, "fonts", "OFL-Playfair-Display.txt"), "utf8");

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
  assert.match(css, /\.launch-sequence\s*\{[\s\S]*position:\s*fixed;[\s\S]*background:[\s\S]*var\(--paper\)/);
  assert.match(css, /@keyframes launch-cursor-blink/);
  assert.match(css, /font-family:\s*"Playfair Display"/);
  assert.match(css, /\.launch-title\s*\{[\s\S]*font-family:\s*"Playfair Display"/);
  assert.match(css, /\.launch-photography\s*\{[\s\S]*font-family:\s*"Brisket Script"/);
  assert.match(css, /\.launch-sequence\.is-photography-visible \.launch-photography\s*\{[\s\S]*opacity:\s*1/);
  assert.match(css, /@keyframes launch-circle-reveal/);
  assert.match(css, /body\[data-page="home"\] \.launch-sequence\.is-circle-revealing/);
  assert.match(css, /\.launch-typewriter-cursor/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.launch-sequence\s*\{[\s\S]*transition:\s*opacity 140ms ease/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.launch-typewriter-cursor\s*\{[\s\S]*display:\s*none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.launch-photography\s*\{[\s\S]*transition:\s*none/);
  assert.ok(playfair.length > 100_000);
  assert.match(playfairLicense, /SIL OPEN FONT LICENSE Version 1\.1/);
  assert.doesNotMatch(css, /\.launch-dialog|\.launch-enter|\.launch-skip/);
  assert.doesNotMatch(css, /launch-camera-burst|data-face=|is-changing|launch-line-break-nudge|launch-progress/);
  assert.doesNotMatch(css, /launch-(?:sequence-canvas|archive-header|contact-frames|exposure|archive-stamp|destination-label|status-row|typewriter-card|document-line|tagline|document-meta)/);
  assert.doesNotMatch(css, /launch-carriage-return|is-carriage-return|photos\/featured\/0[123]/);
  assert.doesNotMatch(css, /url\("og\.png"\)/);
  assert.match(css, /@media \(max-width: 860px\)[\s\S]*body\[data-page="home"\] \.category-portal-grid/);
  assert.match(css, /min-height:\s*calc\(64px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(css, /padding-top:\s*calc\(7px \+ env\(safe-area-inset-top, 0px\)\)/);
  assert.match(css, /\.theme-toggle\s*\{/);
  assert.match(css, /html\[data-theme="dark"\] \.launch-sequence/);
  assert.match(css, /html\[data-theme="dark"\] \.site-header/);
  assert.match(css, /html\[data-theme="dark"\] \.category-portal/);
  assert.match(css, /html\[data-theme="dark"\] \.photo-surface/);
  assert.match(css, /html\[data-theme="dark"\] \.booking-card/);
  assert.match(css, /html\[data-theme="dark"\] \.lightbox-frame/);
  assert.match(css, /html\[data-theme="dark"\] \.site-footer/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.theme-toggle/);
  assert.match(script, /localStorage\.setItem\(themeStorageKey, nextTheme\)/);
  assert.match(script, /themeToggle\.setAttribute\("aria-checked", String\(isDark\)\)/);
  assert.match(script, /systemColorScheme\.addEventListener\("change", followSystemTheme\)/);
  assert.match(script, /nextTheme === "dark" \? "#142b23" : "#f2eddd"/);
  assert.match(css, /\.site-header\s*\{[\s\S]*background:\s*var\(--paper\);[\s\S]*backdrop-filter:\s*none;/);
  assert.match(css, /\.booking-chapter\s*\{[\s\S]{0,320}min-height:\s*0;/);
  assert.doesNotMatch(css, /\.booking-chapter\s*\{[\s\S]{0,320}min-height:\s*calc\(100vh/);
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
  assert.match(script, /const routeCoverDurationMs = 360/);
  assert.match(script, /const routeTitleHoldMs = 250/);
  assert.match(script, /const routeLoadingThresholdMs = routeTitleHoldMs \+ 400/);
  assert.match(script, /new Promise\(\(resolve\) => window\.setTimeout\(resolve, routeTitleHoldMs\)\)/);
  assert.match(script, /Promise\.all\(\[[\s\S]*essentialReady[\s\S]*routeTitleHold/);
  assert.match(script, /function beginRouteNavigation/);
  assert.match(script, /window\.location\.assign\(destination\.href\)/);
  assert.match(script, /routeNavigationDeadline = Date\.now\(\) \+ routeCoverDurationMs/);
  assert.match(script, /const remaining = Math\.max\(0, routeNavigationDeadline - Date\.now\(\)\)/);
  assert.match(script, /routeNavigationLocked/);
  assert.match(script, /function syncRouteCurtainBoundary/);
  assert.match(script, /getBoundingClientRect\(\)\.bottom/);
  assert.match(script, /setRouteCurtainLoading/);
  assert.doesNotMatch(script, /showRouteCurtainError|loadRouteDestination|retryFailedRoute/);
  assert.doesNotMatch(script, /fetch\(destination\.href|response\.text\(\)|window\.history\.pushState/);
  assert.match(script, /focusNewRouteHeading/);
  assert.match(script, /classList\.add\("is-covering"\)/);
  assert.match(script, /classList\.add\("is-revealing"\)/);
  assert.doesNotMatch(css, /route-active-label-settle|route-active-label-print/);
  assert.doesNotMatch(script, /is-pressed/);
  assert.match(css, /@keyframes archive-label-slide/);
  assert.match(css, /@keyframes archive-label-border-draw/);
  assert.match(css, /@keyframes archive-label-shadow-settle/);
  assert.match(css, /@keyframes archive-label-text-focus/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*nav\[data-nav-label-moving="true"\] \.nav-active-label,[\s\S]*transition: none/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.nav-active-label\.is-sliding > i,[\s\S]*animation: none/);
  assert.match(css, /\.nav-active-label/);
  assert.match(css, /\.nav-active-shadow/);
  assert.match(css, /scaleY\(0\.97\)/);
  assert.match(script, /function measureNavigationLink/);
  assert.match(script, /snappedNavigationPixel/);
  assert.match(script, /function slideArchiveLabel/);
  assert.match(script, /function retargetRouteNavigation/);
  assert.match(script, /routeNavigationDeadline/);
  assert.match(script, /ResizeObserver\(scheduleArchiveLabelMeasurement\)/);
  assert.match(script, /document\.fonts\?\.ready/);
  assert.doesNotMatch(script, /waitForRouteCurtainMotion/);
  assert.doesNotMatch(script, /event\.preventDefault\(\);\s*if \(routeNavigationLocked\)/);
  assert.match(script, /"pagehide"/);
  assert.match(script, /setupLaunchExperience\(\)/);
  assert.match(script, /"archiveintrocomplete"/);
  assert.match(script, /launchSequence\.addEventListener\("pointerdown"/);
  assert.match(script, /document\.addEventListener\("keydown", onKeydown/);
  assert.match(script, /const typedCopy = "AJ Shaw"/);
  assert.match(script, /const completeCopy = "AJ Shaw Photography"/);
  assert.match(script, /const revealDuration = currentPage === "home" \? 580 : 320/);
  assert.match(script, /start: 160, pace: 52, photographyDelay: 140, hold: 620, reveal: revealDuration/);
  assert.match(script, /const characters = \[\.\.\.typedCopy\]/);
  assert.match(script, /schedule\(typeNextCharacter, timings\.pace\)/);
  assert.match(script, /launchSequence\.classList\.add\("is-photography-visible"\)/);
  assert.match(script, /launchSequence\.classList\.add\("is-circle-revealing"\)/);
  assert.match(script, /launchAnnouncement\.textContent/);
  assert.doesNotMatch(script, /is-waiting|AJ SHAW PHOTOGRAPHIC ARCHIVE|Small moments, kept|launchTypedArchive|launchTypedTagline/);
  assert.doesNotMatch(script, /is-carriage-return|carriage-return|launchSessionKey|markLaunchSeen/);
  assert.doesNotMatch(script, /launchDialog|dismissLaunch/);
  assert.doesNotMatch(script, /launchFaces|startLaunchTypography|data\.face|is-flashing/);
  assert.doesNotMatch(script, /Places\. People\. Motion\./);
  assert.match(script, /lightboxSwapTimer/);
  assert.match(script, /element\.inert = true/);
  assert.doesNotMatch(script, /positionNavigationMarker|nav-proximity/);
  assert.doesNotMatch(script, /function randomPhotoSelection|Math\.random\(\)/);
  assert.match(script, /function hydrateStaticGallery/);
  assert.match(script, /document\.documentElement\.classList\.add\("gallery-enhanced"\)/);
  assert.match(css, /body\[data-page="home"\]\s*\{[\s\S]{0,220}min-height:\s*100dvh;[\s\S]{0,120}overflow-y:\s*auto/);
  assert.doesNotMatch(css, /body\[data-page="home"\]\s*\{[\s\S]{0,220}\n\s*height:\s*100dvh/);
  assert.match(css, /body\[data-page="home"\] \.category-portal-travel\s*\{[\s\S]*grid-column:\s*8 \/ 13/);
  assert.match(css, /body\[data-page="home"\] \.category-portal-sports\s*\{[\s\S]*grid-column:\s*2 \/ 12/);
  assert.match(css, /\.photo-card\s*\{[\s\S]{0,180}opacity:\s*1/);
  assert.match(css, /html\.gallery-enhanced \.photo-card\s*\{[\s\S]{0,100}opacity:\s*0/);
  assert.match(css, /\.photo-window img\s*\{[\s\S]{0,180}opacity:\s*1/);
});
