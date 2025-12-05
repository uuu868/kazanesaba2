const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Ping値を計測します')
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

	async execute(client, interaction) {
		// 管理者権限チェック
		if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
			await interaction.reply({ content: 'このコマンドは管理者のみ使用できます。', flags: 64 });
			return;
		}

		await interaction.reply({ content: `計算中`, ephemeral: true });
		await interaction.editReply({ content: `Pong! APIレイテンシ : ${Math.round(client.ws.ping)}ms 🛰️`, ephemeral: true });
	},
};
