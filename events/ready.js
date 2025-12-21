const { Events } = require('discord.js');
const { DefaultExtractors } = require('@discord-player/extractor');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	    console.log("----------参加サーバー----------")
	    console.log(client.guilds.cache.map(guild => `${guild.name} || ${guild.memberCount}人`).join("\n"))
	    console.log("------------------------------")

	    // discord-player extractorをロード
	    try {
	      await client.player.extractors.loadMulti(DefaultExtractors);
	      console.log('[Ready] Discord Player extractorをロードしました');
	    } catch (e) {
	      console.error('[Ready] Extractor読み込みエラー:', e);
	    }

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
	},
};
