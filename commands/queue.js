const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('再生キューを表示します'),

  async execute(client, interaction) {
    const queue = useQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      return await interaction.reply({
        content: '❌ キューが空です。',
        ephemeral: true
      });
    }

    const currentTrack = queue.currentTrack;
    const tracks = queue.tracks.toArray();

    const embed = new EmbedBuilder()
      .setColor(0x0099ff)
      .setTitle('🎵 音楽キュー')
      .setDescription(`**▶️ 再生中:**\n${currentTrack.title}\n\n${tracks.length > 0 ? '**待機中:**' : 'キューが空です'}`)
      .setThumbnail(currentTrack.thumbnail);

    if (tracks.length > 0) {
      const queueList = tracks.slice(0, 10).map((track, index) => 
        `${index + 1}. ${track.title}`
      ).join('\n');
      
      embed.addFields({ name: '\u200B', value: queueList });

      if (tracks.length > 10) {
        embed.setFooter({ text: `...他 ${tracks.length - 10}曲` });
      }
    }

    await interaction.reply({ embeds: [embed] });
  },
};
