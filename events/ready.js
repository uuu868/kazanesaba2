const { Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const RESTART_FILE = path.join(__dirname, '..', 'data', 'restart.json');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
	    console.log("----------参加サーバー----------")
	    console.log(client.guilds.cache.map(guild => `${guild.name} || ${guild.memberCount}人`).join("\n"))
	    console.log("------------------------------")

	    // 永続化されたリマインドをロードしてスケジュール
	    try {
	      const reminderManager = require('../utils/reminderManager');
	      reminderManager.loadAll(client);
	      console.log('[Ready] 永続リマインドをロードしました');
	    } catch (e) {
	      console.error('[Ready] リマインドロード中にエラー:', e);
	    }

	    // 再起動完了通知をチェック
	    try {
	      if (fs.existsSync(RESTART_FILE)) {
	        const data = JSON.parse(fs.readFileSync(RESTART_FILE, 'utf8'));
	        const channel = await client.channels.fetch(data.channelId).catch(() => null);
	        if (channel) {
	          await channel.send('✅ BOTの再起動が完了しました。');
	          console.log(`[Ready] 再起動完了通知を送信しました (チャンネル: ${channel.name})`);
	        }
	        // ファイルを削除
	        fs.unlinkSync(RESTART_FILE);
	      }
	    } catch (e) {
	      console.error('[Ready] 再起動通知中にエラー:', e);
	    }
	},
};
