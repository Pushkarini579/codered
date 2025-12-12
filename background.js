// background.js
console.log("LLM Safety Extension background loaded");

const RULES = {
  keywords: [
    { k: "hack", add: 30 },
    { k: "bypass", add: 25 },
    { k: "exploit", add: 25 },
    { k: "malware", add: 35 },
    { k: "dox", add: 35 },
  ],
  patterns: [{ re: /\bSQL\s*injection\b/i, add: 35 }, { re: /\bXSS\b/i, add: 20 }],
  max: 100, warn: 30, block: 70
};

function analyze(prompt) {
  let total = 0; const reasons = [];
  const lower = prompt.toLowerCase();
  for (const {k, add} of RULES.keywords) if (lower.includes(k)) { total += add; reasons.push({type:"keyword", keyword:k, add}); }
  for (const {re, add} of RULES.patterns) if (re.test(prompt)) { total += add; reasons.push({type:"pattern", pattern:re.source, add}); }
  total = Math.min(total, RULES.max);
  const sanitized = prompt
    .replace(/hack/gi, "ethically test")
    .replace(/exploit/gi, "vulnerability topic")
    .replace(/bypass/gi, "work around per policy");
  return { originalPrompt: prompt, sanitizedPrompt: sanitized, total, reasons };
}

let lastTabId = null;

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "SCAN_PROMPT") {
    lastTabId = sender?.tab?.id ?? lastTabId;
    const result = analyze(msg.prompt || "");
    // to popup
    chrome.runtime.sendMessage({ type: "SCAN_RESULT", result });
  }
  if (msg?.type === "USER_ACTION" && lastTabId != null) {
    // decide final text
    const action = msg.action;
    const chosen = action === "SANITIZE" ? (msg.prompt || "") :
                   action === "ALLOW"    ? (msg.prompt || "") :
                   ""; // CANCEL → empty; content.js will no-op
    chrome.tabs.sendMessage(lastTabId, { type: "FINAL_PROMPT", prompt: chosen });
  }
});
