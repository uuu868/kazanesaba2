const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'pinnedMessages.json');

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
    console.error('[Pinned Message Store] 読み込みエラー:', e);
    return {};
  }
}

function writeAll(data) {
  ensureFile();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[Pinned Message Store] 書き込みエラー:', e);
  }
}

// 固定メッセージ情報を保存
function savePinnedMessage(channelId, messageId, title, content) {
  const data = readAll();
  data[channelId] = {
    messageId: messageId,
    title: title,
    content: content,
    updatedAt: new Date().toISOString()
  };
  writeAll(data);
  console.log(`[Pinned Message Store] 保存: チャンネル ${channelId} => メッセージ ${messageId}`);
}

// 固定メッセージ情報を取得
function getPinnedMessage(channelId) {
  const data = readAll();
  return data[channelId] || null;
}

// 固定メッセージ情報を削除
function deletePinnedMessage(channelId) {
  const data = readAll();
  if (data[channelId]) {
    delete data[channelId];
    writeAll(data);
    console.log(`[Pinned Message Store] 削除: チャンネル ${channelId}`);
    return true;
  }
  return false;
}

// すべての固定メッセージ情報を取得（起動時のロード用）
function getAllPinnedMessages() {
  return readAll();
}

module.exports = {
  savePinnedMessage,
  getPinnedMessage,
  deletePinnedMessage,
  getAllPinnedMessages
};
