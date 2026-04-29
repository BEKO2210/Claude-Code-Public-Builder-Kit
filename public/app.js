const form = document.getElementById("generate-form");
const ideaInput = document.getElementById("idea");
const persistInput = document.getElementById("persist");
const submitBtn = document.getElementById("submit");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const projectName = document.getElementById("project-name");
const projectMeta = document.getElementById("project-meta");
const writtenTo = document.getElementById("written-to");
const fileList = document.getElementById("file-list");
const activePath = document.getElementById("active-path");
const fileContent = document.getElementById("file-content");
const copyBtn = document.getElementById("copy");

let currentFiles = [];
let activeIndex = -1;

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function renderFileList() {
  fileList.innerHTML = "";
  currentFiles.forEach((file, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = file.path;
    btn.className = i === activeIndex ? "active" : "";
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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const idea = ideaInput.value.trim();
  if (!idea) {
    setStatus("Enter an idea first.", true);
    return;
  }
  submitBtn.disabled = true;
  setStatus("Generating…");

  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, persist: persistInput.checked })
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "Generation failed.", true);
      return;
    }

    currentFiles = data.files;
    activeIndex = 0;
    projectName.textContent = data.context.projectName;
    projectMeta.textContent = `${data.context.productType} · ${data.context.audience} · ${data.context.domain} · slug: ${data.context.slug}`;
    writtenTo.textContent = data.writtenTo ? `Written to: ${data.writtenTo}` : "";
    resultEl.hidden = false;
    renderFileList();
    selectFile(0);
    setStatus(`Generated ${currentFiles.length} files.`);
  } catch (err) {
    setStatus(err.message || "Network error.", true);
  } finally {
    submitBtn.disabled = false;
  }
});
