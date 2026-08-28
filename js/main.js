const dropZone = document.getElementById("dropZone");
const outputTextEl = document.querySelector(".output-text");
const menuModal = document.querySelector(".menu-modal");
const previewTitleEl = document.querySelector(".preview .title");
const progressInput = document.querySelector(".progress-bar input");
const timeDisplay = document.querySelector(".time-display");

let currentFileName = "converted_subtitle.txt";
let outputText = "";
let currentSubtitles = [];
let duration = 0;
let currentTime = 0;

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
  el.addEventListener("click", () => toggleMenuModal(false));
});

progressInput.addEventListener("input", (e) => {
  if (!outputText) return
  currentTime = e.target.value
  updateUI()
})

progressInput.addEventListener("change", (e) => {
  if (outputText) seekTo(e.target.value)
  toggleMenuModal(false);
});

outputTextEl.addEventListener("scroll", () => {
  const maxScroll = outputTextEl.scrollHeight - outputTextEl.clientHeight;
  const normalizedScroll = maxScroll > 0 ? roundFloat(outputTextEl.scrollTop / maxScroll) : 0;

  currentTime = duration * normalizedScroll;
  progressInput.value = currentTime;
  updateUI();
});

// File Processing
async function handleFile(file) {
  currentFileName = file.name.replace(/\.[^/.]+$/, "") + ".txt";

  const text = await getFileText(file);
  parseSubtitle(text);
  dropZone.classList.add("hidden");
  previewTitleEl.textContent = file.name;
  updateUI()
}

function updateUI() {
  timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
}

// Convert "HH:MM:SS,ms" or "MM:SS.ms" to seconds
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.trim().replace(",", ".").split(":");

  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
  }
  return 0;
}

// Core Parsing Logic
function parseSubtitle(rawText) {
  if (!rawText) return;

  // 1. Normalize line endings
  let text = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 2. Remove WebVTT headers / metadata
  text = text.replace(/^WEBVTT.*$/gm, "");
  text = text.replace(/^Kind:.*$/gm, "");
  text = text.replace(/^Language:.*$/gm, "");

  // 3. Break into cue blocks
  const blocks = text.split(/\n\s*\n/);
  currentSubtitles = [];

  const timeRegex = /((\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})\s*-->\s*((\d{1,2}:)?\d{2}:\d{2}[\.,]\d{3})/;

  blocks.forEach((block) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    let startTime = 0;
    let endTime = 0;
    let textLines = [];

    lines.forEach((line) => {
      // Check if line is a timestamp line
      const match = line.match(timeRegex);
      if (match) {
        startTime = parseTimeToSeconds(match[1]);
        endTime = parseTimeToSeconds(match[3]);
      } else if (!/^\d+$/.test(line)) {
        // Strip inline HTML tags (e.g. <i>...</i>)
        const cleanText = line.replace(/<[^>]*>/g, "");
        if (cleanText) textLines.push(cleanText);
      }
    });

    if (textLines.length > 0) {
      currentSubtitles.push({
        startTime,
        endTime,
        text: textLines.join(" "),
      });
    }
  });

  // 4. Render HTML with timestamps and line break output for plain text export
  outputTextEl.innerHTML = currentSubtitles.map((sub) => `<p class="subtitle" data-start-time="${sub.startTime}" data-end-time="${sub.endTime}">${sub.text}</p>`).join("");

  // Plain-text formatted version for copying/downloading
  outputText = currentSubtitles.map((sub) => sub.text).join("\n");

  duration = currentSubtitles[currentSubtitles.length - 1].endTime;
  progressInput.max = duration;
}

// Time seeking function
function seekTo(seconds) {
  if (!outputText) return;
  const subtitle = currentSubtitles.find((subtitle) => subtitle.startTime >= seconds - 5);
  if (!subtitle) return;

  const subtitleEl = document.querySelector(`[data-start-time="${subtitle.startTime}"]`);
  subtitleEl.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  updateUI();
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
