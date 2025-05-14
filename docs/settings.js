// docs/settings.js

document.addEventListener('DOMContentLoaded', function() {
    console.log("settings.js DOMContentLoaded fired.");

    // UIテキストの多言語化を適用 (settings.jsにも追加)
    // common.jsでlocalizeHtmlPageが定義されていることを前提とします
    if (typeof localizeHtmlPage === 'function') {
        localizeHtmlPage(); // ★ localizeHtmlPage() の呼び出しを追加 ★
        console.log("localizeHtmlPage called from settings.js");
    } else {
        console.error("localizeHtmlPage function not found in settings.js scope.");
    }

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

    // セットアップ（common.jsで既にセットアップされているか確認）
    if (typeof window.modalEventsSetup === 'function' || typeof setupModalEvents === 'function') {
        // common.jsですでに定義されている場合は呼び出さない
        // setupModalEvents(); // common.jsで一元管理されている場合は不要
        console.log('Modal events assumed to be set up by common.js');
    } else {
        // setupModalEventsがcommon.jsにない場合はここで定義・呼び出し
         // setupModalEvents(); // ★ common.jsで一元管理推奨 ★
         console.warn('setupModalEvents not found. Assuming common.js handles it or needs to be added there.');
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

            // 生成したHTML内のテキストも多言語化するために再度localizeHtmlPageを呼び出す
            // regenerate content will need re-localization
            if (typeof localizeHtmlPage === 'function') {
                 localizeHtmlPage(); // ★ 生成したHTMLにも適用するために再度呼び出し ★
                 console.log("localizeHtmlPage called again after generating settings HTML.");
             } else {
                 console.error("localizeHtmlPage function not found after generating settings HTML.");
             }


            // モーダルを表示 (タイトルも多言語化)
            showDocsModal(chrome.i18n.getMessage('settingsTitle')); // ★ タイトルを多言語化 ★

        } catch (error) {
            console.error('設定画面の表示に失敗しました:', error);
            // エラー表示もcommon.jsで多言語化されていればOK
            if (typeof showError === 'function') {
                 showError(docsContent, error);
             } else {
                 docsContent.innerHTML = `<p>Error displaying settings: ${error.message}</p>`;
             }

            // モーダルを表示 (タイトルも多言語化)
            showDocsModal(chrome.i18n.getMessage('settingsTitle')); // ★ タイトルを多言語化 ★
        }
    }

    // 設定画面のHTML生成 (ハードコードされた日本語を削除し、data-i18n属性を追加)
    function generateSettingsHTML() {
        // アプリ設定を取得（グローバル変数appSettingsを参照）
        const isDeleteEnabled = window.appSettings && window.appSettings.enableDeleteAction === true;

        return `
        <div class="settings-container markdown-container">
            <h1 data-i18n-text="settingsTitle"></h1>
            <p data-i18n-text="settingsDescription"></p>

            <h2 data-i18n-text="settingsDeleteSectionTitle"></h2>
            <div class="settings-item">
                <label class="switch-label" for="settings-enable-delete">
                    <div class="toggle-switch">
                        <input type="checkbox" id="settings-enable-delete" ${isDeleteEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </div>
                    <span class="label-text" data-i18n-text="settingsEnableDeleteLabel"></span>
                </label>
                <div class="setting-warning" data-i18n-innerHTML="settingsDeleteWarning">
                </div>
            </div>

            <div class="settings-info">
                <h3 data-i18n-text="settingsDeleteInfoTitle"></h3>
                <p data-i18n-text="settingsDeleteInfoDisabledText"></p>
                <ul>
                    <li data-i18n-text="settingsDeleteInfoDisabledBullet1"></li>
                    <li data-i18n-text="settingsDeleteInfoDisabledBullet2"></li>
                    <li data-i18n-text="settingsDeleteInfoDisabledBullet3"></li>
                </ul>
                <p data-i18n-text="settingsDeleteInfoPersistence"></p>
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

                    // UIを更新 (manager.jsの関数を呼び出し)
                    if (typeof updateUIBasedOnSettings === 'function') {
                        updateUIBasedOnSettings();
                    }

                    // 変更を通知 (アラートメッセージも多言語化)
                    if (this.checked) {
                        alert(chrome.i18n.getMessage('settingsDeleteEnabledAlert')); // ★ アラートメッセージを多言語化 ★
                    } else {
                        alert(chrome.i18n.getMessage('settingsDeleteDisabledAlert')); // ★ アラートメッセージを多言語化 ★
                    }
                } else {
                    console.error('appSettings is not defined');
                }
            });
        }
    }
});