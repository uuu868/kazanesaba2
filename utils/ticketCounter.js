const fs = require('fs');
const path = require('path');

const COUNTER_FILE = path.join(__dirname, '..', 'data', 'ticketCounter.json');

function ensureFile() {
  const dataDir = path.dirname(COUNTER_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(COUNTER_FILE)) {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ counter: 0 }), 'utf8');
  }
}

function getNextNumber() {
  ensureFile();
  try {
    const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
    const currentNumber = data.counter || 0;
    const nextNumber = currentNumber + 1;
    
    // カウンターを保存
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ counter: nextNumber }), 'utf8');
    
    return currentNumber; // 0から始まる
  } catch (err) {
    console.error('[Ticket Counter] Error:', err);
    return 0;
  }
}

module.exports = {
  getNextNumber
};
