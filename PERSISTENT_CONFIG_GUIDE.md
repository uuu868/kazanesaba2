# 永続設定システム - 使用ガイド

## 概要

このシステムは、Discord botの設定を再起動後も保持するための包括的なソリューションです。以下の機能を提供します：

- ✅ **自動保存**: 5分ごとに設定を自動保存
- ✅ **自動バックアップ**: 1時間ごとに設定をバックアップ
- ✅ **起動時自動読み込み**: Bot起動時に設定を自動的に読み込み
- ✅ **再起動前の保存**: 再起動前に必ず設定を保存
- ✅ **復元機能**: バックアップから設定を復元
- ✅ **エクスポート/インポート**: 設定のエクスポート・インポート

## 設定ファイルの場所

- **メイン設定**: `data/persistent_config.json`
- **バックアップ**: `data/backups/config_backup_YYYY-MM-DDTHH-MM-SS.json`

## 使用方法

### 1. プログラムから設定を使用する

```javascript
const { getConfig, setConfig } = require('./utils/persistentConfig');

// 設定を取得
const prefix = getConfig('botSettings.prefix'); // '!'
const allSettings = getConfig(); // すべての設定

// 設定を更新（自動保存される）
setConfig('botSettings.prefix', '?');
setConfig('features.debugMode', true);
setConfig('customSettings.myFeature', { enabled: true, value: 100 });
```

### 2. Discordコマンドで設定を管理する

#### 設定を表示
```
/config view
/config view key:botSettings.prefix
```

#### 設定を変更
```
/config set key:botSettings.prefix value:!
/config set key:features.debugMode value:true
/config set key:customSettings.myData value:{"test": 123}
```

#### バックアップを作成
```
/config backup
```

#### バックアップから復元
```
/config restore
/config restore file:config_backup_2025-12-26T12-00-00.json
```

#### バックアップリストを表示
```
/config list-backups
```

#### 設定をエクスポート
```
/config export
```

## 設定構造

```json
{
  "botSettings": {
    "prefix": "!",
    "language": "ja",
    "timezone": "Asia/Tokyo"
  },
  "features": {
    "autoBackup": true,
    "autoSave": true,
    "debugMode": false
  },
  "channels": {
    "notification": null,
    "logs": null,
    "tickets": null
  },
  "roles": {
    "admin": [],
    "moderator": [],
    "ticketManager": []
  },
  "customSettings": {},
  "lastUpdated": "2025-12-26T12:00:00.000Z",
  "version": "1.0.0"
}
```

## プログラムAPIリファレンス

### `initialize()`
設定システムを初期化します（Bot起動時に自動実行）。

### `getConfig(key)`
設定を取得します。
- **パラメータ**: `key` (string, オプション) - ドット記法のキー（例: 'botSettings.prefix'）
- **戻り値**: 設定値またはすべての設定

### `setConfig(key, value)`
設定を更新します（自動保存）。
- **パラメータ**: 
  - `key` (string) - ドット記法のキー
  - `value` (any) - 設定値

### `save()`
現在の設定を即座に保存します。

### `backup()`
現在の設定をバックアップファイルに保存します。

### `restoreFromBackup(backupFile)`
バックアップから設定を復元します。
- **パラメータ**: `backupFile` (string, オプション) - バックアップファイル名（省略で最新）

### `exportConfig()`
設定をJSON形式でエクスポートします。

### `importConfig(config)`
設定をインポートします。

### `listBackups()`
利用可能なバックアップのリストを取得します。

## 実装例

### カスタム機能で設定を使用

```javascript
// commands/my-feature.js
const { getConfig, setConfig } = require('../utils/persistentConfig');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('my-feature')
    .setDescription('カスタム機能')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('モード設定')
        .setRequired(true)
    ),

  async execute(interaction) {
    const mode = interaction.options.getString('mode');
    
    // 現在の設定を取得
    const currentMode = getConfig('customSettings.myFeature.mode') || 'default';
    
    // 設定を更新（自動保存される）
    setConfig('customSettings.myFeature.mode', mode);
    setConfig('customSettings.myFeature.lastChanged', new Date().toISOString());
    
    await interaction.reply(`✅ モードを ${currentMode} から ${mode} に変更しました`);
  }
};
```

### イベントハンドラーで設定を使用

```javascript
// events/my-event.js
const { getConfig } = require('../utils/persistentConfig');

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // 設定から値を取得
    const prefix = getConfig('botSettings.prefix') || '!';
    const debugMode = getConfig('features.debugMode') || false;
    
    if (debugMode) {
      console.log(`[Debug] メッセージ受信: ${message.content}`);
    }
    
    if (!message.content.startsWith(prefix)) return;
    
    // コマンド処理...
  }
};
```

## 自動化機能

### 自動保存
- **頻度**: 5分ごと
- **設定**: `features.autoSave` で有効/無効を切り替え

### 自動バックアップ
- **頻度**: 1時間ごと
- **保持数**: 最新10個を保持（古いものは自動削除）
- **設定**: `features.autoBackup` で有効/無効を切り替え

### 再起動時の保存
Bot再起動前に自動的に：
1. 現在の設定を保存
2. バックアップを作成
3. Gitにコミット&プッシュ（autoCommit機能有効時）

## トラブルシューティング

### 設定が保存されない場合
1. `data/` ディレクトリに書き込み権限があるか確認
2. `features.autoSave` が `true` に設定されているか確認
3. コンソールログでエラーメッセージを確認

### バックアップから復元できない場合
1. `data/backups/` ディレクトリにバックアップファイルが存在するか確認
2. `/config list-backups` でファイル名を確認
3. 正しいファイル名を指定しているか確認

### 設定がリセットされる場合
1. `data/persistent_config.json` が削除されていないか確認
2. 最新のバックアップから復元: `/config restore`
3. Gitから復元（autoCommit機能有効時）: `git checkout data/persistent_config.json`

## 注意事項

- 設定ファイルは自動的に `data/` ディレクトリに保存されます
- バックアップは最新10個のみ保持されます（古いものは自動削除）
- 大きなデータ（1MB以上）を設定に保存することは推奨されません
- 機密情報（トークン等）は設定システムではなく `.env` ファイルに保存してください

## 利点

1. **再起動耐性**: サーバーがクラッシュしても設定は保持されます
2. **履歴管理**: バックアップにより過去の設定に戻せます
3. **柔軟性**: プログラムとDiscordコマンドの両方から操作可能
4. **自動化**: 手動での保存操作が不要
5. **安全性**: プロセス終了時に自動保存されます

## 更新履歴

- **v1.0.0** (2025-12-26)
  - 初回リリース
  - 基本的な永続設定機能
  - 自動保存・バックアップ機能
  - Discordコマンド実装
