// Renders share images (1200x630) with headless Chrome into src/og/. Run after build: node scripts/og.mjs
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.join(ROOT, "src/og");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "og-"));
fs.mkdirSync(OUT, { recursive: true });
const data = JSON.parse(fs.readFileSync(path.join(ROOT, "dist/og-list.json"), "utf8"));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const file = (p) => "file://" + path.join(ROOT, p);

const base = `<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600&family=Ultra&display=block" rel="stylesheet">
<style>*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;overflow:hidden;background:#f3efe5;color:#17140f;font-family:Archivo,sans-serif;position:relative}
.logo{font:400 34px/1 Ultra,serif;letter-spacing:-.01em}.amp{color:#dca857;-webkit-text-stroke:2px #17140f;paint-order:stroke fill}
.stamp{width:150px;height:150px;border-radius:50%;border:4px solid #17140f;background:#faf7f0;display:grid;place-items:center;font:400 54px/1 Ultra,serif;position:relative}
.stamp.top{background:#dca857}.stamp small{position:absolute;bottom:22px;font:600 18px/1 Archivo;opacity:.7}
.lbl{font:600 18px/1 Archivo;letter-spacing:.14em;text-transform:uppercase;color:#6e6455}</style>`;

function render(name, html) {
  const f = path.join(TMP, name + ".html");
  fs.writeFileSync(f, `<!doctype html><meta charset="utf-8">${base}<body>${html}</body>`);
  const png = path.join(TMP, name + ".png");
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files", "--virtual-time-budget=4000", "--window-size=1200,630", `--screenshot=${png}`, "file://" + f], { stdio: "ignore" });
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", png, "-q:v", "3", path.join(OUT, name + ".jpg")]);
}

render("site", `<div style="position:absolute;inset:0;background:#0c0d11"></div>
<img src="${file("raw/hero/g3c.jpg")}" style="position:absolute;right:-70px;top:25px;width:580px;height:580px;border-radius:50%;object-fit:cover">
<div style="position:absolute;left:64px;top:60px;width:600px;color:#faf7f0">
<div class="logo" style="font-size:40px">Cholent <span class="amp" style="-webkit-text-stroke:0">&amp;</span> Chill</div>
<div style="font:400 74px/1.06 Ultra,serif;margin-top:70px">Where are you eating tonight?</div>
<div class="lbl" style="margin-top:34px;color:#dca857;font-size:22px">Israel's #1 cholent directory</div></div>`);

for (const s of data.spots) {
  render(s.id, `<img src="${file("src" + s.img)}" style="position:absolute;right:0;top:0;width:430px;height:630px;object-fit:cover;object-position:50% 30%">
<div style="position:absolute;left:64px;top:56px;width:640px;height:518px;display:flex;flex-direction:column">
<div class="logo">Cholent <span class="amp">&amp;</span> Chill</div>
<div style="margin-top:auto;display:flex;gap:32px;align-items:center"><div class="stamp ${s.score >= 9 ? "top" : ""}">${s.score.toFixed(1)}<small>/10</small></div>
<div><div class="lbl">${esc(s.place)}</div><div style="font:400 ${s.name.length > 16 ? 48 : 60}px/1 Ultra,serif;margin-top:12px">${esc(s.name)}</div></div></div>
<div style="font:500 30px/1.3 Archivo;margin-top:32px;color:#4b4337">“${esc(s.verdict)}”</div></div>`);
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log("OG images:", fs.readdirSync(OUT).length);
