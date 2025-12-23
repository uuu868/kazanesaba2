const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const reminderStore = require('../utils/reminderStore');

const BOT_CREATOR_IDS = ['1088020702583603270', '959816319568576582'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind-list')
    .setDescription('現在設定されているリマインド一覧を表示します（bot作成者のみ）'),

  async execute(interaction) {
    try {
      const client = interaction.client;
      
      // bot作成者チェック
      if (!BOT_CREATOR_IDS.includes(interaction.user.id)) {
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

      // 25件ごとにEmbedを分割
      const itemsPerPage = 25;
      const totalPages = Math.ceil(reminders.length / itemsPerPage);

      // 最初のメッセージを送信
      await interaction.editReply({ 
        content: `📋 **リマインド一覧** - 合計 **${reminders.length}** 件 ${totalPages > 1 ? `(${totalPages}ページ)` : ''}` 
      });

      // ページごとにEmbedを作成して送信
      for (let page = 0; page < totalPages; page++) {
        const startIndex = page * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, reminders.length);
        const pageReminders = reminders.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
          .setColor(0x2196f3)
          .setTimestamp();

        if (totalPages > 1) {
          embed.setTitle(`📋 リマインド一覧 (${page + 1}/${totalPages}ページ目)`);
        } else {
          embed.setTitle('📋 リマインド一覧');
        }

        for (let i = 0; i < pageReminders.length; i++) {
          const reminder = pageReminders[i];
          const globalIndex = startIndex + i + 1;
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
            name: `${globalIndex}. ${reminder.title}`,
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

        embed.setFooter({ 
          text: `表示: ${startIndex + 1}-${endIndex}件 / 全体: ${reminders.length}件` 
        });

        // 最初のページはeditReply、それ以降はfollowUp
        if (page === 0) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.followUp({ embeds: [embed], flags: 64 });
        }

        // 次のページがある場合は少し待機（レート制限対策）
        if (page < totalPages - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

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
