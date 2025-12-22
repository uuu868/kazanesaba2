const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');

const NOTIFICATION_CHANNEL_ID = '1452579787628609587';

/**
 * スケジュールされた再起動を設定
 * 日本時間の1時、5時、12時、17時に再起動を実行
 * @param {Client} client - Discord.jsのクライアントインスタンス
 */
function setupScheduledRestart(client) {
  console.log('✓ スケジュール再起動を設定しました (JST 1:00, 5:00, 12:00, 17:00)');

  // === 1時の再起動 ===
  // 30分前 (JST 0:30)
  cron.schedule('30 0 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは30分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (JST 0:45)
  cron.schedule('45 0 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは15分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (JST 0:50)
  cron.schedule('50 0 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは10分後に再起動予定です。', 0xFFA500);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (JST 0:55)
  cron.schedule('55 0 * * *', () => {
    startCountdown(client, 'JST 1:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (JST 1:00)
  cron.schedule('0 1 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // === 5時の再起動 ===
  // 30分前 (JST 4:30)
  cron.schedule('30 4 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは30分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (JST 4:45)
  cron.schedule('45 4 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは15分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (JST 4:50)
  cron.schedule('50 4 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは10分後に再起動予定です。', 0xFFA500);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (JST 4:55)
  cron.schedule('55 4 * * *', () => {
    startCountdown(client, 'JST 5:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (JST 5:00)
  cron.schedule('0 5 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // === 12時の再起動 ===
  // 30分前 (JST 11:30)
  cron.schedule('30 11 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは30分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (JST 11:45)
  cron.schedule('45 11 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは15分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (JST 11:50)
  cron.schedule('50 11 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは10分後に再起動予定です。', 0xFFA500);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (JST 11:55)
  cron.schedule('55 11 * * *', () => {
    startCountdown(client, 'JST 12:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (JST 12:00)
  cron.schedule('0 12 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });

  // === 17時の再起動 ===
  // 30分前 (JST 16:30)
  cron.schedule('30 16 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは30分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 15分前 (JST 16:45)
  cron.schedule('45 16 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは15分後に再起動予定です。', 0xFFD700);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 10分前 (JST 16:50)
  cron.schedule('50 16 * * *', () => {
    sendNotification(client, '🔔 再起動予定通知', 'Botは10分後に再起動予定です。', 0xFFA500);
  }, {
    timezone: "Asia/Tokyo"
  });

  // 5分前からカウントダウン (JST 16:55)
  cron.schedule('55 16 * * *', () => {
    startCountdown(client, 'JST 17:00');
  }, {
    timezone: "Asia/Tokyo"
  });

  // 再起動 (JST 17:00)
  cron.schedule('0 17 * * *', () => {
    performRestart(client);
  }, {
    timezone: "Asia/Tokyo"
  });
}

/**
 * 通知メッセージを送信（埋め込み形式）
 * @param {Client} client - Discord.jsのクライアントインスタンス
 * @param {string} title - 埋め込みのタイトル
 * @param {string} description - 埋め込みの説明
 * @param {number} color - 埋め込みの色（16進数）
 */
async function sendNotification(client, title, description, color = 0x0099FF) {
  const channel = await client.channels.fetch(NOTIFICATION_CHANNEL_ID).catch(err => {
    console.error('チャンネルの取得に失敗しました:', err);
    return null;
  });

  if (!channel) {
    console.error('通知チャンネルが見つかりません');
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .setTimestamp();

  await channel.send({ embeds: [embed] }).catch(console.error);
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
  const embed5 = new EmbedBuilder()
    .setTitle('🔄 再起動カウントダウン')
    .setDescription('Botは5分後に再起動予定です。')
    .setColor(0xFF8C00)
    .setTimestamp();
  await channel.send({ embeds: [embed5] }).catch(console.error);
  
  // 4分前
  setTimeout(async () => {
    const embed4 = new EmbedBuilder()
      .setTitle('🔄 再起動カウントダウン')
      .setDescription('Botは4分後に再起動予定です。')
      .setColor(0xFF8C00)
      .setTimestamp();
    await channel.send({ embeds: [embed4] }).catch(console.error);
  }, 60000);

  // 3分前
  setTimeout(async () => {
    const embed3 = new EmbedBuilder()
      .setTitle('🔄 再起動カウントダウン')
      .setDescription('Botは3分後に再起動予定です。')
      .setColor(0xFF6347)
      .setTimestamp();
    await channel.send({ embeds: [embed3] }).catch(console.error);
  }, 120000);

  // 2分前
  setTimeout(async () => {
    const embed2 = new EmbedBuilder()
      .setTitle('🔄 再起動カウントダウン')
      .setDescription('Botは2分後に再起動予定です。')
      .setColor(0xFF4500)
      .setTimestamp();
    await channel.send({ embeds: [embed2] }).catch(console.error);
  }, 180000);

  // 1分前
  setTimeout(async () => {
    const embed1 = new EmbedBuilder()
      .setTitle('🔄 再起動カウントダウン')
      .setDescription('Botは1分後に再起動予定です。')
      .setColor(0xFF0000)
      .setTimestamp();
    await channel.send({ embeds: [embed1] }).catch(console.error);
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
    const embed = new EmbedBuilder()
      .setTitle('⚡ Bot再起動')
      .setDescription('Botを再起動しています...')
      .setColor(0x00FF00)
      .setTimestamp();
    await channel.send({ embeds: [embed] }).catch(console.error);
  }

  // メッセージ送信後、少し待ってから再起動
  setTimeout(() => {
    process.exit(0); // プロセスを終了（PM2などのプロセスマネージャーが自動再起動します）
  }, 1000);
}

module.exports = { setupScheduledRestart };
