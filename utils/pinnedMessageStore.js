const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const filePath = path.join(dataDir, 'pinnedMessages.json');

/**
 * データファイルの存在を確認・作成
 */
function ensureFile() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf8');
  }
}

/**
 * すべての固定メッセージデータを読み込む
 */
function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (err) {
    console.error('[Pinned Message Store] 読み込みエラー:', err);
    return {};
  }
}

/**
 * すべての固定メッセージデータを書き込む
 */
function writeAll(data) {
  ensureFile();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[Pinned Message Store] 書き込みエラー:', err);
  }
}

/**
 * 固定メッセージを保存
 * @param {string} channelId - チャンネルID
 * @param {Object} messageData - メッセージデータ
 * @param {string} messageData.messageId - メッセージID
 * @param {string} messageData.title - タイトル
 * @param {string} messageData.content - 内容
 * @param {string} messageData.color - カラーコード
 * @param {string} messageData.createdAt - 作成日時
 * @param {string} messageData.updatedAt - 更新日時
 */
function savePinnedMessage(channelId, messageData) {
  const data = readAll();
  data[channelId] = messageData;
  writeAll(data);
  console.log(`[Pinned Message Store] 保存: チャンネル ${channelId}`);
}

/**
 * 固定メッセージを取得
 * @param {string} channelId - チャンネルID
 * @returns {Object|null} メッセージデータまたはnull
 */
function getPinnedMessage(channelId) {
  const data = readAll();
  return data[channelId] || null;
}

/**
 * 固定メッセージを削除
 * @param {string} channelId - チャンネルID
 * @returns {boolean} 削除成功ならtrue
 */
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

/**
 * すべての固定メッセージを取得
 * @returns {Object} すべての固定メッセージデータ
 */
function getAllPinnedMessages() {
  return readAll();
}

module.exports = {
  savePinnedMessage,
  getPinnedMessage,
  deletePinnedMessage,
  getAllPinnedMessages
};
