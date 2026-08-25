const dropZone = document.getElementById("dropZone");
const outputTextEl = document.querySelector(".output-text");
const menuModal = document.querySelector(".menu-modal");
const previewTitleEl = document.querySelector(".preview .title");

let rawContent = "";
let currentFileName = "converted_subtitle.txt";
let outputText = "";

// Drag and Drop listeners
["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

menuModal.querySelectorAll(".items").forEach((el) => {
  el.addEventListener("click", ()=> toggleMenuModal(false));
});

// File Processing
async function handleFile(file) {
  currentFileName = file.name.replace(/\.[^/.]+$/, "") + ".txt";

  rawContent = await getFileText(file);
  parseSubtitle();
  dropZone.classList.add("hidden");
  previewTitleEl.textContent = file.name;
}

// Core Parsing Logic
function parseSubtitle() {
  if (!rawContent) return;

  // 1. Normalize line endings
  let text = rawContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove WebVTT headers / metadata
  text = text.replace(/^WEBVTT.*$/gm, "");
  text = text.replace(/^Kind:.*$/gm, "");
  text = text.replace(/^Language:.*$/gm, "");

  // 3. Remove timestamps (SRT: 00:00:00,000 --> 00:00:00,000 | VTT: 00:00:00.000 --> 00:00:00.000)
  text = text.replace(/\d{1,2}:\d{2}:\d{2}[\.,]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[\.,]\d{3}.*/g, "");
  text = text.replace(/\d{2}:\d{2}[\.,]\d{3}\s*-->\s*\d{2}:\d{2}[\.,]\d{3}.*/g, "");

  // 4. Remove inline HTML/VTT style tags (e.g., <i>...</i>, <c>...</c>)
  text = text.replace(/<[^>]*>/g, "");

  // 5. Split into lines and filter out cue numbers and blank lines
  let lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^\d+$/.test(line));

  outputText = lines.join("<br>");
  outputTextEl.innerHTML = outputText;
}

async function copyToCB() {
  if (!outputText) return;
  await navigator.clipboard.writeText(outputText);
  Toast.show("Text copied to clipboard");
}

function downloadText() {
  const content = outputText;
  if (!content) return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  download(url, currentFileName);
}

function toggleMenuModal(force) {
  const shouldHide = force !== undefined ? !force : undefined;
  menuModal.classList.toggle("hidden", shouldHide);
}
