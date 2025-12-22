const cron = require('node-cron');

const NOTIFICATION_CHANNEL_ID = '1452579787628609587';

/**
 * スケジュールされた再起動を設定
 * 日本時間の5時、12時、17時に再起動を実行
 * @param {Client} client - Discord.jsのクライアントインスタンス
 */
function setupScheduledRestart(client) {
  console.log('✓ スケジュール再起動を設定しました (JST 5:00, 12:00, 17:00)');

  // 日本時間4:55にカウントダウン開始、5時に再起動 (UTC 19:55, 20:00前日)
  cron.schedule('55 19 * * *', () => {
    startCountdown(client, 'JST 5:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  cron.schedule('0 20 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 日本時間11:55にカウントダウン開始、12時に再起動 (UTC 2:55, 3:00)
  cron.schedule('55 2 * * *', () => {
    startCountdown(client, 'JST 12:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  cron.schedule('0 3 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 日本時間16:55にカウントダウン開始、17時に再起動 (UTC 7:55, 8:00)
  cron.schedule('55 7 * * *', () => {
    startCountdown(client, 'JST 17:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  cron.schedule('0 8 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });
}

/**
 * 5分前からカウントダウンを開始
 * @param {Client} client - Discord.jsのクライアントインスタンス
 * @param {string} scheduledTime - スケジュールされた時刻
 */
async function startCountdown(client, scheduledTime) {
  console.log(`🔔 再起動カウントダウン開始 (${scheduledTime})`);
  
  const channel = await client.channels.fetch(NOTIFICATION_CHANNEL_ID).catch(err => {
    console.error('チャンネルの取得に失敗しました:', err);
    return null;
  });

  if (!channel) {
    console.error('通知チャンネルが見つかりません');
    return;
  }

  // 5分前
  await channel.send('🔄 Botは5分後に再起動予定です。').catch(console.error);
  
  // 4分前
  setTimeout(async () => {
    await channel.send('🔄 Botは4分後に再起動予定です。').catch(console.error);
  }, 60000);

  // 3分前
  setTimeout(async () => {
    await channel.send('🔄 Botは3分後に再起動予定です。').catch(console.error);
  }, 120000);

  // 2分前
  setTimeout(async () => {
    await channel.send('🔄 Botは2分後に再起動予定です。').catch(console.error);
  }, 180000);

  // 1分前
  setTimeout(async () => {
    await channel.send('🔄 Botは1分後に再起動予定です。').catch(console.error);
  }, 240000);
}

/**
 * 再起動を実行
 * @param {Client} client - Discord.jsのクライアントインスタンス
 */
async function performRestart(client) {
  console.log('Botを再起動しています...');
  
  const channel = await client.channels.fetch(NOTIFICATION_CHANNEL_ID).catch(err => {
    console.error('チャンネルの取得に失敗しました:', err);
    return null;
  });

  if (channel) {
    await channel.send('⚡ Botを再起動しています...').catch(console.error);
  }

  // メッセージ送信後、少し待ってから再起動
  setTimeout(() => {
    process.exit(0); // プロセスを終了（PM2などのプロセスマネージャーが自動再起動します）
  }, 1000);
}

module.exports = { setupScheduledRestart };
