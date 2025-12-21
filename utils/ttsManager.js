const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const googleTTS = require('google-tts-api');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { loadData, saveData } = require('./dataStore');

// 各サーバーの読み上げ設定を管理
const guildSettings = new Map();
// 各サーバーのボイス接続を管理
const connections = new Map();
// 各サーバーの音声プレイヤーを管理
const players = new Map();
// 各サーバーの読み上げキューを管理
const queues = new Map();

// 一時ファイルディレクトリ
const tempDir = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * 読み上げ設定をロード
 */
function loadSettings() {
  const data = loadData('ttsSettings', {});
  for (const [guildId, settings] of Object.entries(data)) {
    guildSettings.set(guildId, settings);
  }
}

/**
 * 読み上げ設定を保存
 */
function saveSettings() {
  const data = Object.fromEntries(guildSettings);
  saveData('ttsSettings', data);
}

/**
 * サーバーの設定を取得
 */
function getSettings(guildId) {
  if (!guildSettings.has(guildId)) {
    guildSettings.set(guildId, {
      enabled: false,
      channelId: null,
      voiceChannelId: null,
      maxLength: 200,
      language: 'ja'
    });
  }
  return guildSettings.get(guildId);
}

/**
 * サーバーの設定を更新
 */
function updateSettings(guildId, newSettings) {
  const settings = getSettings(guildId);
  Object.assign(settings, newSettings);
  guildSettings.set(guildId, settings);
  saveSettings();
}

/**
 * ボイスチャンネルに接続
 */
async function joinChannel(guild, voiceChannel) {
  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    // 接続完了を待つ
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    
    connections.set(guild.id, connection);
    
    // プレイヤーを作成してサブスクライブ
    const player = createAudioPlayer();
    connection.subscribe(player);
    players.set(guild.id, player);
    
    // キューを初期化
    queues.set(guild.id, []);
    
    // プレイヤーのイベント設定
    player.on(AudioPlayerStatus.Idle, () => {
      playNext(guild.id);
    });
    
    player.on('error', error => {
      console.error(`[TTS] プレイヤーエラー: ${error.message}`);
      playNext(guild.id);
    });
    
    // 切断イベント
    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        connection.destroy();
        cleanup(guild.id);
      }
    });
    
    console.log(`[TTS] ボイスチャンネルに接続: ${voiceChannel.name} (${guild.name})`);
    return connection;
  } catch (error) {
    console.error('[TTS] 接続エラー:', error);
    throw error;
  }
}

/**
 * ボイスチャンネルから切断
 */
function leaveChannel(guildId) {
  const connection = connections.get(guildId);
  if (connection) {
    connection.destroy();
  }
  cleanup(guildId);
  console.log(`[TTS] ボイスチャンネルから切断 (Guild: ${guildId})`);
}

/**
 * クリーンアップ
 */
function cleanup(guildId) {
  connections.delete(guildId);
  players.delete(guildId);
  queues.delete(guildId);
}

/**
 * テキストを音声に変換して再生キューに追加
 */
async function addToQueue(guildId, text) {
  try {
    const settings = getSettings(guildId);
    
    // テキストの長さ制限
    if (text.length > settings.maxLength) {
      text = text.substring(0, settings.maxLength);
    }
    
    // URLを除去
    text = text.replace(/https?:\/\/[^\s]+/g, 'URL省略');
    
    // メンションを除去
    text = text.replace(/<@!?\d+>/g, '').replace(/<@&\d+>/g, '').replace(/<#\d+>/g, '');
    
    // 絵文字を除去
    text = text.replace(/<a?:\w+:\d+>/g, '');
    
    if (!text.trim()) {
      return;
    }
    
    const queue = queues.get(guildId);
    if (!queue) {
      console.error(`[TTS] キューが見つかりません: ${guildId}`);
      return;
    }
    
    queue.push(text);
    
    // 既に再生中でなければ再生開始
    const player = players.get(guildId);
    if (player && player.state.status === AudioPlayerStatus.Idle) {
      playNext(guildId);
    }
  } catch (error) {
    console.error('[TTS] キュー追加エラー:', error);
  }
}

/**
 * 次の音声を再生
 */
async function playNext(guildId) {
  const queue = queues.get(guildId);
  const player = players.get(guildId);
  
  if (!queue || !player || queue.length === 0) {
    return;
  }
  
  const text = queue.shift();
  const settings = getSettings(guildId);
  
  try {
    // Google TTS APIでURLを取得
    const url = googleTTS.getAudioUrl(text, {
      lang: settings.language,
      slow: false,
      host: 'https://translate.google.com',
    });
    
    // 音声データをダウンロード
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'arraybuffer'
    });
    
    // 一時ファイルに保存
    const tempFile = path.join(tempDir, `tts_${guildId}_${Date.now()}.mp3`);
    fs.writeFileSync(tempFile, response.data);
    
    // 音声リソースを作成して再生
    const resource = createAudioResource(tempFile);
    player.play(resource);
    
    // 再生完了後にファイルを削除
    setTimeout(() => {
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }, 10000);
    
  } catch (error) {
    console.error('[TTS] 再生エラー:', error);
    // エラーが発生しても次の音声を再生
    playNext(guildId);
  }
}

/**
 * 読み上げが有効かチェック
 */
function isEnabled(guildId) {
  const settings = getSettings(guildId);
  return settings.enabled && connections.has(guildId);
}

/**
 * 読み上げ対象のチャンネルかチェック
 */
function isTargetChannel(guildId, channelId) {
  const settings = getSettings(guildId);
  return settings.channelId === channelId;
}

// 起動時に設定をロード
loadSettings();

module.exports = {
  getSettings,
  updateSettings,
  joinChannel,
  leaveChannel,
  addToQueue,
  isEnabled,
  isTargetChannel,
  connections,
};
