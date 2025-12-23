const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	    console.log("----------参加サーバー----------")
	    console.log(client.guilds.cache.map(guild => `${guild.name} || ${guild.memberCount}人`).join("\n"))
	    console.log("------------------------------")

	    // ステータスをクリア
	    client.user.setPresence({ activities: [], status: 'online' });

	    // 永続化されたリマインドをロードしてスケジュール
	    try {
	      const reminderManager = require('../utils/reminderManager');
	      reminderManager.loadAll(client);
	      console.log('[Ready] 永続リマインドをロードしました');
	    } catch (e) {
	      console.error('[Ready] リマインドロード中にエラー:', e);
	    }

	    // 固定メッセージをロード（存在確認付き）
	    try {
	      const pinMessageCommand = require('../commands/pin-message');
	      await pinMessageCommand.loadAllPinnedMessages(client);
	      console.log('[Ready] 固定メッセージの確認が完了しました');
	    } catch (e) {
	      console.error('[Ready] 固定メッセージロード中にエラー:', e);
	    }

	    // 重複チェッカーのクリーンアップを開始
	    try {
	      const duplicateChecker = require('../utils/duplicateChecker');
	      duplicateChecker.startCacheCleanup();
	      console.log('[Ready] 重複チェッカーを起動しました');
	    } catch (e) {
	      console.error('[Ready] 重複チェッカー起動中にエラー:', e);
	    }
	},
};
