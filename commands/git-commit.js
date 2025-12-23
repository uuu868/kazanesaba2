const { SlashCommandBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const { commitChanges } = require('../utils/autoCommit');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('git-commit')
    .setDescription('現在の変更を手動でコミット&プッシュします（管理者のみ）')
    .addBooleanOption(option =>
      option
        .setName('push')
        .setDescription('コミット後にプッシュするか（デフォルト: true）')
        .setRequired(false)
    ),

  async execute(interaction) {
    const client = interaction.client;
    
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
      const autoPush = interaction.options.getBoolean('push') ?? true;
      const committed = await commitChanges(autoPush);
      
      if (committed) {
        const message = autoPush 
          ? '✅ 変更を正常にコミット&プッシュしました。'
          : '✅ 変更を正常にコミットしました。';
        await interaction.editReply({
          content: message
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
