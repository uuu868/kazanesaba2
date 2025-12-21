const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'copiedMediaMap.json');

function ensureFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}), 'utf8');
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (e) {
    return {};
  }
}

function writeAll(data) {
  ensureFile();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function saveMapping(originalMessageId, mapping) {
  // mapping: an object containing at least { copiedChannelId, copiedMessageId, ... }
  const data = readAll();
  const existing = data[originalMessageId];

  if (!existing) {
    // Normalize to store copiedMessageIds array
    const entry = Object.assign({}, mapping);
    entry.copiedMessageIds = mapping.copiedMessageIds || (mapping.copiedMessageId ? [mapping.copiedMessageId] : []);
    delete entry.copiedMessageId;
    data[originalMessageId] = entry;
  } else {
    // Merge: ensure copiedMessageIds array contains the new id
    if (!existing.copiedMessageIds) existing.copiedMessageIds = [];
    if (mapping.copiedMessageId && !existing.copiedMessageIds.includes(mapping.copiedMessageId)) {
      existing.copiedMessageIds.push(mapping.copiedMessageId);
    }
    // update other metadata (keep earliest createdAt)
    existing.copiedChannelId = existing.copiedChannelId || mapping.copiedChannelId;
    existing.attachmentCount = existing.attachmentCount || mapping.attachmentCount;
  }

  writeAll(data);
}

function getMapping(originalMessageId) {
  const data = readAll();
  return data[originalMessageId] || null;
}

function markDeleted(originalMessageId) {
  const data = readAll();
  if (data[originalMessageId]) {
    data[originalMessageId].deleted = true;
    data[originalMessageId].deletedAt = new Date().toISOString();
    writeAll(data);
  }
}

/**
 * 汎用データ読み込み関数
 */
function loadData(filename, defaultValue = {}) {
  const filePath = path.join(dataDir, `${filename}.json`);
  try {
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || JSON.stringify(defaultValue));
  } catch (e) {
    console.error(`[dataStore] loadData error for ${filename}:`, e);
    return defaultValue;
  }
}

/**
 * 汎用データ保存関数
 */
function saveData(filename, data) {
  const filePath = path.join(dataDir, `${filename}.json`);
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`[dataStore] saveData error for ${filename}:`, e);
  }
}

module.exports = {
  saveMapping,
  getMapping,
  markDeleted,
  loadData,
  saveData
};
