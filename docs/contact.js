// docs/contact.js

document.addEventListener('DOMContentLoaded', function() {

    // バージョン情報を取得するグローバル関数を定義
    window.getExtensionVersionInfo = function() {
        try {
            let version = '不明';
            
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                const manifest = chrome.runtime.getManifest();
                version = manifest.version || '不明';
            }
            
            return version;
        } catch (error) {
            console.error('バージョン情報の取得に失敗:', error);
            return '不明';
        }
    };

    // お問い合わせリンクを取得
    const contactLinks = document.querySelectorAll('.contact-link');
    
    // 各リンクにイベントリスナーを設定
    contactLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            prepareContactFormContent();
        });
    });
    
    // セットアップ
    if (typeof setupModalEvents === 'function') {
        console.log('Modal events already set up by common.js');
    } else {
        setupModalEvents();
    }
    
    // お問い合わせフォームコンテンツを準備して表示する関数
    function prepareContactFormContent() {
        const docsContent = document.getElementById('docs-content');
        
        try {
            // お問い合わせフォームのHTMLを生成してモーダルに設定
            docsContent.innerHTML = generateContactFormHTML();
            
            // イベントリスナーを設定
            setupContactFormEventListeners();
            
            // モーダルを表示（外部クリックでの閉じる動作を無効化）
            showDocsModal('お問い合わせフォーム', true);

            // 閉じるボタンに確認ダイアログを追加
            addCloseConfirmation();
            
        } catch (error) {
            console.error('お問い合わせフォームの表示に失敗しました:', error);
            showError(docsContent, error);
            showDocsModal('お問い合わせフォーム', true);
        }
    }
    
    // お問い合わせフォームのHTML生成
    function generateContactFormHTML() {
        return `
        <div class="contact-form-container markdown-container">
            <p>Gmail Filter Managerに関するご質問、ご意見、不具合報告などをお寄せください。</p>
            
            <form id="contact-form" class="contact-form">
                <div class="form-group">
                    <label for="contact-type">お問い合わせ種別<span class="required">*</span></label>
                    <select id="contact-type" name="entry.100345935" required>
                        <option value="">選択してください</option>
                        <option value="ご質問・使い方について">ご質問・使い方について</option>
                        <option value="機能追加のご要望">機能追加のご要望</option>
                        <option value="不具合のご報告">不具合のご報告</option>
                        <option value="ご意見・感想">ご意見・感想</option>
                        <option value="その他">その他</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="contact-email">メールアドレス（任意）</label>
                    <input type="email" id="contact-email" name="entry.1525296493" placeholder="返信が必要な場合にご記入ください">
                    <p class="form-help">※返信はお約束できかねます。あらかじめご了承ください</p>
                </div>
                
                <div class="form-group">
                    <label for="contact-message">お問い合わせ内容<span class="required">*</span></label>
                    <textarea id="contact-message" name="entry.447890634" rows="6" required placeholder="具体的な内容をご記入ください。不具合の場合は、発生状況や再現手順も併せてお知らせください。"></textarea>
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
                <p>お問い合わせが送信されました。</p>
                <button type="button" id="close-success" class="complete-button">閉じる</button>
            </div>
            
            <div id="form-error" class="form-error" style="display: none;">
                <h2>送信エラー</h2>
                <p>お問い合わせの送信中にエラーが発生しました。</p>
                <p>インターネット接続をご確認のうえ、再度お試しください。</p>
                <button type="button" id="retry-submit" class="retry-button">再試行</button>
                <button type="button" id="close-error" class="complete-button">閉じる</button>
            </div>
        </div>
        <script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min.js"></script>
        `;
    }
    
    // バージョン情報を取得する関数
    function getVersionInfo() {
        try {
            let version = '不明';
            
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
        
        if (contactForm) {
            // フォーム送信イベント
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // フォームデータ取得とバリデーション
                const type = document.getElementById('contact-type').value;
                const email = document.getElementById('contact-email').value;
                let message = document.getElementById('contact-message').value;
                
                if (!type || !message) {
                    alert('お問い合わせ種別とお問い合わせ内容は必須です。');
                    return;
                }
                
                // バージョン情報を取得して、メッセージの末尾に追加
                let version = '不明';
                if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                    version = chrome.runtime.getManifest().version || '不明';
                }
                
                // メッセージの先頭にバージョン情報を追記
                message = ` [v${version}] ` + message.trim();
                
                // 送信ボタンを無効化
                const submitButton = document.getElementById('submit-form');
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.classList.add('submitting');
                    submitButton.textContent = '送信中...';
                }
                
                // Google Formの送信URL
                const googleFormURL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLScLV-MhMQOjyylDvu1gf6JUyobQOelQQqpmSKUHP7AC0uwing/formResponse';
                
                // フォームデータを構築
                const formData = new FormData();
                formData.append('entry.100345935', type);
                formData.append('entry.1525296493', email);
                formData.append('entry.447890634', message); // バージョン情報が追記されたメッセージ
                
                // URLエンコードされた文字列に変換
                const urlEncodedData = new URLSearchParams(formData).toString();
                
                try {
                    // Fetchでの送信
                    fetch(googleFormURL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: urlEncodedData
                    })
                    .then(() => {
                        contactForm.style.display = 'none';
                        formSuccess.style.display = 'block';
                    })
                    .catch(error => {
                        console.error('Error during form submission:', error);
                        contactForm.style.display = 'none';
                        formSuccess.style.display = 'block';
                    })
                    .finally(() => {
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.classList.remove('submitting');
                            submitButton.textContent = '送信する';
                        }
                    });
                } catch (error) {
                    console.error('Error setting up fetch:', error);
                    contactForm.style.display = 'none';
                    formError.style.display = 'block';
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.classList.remove('submitting');
                        submitButton.textContent = '送信する';
                    }
                }
            });
        }
        
        // キャンセルボタン
        if (cancelButton) {
            cancelButton.addEventListener('click', function() {
                const hasInput = checkIfFormHasInput();
                
                if (hasInput) {
                    const isConfirmed = confirm('入力内容が失われますが、お問い合わせをキャンセルしますか？');
                    if (isConfirmed) {
                        closeModal();
                    }
                } else {
                    closeModal();
                }
            });
        }
        
        // 成功メッセージの閉じるボタン
        if (closeSuccessButton) {
            closeSuccessButton.addEventListener('click', closeModal);
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
    }

    // フォームに入力があるかチェックする関数
    function checkIfFormHasInput() {
        const form = document.getElementById('contact-form');
        if (!form) return false;
        
        const typeSelect = document.getElementById('contact-type');
        const emailInput = document.getElementById('contact-email');
        const messageInput = document.getElementById('contact-message');
        
        const typeValue = typeSelect ? typeSelect.value : '';
        const emailValue = emailInput ? emailInput.value : '';
        const messageValue = messageInput ? messageInput.value : '';
        
        return typeValue !== '' || emailValue !== '' || messageValue !== '';
    }

    // 閉じるボタンに確認ダイアログを追加
    function addCloseConfirmation() {
        const closeButton = document.querySelector('#docs-modal .close-button');
        if (closeButton) {
            const newCloseButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newCloseButton, closeButton);
            
            newCloseButton.addEventListener('click', function() {
                const contactForm = document.getElementById('contact-form');
                const formSuccess = document.getElementById('form-success');
                const formError = document.getElementById('form-error');
                
                // 成功または失敗画面が表示されている場合はそのまま閉じる
                if ((formSuccess && formSuccess.style.display !== 'none') || 
                    (formError && formError.style.display !== 'none')) {
                    closeModal();
                    return;
                }
                
                // フォームが表示されている場合は入力確認
                if (contactForm && contactForm.style.display !== 'none') {
                    const hasInput = checkIfFormHasInput();
                    
                    if (hasInput) {
                        const isConfirmed = confirm('入力内容が失われますが、お問い合わせをキャンセルしますか？');
                        if (isConfirmed) {
                            closeModal();
                        }
                    } else {
                        closeModal();
                    }
                } else {
                    closeModal();
                }
            });
        }
    }
    
    // モーダルを閉じる関数
    function closeModal() {
        const modal = document.getElementById('docs-modal');
        if (modal) {
            modal.style.display = 'none';
            // モーダルを閉じる際にフラグをリセット
            if (typeof window.preventOutsideClickClose !== 'undefined') {
                window.preventOutsideClickClose = false;
            } else if (typeof preventOutsideClickClose !== 'undefined') {
                preventOutsideClickClose = false;
            }
        }
    }
});