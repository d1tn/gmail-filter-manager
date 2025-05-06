// docs/about.js
document.addEventListener('DOMContentLoaded', function() {
    // クラス名で全ての「このツールについて」リンクを取得
    const aboutLinks = document.querySelectorAll('.about-link');
    
    // 各リンクにイベントリスナーを設定
    aboutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // マークダウンライブラリ読み込み
            loadMarkdownLib(function() {
                loadAboutContent();
            });
        });
    });
    
    // セットアップ
    setupModalEvents();
    
    // ローカルのこのツールについてファイルを読み込む
    async function loadAboutContent() {
        const docsContent = document.getElementById('docs-content');
        
        try {
            // ローカルのMarkdownファイルを取得
            const response = await fetch('docs/about.md');
            if (!response.ok) {
                throw new Error(`コンテンツの取得に失敗しました。ステータス: ${response.status}`);
            }
            
            const markdownText = await response.text();
            
            // マークダウンを表示
            renderMarkdown(markdownText, docsContent);
            
            // モーダルを表示
            showDocsModal('このツールについて');
            
        } catch (error) {
            console.error('このツールについての読み込みに失敗しました:', error);
            showError(docsContent, error);
            showDocsModal('このツールについて');
        }
    }
});