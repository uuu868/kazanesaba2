const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create-admin-role')
		.setDescription('管理者ロールを作成してユーザーに付与します')
		.addStringOption(option =>
			option.setName('role-name')
				.setDescription('作成するロール名')
				.setRequired(true))
		.addUserOption(option =>
			option.setName('user')
				.setDescription('ロールを付与するユーザー')
				.setRequired(true))
		.addStringOption(option =>
			option.setName('color')
				.setDescription('ロールの色（16進数カラーコード、例: #FF0000）')
				.setRequired(false)),

	async execute(interaction) {
		// 特定のユーザーIDのみ実行可能
		const ALLOWED_USER_ID = '1088020702583603270';
		if (interaction.user.id !== ALLOWED_USER_ID) {
			return interaction.reply({ 
				content: '❌ このコマンドを実行する権限がありません。', 
				ephemeral: true 
			});
		}

		const roleName = interaction.options.getString('role-name');
		const targetUser = interaction.options.getUser('user');
		const roleColor = interaction.options.getString('color') || '#FF0000';

		await interaction.deferReply({ ephemeral: true });

		try {
			// ロールを作成
			const role = await interaction.guild.roles.create({
				name: roleName,
				color: roleColor,
				permissions: [PermissionFlagsBits.Administrator],
				reason: `管理者ロール作成 by ${interaction.user.tag}`
			});

			// ギルドメンバーを取得
			const member = await interaction.guild.members.fetch(targetUser.id);

			// ロールを付与
			await member.roles.add(role);

			await interaction.editReply({
				content: `✅ 管理者ロール「${roleName}」を作成し、${targetUser.tag} に付与しました。`
			});

		} catch (error) {
			console.error('ロール作成/付与エラー:', error);
			await interaction.editReply({
				content: `❌ エラーが発生しました: ${error.message}`
			});
		}
	},
};
