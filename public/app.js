import { t, applyTranslations, onLocaleChange, getLocale } from "/i18n.js";

const form = document.getElementById("generate-form");
const ideaInput = document.getElementById("idea");
const persistInput = document.getElementById("persist");           // wizard step-4 checkbox
const persistInputDirect = document.getElementById("persist-direct"); // direct-form checkbox
const submitBtn = document.getElementById("submit");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const projectName = document.getElementById("project-name");
const projectMeta = document.getElementById("project-meta");
const writtenTo = document.getElementById("written-to");
const sourceBadge = document.getElementById("result-source-badge");
const fileList = document.getElementById("file-list");
const activePath = document.getElementById("active-path");
const fileContent = document.getElementById("file-content");
const copyBtn = document.getElementById("copy");
const downloadZipBtn = document.getElementById("download-zip");
const galleryEl = document.getElementById("example-cards");
const previewLineEl = document.getElementById("preview-line");
const kitPromptEl = document.getElementById("kit-prompt-text");
const copyPromptBtn = document.getElementById("copy-prompt");

let currentFiles = [];
let activeIndex = -1;
let lastIdea = "";
let lastSlug = "";
let resultSource = null; // "generate" | "example" | null

function setStatus(message, kind = "") {
  // kind: "" (info) | "error" | "busy" | "success"
  statusEl.textContent = message;
  statusEl.classList.toggle("error", kind === "error");
  statusEl.classList.toggle("busy", kind === "busy");
}

function showSkeleton({ scrollIntoView = false } = {}) {
  resultEl.hidden = false;
  resultEl.setAttribute("data-loading", "true");
  if (scrollIntoView) {
    // rAF + small delay so the layout settles before the smooth scroll fires.
    requestAnimationFrame(() => {
      setTimeout(() => resultEl.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    });
  }
}

function hideSkeleton() {
  resultEl.removeAttribute("data-loading");
}

function clearResult() {
  resultEl.hidden = true;
  resultEl.removeAttribute("data-loading");
}

function setSourceBadge(label) {
  if (label) {
    sourceBadge.textContent = label;
    sourceBadge.hidden = false;
  } else {
    sourceBadge.textContent = "";
    sourceBadge.hidden = true;
  }
}

function renderFileList() {
  fileList.innerHTML = "";
  currentFiles.forEach((file, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = file.path;
    if (i === activeIndex) {
      btn.classList.add("active");
      btn.setAttribute("aria-current", "true");
    }
    btn.addEventListener("click", () => selectFile(i));
    fileList.appendChild(btn);
  });
}

function selectFile(i) {
  if (i < 0 || i >= currentFiles.length) return;
  activeIndex = i;
  const file = currentFiles[i];
  activePath.textContent = file.path;
  fileContent.textContent = file.content;
  renderFileList();
}

function buildStarterPrompt(title) {
  // Plain language. The audience is someone who has never used Claude before.
  // Keep this short — pasting walls of text scares first-time users.
  const name = title || (getLocale() === "de" ? "dieses Projekt" : "this project");
  return t("prompt.starter", { name });
}

function renderResult({ projectName: title, meta, files, slug, idea, source, writtenToPath, persistError }) {
  currentFiles = files;
  activeIndex = 0;
  lastIdea = idea;
  lastSlug = slug;
  resultSource = source;

  projectName.textContent = title;
  projectMeta.textContent = meta;
  if (writtenToPath) {
    writtenTo.textContent = t("label.written-to", { path: writtenToPath });
  } else if (persistError) {
    writtenTo.textContent = t("label.note", { message: persistError });
  } else {
    writtenTo.textContent = "";
  }
  if (kitPromptEl) kitPromptEl.textContent = buildStarterPrompt(title);
  setSourceBadge(source === "example" ? t("label.example-badge") : "");
  resultEl.hidden = false;
  hideSkeleton();
  renderFileList();
  selectFile(0);
}

// ---- Example gallery ----

function renderExampleCards(examples) {
  galleryEl.innerHTML = "";
  galleryEl.setAttribute("aria-busy", "false");
  if (!examples.length) {
    const li = document.createElement("li");
    li.className = "example-card placeholder";
    li.textContent = t("gallery.empty");
    galleryEl.appendChild(li);
    return;
  }
  for (const ex of examples) {
    const li = document.createElement("li");
    li.className = "example-card";

    const title = document.createElement("h3");
    title.className = "card-title";
    title.textContent = ex.title;

    const idea = document.createElement("p");
    idea.className = "card-idea";
    idea.textContent = `"${ex.idea}"`;

    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = ex.description;

    const meta = document.createElement("p");
    meta.className = "card-meta";
    meta.textContent = t("card.meta", { count: ex.fileCount, slug: ex.slug });

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const generateBtn = document.createElement("button");
    generateBtn.type = "button";
    generateBtn.textContent = t("card.generate-now");
    generateBtn.setAttribute("aria-label", t("card.aria.generate-now", { idea: ex.idea }));
    generateBtn.addEventListener("click", () => generateFromCard(ex.idea, generateBtn));

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.className = "secondary";
    previewBtn.textContent = t("card.preview-example");
    previewBtn.setAttribute("aria-label", t("card.aria.preview", { title: ex.title }));
    previewBtn.addEventListener("click", () => previewExample(ex.id, previewBtn));

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "secondary";
    useBtn.textContent = t("card.use-this-idea");
    useBtn.setAttribute("aria-label", t("card.aria.use-idea", { idea: ex.idea }));
    useBtn.addEventListener("click", () => useIdea(ex.idea));

    actions.append(generateBtn, previewBtn, useBtn);
    li.append(title, idea, desc, meta, actions);
    galleryEl.appendChild(li);
  }
}

async function loadExamples() {
  try {
    const res = await fetch("/api/examples");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("status.failed-examples-load"));
    renderExampleCards(data.examples || []);
  } catch (err) {
    galleryEl.innerHTML = "";
    galleryEl.setAttribute("aria-busy", "false");
    const li = document.createElement("li");
    li.className = "example-card placeholder";
    li.textContent = t("gallery.error", { error: err.message });
    galleryEl.appendChild(li);
  }
}

