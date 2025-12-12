const { SlashCommandBuilder } = require('discord.js');

const ALLOWED_USER_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restart')
    .setDescription('BOTを再起動します（bot作成者のみ）'),

  async execute(client, interaction) {
    // ユーザーIDチェック
    if (interaction.user.id !== ALLOWED_USER_ID) {
      await interaction.reply({ 
        content: 'このコマンドを使用する権限がありません。', 
        ephemeral: true 
      });
      return;
    }

    await interaction.reply({
      content: '🔄 BOTを再起動します...',
      ephemeral: true
    });

    console.log(`[Restart] BOTを再起動します (実行者: ${interaction.user.tag})`);

    // 少し待ってから終了（応答が送信されるまで待つ）
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  }
};
