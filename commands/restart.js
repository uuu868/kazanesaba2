const { SlashCommandBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('restart')
		.setDescription('Botを再起動します'),

	async execute(interaction) {
		const client = interaction.client;
		
		// ロールチェック
		if (!(await ensureAllowed(interaction))) return;

		await interaction.reply({ content: '🔄 Botを再起動しています...', ephemeral: true });

		console.log(`Bot restart requested by ${interaction.user.tag}`);

		// 少し待ってから再起動
		setTimeout(() => {
			console.log('Restarting bot...');
			process.exit(0); // プロセスを終了（PM2などのプロセスマネージャーが自動的に再起動します）
		}, 1000);
	},
};
