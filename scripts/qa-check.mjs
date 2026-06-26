import { existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const html = readFileSync(join(root, "index.html"), "utf8");
const js = readFileSync(join(root, "app.js"), "utf8");
const css = readFileSync(join(root, "styles.css"), "utf8");
const failures = [];

function fail(message) {
  failures.push(message);
}

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  if (!ids.has(match[1])) fail(`깨진 앵커 링크: #${match[1]}`);
}

for (const match of html.matchAll(/src="\.\/([^"]+)"/g)) {
  const file = join(root, match[1]);
  if (!existsSync(file)) {
    fail(`없는 이미지 또는 스크립트 경로: ${match[1]}`);
  } else if (match[1].startsWith("assets/") && statSync(file).size === 0) {
    fail(`비어 있는 이미지 파일: ${match[1]}`);
  }
}

for (const id of ["package", "goods", "validation", "final"]) {
  if (!ids.has(id)) fail(`필수 섹션 누락: ${id}`);
}

const copyButtons = [...html.matchAll(/data-copy="([^"]+)"/g)];
if (copyButtons.length < 4) fail("AI 프롬프트 복사 버튼이 부족합니다.");
if (copyButtons.some((match) => match[1].trim().length < 10)) fail("비어 있거나 너무 짧은 복사 프롬프트가 있습니다.");

if (!html.includes("최종 제출안")) fail("최종 제출안 영역이 없습니다.");
if (!js.includes("localStorage")) fail("자동 저장 로직이 없습니다.");
if (!js.includes("downloadFinalText")) fail("최종안 저장 로직이 없습니다.");
if (!css.includes("@media (max-width: 640px)")) fail("모바일 대응 CSS가 없습니다.");

const visibleText = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "");
if (/TODO|FIXME|임시|lorem/i.test(visibleText)) fail("미정리 문구가 화면 텍스트에 남아 있습니다.");
if (/[ ]{2,}/.test(visibleText.replace(/\n\s+/g, "\n"))) fail("화면 텍스트에 불필요한 연속 공백이 있습니다.");

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log("QA check passed: anchors, assets, required sections, prompts, storage, responsive CSS.");
