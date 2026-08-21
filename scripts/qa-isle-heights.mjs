#!/usr/bin/env node
// Temporary QA driver: plays the critter flow and samples isle lane heights
// to verify fill/hug/pair transitions interpolate. Not part of the app.
import { chromium } from "playwright";

const URL_ = process.argv[2] || "http://127.0.0.1:8081/";
const SHOT = (name) => `screenshots/${name}.png`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 520, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});

await page.goto(URL_, { waitUntil: "networkidle", timeout: 30000 });

// Height sampler (starts before the play shell mounts; nulls until then).
await page.evaluate(() => {
  window.__samples = [];
  window.__marks = [];
  const t0 = performance.now();
  window.__mark = (label) => window.__marks.push({ t: Math.round(performance.now() - t0), label });
  setInterval(() => {
    const q = (s) => document.querySelector(s);
    const h = (el) => (el ? Math.round(el.getBoundingClientRect().height * 10) / 10 : null);
    const stack = q(".isle-stack");
    window.__samples.push({
      t: Math.round(performance.now() - t0),
      sun: h(q(".sun-lane")),
      moon: h(q(".isle-moon-lane")),
      stack: h(stack),
      pair: stack ? stack.classList.contains("is-pair") : null,
      pets: document.querySelectorAll(".pet-paper").length,
      inline: q(".sun-lane")?.style.height || "",
    });
  }, 80);
});

const mark = (label) => page.evaluate((l) => window.__mark(l), label);
const idle = async () => {
  await page.waitForTimeout(400);
  await page.waitForSelector('button:has-text("reset"):not([disabled])', { timeout: 30000 });
};

// 1. Boot
await page.click("button.h-14");
await mark("boot-click");
await page.waitForSelector(".isle-stack", { timeout: 15000 });
await page.waitForTimeout(5000);
await mark("boot-settled");
await page.screenshot({ path: SHOT("qa-1-empty-full") });

// 2. First hatch (fill -> hug, the historically broken first transition)
await mark("hatch-pip-click");
await page.click('button:has-text("Pip")', { force: true });
await page.waitForFunction(() => document.querySelectorAll(".pet-paper").length === 1, {
  timeout: 20000,
});
await mark("pip-visible");
await idle();
await page.waitForTimeout(900);
await page.screenshot({ path: SHOT("qa-2-hug-one") });

// 3. Second hatch (hug -> hug growth)
await mark("hatch-nub-click");
await page.click('button:has-text("Nub")', { force: true });
await page.waitForFunction(() => document.querySelectorAll(".pet-paper").length === 2, {
  timeout: 20000,
});
await mark("nub-visible");
await idle();
await page.waitForTimeout(900);
await page.screenshot({ path: SHOT("qa-3-hug-two") });

// Mission 1 won -> next
await page.click("header .justify-self-center button");
await page.waitForTimeout(300);

// 4. Feed ok, then feed reject (mission 2)
await page.click(".act-feed >> nth=0");
await idle();
await mark("feed-reject-click");
await page.click(".act-feed >> nth=0");
await idle();
await page.waitForSelector("header .justify-self-center button", { timeout: 20000 });
await page.click("header .justify-self-center button");
await page.waitForTimeout(300);

// 5. Storm (hug -> fill, wipes herd) then replay (fill -> hug again)
await mark("storm-click");
await page.click("button:has(.lucide-wind) >> nth=0");
await page.waitForFunction(() => document.querySelectorAll(".pet-paper").length === 0, {
  timeout: 10000,
});
await idle();
await page.waitForTimeout(900);
await page.screenshot({ path: SHOT("qa-4-storm-full") });
await mark("replay-click");
await page.click("button:has(.lucide-undo-2) >> nth=0");
await page.waitForSelector("header .justify-self-center button", { timeout: 30000 });
await idle();
await mark("mission4-click");
await page.click("header .justify-self-center button");

// 6. Moon entrance (pair split)
await page.waitForSelector(".isle-stack.is-pair", { timeout: 10000 });
await mark("pair-on");
await page.waitForTimeout(500);
await page.screenshot({ path: SHOT("qa-5-moon-mid") });
await page.waitForTimeout(1800);
await mark("pair-settled");
await page.screenshot({ path: SHOT("qa-6-moon-settled") });

const overflow = await page.evaluate(() => {
  const doc = document.documentElement;
  const ferry = document.querySelector(".isle-ferry");
  const r = ferry ? ferry.getBoundingClientRect() : null;
  return {
    docOverflowX: doc.scrollWidth > window.innerWidth,
    ferryRight: r ? Math.round(r.right) : null,
    innerWidth: window.innerWidth,
  };
});

const data = await page.evaluate(() => ({ samples: window.__samples, marks: window.__marks }));
await browser.close();

const { samples, marks } = data;
const at = (label) => marks.find((m) => m.label === label)?.t ?? null;
const win = (from, to) => samples.filter((s) => s.t >= from && s.t <= to);
const series = (rows, key) => rows.map((s) => `${s.t}:${s[key]}`).join(" ");

const report = { errors, overflow, marks };
console.log(JSON.stringify(report, null, 2));

const print = (title, t0, t1, key = "sun") => {
  if (t0 == null) return console.log(`${title}: mark missing`);
  console.log(`\n== ${title} (${key}) ==\n${series(win(t0, t1), key)}`);
};

print("boot settled (should equal stack-4)", at("boot-settled") - 400, at("boot-settled") + 200);
print("first hatch fill->hug", at("pip-visible") - 100, at("pip-visible") + 1200);
print("second hatch hug->hug", at("nub-visible") - 100, at("nub-visible") + 1200);
print("storm hug->fill", at("storm-click"), at("storm-click") + 2200);
print("pair split sun", at("pair-on") - 200, at("pair-on") + 2400);
print("pair split moon", at("pair-on") - 200, at("pair-on") + 2400, "moon");
