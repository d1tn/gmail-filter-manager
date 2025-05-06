// docs/readme.js
document.addEventListener('DOMContentLoaded', function() {
    // クラス名で全ての「はじめに」リンクを取得
    const readmeLinks = document.querySelectorAll('.readme-link');
    
    // 各リンクにイベントリスナーを設定
    readmeLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // マークダウンライブラリ読み込み
            loadMarkdownLib(function() {
                loadReadmeContent();
            });
        });
    });
    
    // セットアップ
    setupModalEvents();
    
    // ローカルのはじめにファイルを読み込む
    async function loadReadmeContent() {
        const docsContent = document.getElementById('docs-content');
        
        try {
            // ローカルのMarkdownファイルを取得
            const response = await fetch('readme.md');
            if (!response.ok) {
                throw new Error(`コンテンツの取得に失敗しました。ステータス: ${response.status}`);
            }
            
            const markdownText = await response.text();
            
            // マークダウンを表示
            renderMarkdown(markdownText, docsContent);
            
            // モーダルを表示
            showDocsModal('はじめに');
            
        } catch (error) {
            console.error('はじめにの読み込みに失敗しました:', error);
            showError(docsContent, error);
            showDocsModal('はじめに');
        }
    }
});