const historyManager = (() => {
  const maxItems = 50;

  function loadHistory(key) {
    const data = load(key, [])
    return data
  }

  function saveHistory(key, data) {
    save(storageKey, JSON.stringify(data));
  }

  // Active state initialized from localStorage
  let history = loadHistory();

  return {
    /**
     * Add or update an item. Re-viewed items bump to the top.
     * @param {Object} item - Must contain a unique `id`.
     */
    addItem(item) {
      if (!item || !item.id) {
        throw new Error('Item must be an object with a unique "id" property.');
      }

      // Remove duplicate
      history = history.filter((existingItem) => existingItem.id !== item.id);

      // Add new record to start
      const record = {
        ...item,
        watchedAt: new Date().toISOString(),
      };
      history.unshift(record);

      // Enforce limit
      if (history.length > maxItems) {
        history = history.slice(0, maxItems);
      }

      saveHistory(history);
      return record;
    },

    // Read all items (returns a shallow copy)
    getHistory() {
      return [...history];
    },

    // Read single item by ID
    getItem(id) {
      return history.find((item) => item.id === id) || null;
    },

    // Remove single item by ID
    removeItem(id) {
      const initialLength = history.length;
      history = history.filter((item) => item.id !== id);

      if (history.length !== initialLength) {
        saveHistory(history);
        return true;
      }
      return false;
    },

    // Clear everything
    clearHistory() {
      history = [];
      localStorage.removeItem(storageKey);
    },
  };
})();
