const dropZone = document.getElementById("dropZone");
const outputEl = document.querySelector(".output-text");
const menuModal = document.querySelector(".menu-modal");
const previewTitleEl = document.querySelector(".preview .title");
const progressInput = document.querySelector(".progress-bar input");
const timeDisplay = document.querySelector(".time-display");
const historyModal = document.querySelector(".history-modal");

let currentFileName = "converted_subtitle.txt";
let outputText = "";
let currentSubtitles = [];
let duration = 0;
let currentTime = 0;
let activeSubtitleEl = null;
let currentCover = load("currentCover", null);
let historyItems = load("historyItems", []);

document.addEventListener("DOMContentLoaded", () => {
  updateCover();
  setInterval(() => {
    updateHistory();
  }, 1000);
});

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
  if (file) openFile(file);
});

menuModal.querySelectorAll(".items").forEach((el) => {
  el.addEventListener("click", () => toggleMenuModal(false));
});

progressInput.addEventListener("input", (e) => {
  if (!outputText) return;
  currentTime = e.target.value;
  updateUI();
});

progressInput.addEventListener("change", (e) => {
  if (outputText) seekTo(e.target.value);
  toggleMenuModal(false);
});

outputEl.addEventListener("scroll", () => {
  const maxScroll = outputEl.scrollHeight - outputEl.clientHeight;
  const normalizedScroll = maxScroll > 0 ? roundFloat(outputEl.scrollTop / maxScroll) : 0;

  currentTime = duration * normalizedScroll;
  progressInput.value = currentTime;
  updateUI();
});

async function openFile(file) {
  const fileName = file.name.replace(/\.[^/.]+$/, "") + ".txt";

  const historyItemIndex = historyItems.findIndex((item) => item.title === fileName);
  if (historyItemIndex !== -1) {
    loadFromHistory(historyItemIndex);
    return;
  }

  currentFileName = fileName;
  currentTime = 0;
  const text = await getFileText(file);
  parseSubtitle(text);
  displaySubtitle();
  updateHistory();
}

function loadFromHistory(index) {
  const historyItem = historyItems[index];

  currentFileName = historyItem.title;
  currentSubtitles = historyItem.subtitles;
  currentTime = historyItem.time;

  extractSubtitles();
  displaySubtitle();
  toggleHistoryModal(false);
}

function displaySubtitle() {
  dropZone.classList.add("hidden");
  previewTitleEl.textContent = currentFileName;
  updateUI();
  seekTo(currentTime);
}

function updateUI() {
  timeDisplay.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
  document.querySelector(".subtitle.active")?.classList.remove("active");
  activeSubtitleEl?.classList.add("active");
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
      const isStandardLine = /\[.*\]|heat\./i.test(textLines[0]);
      if (isStandardLine) {
        currentSubtitles.push({
          startTime,
          endTime,
          text: textLines.join(" "),
        });
      }
    }
  });

  extractSubtitles();
}

function extractSubtitles() {
  // Render HTML with timestamps and line break output for plain text export
  outputEl.innerHTML = currentSubtitles.map((sub) => `<p class="subtitle" data-start-time="${sub.startTime}" data-end-time="${sub.endTime}">${sub.text}</p>`).join("");

  // Plain-text formatted version for copying/downloading
  outputText = currentSubtitles.map((sub) => sub.text).join("\n");

  duration = currentSubtitles[currentSubtitles.length - 1].endTime;
  progressInput.max = duration;
}

function seekTo(seconds) {
  if (!outputText) return;
  const subtitle = currentSubtitles.find((subtitle) => subtitle.startTime >= seconds - 10);
  if (!subtitle) return;

  const subtitleEl = document.querySelector(`[data-start-time="${subtitle.startTime}"]`);
  subtitleEl.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });

  if (seconds > 0) activeSubtitleEl = subtitleEl;

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

async function changeCover(file) {
  if (!file) return;

  try {
    currentCover = await getFileDataUrl(file);
    save("currentCover", currentCover);
    updateCover();
  } catch (error) {
    Toast.show(error);
  }
}

function updateCover() {
  if (!currentCover) return;
  document.body.style.background = `
    var(--overlay-gradient),
    url("${dataURLtoBlobURL(currentCover)}")
    center / cover no-repeat
  `;
}

function toggleHistoryModal(force) {
  const shouldHide = force !== undefined ? !force : undefined;
  historyModal.classList.toggle("hidden", shouldHide);

  updateHistoryModal();
}

function updateHistoryModal() {
  const itemsEl = historyModal.querySelector(".items");
  itemsEl.innerHTML =
    historyItems.length > 0
      ? historyItems
          .map(
            (item, i) => `
    <div class="truncated" onclick="loadFromHistory(${i})">${item.title}</div>
  `,
          )
          .join("")
      : "No history";
}

function updateHistory() {
  if (!outputText) return;

  const historyItem = historyItems.find((item) => item.title === currentFileName);

  const newItem = {
    title: currentFileName,
    subtitles: currentSubtitles,
    time: currentTime,
  };

  if (historyItem) {
    Object.assign(historyItem, newItem);
  } else {
    historyItems.unshift(newItem);

    if (historyItems.length > 5) {
      historyItems.pop();
    }
  }

  save("historyItems", historyItems);
}

function scrollOutputEl() {
  outputEl.scrollBy({
    top: 50,
    left: 0,
    behavior: "smooth",
  });
}

const keyActions = {
  Space: scrollOutputEl,
  KeyF: toggleFullscreen,
};

document.addEventListener(
  "keydown",
  (event) => {
    const action = keyActions[event.code];
    if (action) {
      event.preventDefault();
      action();
    }
  },
  true,
);
