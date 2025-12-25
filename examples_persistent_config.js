/**
 * 永続設定システムの使用例
 * 
 * このファイルでは、様々な場面での永続設定システムの使い方を示します。
 */

const { getConfig, setConfig } = require('./utils/persistentConfig');

// ==========================================
// 例1: 基本的な設定の取得と更新
// ==========================================

function example1_BasicUsage() {
  console.log('=== 例1: 基本的な使用方法 ===');
  
  // 設定を取得
  const prefix = getConfig('botSettings.prefix');
  console.log('現在のPrefix:', prefix);
  
  // 設定を更新（自動保存される）
  setConfig('botSettings.prefix', '?');
  console.log('Prefixを変更しました');
  
  // 確認
  console.log('新しいPrefix:', getConfig('botSettings.prefix'));
}

// ==========================================
// 例2: カスタム設定の保存
// ==========================================

function example2_CustomSettings() {
  console.log('\n=== 例2: カスタム設定 ===');
  
  // カスタム設定を保存
  setConfig('customSettings.welcomeMessage', {
    enabled: true,
    message: 'ようこそ、{user}さん！',
    channel: '1234567890',
    color: '#00FF00'
  });
  
  // 取得して使用
  const welcomeSettings = getConfig('customSettings.welcomeMessage');
  if (welcomeSettings.enabled) {
    console.log('ウェルカムメッセージ:', welcomeSettings.message);
  }
}

// ==========================================
// 例3: 配列データの管理
// ==========================================

function example3_ArrayData() {
  console.log('\n=== 例3: 配列データ ===');
  
  // 初期化
  let adminRoles = getConfig('roles.admin') || [];
  console.log('現在の管理者ロール:', adminRoles);
  
  // 新しいロールIDを追加
  const newRoleId = '9876543210';
  if (!adminRoles.includes(newRoleId)) {
    adminRoles.push(newRoleId);
    setConfig('roles.admin', adminRoles);
    console.log('管理者ロールを追加しました');
  }
  
  // 確認
  console.log('更新後の管理者ロール:', getConfig('roles.admin'));
}

// ==========================================
// 例4: イベントハンドラーでの使用
// ==========================================

function example4_EventHandler(message) {
  // debugModeを確認
  const debugMode = getConfig('features.debugMode');
  
  if (debugMode) {
    console.log('[Debug] メッセージ受信:', message.content);
  }
  
  // prefixを取得
  const prefix = getConfig('botSettings.prefix') || '!';
  
  if (message.content.startsWith(prefix)) {
    // コマンド処理
    console.log('コマンド検出');
  }
}

// ==========================================
// 例5: 統計情報の保存
// ==========================================

function example5_Statistics() {
  console.log('\n=== 例5: 統計情報 ===');
  
  // コマンド実行回数をカウント
  const commandName = 'ping';
  const statsKey = `customSettings.stats.commands.${commandName}`;
  
  const currentCount = getConfig(statsKey) || 0;
  setConfig(statsKey, currentCount + 1);
  
  console.log(`${commandName}コマンドの実行回数:`, currentCount + 1);
  
  // 最終実行時刻を記録
  setConfig(`customSettings.stats.lastExecution.${commandName}`, new Date().toISOString());
}

// ==========================================
// 例6: 機能のオン/オフ管理
// ==========================================

function example6_FeatureToggle(featureName) {
  console.log('\n=== 例6: 機能トグル ===');
  
  const featureKey = `customSettings.features.${featureName}.enabled`;
  const currentState = getConfig(featureKey) || false;
  
  // トグル
  setConfig(featureKey, !currentState);
  
  console.log(`${featureName}機能を${!currentState ? '有効' : '無効'}にしました`);
  
  return !currentState;
}

// ==========================================
// 例7: タイムスタンプの記録
// ==========================================

