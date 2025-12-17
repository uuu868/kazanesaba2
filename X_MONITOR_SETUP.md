# X (Twitter) 監視機能セットアップ

## 必要な設定

### 1. X Developer アカウントの作成

1. [X Developer Portal](https://developer.twitter.com/) にアクセス
2. アカウントを作成し、アプリを登録
3. Bearer Token を取得

### 2. 環境変数の設定

`.env` ファイルに以下を追加:

```
X_BEARER_TOKEN=あなたのBearerToken
```

### 3. 使用方法

#### 監視アカウントを追加
```
/x-monitor add username:ユーザー名 channel:#チャンネル
```

例: `/x-monitor add username:elonmusk channel:#x-posts`

#### 監視アカウントを削除
```
/x-monitor remove username:ユーザー名
```

#### 監視中のアカウント一覧
```
/x-monitor list
```

## 動作仕様

- 5分ごとに監視対象アカウントの新しいポストをチェック
- 新しいポストが見つかると、指定されたDiscordチャンネルに自動投稿
- ポストのテキスト内容と、X へのリンクを含むEmbedメッセージを送信

## 注意事項

- X API の無料プランには月間の取得制限があります
- 多数のアカウントを監視すると制限に達する可能性があります
- Bot作成者のみがこのコマンドを使用できます

## トラブルシューティング

### Bearer Token が設定されていないエラー
- `.env` ファイルに `X_BEARER_TOKEN` が正しく設定されているか確認
- Botを再起動

### アカウントが見つからないエラー
- ユーザー名が正しいか確認（@は不要）
- アカウントが存在し、公開されているか確認

### レート制限エラー
- 監視アカウント数を減らす
- チェック間隔を長くする（コードの編集が必要）
