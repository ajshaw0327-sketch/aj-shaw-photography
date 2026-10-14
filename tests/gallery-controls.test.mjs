import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const script = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
const stateSource = script.slice(script.indexOf("function setSubsectionExpanded("), script.indexOf("function syncSubsectionPreviewControls("));
const viewControlsSource = script.slice(script.indexOf("function setupSubsectionViewControls("), script.indexOf("function setupSubsectionPreview("));
const keyboardSource = script.slice(script.indexOf("function setupSubsectionPreview("), script.indexOf("function openHashedSubsection("));
const classList = () => {
  const values = new Set();
  return { contains: name => values.has(name), add: (...names) => names.forEach(name => values.add(name)),
    remove: (...names) => names.forEach(name => values.delete(name)),
    toggle: (name, enabled) => enabled ? values.add(name) : values.delete(name) };
};
const attributes = () => {
  const values = new Map();
  return { setAttribute: (name, value) => values.set(name, value), getAttribute: name => values.get(name) };
};

test("fully minimizing hides and disables the panel, then restores its preview position", () => {
  const strip = { scrollLeft: 240 };
  const frame = {};
  const document = { activeElement: frame };
  let focusOptions;
  const buttons = ["closed", "strip", "sheet"].map(view => {
    const button = {...attributes(), dataset: {galleryView:view}, addEventListener() {}};
    button.focus = options => {document.activeElement = button;focusOptions=options;};
    return button;
  });
  const reopen = {...attributes(), inert:true, addEventListener() {}, focus: options => {document.activeElement = reopen;focusOptions=options;}};
  let canisterClick;
  const canister = {...attributes(), addEventListener: (event, handler) => {if (event === "click") canisterClick = handler;}};
  const controls = {dataset: {view:"strip"},
    contains: element => element === canister || element === reopen || buttons.includes(element),
    querySelector: selector => selector === ".gallery-film-canister" ? canister : selector === ".gallery-reopen" ? reopen : buttons.find(button => selector.includes(button.dataset.galleryView)),
    querySelectorAll: () => buttons};
  const inner = { getBoundingClientRect: () => ({ height: 200 }) };
  const panel = { ...attributes(), classList: classList(), hidden: false, inert: false,
    style: { removeProperty() {} }, contains: element => element === frame,
    getBoundingClientRect: () => ({ height: panel.hidden ? 0 : 200 }),
    querySelector: selector => selector === ".photo-grid" ? strip : inner,
    querySelectorAll: () => [],
  };
  const subsection = { classList: classList(), querySelector: selector => ({
    ".gallery-view-selector": controls, ".gallery-subsection-panel": panel,
  })[selector] };
  const context = { subsection, document, reducedMotion: { matches: true },
    subsectionLayoutTimers: new WeakMap(), subsectionLayoutFrames: new WeakMap(), previewScrollPositions: new WeakMap(),
    syncSubsectionPreviewControls() {}, requestAnimationFrame: callback => callback(),
    window: { clearTimeout() {}, cancelAnimationFrame() {} },
  };
  runInNewContext(`${stateSource}; setSubsectionExpanded(subsection, false, {minimized:true});`, context);
  assert.ok(panel.hidden && panel.inert);
  assert.equal(panel.getAttribute("aria-hidden"), "true");
  assert.equal(controls.dataset.view, "closed");
  assert.equal(buttons[0].getAttribute("aria-pressed"), "true");
  assert.equal(document.activeElement, reopen);
  assert.equal(reopen.inert, false);
  assert.ok(buttons.every(button => button.inert && button.getAttribute("aria-hidden") === "true"));
  assert.equal(focusOptions.preventScroll, true);
  strip.scrollLeft = 0;
  runInNewContext("setSubsectionExpanded(subsection, false);", context);
  assert.ok(!panel.hidden && !panel.inert);
  assert.equal(strip.scrollLeft, 240);
  assert.equal(controls.dataset.view, "strip");
  assert.equal(buttons[1].getAttribute("aria-pressed"), "true");
  assert.equal(reopen.inert, true);
  assert.equal(document.activeElement, buttons[1]);
  assert.ok(buttons.every(button => !button.inert && button.getAttribute("aria-hidden") === "false"));
  runInNewContext("setSubsectionExpanded(subsection, true); setSubsectionExpanded(subsection, false, {minimized:true}); setSubsectionExpanded(subsection, true);", context);
  assert.ok(subsection.classList.contains("is-expanded"));
  assert.ok(!subsection.classList.contains("is-minimized"));
  assert.ok(!panel.hidden && !panel.inert);
  context.reducedMotion.matches = false;
  let layoutFrame;
  let finishLayout;
  let cancelled = 0;
  context.requestAnimationFrame = callback => { layoutFrame = callback; return 1; };
  context.window.setTimeout = callback => { finishLayout = callback; return 1; };
  context.window.clearTimeout = timer => { if (timer === 1) cancelled += 1; };
  runInNewContext("setSubsectionExpanded(subsection, false, {minimized:true}); setSubsectionExpanded(subsection, false, {minimized:true});", context);
  assert.equal(cancelled, 0, "selecting the current view must not interrupt its transition");
  assert.ok(panel.classList.contains("is-layout-transitioning"));
  layoutFrame();
  finishLayout();
  assert.ok(panel.hidden);

  context.reducedMotion.matches = true;
  context.URL = URL;
  context.decodedLocationHash = () => "";
  context.window.location = {href:"https://example.com/events.html"};
  context.window.history = {state:null, replaceState() {}};
  runInNewContext(`${viewControlsSource}; setupSubsectionViewControls(subsection); setSubsectionExpanded(subsection, true);`, context);
  document.activeElement = canister;
  canisterClick();
  assert.ok(panel.hidden, "clicking the canister from Show all minimizes the album");
  assert.equal(document.activeElement, canister, "the toggle retains focus for a second keyboard activation");
  assert.equal(canister.getAttribute("aria-expanded"), "false");
  assert.equal(canister.getAttribute("aria-label"), "Browse archive");
  canisterClick();
  assert.ok(!panel.hidden && !subsection.classList.contains("is-expanded"));
  assert.equal(controls.dataset.view, "strip", "the canister reopens in Browse");
  assert.equal(canister.getAttribute("aria-expanded"), "true");
  assert.equal(canister.getAttribute("aria-label"), "Hide archive");
  assert.equal(document.activeElement, canister);
});

