const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 自動コミットの間隔（ミリ秒） - デフォルト5分
const AUTO_COMMIT_INTERVAL = 5 * 60 * 1000;

/**
 * Gitの変更をチェック
 */
async function checkGitStatus() {
  try {
    const { stdout } = await execPromise('git status --porcelain');
    return stdout.trim().length > 0;
  } catch (error) {
    console.error('[AutoCommit] Git status チェックエラー:', error.message);
    return false;
  }
}

/**
 * 変更内容から適切なコミットメッセージを生成
 */
async function generateCommitMessage() {
  try {
    const { stdout } = await execPromise('git status --short');
    const changes = stdout.trim().split('\n').filter(line => line);
    
    if (changes.length === 0) {
      return '自動コミット: データファイルの更新';
    }

    // 変更されたファイルの種類を分析
    const dataFiles = changes.filter(line => line.includes('data/'));
    const commandFiles = changes.filter(line => line.includes('commands/'));
    const utilFiles = changes.filter(line => line.includes('utils/'));
    const eventFiles = changes.filter(line => line.includes('events/'));

    const parts = [];
    
    if (dataFiles.length > 0) {
      const fileNames = dataFiles.map(line => {
        const match = line.match(/data\/(\w+)\.json/);
        return match ? match[1] : 'データ';
      }).filter((v, i, a) => a.indexOf(v) === i);
      
      if (fileNames.includes('activity')) {
        parts.push('アクティビティデータの更新');
      }
      if (fileNames.includes('reminders')) {
        parts.push('リマインダーデータの更新');
      }
      if (fileNames.includes('copiedMediaMap')) {
        parts.push('メディアマッピングデータの更新');
      }
      if (parts.length === 0) {
        parts.push('データファイルの更新');
      }
    }
    
    if (commandFiles.length > 0) {
      parts.push('コマンドの修正');
    }
    
    if (utilFiles.length > 0) {
      parts.push('ユーティリティの改善');
    }
    
    if (eventFiles.length > 0) {
      parts.push('イベントハンドラーの更新');
    }

    return parts.length > 0 
      ? `自動コミット: ${parts.join(', ')}` 
      : '自動コミット: プロジェクトの更新';
      
  } catch (error) {
    console.error('[AutoCommit] コミットメッセージ生成エラー:', error.message);
    return '自動コミット: プロジェクトの更新';
  }
}

/**
 * Gitコミットを実行
 */
async function commitChanges() {
  try {
    // 変更があるかチェック
    const hasChanges = await checkGitStatus();
    if (!hasChanges) {
      return false;
    }

    // すべての変更をステージング
    await execPromise('git add -A');
    
    // コミットメッセージを生成
    const message = await generateCommitMessage();
    
    // コミット実行
    const timestamp = new Date().toISOString();
    await execPromise(`git commit -m "${message}" -m "自動コミット時刻: ${timestamp}"`);
    
    console.log(`[AutoCommit] ✓ コミット完了: ${message}`);
    return true;
    
  } catch (error) {
    // コミットするものがない場合はエラーではない
    if (error.message.includes('nothing to commit')) {
      return false;
    }
    console.error('[AutoCommit] コミットエラー:', error.message);
    return false;
  }
}

/**
 * 自動コミットを開始
 */
function startAutoCommit() {
  console.log(`[AutoCommit] 自動コミット機能を開始しました（間隔: ${AUTO_COMMIT_INTERVAL / 60000}分）`);
  
  // 定期的にコミットをチェック
  setInterval(async () => {
    await commitChanges();
  }, AUTO_COMMIT_INTERVAL);
  
  // 初回実行（起動時の変更をコミット）
  setTimeout(async () => {
    const committed = await commitChanges();
    if (committed) {
      console.log('[AutoCommit] 起動時の変更をコミットしました');
    }
  }, 10000); // 10秒後に実行（起動処理が完了してから）
}

module.exports = {
  startAutoCommit,
  commitChanges
};
