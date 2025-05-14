// docs/common.js

// グローバル変数でモーダルの挙動を制御
let preventOutsideClickClose = false;

// UIテキストを多言語化する関数 (data-i18n属性に基づいてテキストを設定)
// common.js, manager.js, settings.js, contact.js など、HTMLを扱う各JSファイルに配置または参照される想定
function localizeHtmlPage() {
    console.log("Localizing HTML page based on data-i18n attributes.");

    // data-i18n-textを持つ要素のtextContentを設定
    document.querySelectorAll("[data-i18n-text]").forEach(element => {
        const key = element.getAttribute("data-i18n-text");
        if (key) {
             element.textContent = chrome.i18n.getMessage(key) || `[${key}]`;
             console.log(`Set text for key "${key}" (text): ${element.textContent}`);
        }
    });

    // data-i18n-placeholderを持つ要素のplaceholder属性を設定
    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
        const key = element.getAttribute("data-i18n-placeholder");
         if (key && element.placeholder !== undefined) {
            element.placeholder = chrome.i18n.getMessage(key) || `[${key}]`;
             console.log(`Set placeholder for key "${key}": ${element.placeholder}`);
         }
    });

    // data-i18n-titleを持つ要素のtitle属性を設定
    document.querySelectorAll("[data-i18n-title]").forEach(element => {
        const key = element.getAttribute("data-i18n-title");
         if (key && element.title !== undefined) {
            element.title = chrome.i18n.getMessage(key) || `[${key}]`;
             console.log(`Set title for key "${key}": ${element.title}`);
         }
    });

    // ★ここを追加★ data-i18n-innerHTMLを持つ要素のinnerHTMLを設定
    document.querySelectorAll("[data-i18n-innerHTML]").forEach(element => {
        const key = element.getAttribute("data-i18n-innerHTML");
        if (key) {
             // innerHTMLを使用するため、HTMLタグ（例: <br>）が解釈されます
             element.innerHTML = chrome.i18n.getMessage(key) || `[${key}]`;
             console.log(`Set innerHTML for key "${key}": ${element.innerHTML}`);
        }
    });


    // TODO: 他の data-i18n-* 属性が必要であればここに追加

    console.log("HTML page localization complete.");
}

function showDocsModal(title, preventOutsideClick = false) {
    const modal = document.getElementById('docs-modal');
    const modalTitle = document.getElementById('modal-title');
    
    // 外部クリックによる閉じる動作の制御フラグを設定
    preventOutsideClickClose = preventOutsideClick;
    
    // モーダルクラスを更新（スタイル変更用）
    if (preventOutsideClick) {
        modal.classList.add('no-outside-close');
    } else {
        modal.classList.remove('no-outside-close');
    }
    
    modalTitle.textContent = title;
    modal.style.display = 'block';
}

function setupModalEvents() {
    const modal = document.getElementById('docs-modal');
    const closeButton = document.querySelector('.close-button');
    
    closeButton.addEventListener('click', function() {
        // 閉じるボタンでは常に閉じられる
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        // 外部クリックの場合は、preventOutsideClickCloseフラグに基づいて判断
        if (event.target === modal && !preventOutsideClickClose) {
            modal.style.display = 'none';
        }
    });
}

function renderMarkdown(markdownText, contentElement) {
    try {
        // コンテンツクリア
        contentElement.innerHTML = '';
        
        // 装飾用のdiv
        const markdownContainer = document.createElement('div');
        markdownContainer.className = 'markdown-container';
        
        // 行ごとに簡単な処理
        const lines = markdownText.split('\n');
        let html = '';
        let listStack = []; // リストのスタック（入れ子対応）
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            
            // 見出し処理
            if (line.startsWith('# ')) {
                // 開いているリストをすべて閉じる
                while (listStack.length > 0) {
                    html += `</${listStack.pop()}>`;
                }
                html += `<h1>${line.substring(2)}</h1>`;
            } 
            else if (line.startsWith('## ')) {
                // 開いているリストをすべて閉じる
                while (listStack.length > 0) {
                    html += `</${listStack.pop()}>`;
                }
                html += `<h2>${line.substring(3)}</h2>`;
            } 
            else if (line.startsWith('### ')) {
                // 開いているリストをすべて閉じる
                while (listStack.length > 0) {
                    html += `</${listStack.pop()}>`;
                }
                html += `<h3>${line.substring(4)}</h3>`;
            } 
            // リスト処理
            else if (line.match(/^(\s*)([\-\*]|\d+\.)\s/)) {
                const match = line.match(/^(\s*)([\-\*]|\d+\.)\s(.*)/);
                if (match) {
                    const indent = match[1].length;
                    const listMarker = match[2];
                    const content = match[3];
                    const isOrdered = listMarker.match(/\d+\./);
                    const listType = isOrdered ? 'ol' : 'ul';
                    
                    // インデントレベルに基づいて適切なリストの開始と終了
                    while (listStack.length > Math.floor(indent / 3) + 1) {
                        html += `</${listStack.pop()}>`;
                    }
                    
                    // 現在のインデントレベルで新しいリストを開始
                    if (listStack.length <= Math.floor(indent / 3)) {
                        html += `<${listType}>`;
                        listStack.push(listType);
                    }
                    
                    html += `<li>${content}</li>`;
                }
            }
            // 通常の行
            else {
                // 開いているリストをすべて閉じる
                while (listStack.length > 0) {
                    html += `</${listStack.pop()}>`;
                }
                
                // 空行はスキップ
                if (line.trim()) {
                    html += `<p>${line}</p>`;
                }
            }
        }
        
        // 最後に開いているリストをすべて閉じる
        while (listStack.length > 0) {
            html += `</${listStack.pop()}>`;
        }
        
        markdownContainer.innerHTML = html;
        contentElement.appendChild(markdownContainer);
    } catch (error) {
        console.error('マークダウンのレンダリングエラー:', error);
        contentElement.innerHTML = `<p>マークダウンの表示中にエラーが発生しました: ${error.message}</p>`;
    }
}

function showError(element, error) {
    element.innerHTML = `
    <div class="markdown-container">
        <h1>読み込みエラー</h1>
        
        <p>ドキュメントの読み込みに失敗しました。</p>
        <p>エラー詳細: ${error.message}</p>
        <p><a href="javascript:location.reload()">再読み込み</a>を試してください。</p>
    </div>
    `;
}

function loadMarkdownLib(callback) {
    if (callback) callback();
}

function configureMarked() {
    // 何もしない
}