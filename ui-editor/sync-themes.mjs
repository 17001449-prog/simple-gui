#!/usr/bin/env node
// Генерирует ui-editor/themes.js из SimpleUI.txt — единственный источник правды.
// Запуск: node ui-editor/sync-themes.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const luaPath = join(here, "..", "SimpleUI.txt");
const outPath = join(here, "themes.js");

const src = readFileSync(luaPath, "utf8");
const block = src.match(/local Themes = \{([\s\S]*?)\n\}/);
if (!block) {
  console.error("Не нашёл блок `local Themes = {...}` в SimpleUI.txt");
  process.exit(1);
}

const themes = {};
const re = /(\w+)\s*=\s*\{([^}]*)\}/g;
let m;
while ((m = re.exec(block[1]))) {
  const [, name, body] = m;
  const colors = {};
  for (const pair of body.split(",")) {
    const kv = pair.match(/(\w+)\s*=\s*"(#[0-9A-Fa-f]{6})"/);
    if (kv) colors[kv[1]] = kv[2];
  }
  if (Object.keys(colors).length) themes[name] = colors;
}

const count = Object.keys(themes).length;
if (count === 0) {
  console.error("Темы не распознаны");
  process.exit(1);
}

const header = `// ⚠️ Файл сгенерирован автоматически: node ui-editor/sync-themes.mjs
// Источник: SimpleUI.txt (блок "local Themes = {...}")
// Тем: ${count}
`;
writeFileSync(outPath, `${header}window.THEMES = ${JSON.stringify(themes, null, 2)};\n`, "utf8");
console.log(`themes.js обновлён, тем: ${count} (${Object.keys(themes).join(", ")})`);
