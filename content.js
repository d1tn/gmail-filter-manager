// Content Script: Gmailページ上で実行される

console.log("Gmail Filter Manager Content Script loaded!");

// UIパネル要素を作成
const uiContainer = document.createElement('div');
uiContainer.id = 'gmail-filter-manager-ui';

// UIパネルの初期スタイルと非表示設定
uiContainer.style.position = 'fixed';
uiContainer.style.top = '10%';
uiContainer.style.right = '10px';
uiContainer.style.width = '300px';
uiContainer.style.height = 'auto';
uiContainer.style.backgroundColor = '#fff';
uiContainer.style.border = '1px solid #ccc';
uiContainer.style.zIndex = '9999';
uiContainer.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
uiContainer.style.padding = '15px';
uiContainer.style.borderRadius = '8px';
uiContainer.style.display = 'none'; // 初期状態は非表示

// UIパネルのHTMLコンテンツを設定
uiContainer.innerHTML = `
    <h3>Filter Management UI</h3>
    <p>This is where your filter management interface will go.</p>
    <button id="close-filter-ui">閉じる</button>
`;

// UIコンテナをページに追加
document.body.appendChild(uiContainer);

// 閉じるボタンにイベントリスナーを設定
document.getElementById('close-filter-ui').addEventListener('click', () => {
    uiContainer.style.display = 'none'; // UIを非表示
});

// UI表示/非表示を切り替える関数
function toggleFilterUI() {
    if (uiContainer.style.display === 'none') {
        uiContainer.style.display = 'block'; // または 'flex', 'grid' など
    } else {
        uiContainer.style.display = 'none';
    }
}

// UI表示ボタンの作成と仮の挿入
// TODO: Gmailの適切なDOM要素に挿入するように修正
const toggleButton = document.createElement('button');
toggleButton.id = 'toggle-filter-ui-button';
toggleButton.textContent = 'フィルタ管理ツールを開く'; // ボタンのテキスト
toggleButton.style.position = 'fixed'; // テスト用：画面左下に固定
toggleButton.style.bottom = '10px';
toggleButton.style.left = '10px';
toggleButton.style.zIndex = '9999';

// 仮の挿入場所：bodyの最後にボタンを追加
document.body.appendChild(toggleButton);

// ボタンにイベントリスナーを設定
toggleButton.addEventListener('click', toggleFilterUI);