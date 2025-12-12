// content.js
console.log("LLM Safety content script loaded");
const DEBUG = true;
const RETRY_MS = 1500;
let composing = false;

function findPromptBox() {
  return document.querySelector("textarea, [contenteditable='true']");
}

function waitForPromptBox() {
  const box = findPromptBox();
  if (!box) return void setTimeout(waitForPromptBox, RETRY_MS);
  attachKeyListener(box);
  if (DEBUG) console.log("Interception listener attached.");
}
waitForPromptBox();

function keyHandler(e) {
  if (e.key === "Enter" && e.shiftKey) return;  // allow newline
  if (composing) return;                         // IME active
  if (e.key !== "Enter") return;

  e.preventDefault();
  const box = findPromptBox();
  const prompt = ("value" in box) ? box.value : box.innerText;
  chrome.runtime.sendMessage({ type: "SCAN_PROMPT", prompt });
  // optional: show mini “Analyzing…” overlay here
}

function attachKeyListener(box) {
  box.removeEventListener("keydown", keyHandler);
  box.addEventListener("keydown", keyHandler, true);
}

document.addEventListener("compositionstart", () => composing = true);
document.addEventListener("compositionend",   () => composing = false);

// Receive FINAL_PROMPT from background after popup decision
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type !== "FINAL_PROMPT") return;
  const final = msg.prompt || "";
  if (!final) return; // CANCEL

  const box = findPromptBox();
  if (!box) return;

  if ("value" in box) box.value = final;
  else box.innerText = final;

  box.dispatchEvent(new Event("input", { bubbles: true }));

  const sendBtn = document.querySelector('button[type="submit"], button[aria-label*="send" i]');
  if (sendBtn) sendBtn.click();
});
