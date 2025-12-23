const crypto = require('crypto');

// メッセージのハッシュを保存するマップ（メモリ内キャッシュ）
// 構造: { userId: { hash: timestamp, ... } }
const userMessageCache = new Map();

// 設定
const DUPLICATE_CHECK_WINDOW = 30000; // 30秒以内の重複を検出
const MAX_CACHE_SIZE = 1000; // ユーザーごとの最大キャッシュサイズ
const CACHE_CLEANUP_INTERVAL = 60000; // 60秒ごとにクリーンアップ

/**
 * メッセージのハッシュを生成
 * @param {Object} message - Discordメッセージオブジェクト
 * @returns {string} メッセージのハッシュ値
 */
function generateMessageHash(message) {
  const content = message.content || '';
  const attachments = Array.from(message.attachments.values())
    .map(a => `${a.name}:${a.size}`)
    .sort()
    .join('|');
  
  const embeds = message.embeds
    .map(e => `${e.title || ''}:${e.description || ''}`)
    .join('|');
  
  const combined = `${content}|||${attachments}|||${embeds}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * 重複メッセージをチェック
 * @param {Object} message - Discordメッセージオブジェクト
 * @returns {Object} { isDuplicate: boolean, timeSince: number }
 */
function checkDuplicate(message) {
  const userId = message.author.id;
  const messageHash = generateMessageHash(message);
  const now = Date.now();

  // ユーザーのキャッシュを取得または作成
  if (!userMessageCache.has(userId)) {
    userMessageCache.set(userId, new Map());
  }

  const userCache = userMessageCache.get(userId);

  // 古いエントリをクリーンアップ
  for (const [hash, timestamp] of userCache.entries()) {
    if (now - timestamp > DUPLICATE_CHECK_WINDOW) {
      userCache.delete(hash);
    }
  }

  // キャッシュサイズ制限
  if (userCache.size > MAX_CACHE_SIZE) {
    const oldestHash = userCache.keys().next().value;
    userCache.delete(oldestHash);
  }

  // 重複チェック
  if (userCache.has(messageHash)) {
    const lastTimestamp = userCache.get(messageHash);
    const timeSince = now - lastTimestamp;
    
    if (timeSince < DUPLICATE_CHECK_WINDOW) {
      return {
        isDuplicate: true,
        timeSince: timeSince,
        remainingTime: DUPLICATE_CHECK_WINDOW - timeSince
      };
    }
  }

  // 新しいメッセージを記録
  userCache.set(messageHash, now);

  return {
    isDuplicate: false,
    timeSince: 0,
    remainingTime: 0
  };
}

/**
 * 重複メッセージを処理（削除して警告）
 * @param {Object} message - Discordメッセージオブジェクト
 * @param {number} remainingTime - 残り待機時間（ミリ秒）
 */
async function handleDuplicate(message, remainingTime) {
  try {
    const seconds = Math.ceil(remainingTime / 1000);
    
    // メッセージを削除
    await message.delete();
    
    // DMで警告を送信
    try {
      await message.author.send(
        `⚠️ **重複投稿が検出されました**\n\n` +
        `同じ内容のメッセージを短時間に投稿することはできません。\n` +
        `**サーバー**: ${message.guild.name}\n` +
        `**チャンネル**: ${message.channel.name}\n` +
        `**あと ${seconds} 秒後に再投稿できます。**`
      );
    } catch (dmErr) {
      // DMが送れない場合は、チャンネルに一時的なメッセージを送信
      const warning = await message.channel.send(
        `⚠️ ${message.author} 重複投稿が検出されました。あと${seconds}秒後に再投稿できます。`
      );
      
      // 5秒後に警告メッセージを削除
      setTimeout(() => {
        warning.delete().catch(() => {});
      }, 5000);
    }

    console.log(
      `[Duplicate Check] 重複投稿を削除: ` +
      `ユーザー ${message.author.tag} (${message.author.id}), ` +
      `チャンネル ${message.channel.name}, ` +
      `残り待機時間 ${seconds}秒`
    );

  } catch (err) {
    console.error('[Duplicate Check] 重複メッセージの処理エラー:', err);
  }
}

/**
 * 特定のユーザーのキャッシュをクリア
 * @param {string} userId - ユーザーID
 */
function clearUserCache(userId) {
  userMessageCache.delete(userId);
  console.log(`[Duplicate Check] ユーザー ${userId} のキャッシュをクリア`);
}

/**
 * 全てのキャッシュをクリア
 */
function clearAllCache() {
  userMessageCache.clear();
  console.log('[Duplicate Check] 全てのキャッシュをクリア');
}

/**
 * 古いキャッシュを定期的にクリーンアップ
 */
function startCacheCleanup() {
  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [userId, userCache] of userMessageCache.entries()) {
      for (const [hash, timestamp] of userCache.entries()) {
        if (now - timestamp > DUPLICATE_CHECK_WINDOW * 2) {
          userCache.delete(hash);
          cleanedCount++;
        }
      }

      // ユーザーのキャッシュが空になったら削除
      if (userCache.size === 0) {
        userMessageCache.delete(userId);
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Duplicate Check] ${cleanedCount}件の古いキャッシュをクリーンアップ`);
    }
  }, CACHE_CLEANUP_INTERVAL);

  console.log('[Duplicate Check] 自動クリーンアップを開始しました');
}

/**
 * キャッシュの統計情報を取得
 * @returns {Object} 統計情報
 */
function getCacheStats() {
  let totalEntries = 0;
  for (const userCache of userMessageCache.values()) {
    totalEntries += userCache.size;
  }

  return {
    users: userMessageCache.size,
    totalEntries: totalEntries,
    memoryUsage: process.memoryUsage().heapUsed
  };
}

module.exports = {
  checkDuplicate,
  handleDuplicate,
  clearUserCache,
  clearAllCache,
  startCacheCleanup,
  getCacheStats,
  DUPLICATE_CHECK_WINDOW
};
