const { SlashCommandBuilder } = require('discord.js');
const { isDebugMode, setDebugMode } = require('../utils/debugMode');

const ALLOWED_USER_ID = '1088020702583603270';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('debug-mode')
    .setDescription('デバッグモードのON/OFFを切り替え（メンション無効化）')
    .addStringOption(option =>
      option.setName('state')
        .setDescription('デバッグモードの状態')
        .setRequired(true)
        .addChoices(
          { name: 'ON', value: 'on' },
          { name: 'OFF', value: 'off' }
        )
    ),

  async execute(client, interaction) {
    // ユーザーIDチェック
    if (interaction.user.id !== ALLOWED_USER_ID) {
      await interaction.reply({ 
        content: 'このコマンドを使用する権限がありません。', 
        ephemeral: true 
      });
      return;
    }

    const state = interaction.options.getString('state');
    const enabled = state === 'on';

    setDebugMode(enabled);

    await interaction.reply({
      content: `✅ デバッグモードを **${enabled ? 'ON' : 'OFF'}** にしました。${enabled ? '\n（メンション送信が無効化されます）' : ''}`,
      ephemeral: true
    });

    console.log(`[DebugMode] Set to ${enabled ? 'ON' : 'OFF'} by ${interaction.user.tag}`);
  }
};
