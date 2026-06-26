const STORAGE_KEY = "ongredientsConceptWorkbook";

const fields = [...document.querySelectorAll("[data-field]")];
const checks = [...document.querySelectorAll("[data-check]")];
const finalOutput = document.querySelector("#finalOutput");
const progressValue = document.querySelector("#progressValue");
const progressBar = document.querySelector("#progressBar");
const progressHint = document.querySelector("#progressHint");
const packagePromptList = document.querySelector("#packagePromptList");
const goodsPromptList = document.querySelector("#goodsPromptList");
const toast = document.querySelector("#toast");

const state = {
  fields: {},
  checks: {},
};

const exampleData = {
  setName: "비우고 채우는 광채 케어 세트",
  products: "클렌징폼 50ml + 카밍 로션 220ml",
  routine: "아침 또는 저녁 세안 후, 클렌징폼으로 피부를 비우고 로션으로 장벽 보습을 채우는 루틴",
  packageRole: "언박싱용",
  packageConcept: "클렌징폼과 로션을 STEP 1, STEP 2로 세워 배치해 사용 순서가 열자마자 보이는 2-step 트레이 박스",
  brandSentence: "성분에 솔직하고 피부 장벽을 편안하게 돌보는 클린 스킨케어 브랜드",
  keywords: "성분, 스킨 베리어, 속광, 진정, 클린뷰티",
  targetScene: "아침 세안 루틴, 외출 전 피부 확인, 언박싱 기록",
  goods: "루틴 카드 + 실리콘 헤어밴드",
  goodsReason: "세안할 때 바로 쓰이고, 루틴 카드가 제품 사용 순서를 쉽게 기억하게 해준다.",
  improvement: "헤어밴드는 제품 측면 슬롯에 넣고, 루틴 카드는 제품 위에 얇게 올려 공간 부담을 줄인다.",
};

function fieldValue(key, fallback) {
  return state.fields[key] || fallback;
}

function currentPlanText() {
  return [
    `세트명: ${fieldValue("setName", "아직 정하지 못함")}`,
    `제품 구성: ${fieldValue("products", "아직 입력하지 않음")}`,
    `사용 순서/루틴: ${fieldValue("routine", "아직 정하지 못함")}`,
    `패키지 설명: ${fieldValue("packageConcept", "아직 정하지 못함")}`,
    `브랜드 설명: ${fieldValue("brandSentence", "아직 정하지 못함")}`,
    `키워드: ${fieldValue("keywords", "아직 입력하지 않음")}`,
    `사용 장면: ${fieldValue("targetScene", "아직 정하지 못함")}`,
    `굿즈: ${fieldValue("goods", "아직 정하지 못함")}`,
    `굿즈 선정 이유: ${fieldValue("goodsReason", "아직 정하지 못함")}`,
    `보완점: ${fieldValue("improvement", "아직 없음")}`,
  ].join("\n");
}

