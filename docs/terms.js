// docs/terms.js
document.addEventListener('DOMContentLoaded', function() {
  // クラス名で全ての「利用規約」リンクを取得
  const termsLinks = document.querySelectorAll('.terms-link');
  
  // GitHubの利用規約URL
  const markdownUrl = 'https://raw.githubusercontent.com/d1tn/gmail-filter-manager/refs/heads/main/docs/terms.md';
  const githubUrl = 'https://github.com/d1tn/gmail-filter-manager/blob/main/docs/terms.md';
  
  // 各リンクにイベントリスナーを設定
  termsLinks.forEach(link => {
      link.addEventListener('click', function(e) {
          e.preventDefault();
          
          // マークダウンライブラリ読み込み
          loadMarkdownLib(function() {
              loadTermsContent();
          });
      });
  });
  
  // GitHub上の利用規約を読み込む
  async function loadTermsContent() {
      const docsContent = document.getElementById('docs-content');
      
      try {
          // GitHubからマークダウンを取得
          const response = await fetch(markdownUrl);
          
          if (!response.ok) {
              throw new Error(`GitHubからのコンテンツ取得に失敗しました。ステータス: ${response.status}`);
          }
          
          const markdownText = await response.text();
          
          // マークダウンを表示
          renderMarkdown(markdownText, docsContent);
          
          // モーダルを表示
          showDocsModal('利用規約');
          
      } catch (error) {
          console.error('利用規約の読み込みに失敗しました:', error);
          
          // エラーが発生した場合は直接GitHubページを開く
          window.open(githubUrl, '_blank');
      }
  }
});