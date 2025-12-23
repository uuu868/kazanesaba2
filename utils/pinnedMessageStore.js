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
 * チャンネルIDで固定メッセージを取得
 * @param {string} channelId - チャンネルID
 * @returns {Object|null} メッセージデータまたはnull
 */
function getPinnedMessage(channelId) {
  const data = readAll();
  return data[channelId] || null;
}

/**
 * メッセージIDで固定メッセージを取得
 * @param {string} messageId - メッセージID
 * @returns {Object|null} メッセージデータ（channelIdを含む）またはnull
 */
function getPinnedMessageByMessageId(messageId) {
  const data = readAll();
  for (const [channelId, messageData] of Object.entries(data)) {
    if (messageData.messageId === messageId) {
      return {
        ...messageData,
        channelId: channelId
      };
    }
  }
  return null;
}

/**
 * チャンネルIDまたはメッセージIDで固定メッセージを検索
 * @param {string} id - チャンネルIDまたはメッセージID
 * @returns {Object|null} メッセージデータ（channelIdを含む）またはnull
 */
function findPinnedMessage(id) {
  const data = readAll();
  
  // まずチャンネルIDとして検索
  if (data[id]) {
    return {
      ...data[id],
      channelId: id
    };
  }
  
  // 次にメッセージIDとして検索
  for (const [channelId, messageData] of Object.entries(data)) {
    if (messageData.messageId === id) {
      return {
        ...messageData,
        channelId: channelId
      };
    }
  }
  
  return null;
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
 * メッセージIDで固定メッセージを削除
 * @param {string} messageId - メッセージID
 * @returns {boolean} 削除成功ならtrue
 */
function deletePinnedMessageByMessageId(messageId) {
  const data = readAll();
  for (const [channelId, messageData] of Object.entries(data)) {
    if (messageData.messageId === messageId) {
      delete data[channelId];
      writeAll(data);
      console.log(`[Pinned Message Store] 削除: メッセージID ${messageId} (チャンネル ${channelId})`);
      return true;
    }
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

/**
 * 固定メッセージが存在するか確認（チャンネルIDまたはメッセージID）
 * @param {string} id - チャンネルIDまたはメッセージID
 * @returns {boolean} 存在すればtrue
 */
function hasPinnedMessage(id) {
  return findPinnedMessage(id) !== null;
}

module.exports = {
  savePinnedMessage,
  getPinnedMessage,
  getPinnedMessageByMessageId,
  findPinnedMessage,
  deletePinnedMessage,
  deletePinnedMessageByMessageId,
  getAllPinnedMessages,
  hasPinnedMessage
};
