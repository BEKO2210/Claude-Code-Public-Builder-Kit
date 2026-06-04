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
const statFilesEl = document.getElementById("stat-files");
const statSectionsEl = document.getElementById("stat-sections");
const statWordsEl = document.getElementById("stat-words");
const statTimeEl = document.getElementById("stat-time");
const previewBodyEl = document.getElementById("result-preview-body");
const shareTwitterEl = document.getElementById("share-twitter");
const shareLinkedinEl = document.getElementById("share-linkedin");
const shareWhatsappEl = document.getElementById("share-whatsapp");
const shareCopyEl = document.getElementById("share-copy");

let currentFiles = [];
let activeIndex = -1;
let lastIdea = "";
let lastSlug = "";
let resultSource = null; // "generate" | "example" | null

// --- Stats helpers ---

// Compute headline numbers for the post-generate stats card.
// Sections counts H2-style ## headings across all files (the way each
// generated doc is actually structured); H3+ are not counted because
// they're sub-sections of those.
function computeKitStats(files, durationMs) {
  let sections = 0;
  let words = 0;
  for (const f of files) {
    const c = f.content || "";
    sections += (c.match(/^##\s+/gm) || []).length;
    // Word count: split on whitespace, filter empties. Cheap; close enough.
    words += c.trim() ? c.trim().split(/\s+/).length : 0;
  }
  return {
    files: files.length,
    sections,
    words,
    seconds: durationMs != null ? Math.max(0.1, durationMs / 1000) : null
  };
}

function formatWords(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function formatSeconds(s) {
  if (s == null) return "—";
  return s < 10 ? s.toFixed(1) : Math.round(s).toString();
}

// Build a stateless shareable URL that re-runs the wizard with the
// given idea pre-filled. The receiver lands on the app, the idea is
// auto-loaded into the direct form, the wizard skips itself, and a
// fresh kit is generated. Whole loop is browser-side; no DB, no
// per-user persistence.
function buildShareURL(idea) {
  const base = (typeof window !== "undefined" && window.location)
    ? `${window.location.origin}${window.location.pathname}`
    : "";
  return `${base}?idea=${encodeURIComponent(idea)}`;
}

function updateShareLinks(idea, projectName) {
  const url = buildShareURL(idea);
  const text = t("share.tweet", { name: projectName || idea });
  if (shareTwitterEl) {
    shareTwitterEl.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  }
  if (shareLinkedinEl) {
    // LinkedIn intent only uses URL; the text is added by the user.
    shareLinkedinEl.href = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  }
  if (shareWhatsappEl) {
    shareWhatsappEl.href = `https://wa.me/?text=${encodeURIComponent(text + " " + url)}`;
  }
  if (shareCopyEl) {
    // Cache the URL on the button itself for the click handler.
    shareCopyEl.dataset.shareUrl = url;
  }
}

// Categorise a file path into a colour-coded group for the file-list.
function fileCategory(path) {
  if (/^MASTERPLAN\.md$|^ROADMAP\.md$|^ACCEPTANCE_CRITERIA\.md$/.test(path)) return "strategy";
  if (/^ARCHITECTURE\.md$|^CLAUDE\.md$|technical-decisions/.test(path)) return "tech";
  if (/product-brief|market-positioning/.test(path)) return "brief";
  if (/^PROMPTS\//.test(path)) return "prompts";
  return "meta";
}

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
    btn.setAttribute("data-cat", fileCategory(file.path));
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

function renderResult({ projectName: title, meta, files, slug, idea, source, writtenToPath, persistError, durationMs }) {
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

  // Stats card — concrete numbers the user can quote when sharing.
  const stats = computeKitStats(files, durationMs);
  if (statFilesEl) statFilesEl.textContent = String(stats.files);
  if (statSectionsEl) statSectionsEl.textContent = String(stats.sections);
  if (statWordsEl) statWordsEl.textContent = formatWords(stats.words);
  if (statTimeEl) statTimeEl.textContent = formatSeconds(stats.seconds);

  // Live MASTERPLAN.md preview — first 30 lines, with CSS fade-mask.
  const masterplan = files.find((f) => f.path === "MASTERPLAN.md");
  if (previewBodyEl) {
    previewBodyEl.textContent = masterplan
      ? masterplan.content.split("\n").slice(0, 30).join("\n")
      : "";
  }

  // Share buttons — generate fresh href values for the four outlets.
  updateShareLinks(idea, title);

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
  const t0 = performance.now();
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
      writtenToPath: null,
      durationMs: performance.now() - t0
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
  const t0 = performance.now();
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idea, persist })
  });
  const data = await res.json();
  const durationMs = performance.now() - t0;
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
    persistError: data.persistError,
    durationMs
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

// Copy the full shareable URL of the current kit to the clipboard.
shareCopyEl?.addEventListener("click", async () => {
  const url = shareCopyEl.dataset.shareUrl || "";
  if (!url) return;
  const labelEl = shareCopyEl.querySelector("span");
  if (!labelEl) return;
  try {
    await navigator.clipboard.writeText(url);
    labelEl.textContent = t("share.copied");
    setTimeout(() => { labelEl.textContent = t("share.copy-link"); }, 1500);
  } catch {
    labelEl.textContent = t("share.copy-failed");
    setTimeout(() => { labelEl.textContent = t("share.copy-link"); }, 1500);
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
const modeTabs = document.querySelectorAll("[data-mode-set]");
const wzAboutInput = document.getElementById("wz-about");
const wzAudienceInput = document.getElementById("wz-audience");
const wzBenefitInput = document.getElementById("wz-benefit");
const wzSummary = document.getElementById("wz-summary");
const wzPreview = document.getElementById("wz-preview");
const wzNudgeAbout = document.getElementById("wz-nudge-about");
const wzNudgeAudience = document.getElementById("wz-nudge-audience");
const wzNudgeBenefit = document.getElementById("wz-nudge-benefit");
const wzOtherWrap = document.getElementById("wz-other-wrap");
const wzOtherInput = document.getElementById("wz-other-input");

// "Sparse" = the user typed something but it's too short to give the
// inference any traction. We trigger the nudge on either word-count or
// raw-character thresholds — short words like "Eltern" or "Zeit" should
// still light it up, but a one-word "Geschäftskundenbetreuer" shouldn't.
function isSparseInput(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) return false;
  const words = trimmed.split(/\s+/);
  return words.length <= 1 && trimmed.length <= 14;
}

// Pick "A " or "An " for free-input strings based on the first letter.
// Crude but right almost always — "An API", "An IDE", "A newsletter".
function articleFor(text) {
  const first = (text.trim()[0] || "").toLowerCase();
  return "aeiou".includes(first) ? "An" : "A";
}

// Each tile carries a `data-product-type` value; this map turns that into
// the natural-language opener used in the composed sentence the wizard
// hands to /api/generate. The server's inference re-detects the
// productType from the full text, so the values here just have to read
// well as English ("A marketplace for X" / "An AI assistant for X").
// The "other" sentinel uses the user's free-input text directly.
const productPhrases = {
  "app": "An app",
  "website": "A website",
  "web app": "A web app",
  "dashboard": "A dashboard",
  "tool": "A tool",
  "ai-assistant": "An AI assistant",
  "service": "A service",
  "api": "An API",
  "platform": "A platform",
  "marketplace": "A marketplace",
  "community": "A community",
  "game": "A game"
};

const wizardState = { step: 1, productType: null, otherText: "", subject: "", audience: "", benefit: "" };

// localStorage save/restore — survives accidental reloads.
const WIZARD_STORAGE_KEY = "bk-wizard-state";
function saveWizardState() {
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
      productType: wizardState.productType,
      otherText: wizardState.otherText,
      subject: wizardState.subject,
      audience: wizardState.audience,
      benefit: wizardState.benefit
      // step is NOT saved — every reload starts at step 1, but the user
      // sees their previous answers pre-filled and can advance fast.
    }));
  } catch { /* localStorage full or disabled — non-fatal */ }
}
function restoreWizardState() {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (typeof saved.productType === "string") wizardState.productType = saved.productType;
    if (typeof saved.otherText === "string") wizardState.otherText = saved.otherText;
    if (typeof saved.subject === "string") wizardState.subject = saved.subject;
    if (typeof saved.audience === "string") wizardState.audience = saved.audience;
    if (typeof saved.benefit === "string") wizardState.benefit = saved.benefit;
    // Reflect into the DOM
    if (wizardState.productType) {
      const tile = wizardSection.querySelector(`.wz-option[data-product-type="${wizardState.productType}"]`);
      if (tile) tile.setAttribute("aria-checked", "true");
      if (wizardState.productType === "other" && wzOtherWrap) {
        wzOtherWrap.hidden = false;
        if (wzOtherInput) wzOtherInput.value = wizardState.otherText;
      }
    }
    if (wzAboutInput) wzAboutInput.value = wizardState.subject;
    if (wzAudienceInput) wzAudienceInput.value = wizardState.audience;
    if (wzBenefitInput) wzBenefitInput.value = wizardState.benefit;
  } catch { /* corrupted JSON — start fresh */ }
}