async function previewExample(id, triggerBtn) {
  const original = triggerBtn ? triggerBtn.textContent : null;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = t("card.loading");
  }
  setStatus(t("status.loading-example"), "busy");
  showSkeleton({ scrollIntoView: true });
  try {
    const res = await fetch(`/api/examples/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || t("status.failed-example"));
    renderResult({
      projectName: data.context.projectName,
      meta: t("result.meta", { type: data.context.productType, audience: data.context.audience, domain: data.context.domain, slug: data.context.slug }),
      files: data.files,
      slug: data.context.slug,
      idea: data.idea,
      source: "example",
      writtenToPath: null
    });
    setStatus(t("status.loaded-example", { title: data.title }));
  } catch (err) {
    clearResult();
    setStatus(err.message || t("status.failed-example"), "error");
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = original;
    }
  }
}

function useIdea(idea) {
  ideaInput.value = idea;
  ideaInput.dispatchEvent(new Event("input", { bubbles: true }));
  ideaInput.focus();
  ideaInput.setSelectionRange(idea.length, idea.length);
  setStatus(t("status.idea-loaded"));
}

// ---- Generate flow ----

async function runGenerate(idea, { scrollToResult = false, persist = false } = {}) {
  showSkeleton({ scrollIntoView: scrollToResult });
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, persist })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || t("status.generation-failed"));
  }
  renderResult({
    projectName: data.context.projectName,
    meta: t("result.meta", { type: data.context.productType, audience: data.context.audience, domain: data.context.domain, slug: data.context.slug }),
    files: data.files,
    slug: data.context.slug,
    idea,
    source: "generate",
    writtenToPath: data.writtenTo,
    persistError: data.persistError
  });
  return data;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const idea = ideaInput.value.trim();
  if (!idea) {
    setStatus(t("status.empty"), "error");
    ideaInput.focus();
    return;
  }
  submitBtn.disabled = true;
  setStatus(t("status.generating"), "busy");

  try {
    const data = await runGenerate(idea, {
      scrollToResult: true,
      persist: persistInputDirect?.checked === true
    });
    setStatus(t("status.generated", { n: data.files.length }));
  } catch (err) {
    clearResult();
    setStatus(err.message || t("status.network-error"), "error");
  } finally {
    submitBtn.disabled = false;
  }
});

async function generateFromCard(idea, triggerBtn) {
  const original = triggerBtn ? triggerBtn.textContent : null;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = t("card.generating");
  }
  ideaInput.value = idea;
  ideaInput.dispatchEvent(new Event("input", { bubbles: true }));
  setStatus(t("status.generating"), "busy");
  try {
    // Card-driven generates never persist — the user didn't ask for it,
    // and on hosted there's no disk anyway.
    const data = await runGenerate(idea, { scrollToResult: true, persist: false });
    setStatus(t("status.generated", { n: data.files.length }));
  } catch (err) {
    clearResult();
    setStatus(err.message || t("status.network-error"), "error");
  } finally {
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = original;
    }
  }
}

// ---- Copy + Download ZIP ----

copyBtn.addEventListener("click", async () => {
  if (activeIndex < 0) return;
  try {
    await navigator.clipboard.writeText(currentFiles[activeIndex].content);
    copyBtn.textContent = t("file-view.copied");
    setTimeout(() => { copyBtn.textContent = t("file-view.copy"); }, 1200);
  } catch {
    copyBtn.textContent = t("file-view.copy-failed");
    setTimeout(() => { copyBtn.textContent = t("file-view.copy"); }, 1500);
  }
});

copyPromptBtn?.addEventListener("click", async () => {
  if (!kitPromptEl) return;
  try {
    await navigator.clipboard.writeText(kitPromptEl.textContent || "");
    copyPromptBtn.textContent = t("result.step3.copied");
    setTimeout(() => { copyPromptBtn.textContent = t("result.step3.copy"); }, 1500);
  } catch {
    copyPromptBtn.textContent = t("result.step3.copy-failed");
    setTimeout(() => { copyPromptBtn.textContent = t("result.step3.copy"); }, 1500);
  }
});

downloadZipBtn.addEventListener("click", async () => {
  if (!lastIdea) return;
  const originalLabel = downloadZipBtn.textContent;
  downloadZipBtn.disabled = true;
  downloadZipBtn.textContent = t("status.zip-building");
  try {
    const res = await fetch("/api/generate.zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea: lastIdea })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Download failed (${res.status}).`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lastSlug || "kit"}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    downloadZipBtn.textContent = t("status.zip-downloaded");
    setTimeout(() => { downloadZipBtn.textContent = originalLabel; }, 1500);
  } catch (err) {
    downloadZipBtn.textContent = t("status.zip-failed-short");
    setStatus(err.message || t("status.zip-failed"), "error");
    setTimeout(() => { downloadZipBtn.textContent = originalLabel; }, 1500);
  } finally {
    downloadZipBtn.disabled = false;
  }
});

