const { SlashCommandBuilder } = require('discord.js');

const ALLOWED_USER_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-clear')
    .setDescription('BOTのステータスメッセージをクリアします（bot作成者のみ）'),

  async execute(interaction) {
    const client = interaction.client;
    
    // ユーザーIDチェック
    if (interaction.user.id !== ALLOWED_USER_ID) {
      await interaction.reply({
        content: 'このコマンドを使用する権限がありません。', 
        flags: 64
      });
      return;
    }

    try {
      client.user.setPresence({ activities: [], status: 'online' });
      
      await interaction.reply({
        content: '✅ ステータスをクリアしました。',
        flags: 64
      });

      console.log('[Status Clear] ステータスをクリアしました');
    } catch (error) {
      console.error('[Status Clear] ステータスクリアエラー:', error);
      await interaction.reply({
        content: 'ステータスのクリアに失敗しました。',
        flags: 64
      });
    }
  }
};
