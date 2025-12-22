const cron = require('node-cron');

const NOTIFICATION_CHANNEL_ID = '1452579787628609587';

/**
 * スケジュールされた再起動を設定
 * 日本時間の1時、5時、12時、17時に再起動を実行
 * @param {Client} client - Discord.jsのクライアントインスタンス
 */
function setupScheduledRestart(client) {
  console.log('✓ スケジュール再起動を設定しました (JST 1:00, 5:00, 12:00, 17:00)');

  // === 1時の再起動 ===
  // 30分前 (UTC 15:30前日)
  cron.schedule('30 15 * * *', () => {
    sendNotification(client, '🔔 Botは30分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (UTC 15:45前日)
  cron.schedule('45 15 * * *', () => {
    sendNotification(client, '🔔 Botは15分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (UTC 15:50前日)
  cron.schedule('50 15 * * *', () => {
    sendNotification(client, '🔔 Botは10分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (UTC 15:55前日)
  cron.schedule('55 15 * * *', () => {
    startCountdown(client, 'JST 1:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (UTC 16:00前日)
  cron.schedule('0 16 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // === 5時の再起動 ===
  // 30分前 (UTC 19:30前日)
  cron.schedule('30 19 * * *', () => {
    sendNotification(client, '🔔 Botは30分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (UTC 19:45前日)
  cron.schedule('45 19 * * *', () => {
    sendNotification(client, '🔔 Botは15分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (UTC 19:50前日)
  cron.schedule('50 19 * * *', () => {
    sendNotification(client, '🔔 Botは10分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (UTC 19:55前日)
  cron.schedule('55 19 * * *', () => {
    startCountdown(client, 'JST 5:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (UTC 20:00前日)
  cron.schedule('0 20 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // === 12時の再起動 ===
  // 30分前 (UTC 2:30)
  cron.schedule('30 2 * * *', () => {
    sendNotification(client, '🔔 Botは30分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (UTC 2:45)
  cron.schedule('45 2 * * *', () => {
    sendNotification(client, '🔔 Botは15分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (UTC 2:50)
  cron.schedule('50 2 * * *', () => {
    sendNotification(client, '🔔 Botは10分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (UTC 2:55)
  cron.schedule('55 2 * * *', () => {
    startCountdown(client, 'JST 12:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (UTC 3:00)
  cron.schedule('0 3 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // === 17時の再起動 ===
  // 30分前 (UTC 7:30)
  cron.schedule('30 7 * * *', () => {
    sendNotification(client, '🔔 Botは30分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (UTC 7:45)
  cron.schedule('45 7 * * *', () => {
    sendNotification(client, '🔔 Botは15分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (UTC 7:50)
  cron.schedule('50 7 * * *', () => {
    sendNotification(client, '🔔 Botは10分後に再起動予定です。');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (UTC 7:55)
  cron.schedule('55 7 * * *', () => {
    startCountdown(client, 'JST 17:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (UTC 8:00)
  cron.schedule('0 8 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });
}

/**
 * 通知メッセージを送信
 * @param {Client} client - Discord.jsのクライアントインスタンス
 * @param {string} message - 送信するメッセージ
 */
async function sendNotification(client, message) {
  const channel = await client.channels.fetch(NOTIFICATION_CHANNEL_ID).catch(err => {
    console.error('チャンネルの取得に失敗しました:', err);
    return null;
  });

  if (!channel) {
    console.error('通知チャンネルが見つかりません');
    return;
  }

  await channel.send(message).catch(console.error);
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