// ---- Live inference preview ----

let previewTimer = null;
let previewSeq = 0;

function clearPreview() {
  previewLineEl.textContent = "";
}

function renderPreview(ctx) {
  previewLineEl.innerHTML = "";
  const label = document.createElement("span");
  label.className = "pv-label";
  label.textContent = t("label.detected");
  const value = document.createElement("span");
  value.className = "pv-value";
  value.textContent = t("label.detected.value", { type: ctx.productType, audience: ctx.audience, domain: ctx.domain });
  previewLineEl.append(label, value);
}

ideaInput.addEventListener("input", () => {
  clearTimeout(previewTimer);
  const idea = ideaInput.value.trim();
  if (!idea) {
    clearPreview();
    return;
  }
  const seq = ++previewSeq;
  previewTimer = setTimeout(async () => {
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea })
      });
      // Drop stale responses if the user kept typing.
      if (seq !== previewSeq) return;
      if (!res.ok) {
        clearPreview();
        return;
      }
      const data = await res.json();
      if (data.context) renderPreview(data.context);
    } catch {
      // Network blip — silently clear so we don't show stale state.
      if (seq === previewSeq) clearPreview();
    }
  }, 350);
});

// ---- Hosted-mode adaptation ----
//
// When the server reports `hosted: true`, the filesystem-persist
// checkbox is meaningless (no writable disk on serverless). Hide the
// whole row that contains it and uncheck it so the request body never
// asks the server to persist.
async function detectHostedMode() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return;
    const data = await res.json();
    if (data.hosted) {
      // Uncheck and hide every persist checkbox in the document. Both the
      // wizard step-4 checkbox and the direct-form checkbox should disappear
      // on hosted — there is no writable disk.
      for (const el of document.querySelectorAll('input[id^="persist"]')) {
        el.checked = false;
        const row = el.closest("label.checkbox");
        if (row) row.hidden = true;
      }
    }
  } catch {
    // Health check failed — fall back to local defaults.
  }
}