function keyboardFixture() {
  const events = new Map();
  const state = { focused: null, hovered: null, editable: false };
  class Element {
    closest(selector) { return selector === ".gallery-subsection" ? state.focused : state.editable ? this : null; }
  }
  const strip = { scrollLeft: 0, scrollWidth: 720, clientWidth: 320, offsetLeft: 0,
    children: [0, 240, 480].map(offsetLeft => ({ offsetLeft, classList: { contains: () => true } })),
    addEventListener() {}, scrollTo: ({ left }) => { strip.scrollLeft = Math.max(0, Math.min(400, left)); },
  };
  const button = { addEventListener() {} };
  const subsection = { classList: classList(), querySelector: selector => selector === ".photo-grid" ? strip : button };
  const lightbox = { hidden: true };
  runInNewContext(`${keyboardSource}; setupSubsectionPreview(subsection);`, {
    subsection, lightbox, Element, previewKeyActions: new WeakMap(), setupSubsectionViewControls() {},
    reducedMotion: { matches: false }, requestAnimationFrame: () => 1, syncSubsectionPreviewControls() {},
    grid: { dataset: {}, querySelector: () => state.hovered },
    window: { addEventListener() {} }, document: { addEventListener: (name, callback) => events.set(name, callback) },
  });
  const press = (key, extra = {}) => {
    const event = { key, target: new Element(), defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; }, ...extra };
    events.get("keydown")(event);
    return event;
  };
  return { state, strip, subsection, lightbox, press };
}

test("arrow keys browse the preview from its header focus or pointer hover", () => {
  const { state, strip, subsection, press } = keyboardFixture();
  state.focused = subsection;
  assert.ok(press("ArrowRight").defaultPrevented);
  assert.equal(strip.scrollLeft, 240);
  state.focused = null;
  state.hovered = subsection;
  assert.ok(press("ArrowLeft").defaultPrevented);
  assert.equal(strip.scrollLeft, 0);
  state.focused = subsection;
  press("End");
  assert.equal(strip.scrollLeft, 400);
  press("Home");
  assert.equal(strip.scrollLeft, 0);
});

test("preview keys preserve lightbox controls, text editing, modifiers and closed or expanded albums", () => {
  const { state, strip, subsection, lightbox, press } = keyboardFixture();
  state.hovered = subsection;
  for (const className of ["is-minimized", "is-expanded"]) {
    subsection.classList.add(className);
    assert.ok(!press("ArrowRight").defaultPrevented);
    subsection.classList.remove(className);
  }
  lightbox.hidden = false;
  assert.ok(!press("ArrowRight").defaultPrevented);
  lightbox.hidden = true;
  state.editable = true;
  assert.ok(!press("ArrowRight").defaultPrevented);
  state.editable = false;
  for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey"]) assert.ok(!press("ArrowRight", { [modifier]: true }).defaultPrevented);
  assert.equal(strip.scrollLeft, 0);
});
