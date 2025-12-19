const fs = require('fs');
const path = require('path');

const activityFilePath = path.join(__dirname, '../data/activity.json');

/**
 * アクティビティデータを読み込む
 */
function loadActivity() {
  try {
    if (!fs.existsSync(activityFilePath)) {
      return {};
    }
    const data = fs.readFileSync(activityFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('アクティビティデータの読み込みエラー:', error);
    return {};
  }
}

/**
 * アクティビティデータを保存する
 */
function saveActivity(data) {
  try {
    fs.writeFileSync(activityFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('アクティビティデータの保存エラー:', error);
  }
}

/**
 * ユーザーのメッセージ数を記録する
 * @param {string} guildId - サーバーID
 * @param {string} userId - ユーザーID
 * @param {string} username - ユーザー名
 */
function recordMessage(guildId, userId, username) {
  const activity = loadActivity();
  
  if (!activity[guildId]) {
    activity[guildId] = {};
  }
  
  if (!activity[guildId][userId]) {
    activity[guildId][userId] = {
      username: username,
      messageCount: 0,
      lastMessageAt: null
    };
  }
  
  activity[guildId][userId].messageCount++;
  activity[guildId][userId].username = username; // 名前を更新
  activity[guildId][userId].lastMessageAt = new Date().toISOString();
  
  saveActivity(activity);
}

/**
 * サーバーのアクティビティランキングを取得する
 * @param {string} guildId - サーバーID
 * @param {number} limit - 取得する人数（デフォルト: 10）
 * @returns {Array} ランキング配列
 */
function getActivityRanking(guildId, limit = 10) {
  const activity = loadActivity();
  
  if (!activity[guildId]) {
    return [];
  }
  
  const ranking = Object.entries(activity[guildId])
    .map(([userId, data]) => ({
      userId,
      username: data.username,
      messageCount: data.messageCount,
      lastMessageAt: data.lastMessageAt
    }))
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, limit);
  
  return ranking;
}

/**
 * 特定ユーザーのアクティビティ情報を取得する
 * @param {string} guildId - サーバーID
 * @param {string} userId - ユーザーID
 * @returns {Object|null} アクティビティ情報
 */
function getUserActivity(guildId, userId) {
  const activity = loadActivity();
  
  if (!activity[guildId] || !activity[guildId][userId]) {
    return null;
  }
  
  return {
    userId,
    ...activity[guildId][userId]
  };
}

/**
 * サーバーのアクティビティデータをリセットする
 * @param {string} guildId - サーバーID
 */
function resetActivity(guildId) {
  const activity = loadActivity();
  
  if (activity[guildId]) {
    delete activity[guildId];
    saveActivity(activity);
    return true;
  }
  
  return false;
}

module.exports = {
  recordMessage,
  getActivityRanking,
  getUserActivity,
  resetActivity
};
