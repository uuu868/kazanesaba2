const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType
} = require('@discordjs/voice');
const play = require('play-dl');
const ffmpegPath = require('ffmpeg-static');

// FFmpegのパスを設定
if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

// 各サーバーのキューを管理
const queues = new Map();

class MusicQueue {
  constructor(guildId) {
    this.guildId = guildId;
    this.songs = [];
    this.connection = null;
    this.player = null;
    this.isPlaying = false;
    this.currentSong = null;
  }

  async joinChannel(voiceChannel) {
    try {
      this.connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: this.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      });

      await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);

      this.player = createAudioPlayer({
        behaviors: {
          noSubscriber: NoSubscriberBehavior.Pause,
        },
      });

      this.connection.subscribe(this.player);

      this.player.on(AudioPlayerStatus.Playing, () => {
        console.log('[Music] プレイヤー状態: Playing');
      });

      this.player.on(AudioPlayerStatus.Idle, () => {
        console.log('[Music] プレイヤー状態: Idle - 次の曲へ');
        this.playNext();
      });

      this.player.on('error', error => {
        console.error(`[Music] プレイヤーエラー:`, error);
        this.playNext();
      });

      this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
            entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
          ]);
        } catch (error) {
          this.destroy();
        }
      });

      console.log(`[Music] ボイスチャンネルに接続: ${voiceChannel.name}`);
      return true;
    } catch (error) {
      console.error('[Music] 接続エラー:', error);
      return false;
    }
  }

  async addSong(url, requestedBy) {
    try {
      console.log(`[Music] 動画情報取得中: ${url}`);
      
      // play-dlを使って動画情報を取得
      const info = await play.video_info(url);
      
      if (!info || !info.video_details) {
        throw new Error('動画情報を取得できませんでした');
      }

      console.log(`[Music] 動画情報取得成功: ${info.video_details.title}`);
      
      const song = {
        title: info.video_details.title,
        url: info.video_details.url,
        duration: info.video_details.durationInSec,
        thumbnail: info.video_details.thumbnails && info.video_details.thumbnails.length > 0 
          ? info.video_details.thumbnails[0].url 
          : null,
        requestedBy: requestedBy,
      };

      this.songs.push(song);
      return song;
    } catch (error) {
      console.error('[Music] 曲情報取得エラー:', error);
      throw error;
    }
  }

  async play() {
    if (this.isPlaying || this.songs.length === 0) {
      return;
    }

    this.currentSong = this.songs.shift();
    this.isPlaying = true;

    try {
      console.log(`[Music] 再生準備中: ${this.currentSong.url}`);
      const stream = await play.stream(this.currentSong.url);
      
      console.log(`[Music] ストリーム取得成功, type: ${stream.type}`);
      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });

      this.player.play(resource);
      console.log(`[Music] 再生開始: ${this.currentSong.title}`);
    } catch (error) {
      console.error('[Music] 再生エラー:', error);
      this.isPlaying = false;
      this.playNext();
    }
  }

  playNext() {
    this.isPlaying = false;
    this.currentSong = null;

    if (this.songs.length > 0) {
      this.play();
    } else {
      // キューが空になったら5秒後に切断
      setTimeout(() => {
        if (this.songs.length === 0 && !this.isPlaying) {
          this.destroy();
        }
      }, 5000);
    }
  }

  skip() {
    if (this.player) {
      this.player.stop();
    }
  }

  stop() {
    this.songs = [];
    if (this.player) {
      this.player.stop();
    }
    this.destroy();
  }

  destroy() {
    if (this.connection) {
      this.connection.destroy();
    }
    this.connection = null;
    this.player = null;
    this.isPlaying = false;
    this.currentSong = null;
    queues.delete(this.guildId);
    console.log(`[Music] キューを破棄しました (Guild: ${this.guildId})`);
  }
}

/**
 * サーバーのキューを取得または作成
 */
function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, new MusicQueue(guildId));
  }
  return queues.get(guildId);
}

/**
 * YouTubeのURLかチェック
 */
function isYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/.test(url);
}

/**
 * URLから曲を再生
 */
async function playFromUrl(guild, voiceChannel, url, textChannel, requestedBy) {
  try {
    if (!isYouTubeUrl(url)) {
      return { success: false, message: 'YouTube URLのみ対応しています。' };
    }

    const queue = getQueue(guild.id);

    // まだボイスチャンネルに接続していない場合
    if (!queue.connection) {
      const joined = await queue.joinChannel(voiceChannel);
      if (!joined) {
        return { success: false, message: 'ボイスチャンネルへの接続に失敗しました。' };
      }
    }

    // 曲をキューに追加
    const song = await queue.addSong(url, requestedBy);

    // 再生中でなければ再生開始
    if (!queue.isPlaying) {
      await queue.play();
      return { 
        success: true, 
        message: `🎵 再生開始: **${song.title}**`,
        song: song,
        isPlaying: true
      };
    } else {
      return { 
        success: true, 
        message: `➕ キューに追加: **${song.title}**\n順番: ${queue.songs.length + 1}番目`,
        song: song,
        isPlaying: false
      };
    }
  } catch (error) {
    console.error('[Music] playFromUrl エラー:', error);
    return { success: false, message: `エラー: ${error.message}` };
  }
}

module.exports = {
  getQueue,
  playFromUrl,
  isYouTubeUrl,
};
