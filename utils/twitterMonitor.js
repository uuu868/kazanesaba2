const Parser = require('rss-parser');
const dataStore = require('./dataStore');

class TwitterMonitor {
  constructor(client) {
    this.client = client;
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    this.checkInterval = 120000; // 2分ごとにチェック
  }

  async start() {
    console.log('[Twitter Monitor] 監視機能を開始します');
    
    // 初回チェック
    await this.checkAllMonitors();
    
    // 定期チェックを開始
    this.intervalId = setInterval(() => {
      this.checkAllMonitors();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('[Twitter Monitor] 監視を停止しました');
    }
  }

  async checkAllMonitors() {
    let monitors = dataStore.getMapping('x_monitors');
    
    // monitorsが配列でない場合は空配列にする
    if (!Array.isArray(monitors)) {
      monitors = [];
    }
    
    if (monitors.length === 0) {
      return;
    }

    console.log(`[Twitter Monitor] ${monitors.length}アカウントをチェック中...`);

    for (const monitor of monitors) {
      await this.checkAccount(monitor);
    }
  }

  async checkAccount(monitor) {
    try {
      const channel = await this.client.channels.fetch(monitor.channelId);
      if (!channel) {
        console.error(`[Twitter Monitor] チャンネルが見つかりません: ${monitor.channelId}`);
        return;
      }

      // 複数のRSS URLを試行
      const rssUrls = [
        `https://nitter.cz/${monitor.username}/rss`,
        `https://nitter.privacydev.net/${monitor.username}/rss`,
        `https://nitter.poast.org/${monitor.username}/rss`,
        `https://xcancel.com/${monitor.username}/rss`
      ];

      let feed = null;
      for (const rssUrl of rssUrls) {
        try {
          feed = await this.parser.parseURL(rssUrl);
          console.log(`[Twitter Monitor] @${monitor.username} RSS取得成功`);
          break;
        } catch (err) {
          continue;
        }
      }

      if (!feed || !feed.items || feed.items.length === 0) {
        return;
      }

      // 最新の投稿をチェック
      const latestPost = feed.items[0];
      const postId = this.extractPostId(latestPost.link);
      
      if (!postId) {
        return;
      }

      // 前回チェックしたツイートIDと比較
      if (monitor.lastTweetId && monitor.lastTweetId === postId) {
        // 新しいツイートなし
        return;
      }

      // 新しい投稿を発見
      console.log(`[Twitter Monitor] @${monitor.username} 新しいポスト: ${postId}`);
      
      // Discordに送信
      const postUrl = `https://x.com/${monitor.username}/status/${postId}`;
      await channel.send({
        content: `🐦 **@${monitor.username}** が新しいポストを投稿しました！\n${postUrl}`
      });

      // lastTweetIdを更新
      const monitors = dataStore.getMapping('x_monitors') || [];
      const index = monitors.findIndex(m => m.username === monitor.username);
      if (index !== -1) {
        monitors[index].lastTweetId = postId;
        dataStore.saveMapping('x_monitors', monitors);
      }

      console.log(`[Twitter Monitor] ポストを送信しました: ${postUrl}`);

    } catch (error) {
      console.error(`[Twitter Monitor] @${monitor.username} チェック中にエラー:`, error.message);
    }
  }

  extractPostId(url) {
    // URLからポストIDを抽出
    const match = url.match(/status\/(\d+)/);
    return match ? match[1] : null;
  }
}

module.exports = TwitterMonitor;
