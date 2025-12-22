const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

require('dotenv').config();

// ログフック機能を初期化（Clientが作成された直後に実行）
const { initLogHook } = require('./utils/logHook');
initLogHook(client);
const fs = require('node:fs');
const path = require('node:path');

//-----------commands------------

require("./deploy-commands.js");

//--------------------コマンドを読み込む--------------------------
//スラッシュコマンド
client.commands = new Collection();
const slashcommandsPath = path.join(__dirname, 'commands');
const slashcommandFiles = fs.readdirSync(slashcommandsPath).filter(file => file.endsWith('.js'));

for (const file of slashcommandFiles) {
	const slashfilePath = path.join(slashcommandsPath, file);
	const command = require(slashfilePath);
  console.log(`-> [Loaded Command] ${file.split('.')[0]}`);
	client.commands.set(command.data.name, command);
}

//イベントコマンド
const eventsPath = path.join(__dirname, 'events');
const eventsFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventsFiles) {
	const eventfilePath = path.join(eventsPath, file);
	const event = require(eventfilePath);
  if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
  console.log(`-> [Loaded Event] ${file.split('.')[0]}`);
}

// Git自動コミット機能を初期化
const { startAutoCommit } = require('./utils/autoCommit');

// スケジュール再起動機能を初期化
const { setupScheduledRestart } = require('./utils/scheduledRestart');

client.once(Events.ClientReady, () => {
  // Git自動コミットを開始
  startAutoCommit();
  
  // スケジュール再起動を設定
  setupScheduledRestart();
});

client.login(process.env.TOKEN);