function example7_Timestamps() {
  console.log('\n=== 例7: タイムスタンプ ===');
  
  // 最終アクティビティを記録
  setConfig('customSettings.lastActivity', {
    timestamp: new Date().toISOString(),
    action: 'userCommand',
    userId: '1234567890'
  });
  
  // 取得
  const lastActivity = getConfig('customSettings.lastActivity');
  console.log('最終アクティビティ:', lastActivity);
}

// ==========================================
// 例8: デフォルト値の使用
// ==========================================

function example8_DefaultValues() {
  console.log('\n=== 例8: デフォルト値 ===');
  
  // 存在しないキーを取得（undefinedが返る）
  const value1 = getConfig('customSettings.nonexistent');
  console.log('存在しないキー:', value1);
  
  // デフォルト値を使用
  const value2 = getConfig('customSettings.nonexistent') || 'デフォルト値';
  console.log('デフォルト値使用:', value2);
  
  // 初期化して保存
  if (!getConfig('customSettings.myFeature')) {
    setConfig('customSettings.myFeature', {
      enabled: false,
      value: 100
    });
    console.log('初期値を設定しました');
  }
}

// ==========================================
// 例9: コマンドでの実装例
// ==========================================

async function example9_CommandImplementation(interaction) {
  console.log('\n=== 例9: コマンド実装 ===');
  
  // コマンド: /setprefix new_prefix
  const newPrefix = interaction.options.getString('prefix');
  const oldPrefix = getConfig('botSettings.prefix');
  
  setConfig('botSettings.prefix', newPrefix);
  
  // 変更履歴を記録
  const history = getConfig('customSettings.prefixHistory') || [];
  history.push({
    old: oldPrefix,
    new: newPrefix,
    changedBy: interaction.user.id,
    timestamp: new Date().toISOString()
  });
  setConfig('customSettings.prefixHistory', history);
  
  await interaction.reply(`✅ Prefixを \`${oldPrefix}\` から \`${newPrefix}\` に変更しました`);
}

// ==========================================
// 例10: 複雑なネストされたデータ
// ==========================================

function example10_NestedData() {
  console.log('\n=== 例10: ネストされたデータ ===');
  
  // 複雑な構造のデータを保存
  setConfig('customSettings.serverConfig', {
    guilds: {
      '111111': {
        name: 'サーバー1',
        settings: {
          welcome: true,
          logs: true,
          channels: {
            welcome: '222222',
            logs: '333333'
          }
        }
      },
      '444444': {
        name: 'サーバー2',
        settings: {
          welcome: false,
          logs: true,
          channels: {
            logs: '555555'
          }
        }
      }
    }
  });
  
  // 特定の値を取得
  const server1Welcome = getConfig('customSettings.serverConfig.guilds.111111.settings.welcome');
  console.log('サーバー1のwelcome設定:', server1Welcome);
}

// ==========================================
// メイン実行（テスト用）
// ==========================================

function runExamples() {
  console.log('永続設定システムの使用例を実行します\n');
  
  example1_BasicUsage();
  example2_CustomSettings();
  example3_ArrayData();
  example5_Statistics();
  example6_FeatureToggle('autoBackup');
  example7_Timestamps();
  example8_DefaultValues();
  example10_NestedData();
  
  console.log('\n\n全ての例を実行しました！');
  console.log('設定は data/persistent_config.json に保存されています');
}

// このファイルを直接実行した場合のみ例を実行
if (require.main === module) {
  // 永続設定システムを初期化
  const { initialize } = require('./utils/persistentConfig');
  initialize();
  
  // 例を実行
  runExamples();
}

// エクスポート（他のファイルから使用可能）
module.exports = {
  example1_BasicUsage,
  example2_CustomSettings,
  example3_ArrayData,
  example4_EventHandler,
  example5_Statistics,
  example6_FeatureToggle,
  example7_Timestamps,
  example8_DefaultValues,
  example9_CommandImplementation,
  example10_NestedData
};
