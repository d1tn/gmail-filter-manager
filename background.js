// Background Service Worker

console.log("Background Service Worker started.");

// Content Scriptからのメッセージを受け取るリスナー
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("Message received in background:", request);

        try {
            // Content Scriptから「open_manager_tab」というアクションのリクエストを受け取ったら
            if (request.action === "open_manager_tab") {
                console.log("Request to open manager tab received.");
                // 新しいタブで manager.html を開く
                chrome.tabs.create({ url: chrome.runtime.getURL("manager.html") })
                .then(() => {
                    // 成功時のレスポンス
                    sendResponse({ status: "tab_opened", success: true });
                })
                .catch(error => {
                    // エラー時のレスポンス
                    console.error("Error opening tab:", error);
                    sendResponse({ status: "error", message: error.message });
                });
                
                // 非同期処理を行うため、true を返してチャネルを開いたままにする
                return true;
            }
        } catch (error) {
            console.error("Error in message handler:", error);
            sendResponse({ status: "error", message: error.message });
            return true;
        }
    }
);

// Service Workerのアクティブ化を保持
chrome.runtime.onStartup.addListener(() => {
    console.log("Extension started up.");
});

// 拡張機能のインストール/更新イベント
chrome.runtime.onInstalled.addListener((details) => {
    console.log("Extension installed or updated:", details.reason);
});