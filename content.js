// Content Script: Gmailページ上で実行される

console.log("Gmail Filter Manager Content Script loaded!");

// UI表示ボタンの作成と挿入
// TODO: Gmailの適切なDOM要素に挿入するように修正
const toggleButton = document.createElement('button');
toggleButton.id = 'toggle-filter-ui-button';
toggleButton.textContent = 'フィルタ管理を開く'; // ボタンのテキスト
// スタイルに関する設定は ui.css で行います（位置指定テスト用は残しています）
toggleButton.style.position = 'fixed'; // テスト用：画面左下に固定
toggleButton.style.bottom = '10px';
toggleButton.style.left = '10px';
toggleButton.style.zIndex = '9999';

// 仮の挿入場所：bodyの最後にボタンを追加
document.body.appendChild(toggleButton);

// --- ボタンにイベントリスナーを設定 ---
// クリック時にBackground Service Workerへメッセージを送信するように変更
toggleButton.addEventListener('click', () => {
    console.log("Toggle button clicked, sending message to background.");
    // ★★★ Background Service Workerへメッセージを送信 ★★★
    chrome.runtime.sendMessage({ action: "open_manager_tab" }, response => {
        console.log("Response from background:", response);
        // TODO: 必要であれば、Backgroundからのレスポンスに応じてUIを更新するなど
    });
});

// TODO: Gmailの適切なDOM要素に挿入するように修正（引き続き必要）