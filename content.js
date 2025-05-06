// Content Script: Gmailページ上で実行される
console.log("Gmail Filter Manager Content Script loaded!");

// コンテンツスクリプト初期化関数
function initializeContentScript() {
  // 既存のボタンが残っている場合は削除
  const existingButton = document.getElementById('gmail-filter-manager-button');
  if (existingButton && existingButton.parentNode) {
    existingButton.parentNode.removeChild(existingButton);
  }
  
  // Gmail UIの読み込み完了を待機してから処理を開始
  waitForGmailToLoad().then(navElement => {
    observeGmailChanges(navElement);
  }).catch(error => {
    console.error("Failed to initialize Gmail Filter Manager:", error);
  });
}

// 初期化を実行
initializeContentScript();

// 拡張機能の再接続イベントを監視（拡張機能が再読み込みされた場合に対応）
document.addEventListener('extension-reconnect-event', () => {
  console.log("Extension reconnect event received");
  initializeContentScript();
});

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
  // Gmailのデザインに合わせたボタンを作成
  const filterButton = document.createElement('div');
  filterButton.id = 'gmail-filter-manager-button';
  filterButton.className = 'gmail-filter-manager-button';
  
  // Gmailと似たスタイルを適用
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
  
  // アイコン　SVGの代わりにdiv要素でアイコンを表現
    const iconElement = document.createElement('div');
    iconElement.className = 'filter-icon';
    iconElement.style.width = '20px';
    iconElement.style.height = '20px';
    iconElement.style.marginRight = '8px';
    iconElement.style.backgroundColor = '#444746';
    iconElement.style.maskImage = 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEwIDE4aDR2LTJoLTR2Mnp NMyA2djJoMThWNkgzem0zIDdoMTJ2LTJINS12MnoiLz48L3N2Zz4=)';
    iconElement.style.webkitMaskImage = 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZD0iTTEwIDE4aDR2LTJoLTR2Mnp NMyA2djJoMThWNkgzem0zIDdoMTJ2LTJINS12MnoiLz48L3N2Zz4=)';
    iconElement.style.maskSize = 'cover';
    iconElement.style.webkitMaskSize = 'cover';
  
  // フィルタアイコンのSVGパス
  const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  iconPath.setAttribute('d', 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z');
  iconSvg.appendChild(iconPath);
  
  // テキスト要素
  const buttonText = document.createElement('span');
  buttonText.textContent = 'フィルタ管理を開く';
  
  // 要素をボタンに追加
  filterButton.appendChild(iconSvg);
  filterButton.appendChild(buttonText);
  
// ボタンクリックイベントの設定
filterButton.addEventListener('click', () => {
    console.log("Filter manager button clicked, sending message to background.");
    // Background Service Workerへメッセージを送信
    try {
      chrome.runtime.sendMessage({ action: "open_manager_tab" }, response => {
        if (chrome.runtime.lastError) {
          console.error("メッセージ送信エラー:", chrome.runtime.lastError);
          // エラー発生時の再接続処理
          reconnectExtension();
          return;
        }
        console.log("Response from background:", response);
      });
    } catch (error) {
      console.error("Extension context error:", error);
      // エラー発生時の再接続処理
      reconnectExtension();
    }
  });

  // 拡張機能の再接続を試みる関数
function reconnectExtension() {
    // ユーザーに通知
    const notification = document.createElement('div');
    notification.textContent = 'Gmail Filter Managerの接続が切れました。ページを再読み込みしてください。';
    notification.style.position = 'fixed';
    notification.style.top = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = '#f44336';
    notification.style.color = 'white';
    notification.style.padding = '10px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '9999';
    document.body.appendChild(notification);
    
    // 5秒後に通知を消す
    setTimeout(() => {
      if (notification && notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  function isExtensionContextValid() {
    try {
      // 拡張機能が有効かチェック
      return chrome.runtime && typeof chrome.runtime.id === 'string';
    } catch (e) {
      return false;
    }
  }
  
  // ボタンクリックイベントの設定
  filterButton.addEventListener('click', () => {
    console.log("Filter manager button clicked");
    
    // 拡張機能の状態を確認
    if (!isExtensionContextValid()) {
      console.error("Extension context is invalid");
      reconnectExtension();
      return;
    }
    
    // 正常な場合はメッセージを送信
    console.log("Sending message to background");
    chrome.runtime.sendMessage({ action: "open_manager_tab" }, response => {
      if (chrome.runtime.lastError) {
        console.error("メッセージ送信エラー:", chrome.runtime.lastError);
        reconnectExtension();
        return;
      }
      console.log("Response from background:", response);
    });
  });
  
  // 適切な位置にボタンを挿入
  if (targetElement.tagName.toLowerCase() === 'div') {
    targetElement.parentNode.insertBefore(filterButton, targetElement);
  } else {
    // フォールバックとして単に追加
    targetElement.appendChild(filterButton);
  }
  
  console.log("Filter manager button inserted into Gmail UI");
}

// Gmail UI変更の監視を設定する関数
function observeGmailChanges(initialNavElement) {
  // ボタンが既に存在するか確認
  const buttonExists = document.getElementById('gmail-filter-manager-button');
  if (!buttonExists) {
    // ボタンを挿入
    const insertPosition = findInsertPosition(initialNavElement);
    insertFilterManagerButton(insertPosition);
  }
  
  // Gmail UIの変更を監視してボタンが消えた場合に再挿入
  const observer = new MutationObserver((mutations) => {
    const buttonExists = document.getElementById('gmail-filter-manager-button');
    if (!buttonExists) {
      // 再度挿入位置を探して挿入
      const navElement = document.querySelector('div[role="navigation"]');
      if (navElement) {
        const insertPosition = findInsertPosition(navElement);
        insertFilterManagerButton(insertPosition);
      }
    }
  });
  
  // body全体を監視
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// メイン処理の実行
async function initializeFilterManager() {
  try {
    const navElement = await waitForGmailToLoad();
    observeGmailChanges(navElement);
  } catch (error) {
    console.error("Error initializing Gmail Filter Manager:", error);
  }
}

// 実行
initializeFilterManager();