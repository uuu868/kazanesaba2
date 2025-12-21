const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('再生を停止してボイスチャンネルから退出します'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);

    if (!queue) {
      return await interaction.reply({
        content: '❌ 再生中の曲がありません。',
        ephemeral: true
      });
    }

    queue.delete();
    await interaction.reply('⏹️ 再生を停止しました。');
  },
};
