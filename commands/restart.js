const { SlashCommandBuilder } = require('discord.js');
const { ensureAllowed } = require('../utils/roleGuard');
const { commitChanges, pushChanges } = require('../utils/autoCommit');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('restart')
		.setDescription('Botを再起動します'),

	async execute(interaction) {
		const client = interaction.client;
		
		// ロールチェック
		if (!(await ensureAllowed(interaction))) return;

		await interaction.reply({ content: '🔄 Botを再起動しています...\n💾 データを保存中...', ephemeral: true });

		console.log(`Bot restart requested by ${interaction.user.tag}`);

		// データを保存してから再起動
		setTimeout(async () => {
			try {
				console.log('[Restart] データを保存しています...');
				
				// Gitコミット&プッシュを実行
				const committed = await commitChanges(false); // コミットのみ
				if (committed) {
					console.log('[Restart] データのコミット完了');
					await pushChanges(); // プッシュ
					console.log('[Restart] データのプッシュ完了');
				}
				
				await interaction.editReply({ content: '🔄 Botを再起動しています...\n✅ データ保存完了' }).catch(() => {});
				
				// 再起動実行
				setTimeout(() => {
					console.log('[Restart] Botを再起動します...');
					process.exit(0); // プロセスを終了（PM2などのプロセスマネージャーが自動的に再起動します）
				}, 1000);
				
			} catch (error) {
				console.error('[Restart] データ保存中にエラー:', error);
				await interaction.editReply({ content: '⚠️ データ保存中にエラーが発生しましたが、再起動します...' }).catch(() => {});
				
				setTimeout(() => {
					process.exit(0);
				}, 1000);
			}
		}, 500);
	},
};