function buildPrompt(type) {
  const products = fieldValue("products", "[여기에 제품명과 용량을 적어주세요]");
  const keywords = fieldValue("keywords", "[브랜드 키워드를 적어주세요. 예: 성분, 속광, 진정]");
  const targetScene = fieldValue("targetScene", "[타겟이 제품을 쓰는 상황을 적어주세요]");

  const prompts = {
    package: `나는 화장품 기획 세트를 만들고 있어.
제품 구성은 다음과 같아.
${products}

초보자도 이해할 수 있게 아래 형식으로 제안해줘.
1. 세트명 5개
2. 이 제품들이 왜 한 세트인지 쉬운 설명
3. 소비자가 어떤 순서로 쓰는지
4. 박스를 열었을 때 어떻게 배치하면 좋을지
5. 패키지 컨셉 한 문장

어려운 전문 용어는 피하고, 과제에 바로 붙여 넣을 수 있는 문장으로 써줘.`,
    goods: `나는 화장품 기획 세트에 넣을 굿즈를 고르고 있어.
제품 구성: ${products}
브랜드 키워드: ${keywords}
타겟 사용 장면: ${targetScene}

초보자도 고를 수 있게 아래 형식으로 제안해줘.
1. 굿즈 후보 10개
2. 각 굿즈가 쓰이는 실제 장면
3. 너무 비싸거나 제작이 어려워 보이는 후보 표시
4. 최종 추천 굿즈 3개
5. 추천 이유 한 문장

사은품처럼 보이지만 제품 사용과 연결되는 아이디어를 우선해줘.`,
    goodsFilter: `아래 굿즈 후보 중에서 실제로 쓸 만한 것만 남겨줘.

현재 기획 내용:
${currentPlanText()}

평가 기준은 3가지야.
1. 실제로 반복해서 쓸 것 같은가
2. 제품 사용 장면과 연결되는가
3. 언박싱 사진에서 보기 좋은가

최종 후보 1개와 탈락 이유를 쉽게 정리해줘.`,
    validation: `아래 세트 기획안을 초보자가 이해하기 쉽게 검토해줘.

${currentPlanText()}

다음 기준으로 봐줘.
1. 박스를 열었을 때 제품 사용 순서가 보이는가
2. 굿즈가 제품 사용을 도와주는가
3. 제품과 굿즈가 한 박스 안에 들어갈 것 같은가
4. 사진으로 찍었을 때 세트 느낌이 보이는가
5. 브랜드 이미지와 어울리는가

각 항목을 좋음/보완 필요로 표시하고, 마지막에 고쳐 쓸 최종 제출 문장 1개를 만들어줘.`,
  };

  return prompts[type] || "";
}

function createImagePrompts() {
  const setName = fieldValue("setName", "clean skincare routine set");
  const products = fieldValue("products", "cleanser and lotion skincare products");
  const routine = fieldValue("routine", "a simple daily skincare routine");
  const packageConcept = fieldValue("packageConcept", "a clean 2-step tray box that shows product order clearly");
  const brandSentence = fieldValue("brandSentence", "an honest clean skincare brand focused on gentle skin barrier care");
  const keywords = fieldValue("keywords", "clean ingredients, skin barrier, glow, calming, clean beauty");
  const targetScene = fieldValue("targetScene", "morning skincare routine and unboxing moment");
  const goods = fieldValue("goods", "routine card and silicone hair band");
  const goodsReason = fieldValue("goodsReason", "helps the user follow the skincare routine naturally");

  const packagePrompts = [
    {
      title: "패키지 1: 정면 히어로 목업",
      text: `Premium cosmetic package design mockup for "${setName}", containing ${products}. Show an open rigid box with a clean tray layout based on "${packageConcept}". The product order should clearly express "${routine}". Use a soft clean beauty mood inspired by ${keywords}. Minimal Korean skincare brand style, warm natural daylight, sage green, soft cream, pale yellow accents, tactile paper texture, realistic shadows, high-end product photography, front three-quarter view, no readable text, no logo, no watermark.`,
    },
    {
      title: "패키지 2: 박스 내부 구조",
      text: `Top-down packaging structure concept for "${setName}". Design a realistic inner tray for ${products}, with dedicated product slots and a small goods space. The layout must make the skincare routine easy to understand: ${routine}. Use "${packageConcept}" as the main design idea. Clean ingredient-focused Korean cosmetic package, molded pulp tray, soft matte paper, organized STEP 1 and STEP 2 feeling without readable text, elegant minimal color palette, studio lighting, highly realistic render, no logo, no watermark.`,
    },
    {
      title: "패키지 3: 언박싱 장면",
      text: `Lifestyle unboxing scene of a clean skincare gift set called "${setName}". Show the package opened on a table with ${products} arranged neatly, plus a visible space for ${goods}. The image should communicate "${brandSentence}" and feel suitable for ${targetScene}. Calm clean beauty atmosphere, natural props, soft fabric, paper insert cards, muted sage and cream colors, premium but approachable, editorial product photography, realistic, no readable text, no logo, no watermark.`,
    },
  ];

  const goodsPrompts = [
    {
      title: "굿즈 1: 굿즈 단독 목업",
      text: `Realistic goods design mockup for a skincare brand: ${goods}. The goods should support ${products} and the user routine "${routine}". Visual direction: ${keywords}. Clean minimal Korean beauty style, soft cream and sage green palette, practical everyday object, premium small promotional gift, studio flat lay, realistic material texture, no readable text, no logo, no watermark.`,
    },
    {
      title: "굿즈 2: 사용 장면",
      text: `Lifestyle image showing ${goods} being naturally used during ${targetScene}. The goods should feel useful because ${goodsReason}. Include subtle skincare context with ${products} nearby, calm bathroom or vanity setting, clean beauty mood, soft morning light, gentle skin barrier care atmosphere, realistic photography, warm neutral background, no readable text, no logo, no watermark.`,
    },
    {
      title: "굿즈 3: 패키지와 함께 보이는 구성",
      text: `Unboxing flat lay showing ${goods} placed together with the skincare package for "${setName}" and ${products}. The composition should make the package and goods feel like one coherent set. Express "${brandSentence}" through clean materials, soft color blocks, routine card, neat slots, gentle glow, calming skincare mood, premium Korean cosmetic gift set photography, high realism, no readable text, no logo, no watermark.`,
    },
  ];

  return { packagePrompts, goodsPrompts };
}

