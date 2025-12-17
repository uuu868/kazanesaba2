const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const reminderManager = require('../utils/reminderManager');
const reminderStore = require('../utils/reminderStore');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('指定した時間後にリマインドを送信します')
    .addStringOption(option =>
      option.setName('title')
        .setDescription('リマインドのタイトル（必須）')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('content')
        .setDescription('リマインド内容（最大2000文字・必須）')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('date')
        .setDescription('日付を指定 (YYYY-MM-DD)。指定すると経過時間指定は無視されます')
        .setRequired(false)
    )
    .addStringOption(option =>
      option.setName('time')
        .setDescription('時刻を指定 (HH:MM または HH:MM:SS)。省略時は 00:00:00')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('hours')
        .setDescription('時間（0～23）')
        .setMinValue(0)
        .setMaxValue(23)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('minutes')
        .setDescription('分（0～59）')
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option.setName('seconds')
        .setDescription('秒（0～59）')
        .setMinValue(0)
        .setMaxValue(59)
        .setRequired(false)
    )
,

  async execute(client, interaction) {
    try {
      // ロールチェック（リマインド専用）
      const { ensureReminderAllowed } = require('../utils/roleGuard');
      if (!(await ensureReminderAllowed(interaction))) return;

      await interaction.deferReply({ flags: 64 });

      const title = interaction.options.getString('title');
      const content = interaction.options.getString('content');
      const dateStr = interaction.options.getString('date');
      const timeStr = interaction.options.getString('time');
      const hours = interaction.options.getInteger('hours') || 0;
      const minutes = interaction.options.getInteger('minutes') || 0;
      const seconds = interaction.options.getInteger('seconds') || 0;
      // メンション制御は廃止（デフォルトOFF）。内容中のメンションは送信時に分離処理します。

      let totalMs;
      let scheduledTime;

      if (dateStr) {
        // 日付指定モード
        // dateStr: YYYY-MM-DD
        const dateParts = dateStr.split('-');
        if (dateParts.length !== 3) {
          await interaction.editReply({ content: '⚠️ 日付は YYYY-MM-DD 形式で指定してください。' });
          return;
        }
        const year = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const day = parseInt(dateParts[2], 10);
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          await interaction.editReply({ content: '⚠️ 無効な日付です。' });
          return;
        }

        // 時刻解析
        let hour = 0, minute = 0, second = 0;
        if (timeStr) {
          const tParts = timeStr.split(':').map(p => parseInt(p, 10));
          if (tParts.length < 2 || tParts.length > 3 || tParts.some(v => isNaN(v))) {
            await interaction.editReply({ content: '⚠️ 時刻は HH:MM または HH:MM:SS の形式で指定してください。' });
            return;
          }
          hour = tParts[0];
          minute = tParts[1];
          second = tParts[2] || 0;
        }

        // 日本時間(JST, UTC+9)として入力された時刻をUTCに変換
        const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒に
        scheduledTime = new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0) - jstOffset);
        totalMs = scheduledTime.getTime() - Date.now();

        if (isNaN(scheduledTime.getTime())) {
          await interaction.editReply({ content: '⚠️ 無効な日時です。' });
          return;
        }

      } else {
        // 経過時間指定モード
        totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
        scheduledTime = new Date(Date.now() + totalMs);
      }

      // 最小1秒チェック
      if (totalMs < 1000) {
        await interaction.editReply({ content: '⚠️ 1秒以上の時間を指定してください。' });
        return;
      }

      // 最大1年チェック（365日）
      const maxMs = 365 * 24 * 3600 * 1000;
      if (totalMs > maxMs) {
        await interaction.editReply({ content: '⚠️ 最大365日以内で指定してください。' });
        return;
      }

      // リマインド設定（永続化してスケジュール）
      const reminderId = `${interaction.channel.id}_${Date.now()}`;

      const reminder = {
        id: reminderId,
        content,
        title,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        userAvatar: interaction.user.displayAvatarURL(),
        channelId: interaction.channel.id,
        scheduledTime: scheduledTime.toISOString(),
        // mention 設定は不要
      };

      // 永続化してスケジュール
      reminderManager.addReminder(client, reminder);

      // 表示用ラベル
      const displayDuration = dateStr ? '指定日時' : formatTime(hours, minutes, seconds);

      const responseEmbed = new EmbedBuilder()
        .setTitle('✅ リマインドを設定しました')
        .setColor(0x4caf50)
        .addFields(
          { name: '📌 タイトル', value: title, inline: true },
          { name: '⏰ 設定時間', value: displayDuration, inline: true },
          { name: '📝 内容', value: content.substring(0, 100) + (content.length > 100 ? '...' : ''), inline: false },
          { name: '👤 作成者', value: '非公開', inline: true },
          { name: '⏳ 実行予定時刻', value: `<t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`, inline: false }
        );

      await interaction.editReply({
        embeds: [responseEmbed]
      });

      console.log(`[Remind] リマインド設定: ${reminderId} - ${displayDuration} - ${content.substring(0, 50)}`);

    } catch (err) {
      console.error('[Remind] error:', err);
      try {
        await interaction.editReply({ 
          content: 'エラーが発生しました。' 
        });
      } catch (e) {
        console.error(e);
      }
    }
  }
};

/**
 * 時間をフォーマット
 */
function formatTime(hours, minutes, seconds) {
  const parts = [];
  if (hours > 0) parts.push(`${hours}時間`);
  if (minutes > 0) parts.push(`${minutes}分`);
  if (seconds > 0) parts.push(`${seconds}秒`);
  return parts.length > 0 ? parts.join(' ') : '0秒';
}

/**
 * 全リマインド情報を取得
 */
module.exports.getReminders = function() {
  return reminderStore.getAllReminders();
};

/**
 * リマインドをキャンセル
 */
module.exports.cancelReminder = function(reminderId) {
  try {
    reminderManager.cancelReminder(reminderId);
    return true;
  } catch (e) {
    return false;
  }
};