function composeWizardIdea() {
  let opener;
  if (wizardState.productType === "other") {
    // Strip any article the user already typed ("a Slack bot", "an API")
    // before we prepend our own, so we never produce "An a Slack bot".
    const txt = wizardState.otherText.trim().replace(/^(a|an|the)\s+/i, "");
    opener = txt ? `${articleFor(txt)} ${txt}` : "A product";
  } else {
    opener = productPhrases[wizardState.productType] || "A product";
  }
  const subject = wizardState.subject.trim();
  const audience = wizardState.audience.trim();
  const benefit = wizardState.benefit.trim();

  // First sentence: opener + the subject. The subject is the domain-bearing
  // noun ("an organic grocery store") — without it the kit can't tell retail
  // from real estate and falls back to a generic plan. Reads as
  // "A website for an organic grocery store."
  let s = opener;
  if (subject) s += ` for ${subject}`;
  s += ".";

  // Second sentence: the audience, phrased as "Built for X". This deliberately
  // hits the higher-priority "(built|made|designed|tailored) for" pattern in
  // the server's audience inference, so the subject's own "for …" clause in
  // sentence one is never mistaken for the audience. Benefit rides along.
  if (audience && benefit) {
    s += ` Built for ${audience}, it ${benefit}.`;
  } else if (audience) {
    s += ` Built for ${audience}.`;
  } else if (benefit) {
    s += ` It ${benefit}.`;
  }
  return s;
}

