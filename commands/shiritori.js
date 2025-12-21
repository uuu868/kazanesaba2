const { SlashCommandBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const shiritoriManager = require('../utils/shiritoriManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiritori')
    .setDescription('しりとりゲームを管理します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('しりとりをリセットして最初からやり直します')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('しりとりの状態を確認します')
    ),

  async execute(client, interaction) {
    // ロールチェック
    if (!(await ensureAllowed(interaction))) return;

    const subcommand = interaction.options.getSubcommand();

    try {
      if (subcommand === 'reset') {
        await handleReset(interaction);
      } else if (subcommand === 'status') {
        await handleStatus(interaction);
      }
    } catch (error) {
      console.error('[Shiritori Command] エラー:', error);
      await interaction.reply({ 
        content: `エラーが発生しました: ${error.message}`, 
        ephemeral: true 
      });
    }
  },
};

async function handleReset(interaction) {
  shiritoriManager.resetShiritori(interaction.guild.id);
  
  await interaction.reply({
    content: '✅ しりとりをリセットしました！\n<#' + shiritoriManager.SHIRITORI_CHANNEL_ID + '> で新しくスタートしてください。',
    ephemeral: true
  });
}

async function handleStatus(interaction) {
  const status = shiritoriManager.getShiritoriStatus(interaction.guild.id);
  
  let statusText = '**しりとりの状態**\n\n';
  
  if (status.wordCount === 0) {
    statusText += '📊 まだゲームが始まっていません\n';
    statusText += '\n<#' + shiritoriManager.SHIRITORI_CHANNEL_ID + '> で言葉を入力してスタートしてください！';
  } else {
    statusText += `📊 使用単語数: **${status.wordCount}個**\n`;
    statusText += `📝 最後の単語: **${status.lastWord}**\n`;
    statusText += `🔤 次の文字: **${status.lastChar}**\n\n`;
    
    if (status.recentWords.length > 0) {
      statusText += '**最近使われた単語:**\n';
      statusText += status.recentWords.slice(-5).reverse().map((word, i) => `${i + 1}. ${word}`).join('\n');
    }
  }
  
  await interaction.reply({
    content: statusText,
    ephemeral: true
  });
}
