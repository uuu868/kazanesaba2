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
    this.checkInterval = 600000; // 10分ごとにチェック（安定化のため間隔を延長）
    this.lastSuccessfulSource = {}; // アカウントごとに成功したRSSソースを記憶
    this.failureCount = {}; // 失敗回数を記録
  }

  async start() {
    console.log('[Twitter Monitor] 監視機能を開始します（チェック間隔: 10分）');
    
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
    let monitors = dataStore.loadData('x_monitors', []);
    
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
      // 各アカウントのチェック間に少し待機（レート制限対策）
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  async checkAccount(monitor) {
    try {
      // 連続失敗が多い場合はスキップ
      const failCount = this.failureCount[monitor.username] || 0;
      if (failCount > 5) {
        if (failCount === 6) {
          console.log(`[Twitter Monitor] @${monitor.username} 連続失敗のため一時的に監視を停止します`);
          this.failureCount[monitor.username] = 7; // ログを1回だけ出力
        }
        return;
      }
      
      const channel = await this.client.channels.fetch(monitor.channelId);
      if (!channel) {
        console.error(`[Twitter Monitor] @${monitor.username} チャンネルが見つかりません: ${monitor.channelId}`);
        return;
      }

      // 複数のRSS URLを試行（前回成功したソースを優先）
      const rssUrls = [
        `https://nitter.net/${monitor.username}/rss`,
        `https://nitter.privacytools.io/${monitor.username}/rss`,
        `https://nitter.1d4.us/${monitor.username}/rss`,
        `https://nitter.kavin.rocks/${monitor.username}/rss`,
        `https://nitter.unixfox.eu/${monitor.username}/rss`
      ];
      
      // 前回成功したソースがあれば最初に試す
      if (this.lastSuccessfulSource[monitor.username]) {
        const successUrl = this.lastSuccessfulSource[monitor.username];
        const index = rssUrls.indexOf(successUrl);
        if (index > 0) {
          rssUrls.splice(index, 1);
          rssUrls.unshift(successUrl);
        }
      }

      let feed = null;
      let successUrl = null;
      let attemptCount = 0;
      
      for (const rssUrl of rssUrls) {
        attemptCount++;
        try {
          feed = await this.parser.parseURL(rssUrl);
          successUrl = rssUrl;
          this.lastSuccessfulSource[monitor.username] = successUrl;
          this.failureCount[monitor.username] = 0; // 成功したら失敗カウントをリセット
          console.log(`[Twitter Monitor] @${monitor.username} RSS取得成功`);
          break;
        } catch (err) {
          // エラーログは最初と最後のみ
          if (attemptCount === 1 || attemptCount === rssUrls.length) {
            console.log(`[Twitter Monitor] @${monitor.username} RSS取得試行中... (${attemptCount}/${rssUrls.length})`);
          }
          continue;
        }
      }

      if (!feed || !feed.items || feed.items.length === 0) {
        this.failureCount[monitor.username] = (this.failureCount[monitor.username] || 0) + 1;
        console.log(`[Twitter Monitor] @${monitor.username} フィード取得失敗 (${this.failureCount[monitor.username]}回目)`);
        return;
      }

      // 最新の投稿をチェック
      const latestPost = feed.items[0];
      
      const postId = this.extractPostId(latestPost.link || latestPost.guid);
      
      if (!postId) {
        console.log(`[Twitter Monitor] @${monitor.username} ポストID抽出失敗`);
        return;
      }

      // 前回チェックしたツイートIDと比較
      if (monitor.lastTweetId && monitor.lastTweetId === postId) {
        // 新しいツイートなし（ログは出力しない）
        return;
      }

      // 新しい投稿を発見
      console.log(`[Twitter Monitor] @${monitor.username} 新しいポスト発見: ${postId}`);
      
      // Discordに送信
      const postUrl = `https://x.com/${monitor.username}/status/${postId}`;
      await channel.send({
        content: `🐦 **@${monitor.username}** が新しいポストを投稿しました！\n${postUrl}`
      });
      
      console.log(`[Twitter Monitor] @${monitor.username} ポストを送信しました`);

      // lastTweetIdを更新
      const monitors = dataStore.loadData('x_monitors', []);
      const index = monitors.findIndex(m => m.username === monitor.username);
      if (index !== -1) {
        monitors[index].lastTweetId = postId;
        dataStore.saveData('x_monitors', monitors);
      }

      console.log(`[Twitter Monitor] ポストを送信しました: ${postUrl}`);

    } catch (error) {
      console.error(`[Twitter Monitor] @${monitor.username} チェック中にエラー:`, error.message);
    }
  }

  extractPostId(url) {
    // URLからポストIDを抽出（エラーログを簡潔に）
    if (!url) return null;
    
    // 複数のパターンに対応
    const patterns = [
      /status\/(\d+)/,           // twitter.com/user/status/123456
      /\/(\d+)#m$/,              // xcancel形式の可能性
      /\/(\d+)$/,                // 末尾が数字
      /i\/web\/status\/(\d+)/    // i/web/status/形式
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }
}

module.exports = TwitterMonitor;
