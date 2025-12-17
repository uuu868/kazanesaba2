const { EmbedBuilder } = require('discord.js');
const dataStore = require('./dataStore');
const https = require('https');

class XMonitor {
  constructor(client) {
    this.client = client;
    this.checkInterval = null;
    this.bearerToken = process.env.X_BEARER_TOKEN || '';
  }

  start() {
    if (!this.bearerToken) {
      console.log('[X Monitor] Bearer Tokenが設定されていません。X_BEARER_TOKEN環境変数を設定してください。');
      return;
    }

    console.log('[X Monitor] 監視を開始します');
    
    // 初回実行
    this.checkAllAccounts();

    // 5分ごとにチェック
    this.checkInterval = setInterval(() => {
      this.checkAllAccounts();
    }, 5 * 60 * 1000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[X Monitor] 監視を停止しました');
    }
  }

  async checkAllAccounts() {
    const monitors = dataStore.getMapping('x_monitors') || [];
    
    if (monitors.length === 0) {
      return;
    }

    console.log(`[X Monitor] ${monitors.length}個のアカウントをチェック中...`);

    for (const monitor of monitors) {
      try {
        await this.checkAccount(monitor);
        // レート制限対策として少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (err) {
        console.error(`[X Monitor] @${monitor.username} のチェックに失敗:`, err.message);
      }
    }
  }

  async checkAccount(monitor) {
    try {
      // ユーザー情報を取得
      const userId = await this.getUserId(monitor.username);
      if (!userId) {
        console.error(`[X Monitor] @${monitor.username} のユーザーIDを取得できませんでした`);
        return;
      }

      // 最新のツイートを取得
      const tweets = await this.getUserTweets(userId, monitor.lastTweetId);
      
      if (tweets.length === 0) {
        return;
      }

      console.log(`[X Monitor] @${monitor.username}: ${tweets.length}件の新しいポストを検出`);

      // 古い順に処理（時系列順に投稿）
      tweets.reverse();

      for (const tweet of tweets) {
        await this.postToDiscord(monitor, tweet);
      }

      // 最新のツイートIDを保存
      const monitors = dataStore.getMapping('x_monitors') || [];
      const index = monitors.findIndex(m => m.username === monitor.username);
      if (index !== -1) {
        monitors[index].lastTweetId = tweets[tweets.length - 1].id;
        dataStore.saveMapping('x_monitors', monitors);
      }

    } catch (err) {
      console.error(`[X Monitor] @${monitor.username} の処理エラー:`, err);
    }
  }

  async getUserId(username) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.twitter.com',
        path: `/2/users/by/username/${username}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'User-Agent': 'Discord-Bot-X-Monitor/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.data && json.data.id) {
              resolve(json.data.id);
            } else {
              console.error(`[X Monitor] ユーザーID取得失敗: ${data}`);
              resolve(null);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.end();
    });
  }

  async getUserTweets(userId, sinceId) {
    return new Promise((resolve, reject) => {
      let path = `/2/users/${userId}/tweets?max_results=10&tweet.fields=created_at,text,entities`;
      if (sinceId) {
        path += `&since_id=${sinceId}`;
      }

      const options = {
        hostname: 'api.twitter.com',
        path: path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'User-Agent': 'Discord-Bot-X-Monitor/1.0'
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.data) {
              resolve(json.data);
            } else {
              resolve([]);
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (e) => {
        reject(e);
      });

      req.end();
    });
  }

  async postToDiscord(monitor, tweet) {
    try {
      const channel = await this.client.channels.fetch(monitor.channelId);
      if (!channel) {
        console.error(`[X Monitor] チャンネルが見つかりません: ${monitor.channelId}`);
        return;
      }

      const tweetUrl = `https://twitter.com/${monitor.username}/status/${tweet.id}`;
      
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: `@${monitor.username}`,
          url: `https://twitter.com/${monitor.username}`,
          iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png'
        })
        .setDescription(tweet.text)
        .setColor(0x1DA1F2)
        .setTimestamp(new Date(tweet.created_at))
        .setFooter({ text: 'X (Twitter)' });

      // ツイートへのリンクを追加
      await channel.send({
        content: `🐦 **@${monitor.username}** が新しいポストをしました\n${tweetUrl}`,
        embeds: [embed]
      });

      console.log(`[X Monitor] Discordに投稿しました: @${monitor.username} - ${tweet.id}`);

    } catch (err) {
      console.error(`[X Monitor] Discord投稿エラー:`, err);
    }
  }
}

module.exports = XMonitor;
