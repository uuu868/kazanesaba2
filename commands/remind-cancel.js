const { SlashCommandBuilder } = require('discord.js');
const reminderManager = require('../utils/reminderManager');
const reminderStore = require('../utils/reminderStore');

const BOT_CREATOR_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remind-cancel')
    .setDescription('指定したリマインドを削除します（bot作成者のみ）')
    .addStringOption(option =>
      option.setName('id')
        .setDescription('削除するリマインドのID')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const client = interaction.client;
      
      // bot作成者チェック
      if (interaction.user.id !== BOT_CREATOR_ID) {
        await interaction.reply({ 
          content: '❌ このコマンドはbot作成者のみ使用できます。', 
          flags: 64 
        });
        return;
      }

      await interaction.deferReply({ flags: 64 });

      const reminderId = interaction.options.getString('id');

      // リマインドの存在確認
      const reminder = reminderStore.getReminder(reminderId);
      
      if (!reminder) {
        await interaction.editReply({
          content: `⚠️ リマインドID \`${reminderId}\` は見つかりませんでした。\n\`/remind-list\` で正しいIDを確認してください。`
        });
        return;
      }

      // リマインドをキャンセル
      try {
        reminderManager.cancelReminder(reminderId);
        
        // 削除成功メッセージ
        await interaction.editReply({
          content: [
            '✅ **リマインドを削除しました**',
            '',
            `📌 **タイトル**: ${reminder.title}`,
            `📝 **内容**: ${reminder.content.substring(0, 100)}${reminder.content.length > 100 ? '...' : ''}`,
            `🆔 **ID**: \`${reminderId}\``
          ].join('\n')
        });

        console.log(`[Remind Cancel] リマインド削除: ${reminderId} - ${reminder.title}`);

      } catch (error) {
        console.error('[Remind Cancel] 削除エラー:', error);
        await interaction.editReply({
          content: `❌ リマインドの削除中にエラーが発生しました。\n\`${error.message}\``
        });
      }

    } catch (err) {
      console.error('[Remind Cancel] error:', err);
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
