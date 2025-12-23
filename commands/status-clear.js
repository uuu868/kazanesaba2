const { SlashCommandBuilder } = require('discord.js');

const ALLOWED_USER_IDS = ['1088020702583603270', '959816319568576582'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status-clear')
    .setDescription('BOTのステータスメッセージをクリアします（bot作成者のみ）'),

  async execute(interaction) {
    const client = interaction.client;
    
    // ユーザーIDチェック
    if (!ALLOWED_USER_IDS.includes(interaction.user.id)) {
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
