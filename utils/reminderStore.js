const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'reminders.json');

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

function saveReminder(reminder) {
  // reminder must have id
  if (!reminder || !reminder.id) throw new Error('Reminder must have id');
  const data = readAll();
  data[reminder.id] = reminder;
  writeAll(data);
}

function deleteReminder(id) {
  const data = readAll();
  if (data[id]) {
    delete data[id];
    writeAll(data);
  }
}

function getReminder(id) {
  const data = readAll();
  return data[id] || null;
}

function getAllReminders() {
  const data = readAll();
  return Object.values(data);
}

module.exports = {
  saveReminder,
  deleteReminder,
  getReminder,
  getAllReminders
};
