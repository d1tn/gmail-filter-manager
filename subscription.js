// subscription.js
// ユーザーの課金ステータスと制限ロジックを管理

console.log("Subscription module loaded.");

// ユーザーのステータス管理オブジェクト（グローバル）
window.UserStatus = {
    isPremium: false, // false: 無料版, true: 有料版
    maxFreeFolders: 10,
    
    // 将来的にはここでStripeのAPIを叩いてステータスを更新する
    async init() {
        console.log("Initializing UserStatus...");
        // TODO: ここで chrome.storage や サーバーから最新の課金情報を取得する
        // 今はモック（仮）として、ストレージからデバッグ用のフラグを読むか、デフォルト(false)を使う
        
        // 例: デバッグ用に chrome.storage.local に 'debug_isPremium' があればそれを使う
        return new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get('debug_isPremium', (result) => {
                    if (result.debug_isPremium !== undefined) {
                        this.isPremium = result.debug_isPremium;
                        console.log(`[Debug] Premium status override: ${this.isPremium}`);
                    }
                    resolve(this.isPremium);
                });
            } else {
                resolve(this.isPremium);
            }
        });
    }
};

/**
 * プレミアムユーザーかどうかを確認する関数
 * @returns {boolean}
 */
function checkPremiumStatus() {
    return window.UserStatus.isPremium;
}

/**
 * フォルダ作成が可能かチェックする関数
 * @param {number} currentFolderCount - 現在のフォルダ数
 * @returns {boolean} - 作成可能ならtrue
 */
function canCreateFolder(currentFolderCount) {
    if (checkPremiumStatus()) {
        return true; // プレミアムなら無制限
    }
    // 無料版なら上限チェック
    return currentFolderCount < window.UserStatus.maxFreeFolders;
}

/**
 * プレミアムプランへのアップグレード画面を開く（仮）
 */
function openUpgradePage() {
    const confirmUpgrade = confirm("プレミアム版（無制限）にアップグレードしますか？🥺\n(※これはデモです)");
    if (confirmUpgrade) {
        // TODO: ここでStripeの決済URLへ飛ばす
        alert("ありがとうございます！決済画面へ遷移します...（未実装）");
        // window.open('https://buy.stripe.com/.....');
    }
}