function isWizardStepValid(step) {
  if (step === 1) {
    if (wizardState.productType === null) return false;
    if (wizardState.productType === "other") return wizardState.otherText.trim().length > 0;
    return true;
  }
  if (step === 2) return wizardState.subject.trim().length > 0;   // what it's about (required)
  if (step === 3) return wizardState.audience.trim().length > 0;  // who it's for (required)
  if (step === 4) return true;  // benefit — optional
  if (step === 5) return true;  // ready to generate
  return false;
}

// Direction tracking for slide-transitions; set by gotoWizardStep before
// the panel switches. Initial render uses no direction (no animation).
let wizardLastStep = 0;

function renderWizard() {
  wzSteps.forEach((li) => {
    const n = Number(li.dataset.step);
    li.classList.toggle("active", n === wizardState.step);
    li.classList.toggle("done", n < wizardState.step);
    if (n === wizardState.step) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");
  });
  // Progress-bar fill: 0% before step 1 starts to count, 100% at the last
  // step. Computed from the live step count, so 5 steps land at
  // 0 / 25 / 50 / 75 / 100%.
  const stepCount = wzSteps.length || 4;
  const progress = stepCount <= 1 ? 100 : ((wizardState.step - 1) / (stepCount - 1)) * 100;
  const stepsList = wizardSection?.querySelector(".wizard-steps");
  if (stepsList) stepsList.style.setProperty("--progress", String(progress));

  // Direction-aware panel transition class.
  const direction = wizardLastStep === 0
    ? null
    : wizardState.step > wizardLastStep ? "panel-enter-forward" : "panel-enter-back";

  wzPanels.forEach((p) => {
    const isActive = Number(p.dataset.step) === wizardState.step;
    p.hidden = !isActive;
    // Reset both transition classes, then apply the new one if active.
    p.classList.remove("panel-enter-forward", "panel-enter-back");
    if (isActive && direction) {
      // Force reflow so the animation restarts.
      void p.offsetWidth;
      p.classList.add(direction);
    }
  });
  wizardLastStep = wizardState.step;
  wzBack.disabled = wizardState.step === 1;
  const lastStep = wzSteps.length || 5;
  if (wizardState.step === lastStep) {
    wzNext.hidden = true;
    wzGenerate.hidden = false;
  } else {
    wzNext.hidden = false;
    wzGenerate.hidden = true;
    wzNext.disabled = !isWizardStepValid(wizardState.step);
  }
  if (wizardState.step === lastStep) {
    wzSummary.textContent = composeWizardIdea();
    refreshWizardPreview();
  }
  // Move focus to the primary affordance of the new step.
  if (wizardState.step === 1) {
    const sel = wizardSection.querySelector(".wz-option[aria-checked='true']")
      || wizardSection.querySelector(".wz-option");
    sel?.focus({ preventScroll: true });
  } else if (wizardState.step === 2) {
    wzAboutInput.focus({ preventScroll: true });
  } else if (wizardState.step === 3) {
    wzAudienceInput.focus({ preventScroll: true });
  } else if (wizardState.step === 4) {
    wzBenefitInput.focus({ preventScroll: true });
  } else if (wizardState.step === lastStep) {
    wzGenerate.focus({ preventScroll: true });
  }
}

