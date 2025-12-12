const reminderStore = require('./reminderStore');
const { EmbedBuilder } = require('discord.js');

// in-memory timers
const timers = new Map();

function msUntil(date) {
  return new Date(date).getTime() - Date.now();
}

async function sendReminder(client, reminder) {
  try {
    const channel = await client.channels.fetch(reminder.channelId).catch(() => null);
    if (!channel) {
      console.error('[ReminderManager] チャンネルが見つかりません:', reminder.channelId);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(reminder.title || '🔔 リマインド')
      .setDescription(reminder.content)
      .setColor(0xff9800)
      .setTimestamp();

    // 作成者表示は行わない（非公開）

    const sendContent = reminder.mention ? `<@${reminder.userId}>` : '';

    await channel.send({ content: sendContent, embeds: [embed] });
    console.log(`[ReminderManager] リマインド送信: ${reminder.id}`);
  } catch (err) {
    console.error('[ReminderManager] リマインド送信失敗:', err);
  }
}

function scheduleReminder(client, reminder) {
  const remaining = msUntil(reminder.scheduledTime);
  if (remaining <= 0) {
    // overdue -> send immediately (but asynchronously)
    sendReminder(client, reminder).then(() => {
      reminderStore.deleteReminder(reminder.id);
    });
    return;
  }

  const timeoutId = setTimeout(async () => {
    try {
      await sendReminder(client, reminder);
    } finally {
      // cleanup
      timers.delete(reminder.id);
      reminderStore.deleteReminder(reminder.id);
    }
  }, remaining);

  timers.set(reminder.id, timeoutId);
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
