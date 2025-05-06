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
  
  // アイコン (SVGで実装)
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconSvg.setAttribute('width', '20');
  iconSvg.setAttribute('height', '20');
  iconSvg.setAttribute('viewBox', '0 0 24 24');
  iconSvg.style.marginRight = '8px';
  iconSvg.style.fill = '#444746';
  
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
    chrome.runtime.sendMessage({ action: "open_manager_tab" }, response => {
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