function imagePromptText() {
  const { packagePrompts, goodsPrompts } = createImagePrompts();
  return [
    "패키지 디자인 이미지 프롬프트 3개",
    ...packagePrompts.map((prompt, index) => `PACKAGE IMAGE PROMPT ${index + 1} - ${prompt.title}\n${prompt.text}`),
    "",
    "굿즈 이미지 프롬프트 3개",
    ...goodsPrompts.map((prompt, index) => `GOODS IMAGE PROMPT ${index + 1} - ${prompt.title}\n${prompt.text}`),
  ].join("\n\n");
}

function renderPromptCards(container, prompts, type) {
  container.replaceChildren();
  prompts.forEach((prompt, index) => {
    const article = document.createElement("article");
    article.className = "image-prompt-card";

    const number = document.createElement("span");
    number.textContent = String(index + 1).padStart(2, "0");

    const title = document.createElement("strong");
    title.textContent = prompt.title;

    const text = document.createElement("p");
    text.textContent = prompt.text;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.imagePrompt = `${type}:${index}`;
    button.textContent = "이 프롬프트 복사";

    article.append(number, title, text, button);
    container.append(article);
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    state.fields = saved.fields || {};
    state.checks = saved.checks || {};
  } catch {
    state.fields = {};
    state.checks = {};
  }

  fields.forEach((field) => {
    field.value = state.fields[field.dataset.field] || "";
  });
  checks.forEach((check) => {
    check.checked = Boolean(state.checks[check.dataset.check]);
  });
}

function saveState() {
  fields.forEach((field) => {
    state.fields[field.dataset.field] = field.value.trim();
  });
  checks.forEach((check) => {
    state.checks[check.dataset.check] = check.checked;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function filledCount() {
  const textDone = fields.filter((field) => field.value.trim().length > 0).length;
  const checkDone = checks.filter((check) => check.checked).length;
  return { done: textDone + checkDone, total: fields.length + checks.length };
}

function progressMessage(percent) {
  if (percent === 0) return "첫 번째 입력부터 천천히 채워보세요.";
  if (percent < 40) return "좋습니다. 제품 조합의 이유가 보이기 시작합니다.";
  if (percent < 75) return "이제 굿즈와 사용 장면을 더 선명하게 연결해보세요.";
  if (percent < 100) return "거의 완성입니다. 검증 체크를 끝내면 제출 문장이 안정됩니다.";
  return "완성되었습니다. 이미지 프롬프트를 복사해 이미지 생성 도구에 넣어보세요.";
}

function createFinalText() {
  const get = fieldValue;
  const checked = checks.filter((check) => check.checked).length;
  const validationScore = `${checked}/5`;

  if (!Object.values(state.fields).some(Boolean) && checked === 0) {
    return "아직 작성된 내용이 없습니다. Part 1부터 입력해보세요.";
  }

  return [
    `세트명: ${get("setName", "미작성")}`,
    `제품 구성: ${get("products", "미작성")}`,
    `루틴 해석: ${get("routine", "미작성")}`,
    `패키지 역할: ${get("packageRole", "미작성")}`,
    `패키지 컨셉: ${get("packageConcept", "미작성")}`,
    "",
    `브랜드 한 문장: ${get("brandSentence", "미작성")}`,
    `핵심 키워드: ${get("keywords", "미작성")}`,
    `타겟 사용 장면: ${get("targetScene", "미작성")}`,
    `최종 굿즈: ${get("goods", "미작성")}`,
    `굿즈 선정 이유: ${get("goodsReason", "미작성")}`,
    "",
    `통합 검증 점수: ${validationScore}`,
    `보완점: ${get("improvement", "미작성")}`,
    "",
    `최종 제출 문장: ${get("setName", "이 세트")}는 ${get("products", "제품 조합")}을 ${get("packageConcept", "패키지 구조")}로 보여주고, ${get("goods", "굿즈")}를 통해 ${get("targetScene", "사용 장면")}을 일상에 남긴다.`,
    "",
    imagePromptText(),
  ].join("\n");
}

function render() {
  const progress = filledCount();
  const percent = Math.round((progress.done / progress.total) * 100);
  progressValue.textContent = String(percent);
  progressBar.style.width = `${percent}%`;
  progressHint.textContent = progressMessage(percent);
  finalOutput.textContent = createFinalText();
  const { packagePrompts, goodsPrompts } = createImagePrompts();
  renderPromptCards(packagePromptList, packagePrompts, "package");
  renderPromptCards(goodsPromptList, goodsPrompts, "goods");
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
  showToast("복사되었습니다.");
}

function downloadFinalText() {
  const blob = new Blob([finalOutput.textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ongredients-concept-final.txt";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-field], [data-check]")) saveState();
});

document.addEventListener("change", (event) => {
  if (event.target.matches("[data-field], [data-check]")) saveState();
});

document.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy]");
  const promptButton = event.target.closest("[data-prompt]");
  const imagePromptButton = event.target.closest("[data-image-prompt]");
  const actionButton = event.target.closest("[data-action]");

  if (copyButton) {
    copyText(copyButton.dataset.copy).catch(() => showToast("복사 권한을 확인해주세요."));
  }

  if (promptButton) {
    copyText(buildPrompt(promptButton.dataset.prompt)).catch(() => showToast("복사 권한을 확인해주세요."));
  }

  if (imagePromptButton) {
    const [type, indexText] = imagePromptButton.dataset.imagePrompt.split(":");
    const index = Number(indexText);
    const { packagePrompts, goodsPrompts } = createImagePrompts();
    const list = type === "package" ? packagePrompts : goodsPrompts;
    copyText(list[index]?.text || "").catch(() => showToast("복사 권한을 확인해주세요."));
  }

  if (!actionButton) return;

  if (actionButton.dataset.action === "fill-example") {
    fields.forEach((field) => {
      field.value = exampleData[field.dataset.field] || "";
    });
    checks.forEach((check) => {
      check.checked = true;
    });
    saveState();
    showToast("예시가 채워졌습니다. 문장을 바꿔보세요.");
  }

  if (actionButton.dataset.action === "reset") {
    localStorage.removeItem(STORAGE_KEY);
    fields.forEach((field) => {
      field.value = "";
    });
    checks.forEach((check) => {
      check.checked = false;
    });
    state.fields = {};
    state.checks = {};
    render();
    showToast("작성 내용이 초기화되었습니다.");
  }

  if (actionButton.dataset.action === "copy-final") {
    copyText(finalOutput.textContent).catch(() => showToast("복사 권한을 확인해주세요."));
  }

  if (actionButton.dataset.action === "copy-image-prompts") {
    copyText(imagePromptText()).catch(() => showToast("복사 권한을 확인해주세요."));
  }

  if (actionButton.dataset.action === "download") {
    downloadFinalText();
    showToast("텍스트 파일을 저장했습니다.");
  }
});

loadState();
render();
