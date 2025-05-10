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
            
            // モーダルを表示（第2引数をtrueに設定して外部クリックでの閉じる動作を無効化）
            showDocsModal('お問い合わせフォーム', true);

            // 閉じるボタンに確認ダイアログを追加
            addCloseConfirmation();
            
        } catch (error) {
            console.error('お問い合わせフォームの表示に失敗しました:', error);
            showError(docsContent, error);
            // エラー表示時も外部クリックでの閉じる動作を無効化
            showDocsModal('お問い合わせフォーム', true);
        }
    }
    
// お問い合わせフォームのHTML生成
function generateContactFormHTML() {
    // Google FormのフォームID
    const googleFormId = '1FAIpQLScLV-MhMQOjyylDvu1gf6JUyobQOelQQqpmSKUHP7AC0uwing';
    // const googleFormURL = `https://docs.google.com/forms/u/0/d/e/${googleFormId}/formResponse`;
    
    return `
    <div class="contact-form-container markdown-container">
        <p>Gmail Filter Managerに関するご質問、ご意見、不具合報告などをお寄せください。</p>
        
        <form id="contact-form" class="contact-form">
            <div class="form-group">
                <label for="contact-type">お問い合わせ種別<span class="required">*</span></label>
                <select id="contact-type" name="entry.1560748182" required>
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
                <input type="email" id="contact-email" name="entry.193189185" placeholder="返信が必要な場合にご記入ください">
                <p class="form-help">※返信はお約束できかねます。あらかじめご了承ください</p>
            </div>
            
            <div class="form-group">
                <label for="contact-message">お問い合わせ内容<span class="required">*</span></label>
                <textarea id="contact-message" name="entry.104286217" rows="6" required placeholder="具体的な内容をご記入ください。不具合の場合は、発生状況や再現手順も併せてお知らせください。"></textarea>
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
        
        if (contactForm) {
            // フォーム送信イベント
            contactForm.addEventListener('submit', function(e) {
                e.preventDefault(); // フォームのデフォルト送信を防止
                
                // フォームデータ取得
                const type = document.getElementById('contact-type').value;
                const email = document.getElementById('contact-email').value;
                const message = document.getElementById('contact-message').value;
                
                // バリデーション
                if (!type || !message) {
                    alert('お問い合わせ種別とお問い合わせ内容は必須です。');
                    return;
                }
                
                // 送信ボタンを無効化して二重送信を防止
                const submitButton = document.getElementById('submit-form');
                if (submitButton) {
                    submitButton.disabled = true;
                    submitButton.classList.add('submitting');
                    submitButton.textContent = '送信中...';
                }
                
                // Google Formの送信URLを構築
                const googleFormId = '1FAIpQLScLV-MhMQOjyylDvu1gf6JUyobQOelQQqpmSKUHP7AC0uwing';
                const googleFormURL = `https://docs.google.com/forms/u/0/d/e/${googleFormId}/formResponse`;
                
                // フォームデータを構築
                const formData = new FormData();
                formData.append('entry.1560748182', type);
                formData.append('entry.193189185', email);
                formData.append('entry.104286217', message);
                
                // フォームデータをURLエンコードされた文字列に変換
                const urlEncodedData = new URLSearchParams(formData).toString();
                
                try {
                    // Fetchでの送信を試みる (CORSのため常に成功とみなす)
                    fetch(googleFormURL, {
                        method: 'POST',
                        mode: 'no-cors', // important: no-coresモードでCORS制限を回避
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: urlEncodedData
                    })
                    .then(() => {
                        // no-corsモードでは常に成功扱いになる
                        contactForm.style.display = 'none';
                        formSuccess.style.display = 'block';
                        console.log('Form submission attempt completed');
                    })
                    .catch(error => {
                        console.error('Error during form submission:', error);
                        // エラーの場合も一応成功画面を表示（ほとんどの場合データは送信される）
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
                    // 致命的なエラーの場合はエラー画面を表示
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
        
        // 以下のボタンイベントは変更なし
        if (cancelButton) {
            cancelButton.addEventListener('click', function() {
                // フォームに入力があるかチェック
                const hasInput = checkIfFormHasInput();
                
                if (hasInput) {
                    // 入力がある場合は確認ダイアログを表示
                    const isConfirmed = confirm('入力内容が失われますが、お問い合わせをキャンセルしますか？');
                    if (isConfirmed) {
                        closeModal();
                    }
                } else {
                    // 入力がない場合はそのまま閉じる
                    closeModal();
                }
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
    }

    // フォームに入力があるかチェックする関数
    function checkIfFormHasInput() {
        const form = document.getElementById('contact-form');
        if (!form) return false;
        
        // 入力フィールドの値を取得
        const typeSelect = document.getElementById('contact-type');
        const emailInput = document.getElementById('contact-email');
        const messageInput = document.getElementById('contact-message');
        
        // 存在チェックを追加
        const typeValue = typeSelect ? typeSelect.value : '';
        const emailValue = emailInput ? emailInput.value : '';
        const messageValue = messageInput ? messageInput.value : '';
        
        // いずれかのフィールドに入力があるか確認
        return typeValue !== '' || emailValue !== '' || messageValue !== '';
    }

    // 閉じるボタンにも確認ダイアログを追加するコード
    function addCloseConfirmation() {
        const closeButton = document.querySelector('#docs-modal .close-button');
        if (closeButton) {
            // 元のイベントリスナーを削除
            const newCloseButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newCloseButton, closeButton);
            
            // 新しいイベントリスナーを追加
            newCloseButton.addEventListener('click', function() {
                // フォームが表示されている場合のみ確認
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