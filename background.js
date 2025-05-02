// Background Service Worker

console.log("Background Service Worker started.");

// Content Scriptからのメッセージを受け取るリスナー
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        console.log("Message received in background:", request);

        // Content Scriptから「open_manager_tab」というアクションのリクエストを受け取ったら
        if (request.action === "open_manager_tab") {
            console.log("Request to open manager tab received.");
            // 新しいタブで manager.html を開く
            chrome.tabs.create({ url: chrome.runtime.getURL("manager.html") });

            // レスポンスを返す（Content Script側で受け取れます）
            sendResponse({ status: "tab_opened" });
        }

        // 他のアクションがあればここに追加...

        // 非同期処理を行う場合は、sendResponse(true) を返してチャネルを開いたままにする
        // sendResponse(true);
    }
);