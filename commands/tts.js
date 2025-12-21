const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const ttsManager = require('../utils/ttsManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('テキスト読み上げ機能を管理します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('読み上げを開始します')
        .addChannelOption(option =>
          option
            .setName('text-channel')
            .setDescription('読み上げ対象のテキストチャンネル')
            .setRequired(true))
        .addChannelOption(option =>
          option
            .setName('voice-channel')
            .setDescription('読み上げるボイスチャンネル（省略時は現在のVC）')
            .setRequired(false))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('stop')
        .setDescription('読み上げを停止します')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('読み上げの状態を確認します')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('config')
        .setDescription('読み上げ設定を変更します')
        .addIntegerOption(option =>
          option
            .setName('max-length')
            .setDescription('最大文字数（デフォルト: 200）')
            .setRequired(false)
            .setMinValue(50)
            .setMaxValue(500))
        .addStringOption(option =>
          option
            .setName('language')
            .setDescription('読み上げ言語（デフォルト: ja）')
            .setRequired(false)
            .addChoices(
              { name: '日本語', value: 'ja' },
              { name: '英語', value: 'en' },
              { name: '韓国語', value: 'ko' },
              { name: '中国語', value: 'zh' }
            ))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(client, interaction) {
    // ロールチェック
    if (!(await ensureAllowed(interaction))) return;

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'start') {
        await handleStart(interaction);
      } else if (subcommand === 'stop') {
        await handleStop(interaction);
      } else if (subcommand === 'status') {
        await handleStatus(interaction);
      } else if (subcommand === 'config') {
        await handleConfig(interaction);
      }
    } catch (error) {
      console.error('[TTS Command] エラー:', error);
      await interaction.reply({ 
        content: `エラーが発生しました: ${error.message}`, 
        ephemeral: true 
      });
    }
  },
};

async function handleStart(interaction) {
  const textChannel = interaction.options.getChannel('text-channel');
  let voiceChannel = interaction.options.getChannel('voice-channel');

  // ボイスチャンネルが指定されていない場合、ユーザーの現在のVCを取得
  if (!voiceChannel) {
    const member = interaction.member;
    if (!member.voice.channel) {
      return await interaction.reply({
        content: 'ボイスチャンネルに接続してから実行するか、voice-channelオプションを指定してください。',
        ephemeral: true
      });
    }
    voiceChannel = member.voice.channel;
  }

  // チャンネルタイプのチェック
  if (textChannel.type !== 0) { // 0 = GUILD_TEXT
    return await interaction.reply({
      content: 'テキストチャンネルを指定してください。',
      ephemeral: true
    });
  }

  if (voiceChannel.type !== 2) { // 2 = GUILD_VOICE
    return await interaction.reply({
      content: 'ボイスチャンネルを指定してください。',
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    // ボイスチャンネルに接続
    await ttsManager.joinChannel(interaction.guild, voiceChannel);

    // 設定を更新
    ttsManager.updateSettings(interaction.guild.id, {
      enabled: true,
      channelId: textChannel.id,
      voiceChannelId: voiceChannel.id
    });

    await interaction.editReply({
      content: `✅ 読み上げを開始しました\n📝 対象チャンネル: ${textChannel}\n🔊 ボイスチャンネル: ${voiceChannel.name}`,
      ephemeral: true
    });
  } catch (error) {
    console.error('[TTS] 開始エラー:', error);
    await interaction.editReply({
      content: `読み上げの開始に失敗しました: ${error.message}`,
      ephemeral: true
    });
  }
}

async function handleStop(interaction) {
  const settings = ttsManager.getSettings(interaction.guild.id);

  if (!settings.enabled) {
    return await interaction.reply({
      content: '読み上げは既に停止しています。',
      ephemeral: true
    });
  }

  ttsManager.leaveChannel(interaction.guild.id);
  ttsManager.updateSettings(interaction.guild.id, { enabled: false });

  await interaction.reply({
    content: '✅ 読み上げを停止しました。',
    ephemeral: true
  });
}

async function handleStatus(interaction) {
  const settings = ttsManager.getSettings(interaction.guild.id);

  if (!settings.enabled) {
    return await interaction.reply({
      content: '現在、読み上げは停止しています。',
      ephemeral: true
    });
  }

  const textChannel = interaction.guild.channels.cache.get(settings.channelId);
  const voiceChannel = interaction.guild.channels.cache.get(settings.voiceChannelId);
  const isConnected = ttsManager.connections.has(interaction.guild.id);

  const statusText = `**読み上げ状態**
📊 状態: ${isConnected ? '🟢 接続中' : '🔴 切断済み'}
📝 対象チャンネル: ${textChannel || '不明'}
🔊 ボイスチャンネル: ${voiceChannel ? voiceChannel.name : '不明'}
📏 最大文字数: ${settings.maxLength}文字
🌐 言語: ${settings.language}`;

  await interaction.reply({
    content: statusText,
    ephemeral: true
  });
}

async function handleConfig(interaction) {
  const maxLength = interaction.options.getInteger('max-length');
  const language = interaction.options.getString('language');

  if (!maxLength && !language) {
    return await interaction.reply({
      content: '変更する設定を指定してください。',
      ephemeral: true
    });
  }

  const updates = {};
  if (maxLength) updates.maxLength = maxLength;
  if (language) updates.language = language;

  ttsManager.updateSettings(interaction.guild.id, updates);

  let message = '✅ 設定を更新しました\n';
  if (maxLength) message += `📏 最大文字数: ${maxLength}文字\n`;
  if (language) message += `🌐 言語: ${language}\n`;

  await interaction.reply({
    content: message,
    ephemeral: true
  });
}
