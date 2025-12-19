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

/**
 * 実際のチケットチャンネル数を正確に数えて次の番号を返す
 * @param {Guild} guild - Discordサーバー
 * @returns {Promise<number>} - 次のチケット番号
 */
async function getNextNumber(guild) {
  if (!guild) {
    console.error('[Ticket Counter] Guildが提供されていません');
    return 0;
  }

  try {
    // 全てのチャンネルを取得
    const channels = await guild.channels.fetch();
    
    // ticket-で始まるチャンネルをフィルタリング
    const ticketChannels = channels.filter(channel => 
      channel && channel.name && channel.name.startsWith('ticket-')
    );
    
    console.log(`[Ticket Counter] 既存チケット数: ${ticketChannels.size}`);
    
    // 既存のチケット番号を全て抽出
    const existingNumbers = [];
    ticketChannels.forEach(channel => {
      const match = channel.name.match(/^ticket-(\d+)$/);
      if (match) {
        existingNumbers.push(parseInt(match[1], 10));
      }
    });
    
    // 最大値を見つける
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : -1;
    const nextNumber = maxNumber + 1;
    
    console.log(`[Ticket Counter] 次のチケット番号: ${nextNumber}`);
    
    // カウンターファイルも更新（バックアップ用）
    ensureFile();
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ 
      counter: nextNumber,
      lastUpdated: new Date().toISOString() 
    }), 'utf8');
    
    return nextNumber;
  } catch (err) {
    console.error('[Ticket Counter] Error:', err);
    // エラー時はフォールバック: ファイルから読み込む
    ensureFile();
    try {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      const fallbackNumber = (data.counter || 0);
      console.log(`[Ticket Counter] フォールバック番号を使用: ${fallbackNumber}`);
      return fallbackNumber;
    } catch (e) {
      console.error('[Ticket Counter] フォールバックも失敗:', e);
      return 0;
    }
  }
}

module.exports = {
  getNextNumber
};
