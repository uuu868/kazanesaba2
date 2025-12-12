const fs = require('fs');
const path = require('path');

const DEBUG_FILE = path.join(__dirname, '../data/debugMode.json');

let debugModeState = false;

function ensureDataDir() {
  const dataDir = path.dirname(DEBUG_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadDebugMode() {
  ensureDataDir();
  try {
    if (fs.existsSync(DEBUG_FILE)) {
      const data = JSON.parse(fs.readFileSync(DEBUG_FILE, 'utf8'));
      debugModeState = !!data.enabled;
    }
  } catch (err) {
    console.error('[DebugMode] Load error:', err);
    debugModeState = false;
  }
}

function saveDebugMode() {
  ensureDataDir();
  try {
    fs.writeFileSync(DEBUG_FILE, JSON.stringify({ enabled: debugModeState }, null, 2), 'utf8');
  } catch (err) {
    console.error('[DebugMode] Save error:', err);
  }
}

function isDebugMode() {
  return debugModeState;
}

function setDebugMode(enabled) {
  debugModeState = !!enabled;
  saveDebugMode();
}

// 初期化時にロード
loadDebugMode();

module.exports = {
  isDebugMode,
  setDebugMode
};
