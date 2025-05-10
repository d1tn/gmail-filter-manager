// docs/settings.js
document.addEventListener('DOMContentLoaded', function() {
    // 設定メニューのリンクを取得
    const settingsLinks = document.querySelectorAll('.settings-link');
    
    // 各リンクにイベントリスナーを設定
    settingsLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 共通のモーダル表示関数を呼び出す前に設定コンテンツを準備
            prepareSettingsContent();
        });
    });
    
    // セットアップ
    if (typeof setupModalEvents === 'function') {
        // common.jsですでに定義されている場合は呼び出さない
        console.log('Modal events already set up by common.js');
    } else {
        setupModalEvents();
    }
    
    // 設定コンテンツを準備して表示する関数
    function prepareSettingsContent() {
        const docsContent = document.getElementById('docs-content');
        
        try {
            // 設定コンテンツを生成
            const settingsHTML = generateSettingsHTML();
            
            // コンテンツをモーダルに設定
            docsContent.innerHTML = settingsHTML;
            
            // イベントリスナーを設定
            setupSettingsEventListeners();
            
            // モーダルを表示
            showDocsModal('高度な設定');
            
        } catch (error) {
            console.error('設定画面の表示に失敗しました:', error);
            showError(docsContent, error);
            showDocsModal('高度な設定');
        }
    }
    
    // 設定画面のHTML生成
    function generateSettingsHTML() {
        // アプリ設定を取得（グローバル変数appSettingsを参照）
        const isDeleteEnabled = window.appSettings && window.appSettings.enableDeleteAction === true;
        
        return `
        <div class="settings-container markdown-container">
            <h1>高度な設定</h1>
            <p>これらの設定は、本拡張機能の特別な機能を制御します。</p>
            
            <h2>メールの削除（危険な操作）</h2>
            <div class="settings-item">
                <label class="switch-label" for="settings-enable-delete">
                    <div class="toggle-switch">
                        <input type="checkbox" id="settings-enable-delete" ${isDeleteEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </div>
                    <span class="label-text">メールの削除機能を有効にする</span>
                </label>
                <div class="setting-warning">
                    ⚠️ この機能を有効にすると、フィルタ条件に一致するメールが完全に削除される可能性があります。<br>重要なメールも削除される可能性があるため慎重に使用してください。<br>本拡張機能を利用したメールの削除は利用者の自己責任であり、開発者は一切の責任を負いかねます。
                </div>
            </div>
            
            <div class="settings-info">
                <h3>メールの削除機能について</h3>
                <p>メールの削除機能が無効の場合：</p>
                <ul>
                    <li>フィルタで「削除する」オプションはグレーアウトされます</li>
                    <li>既存のフィルタで「削除する」が選択されていても、エクスポート時に削除アクションは無視されます</li>
                    <li>このとき、削除アクションはGmail側に反映されません</li>
                </ul>
                <p>この設定はブラウザ内に保存され、拡張機能を再起動しても維持されます。</p>
            </div>
        </div>
        `;
    }
    
    // 設定画面のイベントリスナー設定
    function setupSettingsEventListeners() {
        const deleteToggle = document.getElementById('settings-enable-delete');
        if (deleteToggle) {
            deleteToggle.addEventListener('change', function() {
                // グローバルのappSettings変数を更新
                if (window.appSettings) {
                    window.appSettings.enableDeleteAction = this.checked;
                    
                    // 設定を保存
                    if (typeof saveAppSettings === 'function') {
                        saveAppSettings();
                    }
                    
                    // UIを更新
                    if (typeof updateUIBasedOnSettings === 'function') {
                        updateUIBasedOnSettings();
                    }
                    
                    // 変更を通知
                    if (this.checked) {
                        alert('削除機能が有効になりました。この機能は重要なメールを完全に削除する可能性があります。慎重に使用してください。');
                    } else {
                        alert('削除機能が無効になりました。既存のフィルタで「削除する」がチェックされている場合、それらは一時的に無効化されます。');
                    }
                } else {
                    console.error('appSettings is not defined');
                }
            });
        }
    }
});