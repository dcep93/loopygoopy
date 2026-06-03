import { MessageType } from "./shared";

type DebugLevel = "log" | "warn";

let debugTabId: number | undefined;

export function setDebugTabId(tabId: number | undefined) {
  debugTabId = tabId;
}

export function debugLog(source: string, message: string, details?: Record<string, unknown>) {
  emitDebug("log", source, message, details);
}

export function debugWarn(source: string, message: string, details?: Record<string, unknown>) {
  emitDebug("warn", source, message, details);
}

function emitDebug(
  level: DebugLevel,
  source: string,
  message: string,
  details?: Record<string, unknown>
) {
  const prefix = `[LoopyGoopy ${source}]`;
  const formattedDetails = formatDetails(details);
  if (level === "warn") {
    console.warn(prefix, message, formattedDetails);
  } else {
    console.log(prefix, message, formattedDetails);
  }
  forwardDebugToContentScript(level, source, message, formattedDetails);
}

function forwardDebugToContentScript(
  level: DebugLevel,
  source: string,
  message: string,
  details: string
) {
  if (debugTabId === undefined || !window.chrome?.tabs?.sendMessage) return;
  window.chrome.tabs.sendMessage(
    debugTabId,
    {
      mType: MessageType.debug,
      payload: {
        level,
        source,
        message,
        details,
      },
    },
    () => {
      // Reading lastError prevents Chrome from treating a missing content script
      // as an unhandled extension error.
      void window.chrome?.runtime?.lastError;
    }
  );
}

function formatDetails(details?: Record<string, unknown>) {
  if (!details) return "";
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}
