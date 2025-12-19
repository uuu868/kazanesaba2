const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reminderStore = require('../utils/reminderStore');

const BOT_CREATOR_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind-list')
    .setDescription('現在設定されているリマインド一覧を表示します（bot作成者のみ）'),

  async execute(client, interaction) {
    try {
      // bot作成者チェック
      if (interaction.user.id !== BOT_CREATOR_ID) {
        await interaction.reply({ 
          content: '❌ このコマンドはbot作成者のみ使用できます。', 
          flags: 64 
        });
        return;
      }

      await interaction.deferReply({ flags: 64 });

      // 全リマインドを取得
      const reminders = reminderStore.getAllReminders();

      if (!reminders || reminders.length === 0) {
        await interaction.editReply({
          content: '📋 現在設定されているリマインドはありません。'
        });
        return;
      }

      // 実行予定時刻でソート（近い順）
      reminders.sort((a, b) => {
        const timeA = new Date(a.scheduledTime).getTime();
        const timeB = new Date(b.scheduledTime).getTime();
        return timeA - timeB;
      });

      // Embedを作成
      const embed = new EmbedBuilder()
        .setTitle('📋 リマインド一覧')
        .setColor(0x2196f3)
        .setDescription(`合計 **${reminders.length}** 件のリマインドが設定されています`)
        .setTimestamp();

      // 最大25件まで表示（Embedのフィールド制限）
      const displayReminders = reminders.slice(0, 25);
      
      for (let i = 0; i < displayReminders.length; i++) {
        const reminder = displayReminders[i];
        const scheduledTime = new Date(reminder.scheduledTime);
        const timeStr = `<t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`;
        const relativeTimeStr = `<t:${Math.floor(scheduledTime.getTime() / 1000)}:R>`;
        
        // チャンネル情報を取得
        let channelMention = `ID: ${reminder.channelId}`;
        try {
          const channel = await client.channels.fetch(reminder.channelId);
          if (channel) {
            channelMention = `<#${reminder.channelId}>`;
          }
        } catch (e) {
          // チャンネル取得失敗時はIDのみ表示
        }

        // ユーザー情報
        const userMention = `<@${reminder.userId}>`;

        // 内容を短縮（最大100文字）
        const contentPreview = reminder.content.length > 100 
          ? reminder.content.substring(0, 100) + '...' 
          : reminder.content;

        embed.addFields({
          name: `${i + 1}. ${reminder.title}`,
          value: [
            `⏰ **実行予定**: ${timeStr} (${relativeTimeStr})`,
            `👤 **作成者**: ${userMention}`,
            `📍 **送信先**: ${channelMention}`,
            `📝 **内容**: ${contentPreview}`,
            `🆔 **ID**: \`${reminder.id}\``
          ].join('\n'),
          inline: false
        });
      }

      // 25件を超える場合は注記
      if (reminders.length > 25) {
        embed.setFooter({ 
          text: `表示: ${displayReminders.length}件 / 全体: ${reminders.length}件（最初の25件のみ表示）` 
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (err) {
      console.error('[Remind List] error:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'エラーが発生しました。', 
          flags: 64 
        }).catch(() => {});
      } else {
        await interaction.editReply({ 
          content: 'エラーが発生しました。' 
        }).catch(() => {});
      }
    }
  }
};
