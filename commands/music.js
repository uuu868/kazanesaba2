const { SlashCommandBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const musicManager = require('../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('音楽を再生します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('play')
        .setDescription('YouTubeのURLから音楽を再生します')
        .addStringOption(option =>
          option
            .setName('url')
            .setDescription('YouTubeのURL')
            .setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('skip')
        .setDescription('現在の曲をスキップします')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('再生を停止してボイスチャンネルから退出します')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('queue')
        .setDescription('キューを表示します')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('nowplaying')
        .setDescription('現在再生中の曲を表示します')
    ),

  async execute(client, interaction) {
    // ロールチェック
    if (!(await ensureAllowed(interaction))) return;

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'play') {
        await handlePlay(interaction);
      } else if (subcommand === 'skip') {
        await handleSkip(interaction);
      } else if (subcommand === 'stop') {
        await handleStop(interaction);
      } else if (subcommand === 'queue') {
        await handleQueue(interaction);
      } else if (subcommand === 'nowplaying') {
        await handleNowPlaying(interaction);
      }
    } catch (error) {
      console.error('[Music Command] エラー:', error);
      const replyMethod = interaction.deferred ? 'editReply' : 'reply';
      await interaction[replyMethod]({ 
        content: `エラーが発生しました: ${error.message}`, 
        ephemeral: true 
      });
    }
  },
};

async function handlePlay(interaction) {
  const url = interaction.options.getString('url');
  const member = interaction.member;

  // ユーザーがボイスチャンネルにいるかチェック
  if (!member.voice.channel) {
    return await interaction.reply({
      content: '❌ ボイスチャンネルに接続してから実行してください。',
      ephemeral: true
    });
  }

  await interaction.deferReply();

  const result = await musicManager.playFromUrl(
    interaction.guild,
    member.voice.channel,
    url,
    interaction.channel,
    interaction.user
  );

  if (result.success) {
    await interaction.editReply({ content: result.message });
  } else {
    await interaction.editReply({ content: `❌ ${result.message}`, ephemeral: true });
  }
}

async function handleSkip(interaction) {
  const queue = musicManager.getQueue(interaction.guild.id);

  if (!queue.connection) {
    return await interaction.reply({
      content: '❌ 再生中の曲がありません。',
      ephemeral: true
    });
  }

  if (!queue.isPlaying) {
    return await interaction.reply({
      content: '❌ 現在再生中の曲はありません。',
      ephemeral: true
    });
  }

  queue.skip();
  await interaction.reply({ content: '⏭️ 曲をスキップしました。' });
}

async function handleStop(interaction) {
  const queue = musicManager.getQueue(interaction.guild.id);

  if (!queue.connection) {
    return await interaction.reply({
      content: '❌ 再生中の曲がありません。',
      ephemeral: true
    });
  }

  queue.stop();
  await interaction.reply({ content: '⏹️ 再生を停止しました。' });
}

async function handleQueue(interaction) {
  const queue = musicManager.getQueue(interaction.guild.id);

  if (!queue.connection) {
    return await interaction.reply({
      content: '❌ キューが空です。',
      ephemeral: true
    });
  }

  let queueText = '**🎵 音楽キュー**\n\n';

  if (queue.currentSong) {
    queueText += `**▶️ 再生中:**\n${queue.currentSong.title}\nリクエスト: ${queue.currentSong.requestedBy.username}\n\n`;
  }

  if (queue.songs.length > 0) {
    queueText += '**待機中:**\n';
    queue.songs.slice(0, 10).forEach((song, index) => {
      queueText += `${index + 1}. ${song.title}\n`;
    });

    if (queue.songs.length > 10) {
      queueText += `\n...他 ${queue.songs.length - 10}曲`;
    }
  } else if (!queue.currentSong) {
    queueText += 'キューが空です。';
  }

  await interaction.reply({ content: queueText, ephemeral: true });
}

async function handleNowPlaying(interaction) {
  const queue = musicManager.getQueue(interaction.guild.id);

  if (!queue.connection || !queue.currentSong) {
    return await interaction.reply({
      content: '❌ 現在再生中の曲はありません。',
      ephemeral: true
    });
  }

  const song = queue.currentSong;
  const embed = {
    color: 0x0099ff,
    title: '🎵 再生中',
    description: `**${song.title}**`,
    fields: [
      {
        name: 'リクエスト',
        value: song.requestedBy.username,
        inline: true
      },
      {
        name: '長さ',
        value: formatDuration(song.duration),
        inline: true
      }
    ],
    thumbnail: {
      url: song.thumbnail
    }
  };

  await interaction.reply({ embeds: [embed] });
}

function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}
