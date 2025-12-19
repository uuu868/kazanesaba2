const fs = require('fs');
const path = require('path');

const activityFilePath = path.join(__dirname, '../data/voiceActivity.json');

/**
 * ボイスアクティビティデータを読み込む
 */
function loadVoiceActivity() {
  try {
    if (!fs.existsSync(activityFilePath)) {
      return {};
    }
    const data = fs.readFileSync(activityFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('ボイスアクティビティデータの読み込みエラー:', error);
    return {};
  }
}

/**
 * ボイスアクティビティデータを保存する
 */
function saveVoiceActivity(data) {
  try {
    fs.writeFileSync(activityFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('ボイスアクティビティデータの保存エラー:', error);
  }
}

/**
 * ユーザーのボイス参加を記録開始
 * @param {string} guildId - サーバーID
 * @param {string} userId - ユーザーID
 * @param {string} username - ユーザー名
 */
function startVoiceSession(guildId, userId, username) {
  const activity = loadVoiceActivity();
  
  if (!activity[guildId]) {
    activity[guildId] = {};
  }
  
  if (!activity[guildId][userId]) {
    activity[guildId][userId] = {
      username: username,
      totalTime: 0, // 秒単位
      sessions: []
    };
  }
  
  // 現在のセッション開始を記録
  activity[guildId][userId].username = username; // 名前を更新
  activity[guildId][userId].currentSessionStart = Date.now();
  
  saveVoiceActivity(activity);
}

/**
 * ユーザーのボイス退出を記録
 * @param {string} guildId - サーバーID
 * @param {string} userId - ユーザーID
 */
function endVoiceSession(guildId, userId) {
  const activity = loadVoiceActivity();
  
  if (!activity[guildId] || !activity[guildId][userId]) {
    return;
  }
  
  const userData = activity[guildId][userId];
  
  // セッション中の場合のみ処理
  if (userData.currentSessionStart) {
    const sessionDuration = Math.floor((Date.now() - userData.currentSessionStart) / 1000); // 秒
    userData.totalTime += sessionDuration;
    
    // セッション履歴に追加
    if (!userData.sessions) {
      userData.sessions = [];
    }
    userData.sessions.push({
      start: userData.currentSessionStart,
      end: Date.now(),
      duration: sessionDuration
    });
    
    // 直近100セッションのみ保持
    if (userData.sessions.length > 100) {
      userData.sessions = userData.sessions.slice(-100);
    }
    
    delete userData.currentSessionStart;
    saveVoiceActivity(activity);
  }
}

/**
 * サーバーのボイスアクティビティランキングを取得
 * @param {string} guildId - サーバーID
 * @param {number} limit - 取得する人数（デフォルト: 10）
 * @returns {Array} ランキング配列
 */
function getVoiceActivityRanking(guildId, limit = 10) {
  const activity = loadVoiceActivity();
  
  if (!activity[guildId]) {
    return [];
  }
  
  const ranking = Object.entries(activity[guildId])
    .map(([userId, data]) => {
      // 現在セッション中の時間も加算
      let totalTime = data.totalTime;
      if (data.currentSessionStart) {
        totalTime += Math.floor((Date.now() - data.currentSessionStart) / 1000);
      }
      
      return {
        userId,
        username: data.username,
        totalTime, // 秒
        sessionCount: data.sessions ? data.sessions.length : 0
      };
    })
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, limit);
  
  return ranking;
}

/**
 * 特定ユーザーのボイスアクティビティ情報を取得
 * @param {string} guildId - サーバーID
 * @param {string} userId - ユーザーID
 * @returns {Object|null} アクティビティ情報
 */
function getUserVoiceActivity(guildId, userId) {
  const activity = loadVoiceActivity();
  
  if (!activity[guildId] || !activity[guildId][userId]) {
    return null;
  }
  
  const data = activity[guildId][userId];
  let totalTime = data.totalTime;
  
  // 現在セッション中の時間も加算
  if (data.currentSessionStart) {
    totalTime += Math.floor((Date.now() - data.currentSessionStart) / 1000);
  }
  
  return {
    userId,
    username: data.username,
    totalTime,
    sessionCount: data.sessions ? data.sessions.length : 0,
    isInVoice: !!data.currentSessionStart
  };
}

/**
 * サーバーのボイスアクティビティデータをリセットする
 * @param {string} guildId - サーバーID
 */
function resetVoiceActivity(guildId) {
  const activity = loadVoiceActivity();
  
  if (activity[guildId]) {
    delete activity[guildId];
    saveVoiceActivity(activity);
    return true;
  }
  
  return false;
}

/**
 * 時間を人間が読める形式にフォーマット
 * @param {number} seconds - 秒数
 * @returns {string} フォーマットされた時間
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}時間`);
  if (minutes > 0) parts.push(`${minutes}分`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}秒`);
  
  return parts.join('');
}

module.exports = {
  startVoiceSession,
  endVoiceSession,
  getVoiceActivityRanking,
  getUserVoiceActivity,
  resetVoiceActivity,
  formatDuration
};
