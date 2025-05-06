// docs/common.js
// 最小限のマークダウン処理

function showDocsModal(title) {
    const modal = document.getElementById('docs-modal');
    const modalTitle = document.getElementById('modal-title');
    
    modalTitle.textContent = title;
    modal.style.display = 'block';
}

function setupModalEvents() {
    const modal = document.getElementById('docs-modal');
    const closeButton = document.querySelector('.close-button');
    
    closeButton.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
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