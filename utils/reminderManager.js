const reminderStore = require('./reminderStore');
// Reminder dispatch without embeds (plain message)

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

    const lines = [];
    if (reminder.mention) {
      lines.push(`<@${reminder.userId}>`);
      lines.push(`作成者: ${reminder.userTag}`);
    }
    lines.push(`タイトル: ${reminder.title || 'リマインド'}`);
    lines.push(`内容: ${reminder.content}`);

    const sendContent = lines.join('\n');

    await channel.send({ content: sendContent });
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
