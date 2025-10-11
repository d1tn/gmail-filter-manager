// Content Script: Gmailページ上で実行される
console.log("Gmail Filter Manager Content Script loaded!");

// Gmail UIの読み込み完了を待機
function waitForGmailToLoad() {
  return new Promise((resolve) => {
    // 一般的なGmailの左サイドバーの要素をチェック
    const checkExist = setInterval(() => {
      const gmailLeftNav = document.querySelector('div[role="navigation"]');
      if (gmailLeftNav) {
        clearInterval(checkExist);
        resolve(gmailLeftNav);
      }
    }, 500);
  });
}

// ボタンを挿入する位置を特定する関数
function findInsertPosition(leftNavElement) {
  // Gmailのサイドナビゲーションを取得
  const sideNavItems = leftNavElement.querySelectorAll('div[role="navigation"] > div');

  // 通常、最後から2番目の要素が「もっと見る」などの要素であることが多い
  // その上にボタンを配置
  if (sideNavItems.length > 1) {
    return sideNavItems[sideNavItems.length - 2];
  }

  // 適切な位置が見つからない場合は左ナビゲーション自体を返す
  return leftNavElement;
}

// ボタンを作成して挿入する関数
function insertFilterManagerButton(targetElement) {
  // ボタン要素を作成
  const filterButton = document.createElement('div');
  filterButton.id = 'gmail-filter-manager-button';
  filterButton.className = 'gmail-filter-manager-button'; // スタイリング用のクラス
  filterButton.setAttribute('role', 'button'); // アクセシビリティ考慮

  // ボタンのテキストとツールチップを多言語化
  filterButton.textContent = chrome.i18n.getMessage('contentButtonOpenManager');
  filterButton.title = chrome.i18n.getMessage('extensionDefaultTitle');

 // スタイルを適用
  filterButton.style.padding = '10px 16px';
  filterButton.style.margin = '16px 0';
  filterButton.style.borderRadius = '16px';
  filterButton.style.cursor = 'pointer';
  filterButton.style.color = '#444746';
  filterButton.style.fontFamily = 'Roboto, Arial, sans-serif';
  filterButton.style.fontSize = '14px';
  filterButton.style.display = 'flex';
  filterButton.style.alignItems = 'center';
  filterButton.style.transition = 'background-color 0.2s';
  
  // ホバー時の背景色
  filterButton.addEventListener('mouseover', () => {
    filterButton.style.backgroundColor = 'rgba(32, 33, 36, 0.059)';
  });
  
  filterButton.addEventListener('mouseout', () => {
    filterButton.style.backgroundColor = 'transparent';
  });

  // ボタンがクリックされたときのイベントリスナー
  filterButton.addEventListener('click', () => {
    console.log("Filter Manager button clicked in Gmail UI.");
    // 背景ページにメッセージを送信してmanager.htmlを開いてもらう
    chrome.runtime.sendMessage({ action: "open_manager_tab" }, function(response) {
      // レスポンスを処理
      if (response && response.success) {
        console.log("Manager tab opened successfully:", response);
      } else {
        console.error("Failed to open manager tab:", response);
        // エラーメッセージを多言語化して表示
        alert(chrome.i18n.getMessage('contentAlertExtensionInvalid')); // ★ エラーメッセージを多言語化 ★
      }
    });
  });

  // ボタンをターゲット要素の直前に挿入
  // findInsertPositionが返した要素に応じて、挿入方法を調整する必要があるかもしれません
  // 例: findInsertPositionがleftNavElement自体を返した場合、insertBeforeではなくappendChildが良いかも
  if (targetElement.parentNode) {
     targetElement.parentNode.insertBefore(filterButton, targetElement);
     console.log("Filter Manager button inserted.");
  } else {
     // 親要素がない場合はそのままappendChildを試みる（フォールバック）
     document.body.appendChild(filterButton); // bodyに直接追加される可能性は低いが安全策
     console.warn("Target element has no parentNode, appending to body as fallback.");
  }
}


// Gmail UIの変更を監視してボタンが消えた場合に再挿入
function observeGmailChanges(initialNavElement) {
  // MutationObserverを作成
  const observer = new MutationObserver((mutations) => {
    // ボタンが存在するかチェック
    const buttonExists = document.getElementById('gmail-filter-manager-button');

    // ボタンが存在しない場合
    if (!buttonExists) {
      console.log("Filter Manager button missing, attempting to re-insert.");
      // 再度挿入位置を探して挿入
      const navElement = document.querySelector('div[role="navigation"]');
      if (navElement) {
        const insertPosition = findInsertPosition(navElement);
        insertFilterManagerButton(insertPosition);
      } else {
         console.warn("Navigation element not found during re-insertion attempt.");
      }
    }
  });

  // body全体を監視対象とする (UIの大きな変更に対応するため)
  // オプション: childListの変更と、subtree内の変更を監視
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
   console.log("MutationObserver started on document.body.");
}


// コンテンツスクリプト初期化関数
function initializeContentScript() {
    console.log("Initializing content script...");
  // 既存のボタンが残っている場合は削除（ページの再読み込みなどで重複しないように）
  const existingButton = document.getElementById('gmail-filter-manager-button');
  if (existingButton && existingButton.parentNode) {
      existingButton.parentNode.removeChild(existingButton);
      console.log("Removed existing Filter Manager button.");
  }

  // Gmail UIの読み込み完了を待機してから処理を開始
  waitForGmailToLoad().then(navElement => {
    console.log("Gmail UI loaded, inserting button and starting observer.");
    // ボタンを挿入
    insertFilterManagerButton(findInsertPosition(navElement));
    // UIの変更監視を開始
    observeGmailChanges(navElement);
  }).catch(error => {
    console.error("Failed to initialize content script:", error);
     // ここでのエラーメッセージも必要に応じて多言語化
     // 例: alert(chrome.i18n.getMessage('contentInitializationError', [error.message]));
  });
   console.log("Content script initialization started.");
}

// スクリプトが読み込まれたら即座に初期化処理を開始
initializeContentScript();