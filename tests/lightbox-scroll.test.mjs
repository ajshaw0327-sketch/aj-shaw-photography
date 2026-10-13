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
