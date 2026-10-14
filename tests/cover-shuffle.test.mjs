import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const script = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
const setup = script.slice(script.indexOf("function setupHomeCoverShuffle("), script.indexOf("function setupLivingHero("));
const flush = () => new Promise(resolve => setImmediate(resolve));

function fixture(random = Math.random, reduced = false) {
  const listeners = new Map();
  const animations = [];
  const prints = Array.from({ length: 3 }, (_, index) => ({
    dataset: {}, style: { transition: "", setProperty() {} }, pose: `partial-${index}`,
    getBoundingClientRect: () => ({ width: 300, height: 200 }),
    querySelector: () => ({ decode: async () => {}, naturalWidth: 960 }),
    animate(frames, timing) {
      let finish;
      const finished = new Promise(resolve => { finish = resolve; });
      const animation = { frames, timing: { ...timing }, finished, finish,
        plays: 0, pauses: 0, cancellations: 0, currentTime: 150,
        play() { this.plays += 1; }, pause() { this.pauses += 1; }, cancel() { this.cancellations += 1; },
      };
      animation.effect = {
        setKeyframes: value => { animation.frames = value; },
        updateTiming: value => { Object.assign(animation.timing, value); },
      };
      animations.push(animation);
      return animation;
    },
  }));
  const portal = { dataset: { categoryPreview: "events" }, classList: { add() {} },
    getBoundingClientRect: () => ({ left: 100, top: 100, width: 600, height: 300 }),
    querySelectorAll: () => prints, addEventListener: (name, callback) => listeners.set(name, callback),
  };
  runInNewContext(`${setup}; setupHomeCoverShuffle();`, {
    Math: Object.assign(Object.create(Math), { random }),
    document: { querySelectorAll: () => [portal] }, canHover: { matches: true },
    reducedMotion: { matches: reduced, addEventListener() {} },
    getComputedStyle: print => ({ transform: print.pose, getPropertyValue: name =>
      name === "--cover-clearance" ? "clearance" : `${name}-${print.dataset.coverSlot}` }),
  });
  return { listeners, animations, prints, portal };
}

test("leaving an unfinished fan immediately shuffles from its current pose without a late pause", async () => {
  const { listeners, animations, prints } = fixture();
  listeners.get("pointerenter")({ pointerType: "mouse" });
  await flush();
  assert.equal(animations.length, 6);
  listeners.get("pointerleave")();
  animations.forEach((animation, track) => {
    assert.equal(animation.plays, 1, "return begins in the pointerleave handler");
    assert.equal(animation.currentTime, 0);
    assert.equal(animation.timing.duration, 820);
    assert.equal(animation.timing.iterations, 1);
    if (track % 2 === 0) assert.equal(animation.frames[0].transform, prints[Math.floor(track / 2)].pose);
    else assert.equal(animation.frames[1].offset, 0.44, "all layers exchange together");
  });
  animations.forEach(animation => animation.finish());
  await flush();
  assert.equal(animations.reduce((sum, animation) => sum + animation.pauses, 0), 0);
  assert.ok(animations.every(animation => animation.cancellations === 1));
  assert.deepEqual(prints.map(print => print.dataset.coverSlot), ["1", "2", "0"]);
});

test("random shuffle rounds use every variation without repeating adjacent movements", async () => {
  let seed = 17;
  const { listeners, animations, portal } = fixture(() => {
    seed = (seed * 48271) % 2147483647;
    return seed / 2147483647;
  });
  const choices = [];
  for (let cycle = 0; cycle < 12; cycle += 1) {
    listeners.get("pointerenter")({ pointerType: "mouse" });
    await flush();
    choices.push(portal.dataset.coverMotion);
    listeners.get("pointerleave")();
    animations.slice(-6).forEach(animation => animation.finish());
    await flush();
  }
  for (let index = 1; index < choices.length; index += 1) assert.notEqual(choices[index], choices[index - 1]);
  for (let index = 0; index < choices.length; index += 3) {
    assert.deepEqual(choices.slice(index, index + 3).sort(), ["fan", "lift", "sweep"]);
  }
  assert.ok(new Set(choices.slice(0, 9).map((_, index) => choices.slice(index, index + 3).join())).size > 3);
});

test("reduced motion keeps the stack static while still changing the front photograph", () => {
  const { listeners, animations, prints, portal } = fixture(Math.random, true);
  listeners.get("pointerenter")({ pointerType: "mouse" });
  assert.equal(animations.length, 0);
  assert.equal(portal.dataset.coverMotion, undefined);
  listeners.get("pointerleave")();
  assert.equal(animations.length, 0);
  assert.ok(prints.every(print => print.style.transform === ""));
  assert.deepEqual(prints.map(print => print.dataset.coverSlot), ["1", "2", "0"]);
});

test("each exit edge steers every variation from the current pose, for short and held hovers", async () => {
  const edges = [
    { clientX: 99, clientY: 250, axis: 0, sign: -1 },
    { clientX: 701, clientY: 250, axis: 0, sign: 1 },
    { clientX: 400, clientY: 99, axis: 1, sign: -1 },
    { clientX: 400, clientY: 401, axis: 1, sign: 1 },
    // A wide tile's upper corner should use its top edge, despite the larger x distance.
    { clientX: 690, clientY: 99, axis: 1, sign: -1 },
  ];
  for (const held of [false, true]) {
    for (const edge of edges) {
      const { listeners, animations, prints, portal } = fixture(() => 0.5);
      const variations = new Set();
      for (let cycle = 0; cycle < 3; cycle += 1) {
        listeners.get("pointerenter")({ pointerType: "mouse" });
        await flush();
        const tracks = animations.slice(-6);
        if (held) {
          tracks.forEach(animation => animation.finish());
          await flush();
          assert.ok(tracks.every(animation => animation.pauses === 1));
        }
        const front = prints.find(print => print.dataset.coverSlot === "2");
        listeners.get("pointerleave")(edge);
        const returning = tracks[4];
        const clearance = returning.frames[1].transform;
        const coordinates = clearance.match(/^translate\(([-\d.]+)px, ([-\d.]+)px\)/).slice(1).map(Number);
        assert.equal(Math.sign(coordinates[edge.axis]), edge.sign);
        assert.ok(Math.abs(coordinates[edge.axis]) > Math.abs(coordinates[1 - edge.axis]) * 5);
        assert.ok(clearance.includes(front.pose), "departure continues from the current front print");
        assert.equal(returning.frames[0].transform, front.pose);
        assert.equal(returning.currentTime, 0);
        assert.equal(returning.plays, 1);
        assert.equal(returning.timing.duration, 820);
        assert.ok(tracks.filter((_, index) => index % 2).every(animation => animation.frames[1].offset === 0.44));
        variations.add(portal.dataset.coverMotion);
        tracks.forEach(animation => animation.finish());
        await flush();
      }
      assert.equal(variations.size, 3);
    }
  }
});

test("keyboard departures retain the archive's original route without pointer coordinates", async () => {
  const { listeners, animations, portal } = fixture();
  portal.matches = () => true;
  listeners.get("focus")();
  await flush();
  animations.forEach(animation => animation.finish());
  await flush();
  listeners.get("blur")();
  assert.ok(animations.every(animation => animation.currentTime === 820));
  assert.equal(animations[4].frames[2].transform, "clearance");
});
