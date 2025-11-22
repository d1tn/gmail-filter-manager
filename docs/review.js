// docs/review.js
// _locales の messages.json の文言を使ってレビュー訴求モーダルを表示する
// 依存: common.js の showDocsModal, setupModalEvents

(function () {
  // ============================
  // 定数・ヘルパー
  // ============================

  const REVIEW_DONE_KEY = 'reviewDone';
  const REVIEW_LAST_ACTION_KEY = 'reviewLastActionAt';

  // 「レビュー済み」の場合：199日
  const REVIEW_DONE_INTERVAL_MS = 1000 * 60 * 60 * 24 * 199;

  // 「しばらく表示しない」の場合：180日
  const REVIEW_SNOOZE_INTERVAL_MS = 1000 * 60 * 60 * 24 * 180;

  // i18n ヘルパー
  function t(key) {
    if (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getMessage) {
      return chrome.i18n.getMessage(key) || `[${key}]`;
    }
    return `[${key}]`;
  }

  // ストレージに安全に保存するヘルパー（sync / local 両方）
  function saveReviewStateToBothStores(data) {
    if (typeof chrome === 'undefined' || !chrome.storage) return;

    try {
      if (chrome.storage.sync) {
        chrome.storage.sync.set(data, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('[review.js] sync.set error:', chrome.runtime.lastError);
          }
        });
      }
    } catch (e) {
      console.warn('[review.js] sync.set threw error:', e);
    }

    try {
      if (chrome.storage.local) {
        chrome.storage.local.set(data, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            console.warn('[review.js] local.set error:', chrome.runtime.lastError);
          }
        });
      }
    } catch (e) {
      console.warn('[review.js] local.set threw error:', e);
    }
  }

  // sync / local 両方から状態を読み出す
  function loadReviewState(callback) {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      callback({
        reviewDoneSync: undefined,
        reviewDoneLocal: undefined,
        lastSync: undefined,
        lastLocal: undefined,
      });
      return;
    }

    const keys = [REVIEW_DONE_KEY, REVIEW_LAST_ACTION_KEY];

    try {
      chrome.storage.sync.get(keys, syncResult => {
        if (chrome.runtime && chrome.runtime.lastError) {
          console.warn('[review.js] sync.get error:', chrome.runtime.lastError);
        }

        try {
          chrome.storage.local.get(keys, localResult => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.warn('[review.js] local.get error:', chrome.runtime.lastError);
            }

            callback({
              reviewDoneSync: syncResult[REVIEW_DONE_KEY],
              reviewDoneLocal: localResult[REVIEW_DONE_KEY],
              lastSync: syncResult[REVIEW_LAST_ACTION_KEY],
              lastLocal: localResult[REVIEW_LAST_ACTION_KEY],
            });
          });
        } catch (e) {
          console.warn('[review.js] local.get threw error:', e);
          callback({
            reviewDoneSync: syncResult[REVIEW_DONE_KEY],
            reviewDoneLocal: undefined,
            lastSync: syncResult[REVIEW_LAST_ACTION_KEY],
            lastLocal: undefined,
          });
        }
      });
    } catch (e) {
      console.warn('[review.js] sync.get threw error:', e);
      callback({
        reviewDoneSync: undefined,
        reviewDoneLocal: undefined,
        lastSync: undefined,
        lastLocal: undefined,
      });
    }
  }

  // ============================
  // モーダル表示ロジック
  // ============================

  // 状態に応じて「レビュー訴求パート」を出すかどうかを決めつつモーダル表示
  function checkAndShowReviewModal() {
    loadReviewState(state => {
      const {
        reviewDoneSync,
        reviewDoneLocal,
        lastSync,
        lastLocal,
      } = state;

      const reviewDone = Boolean(reviewDoneSync || reviewDoneLocal);

      const last = Math.max(
        typeof lastSync === 'number' ? lastSync : 0,
        typeof lastLocal === 'number' ? lastLocal : 0
      );

      const now = Date.now();

      // 一度も押されていない → モーダル＋レビュー訴求パートを表示
      if (!last) {
        console.log('[review.js] 初回表示 -> 訴求パートありでモーダル表示');
        showReviewModal({ hideRequestPart: false });
        return;
      }

      // レビュー済みかどうかでインターバルを切り替え
      const intervalMs = reviewDone ? REVIEW_DONE_INTERVAL_MS : REVIEW_SNOOZE_INTERVAL_MS;

      if (now - last >= intervalMs) {
        // 199日 or 180日以上経過 → 再度訴求パートを表示
        console.log('[review.js] インターバル経過 -> 訴求パートありでモーダル再表示');
        showReviewModal({ hideRequestPart: false });
      } else {
        // 期間内 → モーダルは出すが訴求パートは隠す
        const remainMs = intervalMs - (now - last);
        const remainDays = Math.ceil(remainMs / (1000 * 60 * 60 * 24));
        console.log(`[review.js] インターバル未経過 -> 訴求パートなしでモーダル表示 (残り約 ${remainDays} 日)`);

        showReviewModal({ hideRequestPart: true });
      }
    });
  }

  // ============================
  // モーダル描画本体
  // ============================

  // hideRequestPart=true のとき:
  //   - .review-modal-message
  //   - #review-modal-open-store
  //   - #review-modal-snooze
  // を非表示にする
  function showReviewModal(options = {}) {
    const { hideRequestPart = false } = options;
    console.log('[review.js] showReviewModal() hideRequestPart =', hideRequestPart);

    const modalTitle = t('reviewModalTitle');
    const body = t('reviewModalBody');
    const ctaMessage = t('reviewModalCtaReviewMassage').replace(/\n/g, '<br>');

    const docsContent = document.getElementById('docs-content');
    if (!docsContent) {
      console.warn('[review.js] #docs-content が見つかりません');
      return;
    }

    docsContent.innerHTML = `
      <div class="markdown-container review-modal">
        <p>${body}</p>
        <p class="review-modal-message">${ctaMessage}</p>
        <div class="review-modal-buttons">
          <button id="review-modal-open-store" type="button" class="action accent">
            ${t('reviewModalCtaReview')}
          </button>
          <button id="review-modal-close" type="button" class="action">
          ${t('commonModalCloseButton')}
          </button>
          <button id="review-modal-snooze" type="button" class="action nobutton">
            ${t('reviewModalCtaSnooze')}
          </button>
        </div>
      </div>
    `;
    // ボタンイベント登録
    setupReviewModalButtonHandlers();

    // レビュー訴求パートを非表示にする場合
    if (hideRequestPart) {
      const msg = docsContent.querySelector('.review-modal-message');
      const btnReview = docsContent.querySelector('#review-modal-open-store');
      const btnSnooze = docsContent.querySelector('#review-modal-snooze');

      if (msg) msg.style.display = 'none';
      if (btnReview) btnReview.style.display = 'none';
      if (btnSnooze) btnSnooze.style.display = 'none';
    }

    // 外側クリックでは閉じてほしくないので true
    showDocsModal(modalTitle, true);
  }

  function setupReviewModalButtonHandlers() {
    const btnReview = document.getElementById('review-modal-open-store');
    const btnSnooze = document.getElementById('review-modal-snooze');
    const btnClose = document.getElementById('review-modal-close');
    const modal = document.getElementById('docs-modal');

    if (btnReview) {
      btnReview.addEventListener('click', () => {
        const now = Date.now();

        // レビュー済みフラグ + 最終アクション時刻を保存
        saveReviewStateToBothStores({
          [REVIEW_DONE_KEY]: true,
          [REVIEW_LAST_ACTION_KEY]: now,
        });

        // Chrome ウェブストアのレビュー URL を開く（全ロケール共通）
        const storeUrl =
          'https://chromewebstore.google.com/detail/gmail-filter-manager-sort/aneombgjgajbinimohagbejfmapggjpp/reviews';
        window.open(storeUrl, '_blank', 'noopener,noreferrer');

        if (modal) modal.style.display = 'none';
      });
    }

    if (btnSnooze) {
      btnSnooze.addEventListener('click', () => {
        const now = Date.now();

        // レビュー済みにはしないが、最後のアクション時刻のみ更新
        saveReviewStateToBothStores({
          [REVIEW_DONE_KEY]: false,
          [REVIEW_LAST_ACTION_KEY]: now,
        });

        if (modal) modal.style.display = 'none';
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
    }
  }

  // ============================
  // 公開 API
  // ============================

  // 手動で「レビューのお願い」を出したいとき（将来の拡張用）
  window.showReviewRequestModal = function () {
    console.log('[review.js] showReviewRequestModal() called');
    checkAndShowReviewModal();
  };

  // manager.js の exportFilters() から呼ぶ想定
  window.showReviewModalAfterExport = function () {
    console.log('[review.js] showReviewModalAfterExport() called');
    checkAndShowReviewModal();
  };

  // ============================
  // DOMContentLoaded 時のセットアップ
  // ============================

  document.addEventListener('DOMContentLoaded', function () {
    // 共通モーダルイベントがまだ張られていないケースへの保険
    if (typeof setupModalEvents === 'function') {
      setupModalEvents();
    }

    // .review-link からも開けるように（あれば）
    const reviewLinks = document.querySelectorAll('.review-link');
    reviewLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        checkAndShowReviewModal();
      });
    });
  });
})();
