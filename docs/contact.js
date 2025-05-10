// docs/contact.js
document.addEventListener('DOMContentLoaded', function() {
    // お問い合わせリンクを取得
    const contactLinks = document.querySelectorAll('.contact-link');
    
    // 各リンクにイベントリスナーを設定
    contactLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 共通のモーダル表示関数を呼び出す前にお問い合わせフォームコンテンツを準備
            prepareContactFormContent();
        });
    });
    
    // セットアップ
    if (typeof setupModalEvents === 'function') {
        // common.jsですでに定義されている場合は呼び出さない
        console.log('Modal events already set up by common.js');
    } else {
        setupModalEvents();
    }
    
    // お問い合わせフォームコンテンツを準備して表示する関数
    function prepareContactFormContent() {
        const docsContent = document.getElementById('docs-content');
        
        try {
            // お問い合わせフォームのHTMLを生成
            const contactFormHTML = generateContactFormHTML();
            
            // コンテンツをモーダルに設定
            docsContent.innerHTML = contactFormHTML;
            
            // イベントリスナーを設定
            setupContactFormEventListeners();
            
            // モーダルを表示
            showDocsModal('お問い合わせフォーム');
            
        } catch (error) {
            console.error('お問い合わせフォームの表示に失敗しました:', error);
            showError(docsContent, error);
            showDocsModal('お問い合わせフォーム');
        }
    }
    
    // お問い合わせフォームのHTML生成
    function generateContactFormHTML() {
        // Google FormのフォームIDに置き換えてください
        const googleFormId = 'YOUR_GOOGLE_FORM_ID'; // 例: '1FAIpQLSeDjkXy7YzKrOdpZC8...'
        const googleFormURL = `https://docs.google.com/forms/d/e/${googleFormId}/formResponse`;
        
        return `
        <div class="contact-form-container markdown-container">
            <p>Gmail Filter Managerに関するご質問、ご意見、不具合報告などをお寄せください。</p>
            
            <form id="contact-form" class="contact-form" action="${googleFormURL}" method="POST" target="hidden-iframe">
                <div class="form-group">
                    <label for="contact-type">お問い合わせ種別<span class="required">*</span></label>
                    <select id="contact-type" name="entry.123456789" required>
                        <option value="">選択してください</option>
                        <option value="question">ご質問・使い方について</option>
                        <option value="feature">機能追加のご要望</option>
                        <option value="bug">不具合のご報告</option>
                        <option value="feedback">ご意見・感想</option>
                        <option value="other">その他</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="contact-email">メールアドレス（任意）</label>
                    <input type="email" id="contact-email" name="entry.987654321" placeholder="返信が必要な場合にご記入ください">
                    <p class="form-help">※返信はお約束できかねます。あらかじめご了承ください</p>
                </div>
                
                <div class="form-group">
                    <label for="contact-message">お問い合わせ内容<span class="required">*</span></label>
                    <textarea id="contact-message" name="entry.135792468" rows="6" required placeholder="具体的な内容をご記入ください。不具合の場合は、発生状況や再現手順も併せてお知らせください。"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="contact-version">拡張機能のバージョン情報</label>
                    <p class="form-help">${getVersionInfo()}</p>
                </div>
                
                <div class="form-actions">
                    <button type="submit" id="submit-form" class="submit-button">送信する</button>
                    <button type="button" id="cancel-form" class="cancel-button">キャンセル</button>
                </div>
            </form>
            
            <div id="form-success" class="form-success" style="display: none;">
                <h2>送信完了</h2>
                <p>お問い合わせが送信されました。ありがとうございます！</p>
                <p>メールアドレスを入力された場合は、後日管理者からご連絡することがあります。</p>
                <button type="button" id="close-success" class="close-button">閉じる</button>
            </div>
            
            <div id="form-error" class="form-error" style="display: none;">
                <h2>送信エラー</h2>
                <p>お問い合わせの送信中にエラーが発生しました。</p>
                <p>インターネット接続をご確認のうえ、再度お試しください。</p>
                <button type="button" id="retry-submit" class="retry-button">再試行</button>
                <button type="button" id="close-error" class="close-button">閉じる</button>
            </div>
            
            <iframe name="hidden-iframe" id="hidden-iframe" style="display:none;"></iframe>
        </div>
        `;
    }
    
    // バージョン情報を取得する関数
    function getVersionInfo() {
        try {
            // manifest.jsonからバージョン情報を取得できるか試みる
            let version = '不明';
            
            // Chrome拡張機能環境のみ
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                const manifest = chrome.runtime.getManifest();
                version = manifest.version || '不明';
            }
            
            return `バージョン ${version}`;
        } catch (error) {
            console.error('バージョン情報の取得に失敗:', error);
            return '取得できませんでした';
        }
    }
    
    // フォームのイベントリスナーを設定
    function setupContactFormEventListeners() {
        const contactForm = document.getElementById('contact-form');
        const formSuccess = document.getElementById('form-success');
        const formError = document.getElementById('form-error');
        const cancelButton = document.getElementById('cancel-form');
        const closeSuccessButton = document.getElementById('close-success');
        const closeErrorButton = document.getElementById('close-error');
        const retryButton = document.getElementById('retry-submit');
        const hiddenIframe = document.getElementById('hidden-iframe');
        
        if (contactForm) {
            // フォーム送信イベント
            contactForm.addEventListener('submit', function(e) {
                // 通常はここでGoogle Formに送信するが、
                // hiddenIframeを使用して非同期に処理するため、
                // デフォルトの送信処理は止めない
                
                // 送信ボタンを無効化して二重送信を防止
                const submitButton = document.getElementById('submit-form');
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.textContent = '送信中...';
                }
                
                // 送信成功とみなして表示（Google Formに転送される）
                setTimeout(function() {
                    contactForm.style.display = 'none';
                    formSuccess.style.display = 'block';
                    submitButton.disabled = false;
                    submitButton.textContent = '送信する';
                }, 1500);
            });
        }
        
        // キャンセルボタン
        if (cancelButton) {
            cancelButton.addEventListener('click', function() {
                closeModal();
            });
        }
        
        // 成功メッセージの閉じるボタン
        if (closeSuccessButton) {
            closeSuccessButton.addEventListener('click', function() {
                closeModal();
            });
        }
        
        // エラーメッセージの閉じるボタン
        if (closeErrorButton) {
            closeErrorButton.addEventListener('click', function() {
                formError.style.display = 'none';
                contactForm.style.display = 'block';
            });
        }
        
        // 再試行ボタン
        if (retryButton) {
            retryButton.addEventListener('click', function() {
                formError.style.display = 'none';
                contactForm.style.display = 'block';
            });
        }
        
        // hiddenIframeのロードイベント
        if (hiddenIframe) {
            hiddenIframe.addEventListener('load', function() {
                // iframeがロードされたらフォームが送信された可能性がある
                // ただし、初期ロードでも発火するため注意
                console.log('Hidden iframe loaded');
            });
        }
    }
    
    // モーダルを閉じる関数
    function closeModal() {
        const modal = document.getElementById('docs-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
});