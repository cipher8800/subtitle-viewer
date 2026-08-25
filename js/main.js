const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const outputText = document.getElementById("outputText");
const copyBtn = document.getElementById("copyBtn");

let rawContent = "";
let currentFileName = "converted_subtitle.txt";

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

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

// File Processing
async function handleFile(file) {
  currentFileName = file.name.replace(/\.[^/.]+$/, "") + ".txt";

  rawContent = await getFileText(file)
  parseSubtitle()
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

  outputText.value = lines.join("\n");
}

function copyToCB() {
  if (!outputText.value) return;
  navigator.clipboard.writeText(outputText.value).then(() => {
    const originalText = copyBtn.innerText;
    copyBtn.innerText = "Copied!";
    setTimeout(() => (copyBtn.innerText = originalText), 1500);
  });
}

function downloadText() {
  const content = outputText.value;
  if (!content) return;

  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  download(url, currentFileName)
}