// ---- Wizard ----
//
// 4-step guided onboarding that composes the user's answers into a single
// natural-language sentence and feeds that to /api/generate. The classic
// textarea form stays available behind the "Switch to direct input" link.

const wizardSection = document.getElementById("wizard");
const generatorSection = document.getElementById("generator");
const wzSteps = wizardSection?.querySelectorAll(".wizard-steps li") ?? [];
const wzPanels = wizardSection?.querySelectorAll(".wizard-panel") ?? [];
const wzBack = document.getElementById("wz-back");
const wzNext = document.getElementById("wz-next");
const wzGenerate = document.getElementById("wz-generate");
const wzSkip = document.getElementById("wz-skip");
const wzBackToWizard = document.getElementById("wz-back-to-wizard");
const wzAudienceInput = document.getElementById("wz-audience");
const wzBenefitInput = document.getElementById("wz-benefit");
const wzSummary = document.getElementById("wz-summary");
const wzPreview = document.getElementById("wz-preview");

const productPhrases = {
  "app": "An app",
  "website": "A website",
  "web app": "A web app",
  "tool": "A tool",
  "service": "A service",
  "platform": "A platform"
};

const wizardState = { step: 1, productType: null, audience: "", benefit: "" };

function composeWizardIdea() {
  let s = productPhrases[wizardState.productType] || "A product";
  const audience = wizardState.audience.trim();
  const benefit = wizardState.benefit.trim();
  if (audience) s += ` for ${audience}`;
  s += ".";
  // Two sentences — keeps the audience phrase from running into the
  // benefit clause when the inference parses `for X` against punctuation.
  if (benefit) s += ` It ${benefit}.`;
  return s;
}

function isWizardStepValid(step) {
  if (step === 1) return wizardState.productType !== null;
  if (step === 2) return wizardState.audience.trim().length > 0;
  if (step === 3) return true;  // optional
  if (step === 4) return true;  // ready to generate
  return false;
}

function renderWizard() {
  wzSteps.forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("active", n === wizardState.step);
    li.classList.toggle("done", n < wizardState.step);
    if (n === wizardState.step) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
  wzPanels.forEach((p) => {
    p.hidden = Number(p.dataset.step) !== wizardState.step;
  });
  wzBack.disabled = wizardState.step === 1;
  if (wizardState.step === 4) {
    wzNext.hidden = true;
    wzGenerate.hidden = false;
  } else {
    wzNext.hidden = false;
    wzGenerate.hidden = true;
    wzNext.disabled = !isWizardStepValid(wizardState.step);
  }
  if (wizardState.step === 4) {
    wzSummary.textContent = composeWizardIdea();
    refreshWizardPreview();
  }
  // Move focus to the primary affordance of the new step.
  if (wizardState.step === 1) {
    const sel = wizardSection.querySelector(".wz-option[aria-checked='true']")
      || wizardSection.querySelector(".wz-option");
    sel?.focus({ preventScroll: true });
  } else if (wizardState.step === 2) {
    wzAudienceInput.focus({ preventScroll: true });
  } else if (wizardState.step === 3) {
    wzBenefitInput.focus({ preventScroll: true });
  } else if (wizardState.step === 4) {
    wzGenerate.focus({ preventScroll: true });
  }
}

function gotoWizardStep(n) {
  wizardState.step = Math.max(1, Math.min(4, n));
  renderWizard();
}

