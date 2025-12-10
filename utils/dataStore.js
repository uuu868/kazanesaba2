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
  const data = readAll();
  data[originalMessageId] = mapping;
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

module.exports = {
  saveMapping,
  getMapping,
  markDeleted
};
