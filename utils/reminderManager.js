const reminderStore = require('./reminderStore');
const { EmbedBuilder } = require('discord.js');

// in-memory timers
const timers = new Map();

function msUntil(date) {
  return new Date(date).getTime() - Date.now();
}

function extractMentions(text) {
  if (!text) return { mentions: [], sanitized: '' };
  const regex = /(<@!?\d+>|<@&\d+>|<#\d+>)/g; // user, role, channel mentions
  const mentions = text.match(regex) || [];
  const sanitized = text.replace(regex, '').trim();
  return { mentions: Array.from(new Set(mentions)), sanitized };
}

async function sendReminder(client, reminder) {
  try {
    console.log(`[ReminderManager] リマインド送信開始: ${reminder.id}`);
    console.log(`  - タイトル: ${reminder.title}`);
    console.log(`  - 送信時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (JST)`);
    
    const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
    if (!channel) {
      console.error('[ReminderManager] チャンネルが見つかりません:', reminder.channelId);
      return;
    }

    // 内容中のメンションだけを通常メッセージで送信し、埋め込みからは除去
    const { mentions, sanitized } = extractMentions(reminder.content);

    const embed = new EmbedBuilder()
      .setTitle(reminder.title || '🔔 リマインド')
      .setDescription(sanitized || '\u200b')
      .setColor(0xff9800)
      .setTimestamp();

    // 作成者表示は行わない（非公開）

    // 先にメンションだけの通常メッセージを送る（存在する場合）
    if (mentions.length > 0) {
      await channel.send({ content: mentions.join(' ') });
    }

    await channel.send({ embeds: [embed] });
    console.log(`[ReminderManager] リマインド送信完了: ${reminder.id}`);
  } catch (err) {
    console.error('[ReminderManager] リマインド送信失敗:', err);
  }
}

function scheduleReminder(client, reminder) {
  const remaining = msUntil(reminder.scheduledTime);
  
  console.log(`[ReminderManager] スケジュール: ${reminder.id}`);
  console.log(`  - 予定時刻: ${new Date(reminder.scheduledTime).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (JST)`);
  console.log(`  - 残り時間: ${Math.floor(remaining / 1000)}秒 (${Math.floor(remaining / 60000)}分)`);
  console.log(`  - 現在時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} (JST)`);
  
  if (remaining <= 0) {
    console.log(`[ReminderManager] 過去の時刻なので即座に送信: ${reminder.id}`);
    // overdue -> send immediately (but asynchronously)
    sendReminder(client, reminder).then(() => {
      reminderStore.deleteReminder(reminder.id);
    });
    return;
  }

  const timeoutId = setTimeout(async () => {
    try {
      console.log(`[ReminderManager] タイマー実行: ${reminder.id} at ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
      await sendReminder(client, reminder);
    } finally {
      // cleanup
      timers.delete(reminder.id);
      reminderStore.deleteReminder(reminder.id);
    }
  }, remaining);

  timers.set(reminder.id, timeoutId);
  console.log(`[ReminderManager] タイマー設定完了: ${reminder.id}`);
}

function addReminder(client, reminder) {
  // save then schedule
  reminderStore.saveReminder(reminder);
  scheduleReminder(client, reminder);
}

function cancelReminder(id) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
  reminderStore.deleteReminder(id);
}

function loadAll(client) {
  const all = reminderStore.getAllReminders();
  for (const r of all) {
    try {
      scheduleReminder(client, r);
    } catch (e) {
      console.error('[ReminderManager] ロード中にエラー:', e);
    }
  }
}

module.exports = { addReminder, cancelReminder, loadAll, sendReminder };