// Step 1 — option picker (acts as a radio group)
if (wizardSection) {
  wizardSection.querySelectorAll(".wz-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      wizardState.productType = btn.dataset.productType;
      wizardSection.querySelectorAll(".wz-option").forEach((b) => {
        b.setAttribute("aria-checked", b === btn ? "true" : "false");
      });
      wzNext.disabled = false;
      // Auto-advance briefly after the visual selection so the user sees the highlight.
      setTimeout(() => gotoWizardStep(2), 240);
    });
  });

  wzAudienceInput.addEventListener("input", () => {
    wizardState.audience = wzAudienceInput.value;
    wzNext.disabled = !isWizardStepValid(wizardState.step);
  });
  wizardSection.querySelectorAll("[data-fill-audience]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wzAudienceInput.value = btn.dataset.fillAudience;
      wizardState.audience = wzAudienceInput.value;
      wzNext.disabled = false;
      wzAudienceInput.focus();
    });
  });

  wzBenefitInput.addEventListener("input", () => {
    wizardState.benefit = wzBenefitInput.value;
  });
  wizardSection.querySelectorAll("[data-fill-benefit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wzBenefitInput.value = btn.dataset.fillBenefit;
      wizardState.benefit = wzBenefitInput.value;
      wzBenefitInput.focus();
    });
  });

  wzBack.addEventListener("click", () => gotoWizardStep(wizardState.step - 1));
  wzNext.addEventListener("click", () => {
    if (isWizardStepValid(wizardState.step)) gotoWizardStep(wizardState.step + 1);
  });

  wzGenerate.addEventListener("click", async () => {
    const idea = composeWizardIdea();
    wzGenerate.disabled = true;
    setStatus(t("status.generating"), "busy");
    try {
      const data = await runGenerate(idea, {
        scrollToResult: true,
        persist: persistInput?.checked === true
      });
      // Mirror the composed idea into the textarea so a returning user
      // sees what was sent and can tweak from the direct form.
      ideaInput.value = idea;
      ideaInput.dispatchEvent(new Event("input", { bubbles: true }));
      setStatus(t("status.generated", { n: data.files.length }));
    } catch (err) {
      clearResult();
      setStatus(err.message || t("status.network-error"), "error");
    } finally {
      wzGenerate.disabled = false;
    }
  });

  wzSkip.addEventListener("click", () => {
    wizardSection.hidden = true;
    generatorSection.hidden = false;
    ideaInput.focus();
  });
  wzBackToWizard?.addEventListener("click", () => {
    generatorSection.hidden = true;
    wizardSection.hidden = false;
    renderWizard();
  });
}

let wzPreviewTimer = null;
function refreshWizardPreview() {
  clearTimeout(wzPreviewTimer);
  if (!wzPreview) return;
  const idea = composeWizardIdea();
  wzPreviewTimer = setTimeout(async () => {
    try {
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea })
      });
      if (!res.ok) { wzPreview.textContent = ""; return; }
      const data = await res.json();
      if (data.context) {
        wzPreview.innerHTML = "";
        const label = document.createElement("span");
        label.className = "pv-label";
        label.textContent = t("label.detected");
        const value = document.createElement("span");
        value.className = "pv-value";
        value.textContent = t("label.detected.value", { type: data.context.productType, audience: data.context.audience, domain: data.context.domain });
        wzPreview.append(label, value);
      }
    } catch {
      wzPreview.textContent = "";
    }
  }, 250);
}

// ---- Bootstrap ----

applyTranslations();
detectHostedMode();
loadExamples();
if (wizardSection) renderWizard();

// Re-translate dynamic content when the user switches language.
onLocaleChange(() => {
  // Static [data-i18n*] elements are handled by applyTranslations(),
  // which i18n.js itself calls on setLocale. Here we re-render the
  // dynamic surfaces app.js owns: gallery cards, result-side prompt,
  // wizard preview line, and any open status banner.
  if (galleryEl && galleryEl.children.length > 0 && !galleryEl.firstElementChild?.classList.contains("placeholder")) {
    loadExamples();
  } else if (galleryEl?.firstElementChild?.classList.contains("placeholder")) {
    galleryEl.firstElementChild.textContent = t("gallery.loading");
  }
  if (kitPromptEl && projectName.textContent) {
    kitPromptEl.textContent = buildStarterPrompt(projectName.textContent);
  }
  // Source badge respects the new locale.
  if (resultSource === "example") setSourceBadge(t("label.example-badge"));
  // Persisted "Written to:" / "Note:" labels rebuild from the underlying flags.
  // These are computed only at render time, so we leave them — they'll refresh
  // on the next renderResult().
});
