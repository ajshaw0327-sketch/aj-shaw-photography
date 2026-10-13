import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const script = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
const imageSetup = script.slice(script.indexOf("function prepareProgressiveImage("), script.indexOf("function applyReservedPhotoLayout("));

function fixture({ complete = false, width = 0 } = {}) {
  const listeners = new Map();
  const observers = [];
  const classes = new Set();
  const frame = { classList: {
    add: (...names) => names.forEach(name => classes.add(name)),
    remove: (...names) => names.forEach(name => classes.delete(name)),
    contains: name => classes.has(name),
    toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
  } };
  const image = { complete, naturalWidth: width, addEventListener: (name, callback) => listeners.set(name, callback) };
  class Observer {
    constructor(callback) { this.callback = callback; this.targets = new Set(); observers.push(this); }
    observe(target) { this.targets.add(target); }
    unobserve(target) { this.targets.delete(target); }
  }
  const context = { image, frame, reducedMotion: { matches: false }, IntersectionObserver: Observer, queueMicrotask: callback => callback(), window: { IntersectionObserver: Observer } };
  runInNewContext(`let loadingFrameObserver = null; ${imageSetup}; prepareProgressiveImage(image, frame);`, context);
  return { image, frame, listeners, observers, classes };
}

test("cached photographs skip loading observers and listeners", () => {
  const { classes, observers, listeners } = fixture({ complete: true, width: 960 });
  assert.ok(classes.has("is-loaded"));
  assert.ok(!classes.has("is-loading"));
  assert.equal(observers.length, 0);
  assert.equal(listeners.size, 0);
});

test("loading effects run only near the viewport and stop after load or error", () => {
  for (const outcome of ["load", "error"]) {
    const { frame, classes, observers, listeners } = fixture();
    const observer = observers[0];
    assert.ok(classes.has("is-loading"));
    assert.ok(!classes.has("is-loading-visible"));
    observer.callback([{ target: frame, isIntersecting: true }]);
    assert.ok(classes.has("is-loading-visible"));
    observer.callback([{ target: frame, isIntersecting: false }]);
    assert.ok(!classes.has("is-loading-visible"));
    observer.callback([{ target: frame, isIntersecting: true }]);
    listeners.get(outcome)();
    assert.ok(!classes.has("is-loading-visible"));
    assert.ok(!classes.has("is-loading"));
    assert.equal(observer.targets.size, 0);
    assert.ok(classes.has(outcome === "load" ? "is-loaded" : "is-error"));
  }
});
