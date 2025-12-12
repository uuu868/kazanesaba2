const { SlashCommandBuilder } = require('discord.js');

const ALLOWED_USER_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-clear')
    .setDescription('BOTのステータスメッセージをクリアします（bot作成者のみ）'),

  async execute(client, interaction) {
    // ユーザーIDチェック
    if (interaction.user.id !== ALLOWED_USER_ID) {
      await interaction.reply({ 
        content: 'このコマンドを使用する権限がありません。', 
        ephemeral: true 
      });
      return;
    }

    try {
      client.user.setActivity(null);
      
      await interaction.reply({
        content: '✅ ステータスをクリアしました。',
        ephemeral: true
      });

      console.log('[Status Clear] ステータスをクリアしました');
    } catch (error) {
      console.error('[Status Clear] ステータスクリアエラー:', error);
      await interaction.reply({
        content: 'ステータスのクリアに失敗しました。',
        ephemeral: true
      });
    }
  }
};
