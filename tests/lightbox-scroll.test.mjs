import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const script = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
const scrollHelpers = script.slice(script.indexOf("function lockLightboxScroll("), script.indexOf("function openLightbox("));

test("reopening a locked viewer preserves the original position and closing restores it immediately", () => {
  const rootClasses = new Set();
  const bodyClasses = new Set();
  const properties = new Map();
  const classes = values => ({ add: name => values.add(name), remove: name => values.delete(name) });
  const root = { clientWidth: 1180, classList: classes(rootClasses), style: { scrollBehavior: "smooth" } };
  const body = { classList: classes(bodyClasses), style: {
    setProperty: (name, value) => properties.set(name, value),
    removeProperty: name => properties.delete(name),
  } };
  const restored = [];
  const window = { scrollX: 12, scrollY: 845.5, innerWidth: 1200, scrollTo: value => {
    assert.equal(root.style.scrollBehavior, "auto");
    assert.equal(rootClasses.size, 0);
    assert.equal(bodyClasses.size, 0);
    restored.push({ ...value });
  } };
  const context = { window, document: { documentElement: root, body } };
  runInNewContext(`let lightboxScrollState = null; ${scrollHelpers}; lockLightboxScroll();`, context);
  assert.ok(rootClasses.has("lightbox-open"));
  assert.ok(bodyClasses.has("lightbox-open"));
  assert.equal(properties.get("--lightbox-scroll-y"), "-845.5px");
  assert.equal(properties.get("--lightbox-scrollbar"), "20px");
  window.scrollY = 0;
  runInNewContext("lockLightboxScroll(); unlockLightboxScroll(); unlockLightboxScroll();", context);
  assert.deepEqual(restored, [{ left: 12, top: 845.5, behavior: "auto" }]);
  assert.equal(root.style.scrollBehavior, "smooth");
  assert.equal(properties.size, 0);
});

test("the lightbox adapts to screen density, connection and intentional zoom", () => {
  const sourceHelpers = script.slice(script.indexOf("function lightboxFitSize("),
    script.indexOf("function preloadLightboxSource("));
  const photo = { width: 6000, height: 4000, src: "original",
    responsive: {
      webp: [320, 480, 960, 1600].map(width => ({ width, src: String(width) })),
      detail: [2400, 3600].map(width => ({ width, src: String(width) })),
    },
  };
  const context = {
    lightboxImageContainer: { clientWidth: 1250 },
    getComputedStyle: () => ({ maxHeight: "840px" }),
    window: { innerWidth: 1440, innerHeight: 1000, devicePixelRatio: 2 },
    navigator: { connection: { effectiveType: "4g" } },
    photo,
  };
  runInNewContext(sourceHelpers, context);
  const selected = (options = "{}") => runInNewContext(`lightboxSourceFor(photo, ${options}).width`, context);
  assert.equal(selected(), 3600);
  assert.equal(selected("{ prefetch: true }"), 960);
  context.navigator.connection.effectiveType = "3g";
  assert.equal(selected(), 960);
  context.navigator.connection.saveData = true;
  assert.equal(selected(), 480);
  context.window.innerWidth = 378;
  assert.equal(selected("{ scale: 4 }"), 3600);
  context.navigator.connection = undefined;
  assert.equal(selected(), 960);
  assert.equal(runInNewContext('lightboxSourceFor({ src: "original" }).src', context), "original");
});
