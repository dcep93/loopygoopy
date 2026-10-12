"use strict";
(() => {
  // src/practice/migrationDocument.ts
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.target !== "record-migration" || message.type !== "read-legacy-records" || sender.id !== chrome.runtime.id) return;
    try {
      const records = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key.startsWith("loopy-goopy:")) continue;
        try {
          const record = JSON.parse(localStorage.getItem(key));
          if (record?.version === "v0.0.2" && key === `loopy-goopy:${record.media?.id}`) records[key] = record;
        } catch {
        }
      }
      reply({ records });
    } catch {
      reply({ error: "Original settings are unavailable." });
    }
  });
})();
