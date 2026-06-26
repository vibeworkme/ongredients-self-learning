import { spawn } from "node:child_process";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetUrl = process.argv[2] || "http://127.0.0.1:4173/";
const port = 9223;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.json();
}

async function connectDebugger() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const pages = await getJson(`http://127.0.0.1:${port}/json`);
      const page = pages.find((item) => item.type === "page");
      if (page?.webSocketDebuggerUrl) return new WebSocket(page.webSocketDebuggerUrl);
    } catch {
      await wait(250);
    }
  }
  throw new Error("Chrome DevTools endpoint did not open.");
}

function createClient(socket) {
  let id = 0;
  const pending = new Map();

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  });

  return function send(method, params = {}) {
    id += 1;
    socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
  };
}

const chrome = spawn(chromePath, [
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--user-data-dir=/tmp/ongredients-smoke-profile",
  `--remote-debugging-port=${port}`,
  targetUrl,
]);

try {
  const socket = await connectDebugger();
  const opened = new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  if (socket.readyState !== WebSocket.OPEN) await opened;
  const send = createClient(socket);

  await send("Runtime.enable");
  await send("Page.enable");
  await wait(900);

  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `
      (() => {
        const set = (selector, value) => {
          const el = document.querySelector(selector);
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        };
        document.querySelector('[data-action="fill-example"]').click();
        set('[data-field="setName"]', '비우고 채우는 광채 케어 세트');
        set('[data-field="products"]', '클렌징폼 50ml + 카밍 로션 220ml');
        set('[data-field="routine"]', '세안으로 비우고 장벽 보습으로 채우는 2-step 루틴');
        set('[data-field="packageConcept"]', '사용 순서가 열자마자 보이는 2-step 트레이 박스');
        set('[data-field="goods"]', '루틴 카드 + 실리콘 헤어밴드');
        set('[data-field="targetScene"]', '아침 세안 루틴');
        document.querySelectorAll('[data-check]').forEach((el) => {
          el.checked = true;
          el.dispatchEvent(new Event("change", { bubbles: true }));
        });
        const anchorsOk = [...document.querySelectorAll('a[href^="#"]')]
          .every((a) => document.querySelector(a.getAttribute('href')));
        const output = document.querySelector('#finalOutput').textContent;
        const nav = performance.getEntriesByType('navigation')[0];
        return {
          anchorsOk,
          promptButtons: document.querySelectorAll('[data-prompt]').length,
          hasBeginnerGuide: document.body.textContent.includes('처음이라면 이 순서만 따라 하세요'),
          progress: document.querySelector('#progressValue').textContent,
          finalIncludesSet: output.includes('비우고 채우는 광채 케어 세트'),
          finalIncludesScore: output.includes('5/5'),
          stored: localStorage.getItem('ongredientsConceptWorkbook')?.includes('비우고 채우는 광채 케어 세트') || false,
          loadMs: Math.round(nav ? nav.duration : 0),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })();
    `,
  });

  const value = result.result.value;
  const failures = [];
  if (!value.anchorsOk) failures.push("내부 앵커 링크 검증 실패");
  if (value.promptButtons < 4) failures.push("프롬프트 복사 버튼 검증 실패");
  if (!value.hasBeginnerGuide) failures.push("초보자 안내 영역 검증 실패");
  if (!value.finalIncludesSet || !value.finalIncludesScore) failures.push("최종안 생성 검증 실패");
  if (!value.stored) failures.push("자동 저장 검증 실패");
  if (value.loadMs > 2500) failures.push(`초기 로드가 느립니다: ${value.loadMs}ms`);

  if (failures.length) {
    console.error(failures.map((item) => `- ${item}`).join("\\n"));
    process.exitCode = 1;
  } else {
    console.log(
      `Browser smoke passed: anchors, prompts, autosave, final output, load ${value.loadMs}ms, width ${value.clientWidth}/${value.scrollWidth}.`,
    );
  }

  socket.close();
} finally {
  chrome.kill("SIGTERM");
}
