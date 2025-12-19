const { SlashCommandBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const { commitChanges } = require('../utils/autoCommit');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('git-commit')
    .setDescription('現在の変更を手動でコミットします（管理者のみ）'),

  async execute(client, interaction) {
    // 管理者権限チェック
    if (!interaction.member.permissions.has('Administrator')) {
      await interaction.reply({
        content: 'このコマンドは管理者のみが使用できます。',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const committed = await commitChanges();
      
      if (committed) {
        await interaction.editReply({
          content: '✅ 変更を正常にコミットしました。'
        });
      } else {
        await interaction.editReply({
          content: 'ℹ️ コミットする変更がありませんでした。'
        });
      }
    } catch (error) {
      console.error('[GitCommit] コミットエラー:', error);
      await interaction.editReply({
        content: '❌ コミット中にエラーが発生しました。'
      });
    }
  },
};
