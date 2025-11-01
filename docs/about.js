// docs/about.js
// 多言語の about.<lang>.md を読み込んでモーダルに表示する
// 依存: loadMarkdownLib, renderMarkdown, setupModalEvents, showDocsModal, showError（既存）

document.addEventListener('DOMContentLoaded', function () {
  // 「このツールについて」リンクを全て取得
  const aboutLinks = document.querySelectorAll('.about-link');

  // イベント登録
  aboutLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      // マークダウンライブラリ読み込み後に本処理
      loadMarkdownLib(function () {
        loadAboutContent();
      });
    });
  });

  // モーダル等のセットアップ
  setupModalEvents();

  // UI 言語に対応する Markdown をロードしてモーダル表示
  // docs/about.js の loadAboutContent を置き換え
  async function loadAboutContent() {
    const docsContent = document.getElementById('docs-content');

    try {
      // ✅ 開発・実機テスト向け: URLパラメータ ?lang=xx とグローバル定数 FORCE_LANG を優先
      // 例) manager.html?lang=de / manager.html?lang=zh_CN
      const params = new URLSearchParams(location.search);
      const forcedLang = params.get('lang') || (window.FORCE_LANG || ''); // ← 任意で window.FORCE_LANG = 'es' など

      // 1) UI 言語を取得（強制指定があればそれを優先）
      const uiLangRaw = forcedLang || (
        (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage)
          ? chrome.i18n.getUILanguage()
          : (navigator.language || 'en')
      );
      const uiLang = String(uiLangRaw || 'en').toLowerCase();

      // 2) 言語コードの簡易マッピング
      //    docs 配下のファイル名は ja/en/es/fr/de/ru/zh_CN の想定
      const langMap = {
        'ja': 'ja',
        'en': 'en',
        'es': 'es',
        'fr': 'fr',
        'de': 'de',
        'ru': 'ru',
        'zh': 'zh_CN',
        'zh-cn': 'zh_CN',
        'zh_cn': 'zh_CN',
        'zh-ch': 'zh_CN',
        'zh_ch': 'zh_CN'
      };
      const primary = uiLang.split('-')[0]; // 'en-US' → 'en'
      const lang =
        langMap[uiLang] || langMap[primary] || 'en';

      // 3) 読込候補（上から順に試す）
      const candidates = [
        `docs/about.${lang}.md`, // 例: docs/about.ja.md / docs/about.zh_CN.md
        `docs/about.en.md`,      // 最終フォールバック
        `docs/about.md`          // 互換: 旧ファイルが残っている場合
      ];

      // 4) 最初に成功した Markdown を取得
      let md = '';
      let lastErr = null;

      for (const rel of candidates) {
        try {
          const url = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
            ? chrome.runtime.getURL(rel)
            : rel;
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          md = await res.text();
          if (md && md.trim().length > 0) break;
        } catch (err) {
          lastErr = err; // 次候補へ
        }
      }

      if (!md) {
        throw lastErr || new Error('対応するコンテンツが見つかりませんでした');
      }

      // 5) 表示
      renderMarkdown(md, docsContent);

      // ローカライズタイトル（_locales 側のキーを利用、なければ固定文言）
      const title = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage)
        ? (chrome.i18n.getMessage('managerMenuAbout') || 'このツールについて・使い方')
        : 'このツールについて・使い方';

      showDocsModal(title);
    } catch (error) {
      console.error('このツールについての読み込みに失敗しました:', error);
      showError(docsContent, error);
      const fallbackTitle = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage)
        ? (chrome.i18n.getMessage('managerMenuAbout') || 'このツールについて・使い方')
        : 'このツールについて・使い方';
      showDocsModal(fallbackTitle);
    }
  }

});
