const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('現在の曲をスキップします'),

  async execute(client, interaction) {
    const queue = useQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      return await interaction.reply({
        content: '❌ 再生中の曲がありません。',
        ephemeral: true
      });
    }

    queue.node.skip();
    await interaction.reply('⏭️ 曲をスキップしました。');
  },
};
