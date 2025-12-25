const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getConfig, setConfig, backup, restoreFromBackup, listBackups, exportConfig, importConfig } = require('../utils/persistentConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('永続的な設定を管理します')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('現在の設定を表示します')
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('表示する設定キー（例: botSettings.prefix）')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('設定を変更します')
        .addStringOption(option =>
          option
            .setName('key')
            .setDescription('設定キー（例: botSettings.prefix）')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('value')
            .setDescription('設定値（JSON形式も可）')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('backup')
        .setDescription('現在の設定をバックアップします')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('restore')
        .setDescription('バックアップから設定を復元します')
        .addStringOption(option =>
          option
            .setName('file')
            .setDescription('復元するバックアップファイル名（省略で最新）')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list-backups')
        .setDescription('利用可能なバックアップのリストを表示します')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('export')
        .setDescription('設定をJSON形式でエクスポートします')
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'view':
          await handleView(interaction);
          break;
        case 'set':
          await handleSet(interaction);
          break;
        case 'backup':
          await handleBackup(interaction);
          break;
        case 'restore':
          await handleRestore(interaction);
          break;
        case 'list-backups':
          await handleListBackups(interaction);
          break;
        case 'export':
          await handleExport(interaction);
          break;
      }
    } catch (error) {
      console.error('[config command] エラー:', error);
      await interaction.editReply({
        content: `❌ エラーが発生しました: ${error.message}`,
        ephemeral: true
      });
    }
  }
};

async function handleView(interaction) {
  const key = interaction.options.getString('key');
  
  if (key) {
    // 特定のキーの値を表示
    const value = getConfig(key);
    
    if (value === undefined) {
      return await interaction.editReply({
        content: `⚠️ 設定キー \`${key}\` が見つかりません`,
        ephemeral: true
      });
    }
    
    const embed = new EmbedBuilder()
      .setTitle('📋 設定値')
      .setDescription(`**キー:** \`${key}\``)
      .addFields({
        name: '値',
        value: '```json\n' + JSON.stringify(value, null, 2) + '\n```'
      })
      .setColor(0x00AE86)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], ephemeral: true });
  } else {
    // すべての設定を表示
    const config = getConfig();
    
    const embed = new EmbedBuilder()
      .setTitle('⚙️ 現在の設定')
      .setDescription('すべての設定値を表示します')
      .addFields(
        {
          name: 'Bot設定',
          value: '```json\n' + JSON.stringify(config.botSettings, null, 2) + '\n```',
          inline: false
        },
        {
          name: '機能設定',
          value: '```json\n' + JSON.stringify(config.features, null, 2) + '\n```',
          inline: false
        },
        {
          name: '最終更新',
          value: config.lastUpdated || '不明',
          inline: true
        },
        {
          name: 'バージョン',
          value: config.version || '不明',
          inline: true
        }
      )
      .setColor(0x00AE86)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], ephemeral: true });
  }
}

async function handleSet(interaction) {
  const key = interaction.options.getString('key');
  const valueStr = interaction.options.getString('value');
  
  try {
    // JSON形式の値をパース
    let value;
    try {
      value = JSON.parse(valueStr);
    } catch {
      // JSON形式でない場合は文字列として扱う
      value = valueStr;
    }
    
    // 設定を更新
    const success = setConfig(key, value);
    
    if (success) {
      const embed = new EmbedBuilder()
        .setTitle('✅ 設定を更新しました')
        .addFields(
          { name: 'キー', value: `\`${key}\``, inline: false },
          { name: '新しい値', value: '```json\n' + JSON.stringify(value, null, 2) + '\n```', inline: false }
        )
        .setColor(0x00FF00)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } else {
      await interaction.editReply({
        content: '❌ 設定の更新に失敗しました',
        ephemeral: true
      });
    }
  } catch (error) {
    await interaction.editReply({
      content: `❌ エラー: ${error.message}`,
      ephemeral: true
    });
  }
}

async function handleBackup(interaction) {
  const success = backup();
  
  if (success) {
    const embed = new EmbedBuilder()
      .setTitle('💾 バックアップ完了')
      .setDescription('現在の設定をバックアップしました')
      .setColor(0x00FF00)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], ephemeral: true });
  } else {
    await interaction.editReply({
      content: '❌ バックアップに失敗しました',
      ephemeral: true
    });
  }
}

async function handleRestore(interaction) {
  const file = interaction.options.getString('file');
  
  const success = restoreFromBackup(file);
  
  if (success) {
    const embed = new EmbedBuilder()
      .setTitle('♻️ 復元完了')
      .setDescription(file ? `\`${file}\` から設定を復元しました` : '最新のバックアップから設定を復元しました')
      .setColor(0x00FF00)
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed], ephemeral: true });
  } else {
    await interaction.editReply({
      content: '❌ 復元に失敗しました',
      ephemeral: true
    });
  }
}

async function handleListBackups(interaction) {
  const backups = listBackups();
  
  if (backups.length === 0) {
    return await interaction.editReply({
      content: '⚠️ バックアップファイルが見つかりません',
      ephemeral: true
    });
  }
  
  const embed = new EmbedBuilder()
    .setTitle('📂 バックアップリスト')
    .setDescription(`利用可能なバックアップ: ${backups.length}個`)
    .setColor(0x00AE86)
    .setTimestamp();
  
  // 最新の10個のみ表示
  for (const backup of backups.slice(0, 10)) {
    const sizeKB = (backup.size / 1024).toFixed(2);
    embed.addFields({
      name: backup.name,
      value: `📅 ${backup.date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n💾 ${sizeKB} KB`,
      inline: true
    });
  }
  
  await interaction.editReply({ embeds: [embed], ephemeral: true });
}

async function handleExport(interaction) {
  const config = exportConfig();
  
  const jsonStr = JSON.stringify(config, null, 2);
  const buffer = Buffer.from(jsonStr, 'utf8');
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `config_export_${timestamp}.json`;
  
  await interaction.editReply({
    content: '✅ 設定をエクスポートしました',
    files: [{
      attachment: buffer,
      name: filename
    }],
    ephemeral: true
  });
}
