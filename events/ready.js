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

	    // 固定メッセージをロード
	    try {
	      const pinMessageCommand = require('../commands/pin-message');
	      pinMessageCommand.loadAllPinnedMessages();
	      console.log('[Ready] 固定メッセージをロードしました');
	    } catch (e) {
	      console.error('[Ready] 固定メッセージロード中にエラー:', e);
	    }
	},
};
