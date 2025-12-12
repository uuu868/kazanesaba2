const { Events, ActivityType } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	    console.log("----------参加サーバー----------")
	    console.log(client.guilds.cache.map(guild => `${guild.name} || ${guild.memberCount}人`).join("\n"))
	    console.log("------------------------------")

	    // BOTのステータスを設定
	    client.user.setActivity('テスト', { type: ActivityType.Playing });

	    // 永続化されたリマインドをロードしてスケジュール
	    try {
	      const reminderManager = require('../utils/reminderManager');
	      reminderManager.loadAll(client);
	      console.log('[Ready] 永続リマインドをロードしました');
	    } catch (e) {
	      console.error('[Ready] リマインドロード中にエラー:', e);
	    }
	},
};
