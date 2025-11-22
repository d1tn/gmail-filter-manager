// notifications.js
// フォルダ自動スキャン + クリックで履歴表示対応版

console.log("Notifications module loaded.");

/**
 * Chrome拡張機能のディレクトリ内にあるエントリを取得
 */
function getDirectoryEntries(path) {
    return new Promise((resolve, reject) => {
        chrome.runtime.getPackageDirectoryEntry((root) => {
            root.getDirectory(path, { create: false }, (dirEntry) => {
                const reader = dirEntry.createReader();
                const entries = [];
                const read = () => {
                    reader.readEntries((results) => {
                        if (results.length) {
                            entries.push(...results);
                            read();
                        } else {
                            resolve(entries);
                        }
                    }, (err) => {
                        console.warn("Directory read error:", err);
                        resolve([]); 
                    });
                };
                read();
            }, (err) => {
                console.warn("Updates folder not found:", err);
                resolve([]);
            });
        });
    });
}

/**
 * バージョン比較 (新しい順にソート用)
 */
function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (nb > na) return -1;
    }
    return 0;
}

/**
 * MarkdownをHTMLに変換（インデント対応版）
 */
function parseMdContent(version, mdText, isLatest) {
    if (!mdText) return "";

    const lines = mdText.split(/\r?\n/);
    const dateStr = lines[0] ? lines[0].trim() : "";
    
    const bodyLines = lines.slice(1);
    let listItemsHtml = "";

    if (bodyLines.length > 0) {
        listItemsHtml = bodyLines.map(line => {
            if (!line.trim()) return "";

            const match = line.match(/^(\s*)-\s+(.*)$/);
            if (match) {
                const indent = match[1];
                const content = match[2]
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");

                if (indent.length >= 2) {
                    return `<li class="nested-item">${content}</li>`;
                } else {
                    return `<li class="parent-item">${content}</li>`;
                }
            } else {
                return line.trim() ? `<p>${line}</p>` : "";
            }
        }).join('');
    }

    const bodyHtml = listItemsHtml ? `<ul>${listItemsHtml}</ul>` : "";

    let html = "";
    if (isLatest) {
        html = `
            <div class="release-latest">
                <h1 class="release-label">🎉 新バージョン</h1>
                <h2>
                    ${dateStr} <span class="version-badge release-meta">v${version}</span>
                </h2>
                <div class="release-body">
                    ${bodyHtml}
                </div>
            </div>
        `;
    } else {
        html = `
            <div class="release-past">
                <h3>
                    ${dateStr} <span class="version-badge release-meta">v${version}</span>
                </h3>
                <div class="release-body">
                    ${bodyHtml}
                </div>
            </div>
        `;
    }
    return html;
}

/**
 * ファイル取得
 */
async function fetchVersionFile(version) {
    const uiLang = chrome.i18n.getUILanguage();
    const langCode = uiLang.split('-')[0]; 
    const targetUrl = chrome.runtime.getURL(`updates/${version}/${langCode}.md`);
    const defaultUrl = chrome.runtime.getURL(`updates/${version}/en.md`);

    try {
        let response = await fetch(targetUrl);
        if (!response.ok) response = await fetch(defaultUrl);
        if (!response.ok) return null;
        return await response.text();
    } catch (e) {
        return null;
    }
}

/**
 * モーダル表示
 */
function showInfoModal(htmlContent, onClose = null) {
    const modal = document.getElementById('info-modal');
    const bodyEl = document.getElementById('info-modal-body');
    const titleEl = document.getElementById('info-modal-title'); 
    if (!modal || !bodyEl) return;

    if(titleEl) titleEl.textContent = "更新情報";
    bodyEl.innerHTML = htmlContent;

    const closeBtn = document.getElementById('info-modal-close');
    const actionBtn = document.getElementById('info-modal-action');
    
    const closeModal = () => {
        modal.style.display = 'none';
        if (onClose) onClose();
    };

    closeBtn.onclick = closeModal;
    actionBtn.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.style.display = 'block';
}

/**
 * ★ 更新履歴を表示するコアロジック
 * @param {boolean} forceShow trueなら既読チェックを無視して必ず表示（クリック時用）
 */
async function loadAndShowChangelog(forceShow = false) {
    const currentVer = chrome.runtime.getManifest().version;
    const lastSeenVer = localStorage.getItem('gfm_last_seen_version');

    console.log(`Ver Check: Current=${currentVer}, LastSeen=${lastSeenVer}, Force=${forceShow}`);

    // 強制表示でなく、かつバージョンが変わっていなければ何もしない
    if (!forceShow && currentVer === lastSeenVer) {
        return;
    }

    try {
        const entries = await getDirectoryEntries('updates');
        const versionList = entries
            .filter(entry => entry.isDirectory)
            .map(entry => entry.name)
            .sort((a, b) => compareVersions(b, a));

        if (versionList.length === 0) {
            console.log("No version folders found.");
            return;
        }

        // バージョン不一致（フォルダなし）の場合
        if (!versionList.includes(currentVer) && !forceShow) {
            // 起動時チェックならサイレント更新として処理
            localStorage.setItem('gfm_last_seen_version', currentVer);
            return;
        }

        const fetchPromises = versionList.map(ver => fetchVersionFile(ver));
        const contents = await Promise.all(fetchPromises);

        let combinedHtml = "";
        let historyHeaderAdded = false;

        versionList.forEach((ver, index) => {
            const mdText = contents[index];
            if (!mdText) return;

            const isLatest = (index === 0);

            if (!isLatest && !historyHeaderAdded) {
                combinedHtml += `<h2 class="release-history-header">過去の更新履歴</h2>`;
                historyHeaderAdded = true;
            }

            combinedHtml += parseMdContent(ver, mdText, isLatest);
        });

        if (combinedHtml) {
            showInfoModal(combinedHtml, () => {
                // 閉じたら既読にする
                localStorage.setItem('gfm_last_seen_version', currentVer);
            });
        } else {
            if (forceShow) {
                alert("表示できる更新履歴がありません。");
            }
        }

    } catch (e) {
        console.error("Error showing release notes:", e);
    }
}

/**
 * クリックイベントの設定
 */
function setupVersionClickListener() {
    const versionEl = document.getElementById('version-display');
    if (versionEl) {
        versionEl.title = "クリックで更新履歴を表示"; 

        versionEl.addEventListener('click', () => {
            console.log("Version clicked. Opening changelog...");
            loadAndShowChangelog(true); // 強制表示モード
        });
    }
}

// 初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadAndShowChangelog(false); // 起動時の自動チェック
        setupVersionClickListener(); // クリックイベント登録
    });
} else {
    loadAndShowChangelog(false);
    setupVersionClickListener();
}