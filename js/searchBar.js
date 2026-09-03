const SearchBar = (() => {
  const element = document.querySelector(".search-bar");
  const textInput = element.querySelector("input");
  const matchCounter = element.querySelector(".counter");
  const prevBtn = element.querySelector(".prev-btn");
  const nextBtn = element.querySelector(".next-btn");
  const closeBtn = element.querySelector(".close-btn");

  let matches = [];
  let currentIndex = -1;

  function clearHighlights() {
    const highlights = outputEl.querySelectorAll("mark.highlight");
    highlights.forEach((node) => {
      const parent = node.parentNode;
      parent.replaceChild(document.createTextNode(node.textContent), node);
      parent.normalize();
    });
    matches = [];
    currentIndex = -1;
    updateCounter();
  }

  function updateCounter() {
    if (matches.length === 0) {
      matchCounter.textContent = "0/0";
    } else {
      matchCounter.textContent = `${currentIndex + 1}/${matches.length}`;
    }
  }

  function highlightMatches(searchTerm) {
    clearHighlights();
    if (!searchTerm.trim()) return;

    const walker = document.createTreeWalker(outputEl, NodeFilter.SHOW_TEXT, null, false);
    const textNodes = [];

    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    textNodes.forEach((node) => {
      const text = node.nodeValue;
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
      if (regex.test(text)) {
        const fragment = document.createDocumentFragment();
        let lastIdx = 0;

        text.replace(regex, (match, p1, offset) => {
          fragment.appendChild(document.createTextNode(text.substring(lastIdx, offset)));
          const mark = document.createElement("mark");
          mark.className = "highlight";
          mark.textContent = match;
          fragment.appendChild(mark);
          matches.push(mark);
          lastIdx = offset + match.length;
        });

        fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
        node.parentNode.replaceChild(fragment, node);
      }
    });

    if (matches.length > 0) {
      currentIndex = 0;
      setActiveMatch();
    }
  }

  function setActiveMatch() {
    matches.forEach((el, index) => {
      el.classList.toggle("active", index === currentIndex);
    });

    if (matches[currentIndex]) {
      matches[currentIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateCounter();
  }

  // Event Listeners
  textInput.addEventListener("input", (e) => highlightMatches(e.target.value));

  function searchNext() {
    if (matches.length === 0) return;
    currentIndex = (currentIndex + 1) % matches.length;
    setActiveMatch();
  }

  function searchPrev() {
    if (matches.length === 0) return;
    currentIndex = (currentIndex - 1 + matches.length) % matches.length;
    setActiveMatch();
  }

  function toggle(force) {
    const shouldHide = force !== undefined ? !force : undefined
    textInput.value = "";
    clearHighlights();
    element.classList.toggle("hidden", shouldHide);
    if (!shouldHide) textInput.focus()
  }

  return { searchNext, searchPrev, toggle };
})();
