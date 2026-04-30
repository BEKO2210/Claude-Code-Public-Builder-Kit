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

function renderResult({ projectName: title, meta, files, slug, idea, source, writtenToPath, persistError }) {
  currentFiles = files;
  activeIndex = 0;
  lastIdea = idea;
  lastSlug = slug;
  resultSource = source;

  projectName.textContent = title;
  projectMeta.textContent = meta;
  if (writtenToPath) {
    writtenTo.textContent = `Written to: ${writtenToPath}`;
  } else if (persistError) {
    writtenTo.textContent = `Note: ${persistError}`;
  } else {
    writtenTo.textContent = "";
  }
  setSourceBadge(source === "example" ? "Example" : "");
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
    li.textContent = "No examples available.";
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
    meta.textContent = `${ex.fileCount} files · slug: ${ex.slug}`;

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const generateBtn = document.createElement("button");
    generateBtn.type = "button";
    generateBtn.textContent = "Generate now";
    generateBtn.setAttribute("aria-label", `Generate kit from idea: ${ex.idea}`);
    generateBtn.addEventListener("click", () => generateFromCard(ex.idea, generateBtn));

    const previewBtn = document.createElement("button");
    previewBtn.type = "button";
    previewBtn.className = "secondary";
    previewBtn.textContent = "Preview example";
    previewBtn.setAttribute("aria-label", `Preview example: ${ex.title}`);
    previewBtn.addEventListener("click", () => previewExample(ex.id, previewBtn));

    const useBtn = document.createElement("button");
    useBtn.type = "button";
    useBtn.className = "secondary";
    useBtn.textContent = "Use this idea";
    useBtn.setAttribute("aria-label", `Use this idea as input: ${ex.idea}`);
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
    if (!res.ok) throw new Error(data.error || "Failed to load examples.");
    renderExampleCards(data.examples || []);
  } catch (err) {
    galleryEl.innerHTML = "";
    galleryEl.setAttribute("aria-busy", "false");
    const li = document.createElement("li");
    li.className = "example-card placeholder";
    li.textContent = `Could not load examples: ${err.message}`;
    galleryEl.appendChild(li);
  }
}

async function previewExample(id, triggerBtn) {
  const original = triggerBtn ? triggerBtn.textContent : null;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = "Loading…";
  }
  setStatus("Loading example…", "busy");
  showSkeleton({ scrollIntoView: true });
  try {
    const res = await fetch(`/api/examples/${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to load example.");
    renderResult({
      projectName: data.context.projectName,
      meta: `${data.context.productType} · ${data.context.audience} · ${data.context.domain} · slug: ${data.context.slug}`,
      files: data.files,
      slug: data.context.slug,
      idea: data.idea,
      source: "example",
      writtenToPath: null
    });
    setStatus(`Loaded example: ${data.title}.`);
  } catch (err) {
    clearResult();
    setStatus(err.message || "Failed to load example.", "error");
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
  setStatus("Idea loaded into the form. Click Generate kit to continue.");
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
    throw new Error(data.error || "Generation failed.");
  }
  renderResult({
    projectName: data.context.projectName,
    meta: `${data.context.productType} · ${data.context.audience} · ${data.context.domain} · slug: ${data.context.slug}`,
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
    setStatus("Enter an idea first.", "error");
    ideaInput.focus();
    return;
  }
  submitBtn.disabled = true;
  setStatus("Generating your kit…", "busy");

  try {
    const data = await runGenerate(idea, {
      scrollToResult: true,
      persist: persistInputDirect?.checked === true
    });
    setStatus(`Generated ${data.files.length} files. Scroll the file list to explore, or download as ZIP.`);
  } catch (err) {
    clearResult();
    setStatus(err.message || "Network error.", "error");
  } finally {
    submitBtn.disabled = false;
  }
});

async function generateFromCard(idea, triggerBtn) {
  const original = triggerBtn ? triggerBtn.textContent : null;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = "Generating…";
  }
  ideaInput.value = idea;
  ideaInput.dispatchEvent(new Event("input", { bubbles: true }));
  setStatus("Generating your kit…", "busy");
  try {
    // Card-driven generates never persist — the user didn't ask for it,
    // and on hosted there's no disk anyway.
    const data = await runGenerate(idea, { scrollToResult: true, persist: false });
    setStatus(`Generated ${data.files.length} files. Scroll the file list to explore, or download as ZIP.`);
  } catch (err) {
    clearResult();
    setStatus(err.message || "Network error.", "error");
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
    copyBtn.textContent = "Copied";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1200);
  } catch {
    copyBtn.textContent = "Copy failed";
    setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
  }
});

downloadZipBtn.addEventListener("click", async () => {
  if (!lastIdea) return;
  const originalLabel = downloadZipBtn.textContent;
  downloadZipBtn.disabled = true;
  downloadZipBtn.textContent = "Building ZIP…";
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
    downloadZipBtn.textContent = "Downloaded";
    setTimeout(() => { downloadZipBtn.textContent = originalLabel; }, 1500);
  } catch (err) {
    downloadZipBtn.textContent = "Failed";
    setStatus(err.message || "ZIP download failed.", "error");
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
  label.textContent = "Detected: ";
  const value = document.createElement("span");
  value.className = "pv-value";
  value.textContent = `${ctx.productType} · for ${ctx.audience} · in ${ctx.domain}`;
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
    setStatus("Generating your kit…", "busy");
    try {
      const data = await runGenerate(idea, {
        scrollToResult: true,
        persist: persistInput?.checked === true
      });
      // Mirror the composed idea into the textarea so a returning user
      // sees what was sent and can tweak from the direct form.
      ideaInput.value = idea;
      ideaInput.dispatchEvent(new Event("input", { bubbles: true }));
      setStatus(`Generated ${data.files.length} files. Scroll the file list to explore, or download as ZIP.`);
    } catch (err) {
      clearResult();
      setStatus(err.message || "Network error.", "error");
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
        label.textContent = "Detected: ";
        const value = document.createElement("span");
        value.className = "pv-value";
        value.textContent = `${data.context.productType} · for ${data.context.audience} · in ${data.context.domain}`;
        wzPreview.append(label, value);
      }
    } catch {
      wzPreview.textContent = "";
    }
  }, 250);
}

// ---- Bootstrap ----

detectHostedMode();
loadExamples();
if (wizardSection) renderWizard();
