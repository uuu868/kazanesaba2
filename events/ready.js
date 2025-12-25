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

	    // リモートから最新データをプル（再起動後のデータ同期）
	    try {
	      console.log('[Ready] リモートから最新データをプル中...');
	      await execPromise('git pull origin $(git branch --show-current)');
	      console.log('[Ready] ✓ データのプル完了');
	    } catch (error) {
	      // プルエラーは致命的ではないので警告のみ
	      if (error.message.includes('Already up to date')) {
	        console.log('[Ready] データは最新です');
	      } else {
	        console.warn('[Ready] データのプル中にエラー:', error.message);
	      }
	    }

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
	},
};