function gotoWizardStep(n) {
  const lastStep = wzSteps.length || 5;
  wizardState.step = Math.max(1, Math.min(lastStep, n));
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
      saveWizardState();
      // "Something else" expands a free-input field instead of advancing.
      if (wizardState.productType === "other") {
        if (wzOtherWrap) wzOtherWrap.hidden = false;
        wzNext.disabled = !isWizardStepValid(1);
        wzOtherInput?.focus({ preventScroll: true });
        return;
      }
      // Any other choice: collapse the free-input wrap if it was open, and auto-advance.
      if (wzOtherWrap) wzOtherWrap.hidden = true;
      wzNext.disabled = false;
      // Auto-advance briefly after the visual selection so the user sees the highlight.
      setTimeout(() => gotoWizardStep(2), 240);
    });
  });

  // Free-input for "Something else"
  wzOtherInput?.addEventListener("input", () => {
    wizardState.otherText = wzOtherInput.value;
    wzNext.disabled = !isWizardStepValid(1);
    saveWizardState();
  });
  wzOtherInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && isWizardStepValid(1)) {
      e.preventDefault();
      gotoWizardStep(2);
    }
  });

  wzAboutInput.addEventListener("input", () => {
    wizardState.subject = wzAboutInput.value;
    wzNext.disabled = !isWizardStepValid(wizardState.step);
    if (wzNudgeAbout) wzNudgeAbout.hidden = !isSparseInput(wzAboutInput.value);
    saveWizardState();
  });
  wizardSection.querySelectorAll("[data-fill-about]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wzAboutInput.value = btn.dataset.fillAbout;
      wizardState.subject = wzAboutInput.value;
      wzNext.disabled = !isWizardStepValid(wizardState.step);
      if (wzNudgeAbout) wzNudgeAbout.hidden = true;
      saveWizardState();
      wzAboutInput.focus();
    });
  });

  wzAudienceInput.addEventListener("input", () => {
    wizardState.audience = wzAudienceInput.value;
    wzNext.disabled = !isWizardStepValid(wizardState.step);
    if (wzNudgeAudience) wzNudgeAudience.hidden = !isSparseInput(wzAudienceInput.value);
    saveWizardState();
  });
  wizardSection.querySelectorAll("[data-fill-audience]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wzAudienceInput.value = btn.dataset.fillAudience;
      wizardState.audience = wzAudienceInput.value;
      wzNext.disabled = false;
      if (wzNudgeAudience) wzNudgeAudience.hidden = true;
      saveWizardState();
      wzAudienceInput.focus();
    });
  });

  wzBenefitInput.addEventListener("input", () => {
    wizardState.benefit = wzBenefitInput.value;
    if (wzNudgeBenefit) wzNudgeBenefit.hidden = !isSparseInput(wzBenefitInput.value);
    saveWizardState();
  });
  wizardSection.querySelectorAll("[data-fill-benefit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      wzBenefitInput.value = btn.dataset.fillBenefit;
      wizardState.benefit = wzBenefitInput.value;
      if (wzNudgeBenefit) wzNudgeBenefit.hidden = true;
      saveWizardState();
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

  function setMode(mode) {
    const isDirect = mode === "direct";
    if (wizardSection) wizardSection.hidden = isDirect;
    if (generatorSection) generatorSection.hidden = !isDirect;
    for (const tab of modeTabs) {
      const matches = tab.getAttribute("data-mode-set") === mode;
      tab.classList.toggle("is-active", matches);
      tab.setAttribute("aria-selected", matches ? "true" : "false");
    }
    if (isDirect) {
      ideaInput?.focus();
    } else {
      renderWizard();
    }
  }
  for (const tab of modeTabs) {
    tab.addEventListener("click", () => setMode(tab.getAttribute("data-mode-set")));
  }
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
if (wizardSection) {
  restoreWizardState();
  renderWizard();
  // After restore, refresh the "Next" enabled-state for whatever step
  // the wizard happens to be on (always step 1 on reload), so a
  // returning user can continue without re-clicking their tile.
  if (wzNext) wzNext.disabled = !isWizardStepValid(wizardState.step);
}

// Deep-link reader: a shared `?idea=...` URL skips the wizard, drops
// the idea into the direct form, and auto-runs the generate flow.
// This is the receiving half of the share-button loop.
(function handleDeepLinkIdea() {
  try {
    const params = new URLSearchParams(window.location.search);
    const idea = params.get("idea");
    if (!idea) return;
    const trimmed = idea.trim();
    if (!trimmed || trimmed.length > 500) return;
    // Switch from wizard to direct form for clarity, and update the
    // mode tabs so the user sees they landed in direct-input mode.
    if (wizardSection) wizardSection.hidden = true;
    if (generatorSection) generatorSection.hidden = false;
    for (const tab of document.querySelectorAll("[data-mode-set]")) {
      const matches = tab.getAttribute("data-mode-set") === "direct";
      tab.classList.toggle("is-active", matches);
      tab.setAttribute("aria-selected", matches ? "true" : "false");
    }
    if (ideaInput) {
      ideaInput.value = trimmed;
      ideaInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    // Wait a tick so the DOM is settled, then submit.
    setTimeout(() => form?.requestSubmit?.(), 50);
  } catch { /* malformed URL — ignore */ }
})();

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
