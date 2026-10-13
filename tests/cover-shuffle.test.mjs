import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const script = await readFile(new URL("../docs/app.js", import.meta.url), "utf8");
const setup = script.slice(script.indexOf("function setupHomeCoverShuffle("), script.indexOf("function setupLivingHero("));
const flush = () => new Promise(resolve => setImmediate(resolve));

test("leaving an unfinished fan immediately shuffles from its current pose without a late pause", async () => {
  const listeners = new Map();
  const animations = [];
  const prints = Array.from({ length: 3 }, (_, index) => ({
    dataset: {}, style: { transition: "", setProperty() {} }, pose: `partial-${index}`,
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
    querySelectorAll: () => prints, addEventListener: (name, callback) => listeners.set(name, callback),
  };
  runInNewContext(`${setup}; setupHomeCoverShuffle();`, {
    document: { querySelectorAll: () => [portal] }, canHover: { matches: true },
    reducedMotion: { matches: false, addEventListener() {} },
    getComputedStyle: print => ({ transform: print.pose, getPropertyValue: name =>
      name === "--cover-clearance" ? "clearance" : `${name}-${print.dataset.coverSlot}` }),
  });
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
