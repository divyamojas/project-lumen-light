const MAX_LOGS = 120;
const MIN_LOGS_AFTER_PRESSURE = 20;

let listeners = new Set();
let sequence = 0;
let logs = [];
let activeCount = 0;
let pressureInfo = null;
let emitFrame = 0;

const emit = () => {
  if (typeof window === "undefined") {
    listeners.forEach((listener) => listener());
    return;
  }

  if (emitFrame) {
    return;
  }

  emitFrame = window.requestAnimationFrame(() => {
    emitFrame = 0;
    listeners.forEach((listener) => listener());
  });
};

const pushLog = (log) => {
  logs = [log, ...logs].slice(0, MAX_LOGS);
  emit();
};

const updateLog = (id, updater) => {
  let changed = false;

  logs = logs.map((log) => {
    if (log.id !== id) {
      return log;
    }

    changed = true;
    return updater(log);
  });

  if (changed) {
    emit();
  }
};

export const beginApiRequest = ({ method = "GET", url = "", source = "app", requestBody = null } = {}) => {
  const id = `req-${Date.now()}-${sequence += 1}`;
  activeCount += 1;
  pushLog({
    id,
    source,
    method,
    url,
    status: "pending",
    statusCode: null,
    startedAt: Date.now(),
    durationMs: null,
    requestBody,
    responseSnippet: null,
    errorMessage: "",
    errorCode: "",
  });
  return id;
};

export const finishApiRequest = (id, {
  status = "success",
  statusCode = null,
  errorMessage = "",
  errorCode = "",
  responseSnippet = null,
} = {}) => {
  activeCount = Math.max(0, activeCount - 1);
  updateLog(id, (log) => ({
    ...log,
    status,
    statusCode,
    durationMs: Date.now() - log.startedAt,
    responseSnippet,
    errorMessage,
    errorCode,
  }));
};

export const failApiRequest = (id, details = {}) => {
  finishApiRequest(id, {
    status: "error",
    ...details,
  });
};

export const clearApiMonitorLogs = () => {
  logs = [];
  activeCount = 0;
  pressureInfo = null;
  emit();
};

export const trimApiMonitorLogs = (keepCount = MIN_LOGS_AFTER_PRESSURE) => {
  const nextKeepCount = Math.max(0, keepCount);
  logs = logs.slice(0, nextKeepCount);
  emit();
};

export const reportMemoryPressure = ({ usedMB = null, limitMB = null, thresholdMB = null } = {}) => {
  pressureInfo = {
    at: Date.now(),
    usedMB,
    limitMB,
    thresholdMB,
  };
  trimApiMonitorLogs(MIN_LOGS_AFTER_PRESSURE);
};

export const subscribeApiMonitor = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getApiMonitorSnapshot = () => {
  return {
    activeCount,
    logs,
    pressureInfo,
  };
};

export default {
  beginApiRequest,
  finishApiRequest,
  failApiRequest,
  clearApiMonitorLogs,
  trimApiMonitorLogs,
  reportMemoryPressure,
  subscribeApiMonitor,
  getApiMonitorSnapshot,
};
