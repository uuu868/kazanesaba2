const { Events } = require('discord.js');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

	    // Xモニターを起動
	    try {
	      const XMonitor = require('../utils/xMonitor');
	      const xMonitor = new XMonitor(client);
	      xMonitor.start();
	    } catch (e) {
	      console.error('[Ready] Xモニター起動中にエラー:', e);
	    }
	},
};
