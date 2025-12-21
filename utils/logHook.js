const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

// config.jsonからログチャンネルIDを読み込む
const configPath = path.join(__dirname, '..', 'config.json');

let client = null;
let logQueue = [];
let isProcessing = false;

// 元のconsoleメソッドを保存
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

function getLogChannelId() {
  try {
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.logChannelId || null;
  } catch (e) {
    originalConsole.error('config.jsonの読み込みエラー:', e);
    return null;
  }
}

/**
 * ログをDiscordに送信
 */
async function sendLogToDiscord(type, args) {
  if (!client || !client.isReady()) return;

  const logChannelId = getLogChannelId();
  if (!logChannelId) return;

  try {
    const channel = await client.channels.fetch(logChannelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      originalConsole.error('ログチャンネルが見つからないか、テキストチャンネルではありません');
      return;
    }

    // ログメッセージを整形
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    // タイプに応じて色を変える
    const colors = {
      log: 0x5865F2,    // 青
      error: 0xED4245,  // 赤
      warn: 0xFEE75C,   // 黄
      info: 0x57F287,   // 緑
      debug: 0x99AAB5   // グレー
    };

    // タイプに応じた絵文字
    const emojis = {
      log: '📝',
      error: '❌',
      warn: '⚠️',
      info: 'ℹ️',
      debug: '🐛'
    };

    const embed = new EmbedBuilder()
      .setColor(colors[type] || colors.log)
      .setTitle(`${emojis[type] || '📋'} ${type.toUpperCase()}`)
      .setDescription(message.length > 4000 ? message.substring(0, 4000) + '...' : message)
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    // ログ送信エラーは元のconsoleに出力（無限ループ防止）
    originalConsole.error('ログ送信エラー:', error);
  }
}

/**
 * キューを処理
 */
async function processQueue() {
  if (isProcessing || logQueue.length === 0) return;
  
  isProcessing = true;
  
  while (logQueue.length > 0) {
    const item = logQueue.shift();
    await sendLogToDiscord(item.type, item.args);
    // レート制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  isProcessing = false;
}

/**
 * ログをキューに追加
 */
function queueLog(type, args) {
  logQueue.push({ type, args });
  processQueue();
}

/**
 * ログフックを初期化
 */
function initLogHook(discordClient) {
  client = discordClient;

  // console.log をオーバーライド
  console.log = function(...args) {
    originalConsole.log(...args);
    queueLog('log', args);
  };

  // console.error をオーバーライド
  console.error = function(...args) {
    originalConsole.error(...args);
    queueLog('error', args);
  };

  // console.warn をオーバーライド
  console.warn = function(...args) {
    originalConsole.warn(...args);
    queueLog('warn', args);
  };

  // console.info をオーバーライド
  console.info = function(...args) {
    originalConsole.info(...args);
    queueLog('info', args);
  };

  // console.debug をオーバーライド
  console.debug = function(...args) {
    originalConsole.debug(...args);
    queueLog('debug', args);
  };

  originalConsole.log('✅ ログフック機能が初期化されました');
}

/**
 * カスタムログ関数（Discordにのみ送信）
 */
function logToDiscordOnly(type, ...args) {
  queueLog(type, args);
}

module.exports = {
  initLogHook,
  logToDiscordOnly,
  originalConsole
};
