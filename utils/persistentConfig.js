const fs = require('fs');
const path = require('path');
const { loadData, saveData } = require('./dataStore');

/**
 * 永続的な設定管理システム
 * 再起動後も設定を保持し、自動保存・バックアップ機能を提供
 */

const CONFIG_FILE = 'persistent_config';
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backups');

// 設定データをメモリにキャッシュ
let configCache = null;
let autoSaveInterval = null;

/**
 * 設定の初期化
 */
function initialize() {
  try {
    // バックアップディレクトリを作成
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // 設定を読み込む
    configCache = loadData(CONFIG_FILE, {
      botSettings: {
        prefix: '!',
        language: 'ja',
        timezone: 'Asia/Tokyo'
      },
      features: {
        autoBackup: true,
        autoSave: true,
        debugMode: false
      },
      channels: {
        notification: null,
        logs: null,
        tickets: null
      },
      roles: {
        admin: [],
        moderator: [],
        ticketManager: []
      },
      customSettings: {},
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    });

    console.log('✓ 永続的な設定システムを初期化しました');
    
    // 自動保存を開始
    startAutoSave();
    
    return configCache;
  } catch (error) {
    console.error('[persistentConfig] 初期化エラー:', error);
    return null;
  }
}

/**
 * 設定を取得
 */
function getConfig(key = null) {
  if (!configCache) {
    initialize();
  }
  
  if (!key) {
    return configCache;
  }
  
  // ドット記法をサポート（例: 'botSettings.prefix'）
  const keys = key.split('.');
  let value = configCache;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }
  
  return value;
}

/**
 * 設定を更新
 */
function setConfig(key, value) {
  if (!configCache) {
    initialize();
  }
  
  // ドット記法をサポート
  const keys = key.split('.');
  let target = configCache;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    if (!target[k] || typeof target[k] !== 'object') {
      target[k] = {};
    }
    target = target[k];
  }
  
  target[keys[keys.length - 1]] = value;
  configCache.lastUpdated = new Date().toISOString();
  
  // 即座に保存
  save();
  
  return true;
}

/**
 * 設定を保存
 */
function save() {
  if (!configCache) return false;
  
  try {
    saveData(CONFIG_FILE, configCache);
    return true;
  } catch (error) {
    console.error('[persistentConfig] 保存エラー:', error);
    return false;
  }
}

/**
 * 設定をバックアップ
 */
function backup() {
  if (!configCache) return false;
  
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const backupFile = path.join(BACKUP_DIR, `config_backup_${timestamp}.json`);
    
    fs.writeFileSync(backupFile, JSON.stringify(configCache, null, 2), 'utf8');
    console.log(`✓ 設定をバックアップしました: ${backupFile}`);
    
    // 古いバックアップを削除（最新10個を保持）
    cleanOldBackups(10);
    
    return true;
  } catch (error) {
    console.error('[persistentConfig] バックアップエラー:', error);
    return false;
  }
}

/**
 * 古いバックアップを削除
 */
function cleanOldBackups(keepCount = 10) {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('config_backup_'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);
    
    // 古いファイルを削除
    for (let i = keepCount; i < files.length; i++) {
      fs.unlinkSync(files[i].path);
      console.log(`✓ 古いバックアップを削除しました: ${files[i].name}`);
    }
  } catch (error) {
    console.error('[persistentConfig] バックアップクリーンアップエラー:', error);
  }
}

/**
 * バックアップから復元
 */
function restoreFromBackup(backupFile = null) {
  try {
    let filePath;
    
    if (backupFile) {
      filePath = path.join(BACKUP_DIR, backupFile);
    } else {
      // 最新のバックアップを取得
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('config_backup_'))
        .map(f => ({
          name: f,
          path: path.join(BACKUP_DIR, f),
          time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      if (files.length === 0) {
        console.log('⚠ バックアップファイルが見つかりません');
        return false;
      }
      
      filePath = files[0].path;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    configCache = data;
    save();
    
    console.log(`✓ バックアップから復元しました: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error('[persistentConfig] 復元エラー:', error);
    return false;
  }
}

/**
 * 自動保存を開始
 */
function startAutoSave(intervalMinutes = 5) {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
  }
  
  autoSaveInterval = setInterval(() => {
    if (configCache && getConfig('features.autoSave')) {
      save();
      console.log('✓ 設定を自動保存しました');
      
      // 1時間ごとにバックアップ
      const now = new Date();
      if (now.getMinutes() === 0 && getConfig('features.autoBackup')) {
        backup();
      }
    }
  }, intervalMinutes * 60 * 1000);
  
  console.log(`✓ 自動保存を開始しました（${intervalMinutes}分ごと）`);
}

/**
 * 自動保存を停止
 */
function stopAutoSave() {
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    autoSaveInterval = null;
    console.log('✓ 自動保存を停止しました');
  }
}

/**
 * 設定をリセット
 */
function reset() {
  configCache = null;
  return initialize();
}

/**
 * すべての設定をエクスポート
 */
function exportConfig() {
  return JSON.parse(JSON.stringify(configCache || {}));
}

/**
 * 設定をインポート
 */
function importConfig(config) {
  try {
    configCache = config;
    configCache.lastUpdated = new Date().toISOString();
    save();
    return true;
  } catch (error) {
    console.error('[persistentConfig] インポートエラー:', error);
    return false;
  }
}

/**
 * 利用可能なバックアップのリストを取得
 */
function listBackups() {
  try {
    return fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('config_backup_'))
      .map(f => ({
        name: f,
        path: path.join(BACKUP_DIR, f),
        size: fs.statSync(path.join(BACKUP_DIR, f)).size,
        date: fs.statSync(path.join(BACKUP_DIR, f)).mtime
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  } catch (error) {
    console.error('[persistentConfig] バックアップリスト取得エラー:', error);
    return [];
  }
}

// プロセス終了時に保存
process.on('SIGINT', () => {
  console.log('\n[persistentConfig] プロセス終了前に設定を保存しています...');
  save();
  backup();
  stopAutoSave();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[persistentConfig] プロセス終了前に設定を保存しています...');
  save();
  backup();
  stopAutoSave();
  process.exit(0);
});

module.exports = {
  initialize,
  getConfig,
  setConfig,
  save,
  backup,
  restoreFromBackup,
  startAutoSave,
  stopAutoSave,
  reset,
  exportConfig,
  importConfig,
  listBackups,
  cleanOldBackups
};
