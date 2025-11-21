// manager.js
// フィルタ管理画面のロジックを記述

/**
 * @typedef {'filter' | 'folder'} NodeType
 *
 * @typedef {Object} FilterNode
 * @property {'filter'} type
 * @property {string} id
 * // 既存のフィルタが持っている各種プロパティを引き継ぐ（from, to, subject など）
 *
 * @typedef {Object} FolderNode
 * @property {'folder'} type
 * @property {string} id
 * @property {string} name
 * @property {boolean} collapsed
 * @property {FilterNode[]} children
 *
 * @typedef {FilterNode | FolderNode} Node
 */

/**
 * ストレージに保存するための Node 構造（軽量版）
 *
 * @typedef {Object} StoredFilterRef
 * @property {'filter'} type
 * @property {string} id
 *
 * @typedef {Object} StoredFolderNode
 * @property {'folder'} type
 * @property {string} id
 * @property {string} name
 * @property {boolean} collapsed
 * @property {(StoredFilterRef | StoredFolderNode)[]} children
 *
 * @typedef {(StoredFilterRef | StoredFolderNode)} StoredNode
 */


//----------------------------------------------------------------------
// 1. 初期化と基本設定
//----------------------------------------------------------------------
console.log("Filter Manager tab loaded!");

// グローバル設定オブジェクト
window.appSettings = {
    enableDeleteAction: false,  // 削除機能:デフォルトでは無効
    lastUpdated: new Date().toISOString()
};
// フィルタデータを保持するための配列（初期値として空の配列）
let filters = [];

// 現在選択されているフィルタのインデックスを保持
let currentFilterIndex = -1;
// 現在選択中のフォルダのID（フォルダ未選択時は null）
let currentFolderId = null;

// フォルダ機能を含む将来の構造:
// ルート直下に「フィルタ」または「フォルダ」を並べるための配列。
let nodes = null;

// ▼ D&D 用の Sortable インスタンス管理
let rootSortable = null;
/** @type {any[]} */
let folderChildrenSortables = [];

/**
 * filters 配列から nodes 配列を初期化するヘルパー
 * 現時点では「すべてルート直下の単体フィルタ」としてのみ扱う
 * @param {Array<Object>} filterArray
 * @returns {Node[]}
 */

function buildNodesFromFilters(filterArray) {
    if (!Array.isArray(filterArray)) return [];
    return filterArray.map((f) => {
        // 既存のフィルタオブジェクトそのものを編集し、新しいキー type を追加
        f.type = 'filter';
        return f;
    });
}

/**
 * 現在の nodes 配列から、ストレージ保存用の nodesStructure を作成する
 * @returns {StoredNode[]}
 */
function buildStoredNodesFromRuntimeNodes() {
    if (!Array.isArray(nodes) || nodes.length === 0) {
        return [];
    }

    /**
     * 再帰的に Node -> StoredNode に変換
     * @param {Node} node
     * @returns {StoredNode | null}
     */
    function toStored(node) {
        if (!node) return null;

        if (node.type === 'filter') {
            return {
                type: 'filter',
                id: node.id
            };
        }

        if (node.type === 'folder') {
            /** @type {StoredFolderNode} */
            const storedFolder = {
                type: 'folder',
                id: node.id,
                name: node.name || '',
                collapsed: !!node.collapsed,
                children: []
            };

            if (Array.isArray(node.children)) {
                node.children.forEach(child => {
                    const s = toStored(child);
                    if (s) storedFolder.children.push(s);
                });
            }

            return storedFolder;
        }

        return null;
    }

    /** @type {StoredNode[]} */
    const storedNodes = [];
    nodes.forEach(node => {
        const s = toStored(node);
        if (s) storedNodes.push(s);
    });

    return storedNodes;
}

/**
 * 保存された filters 配列と nodesStructure から、実行時の nodes を復元する
 * @param {StoredNode[]} storedNodes
 * @param {any[]} filterArray
 * @returns {Node[]}
 */
function buildRuntimeNodesFromStored(storedNodes, filterArray) {
    if (!Array.isArray(filterArray)) return [];
    if (!Array.isArray(storedNodes) || storedNodes.length === 0) {
        // フォルダ構造がなければ、filters からシンプルな nodes を作る
        return buildNodesFromFilters(filterArray);
    }

    // id -> filter 本体 のマップ
    const filterMap = new Map();
    filterArray.forEach(f => {
        if (!f || !f.id) return;
        f.type = 'filter';
        filterMap.set(f.id, f);
    });

    /**
     * 再帰的に StoredNode -> Node に変換
     * @param {StoredNode} stored
     * @returns {Node | null}
     */
    function toRuntime(stored) {
        if (!stored) return null;

        if (stored.type === 'filter') {
            const filter = filterMap.get(stored.id);
            if (!filter) return null;
            filter.type = 'filter';
            return /** @type {FilterNode} */ (filter);
        }

        if (stored.type === 'folder') {
            /** @type {FolderNode} */
            const folderNode = {
                type: 'folder',
                id: stored.id,
                name: stored.name || '',
                collapsed: !!stored.collapsed,
                children: []
            };

            if (Array.isArray(stored.children)) {
                stored.children.forEach(childStored => {
                    const childRuntime = toRuntime(childStored);
                    if (childRuntime) {
                        folderNode.children.push(childRuntime);
                    }
                });
            }

            return folderNode;
        }

        return null;
    }

    /** @type {Node[]} */
    const runtimeNodes = [];
    storedNodes.forEach(st => {
        const n = toRuntime(st);
        if (n) runtimeNodes.push(n);
    });

    // filters に存在するが、nodesStructure に含まれていなかったフィルタを末尾に追加
    const knownIds = new Set();
    runtimeNodes.forEach(n => {
        if (n.type === 'filter') {
            knownIds.add(n.id);
        } else if (n.type === 'folder' && Array.isArray(n.children)) {
            n.children.forEach(c => {
                if (c.type === 'filter') knownIds.add(c.id);
            });
        }
    });

    filterArray.forEach(f => {
        if (!f || !f.id) return;
        if (!knownIds.has(f.id)) {
            f.type = 'filter';
            runtimeNodes.push(f);
        }
    });

    return runtimeNodes;
}


/**
 * filters配列からnodes配列を再構築する
 * フォルダは温存しつつ、filterノードだけをfiltersの最新状態で差し替える
 */
function syncNodesFromFilters() {
    if (!Array.isArray(filters)) {
        console.warn('filters が配列ではありません。nodes を空にします。');
        nodes = [];
        return;
    }

    // filters を id -> filter のマップにする
    const filterMap = new Map();
    filters.forEach(f => {
        if (!f || !f.id) return;
        f.type = 'filter';
        filterMap.set(f.id, f);
    });

    // nodes がまだ無い or 空なら、素直に filters から作るだけ
    if (!Array.isArray(nodes) || nodes.length === 0) {
        nodes = buildNodesFromFilters(filters);
        console.log('syncNodesFromFilters: nodes を filters から新規構築しました。', nodes);
        return;
    }

    const newNodes = [];
    const seenFilterIds = new Set();

    // 既存 nodes を走査して、フォルダは温存しつつ filter を差し替え
    nodes.forEach(node => {
        if (!node) return;

        if (node.type === 'folder') {
            // フォルダ配下の children も最新の filter に差し替えつつ ID を記録
            if (Array.isArray(node.children) && node.children.length > 0) {
                const newChildren = [];
                node.children.forEach(child => {
                    if (!child || child.type !== 'filter') return;
                    const f = child.id && filterMap.get(child.id);
                    if (f) {
                        f.type = 'filter';
                        newChildren.push(f);
                        seenFilterIds.add(f.id);  // ★ 子フィルタのIDも「すでに使われている」として記録
                    }
                });
                node.children = newChildren;
            }
            newNodes.push(node);
        } else if (node.type === 'filter') {
            // ルート直下のフィルタも filters 側の最新に差し替え
            const f = node.id && filterMap.get(node.id);
            if (f) {
                f.type = 'filter';
                newNodes.push(f);
                seenFilterIds.add(f.id);      // ★ ルートフィルタも記録
            }
            // filters 側に無くなったフィルタのノードは破棄
        }
    });

    // nodes にまだ存在しない「完全新規フィルタ」を末尾に追加
    filters.forEach(f => {
        if (!f || !f.id) return;
        if (!seenFilterIds.has(f.id)) {
            f.type = 'filter';
            newNodes.push(f);
        }
    });

    nodes = newNodes;
    console.log('syncNodesFromFilters: 既存nodesをマージして更新しました。', nodes);
}


/**
 * nodes配列からfilters配列の順序を再構築する
 * フォルダは飛ばし、filterノードだけを直列に flatten する
 */
function syncFiltersFromNodes() {
    if (!Array.isArray(nodes)) {
        console.warn('syncFiltersFromNodes: nodes が配列ではありません。処理をスキップします。');
        return;
    }

    // 変更前に、選択中フィルタのIDを控える
    const currentId =
        (currentFilterIndex >= 0 && currentFilterIndex < filters.length)
            ? filters[currentFilterIndex].id
            : null;

    const newFilters = [];

    nodes.forEach(node => {
        if (!node) return;

        if (node.type === 'filter') {
            newFilters.push(node);
        } else if (node.type === 'folder' && Array.isArray(node.children)) {
            // 将来: フォルダ内に子フィルタを持つようになったらここで flatten
            node.children.forEach(child => {
                if (child && child.type === 'filter') {
                    newFilters.push(child);
                }
            });
        }
    });

    filters = newFilters;

    // currentFilterIndex を再計算
    if (currentId) {
        const idx = filters.findIndex(f => f.id === currentId);
        currentFilterIndex = idx;
    } else {
        currentFilterIndex = -1;
    }

    console.log('syncFiltersFromNodes: filters を nodes から再構築しました。', filters);
}


/**
 * 新しいフォルダノードを作成するヘルパー
 * 現時点では空フォルダ（children: []）のみ
 * @returns {FolderNode}
 */
function createNewFolderNode() {
    const id = 'folder_' + Date.now().toString() + '_' +
        Math.random().toString(36).substring(2, 8);

    /** @type {FolderNode} */
    const folderNode = {
        type: 'folder',
        id,
        name: chrome.i18n.getMessage('managerFolderDefaultName') || 'New folder',
        collapsed: false,
        children: [],
    };

    return folderNode;
}



// 保存処理のデバウンス用タイマーID
let saveTimerId = null;

// ページの読み込みが完了したら実行される処理
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired.");

    // UIテキストの多言語化を適用 (data-i18n属性を使用)
    localizeHtmlPage();

    // 全ての条件項目要素を取得し、ロジックを設定
    const conditionItems = document.querySelectorAll('.filter-condition-item');
    if (conditionItems.length > 0) {
        conditionItems.forEach(item => {
            setupConditionItem(item);
        });
    } else {
        console.warn("No filter condition items found.");
    }

    // アプリ設定を読み込む
    loadAppSettings();

    // ドラッグアンドドロップ機能の初期化
    setupFilterListSorting();

    // バージョン表示機能
    const displayVersionNumber = function () {
        const versionElement = document.getElementById('version-display');
        if (versionElement && chrome.runtime && chrome.runtime.getManifest) {
            const version = chrome.runtime.getManifest().version || '不明';
            versionElement.textContent = 'v' + version;
        }
    };

    // バージョン表示を実行
    displayVersionNumber();

    // 「＋ フィルタを追加」ボタンにイベントリスナーを設定
    const addNewFilterButton = document.getElementById('add-new-filter');
    if (addNewFilterButton) {
        console.log("'+ フィルタを追加' button found, adding event listener.");
        addNewFilterButton.addEventListener('click', () => {
            console.log("'+ フィルタを追加' button clicked!");
            const newFilter = createNewFilterData(); // 無題のフィルタデータを作成
            filters.push(newFilter); // filters 配列に追加

            // nodes を再構築
            syncNodesFromFilters();

            console.log("New filter added:", newFilter);
            console.log("Current filters:", filters);
            renderFilterList(); // フィルタ一覧を更新
            // 無題のフィルタのIDで選択する
            selectFilterById(newFilter.id);
            console.log("New filter should be rendered and selected.");
            // 削除ボタンの状態を更新
            updateDeleteButtonState();
            // 明示的に保存処理を呼び出す
            saveFiltersToStorage();
            // リストを最下部にスクロール
            scrollFilterListToBottom();
        });
    } else {
        console.error("'+ フィルタを追加' button not found!");
    }

    // フォルダ作成ボタン
    const addNewFolderButton = document.getElementById('add-new-folder');
    if (addNewFolderButton) {
        console.log("'+ フォルダを追加' button found, adding event listener.");
        addNewFolderButton.addEventListener('click', () => {
            console.log("'+ フォルダを追加' button clicked!");

            if (!Array.isArray(nodes)) {
                nodes = [];
            }

            const newFolder = createNewFolderNode();
            nodes.push(newFolder);

            console.log('New folder added:', newFolder);
            console.log('Current nodes:', nodes);

            // 現時点では filters は変えない（＝Gmailフィルタは増えない）
            // 一覧だけ更新
            renderFilterList();

            // TODO: 後続コミットで「フォルダ選択で右ペインに情報表示」を追加
        });
    } else {
        console.error("'+ フォルダを追加' button not found!");
    }

    // フィルタ名入力欄のイベントリスナー設定
    const filterNameInput = document.getElementById('filter-name-input');
    if (filterNameInput) {
        filterNameInput.addEventListener('input', updateCurrentFilterData);
    }

    // フィルタ処理に関する入力要素のイベントリスナー設定
    setupFilterProcessEvents();

    // 既存のフィルタデータをストレージから読み込む
    loadFiltersFromStorage();

    // 「この処理を複製」ボタンにイベントリスナーを設定
    const duplicateProcessButton = document.getElementById('duplicate-this-process');
    if (duplicateProcessButton) {
        console.log("'この処理を複製' button found, adding event listener.");
        duplicateProcessButton.addEventListener('click', duplicateCurrentProcess);
    } else {
        console.error("'この処理を複製' button not found!");
    }

    // 「このフィルタを保存する」ボタンにイベントリスナーを設定
    const exportCurrentFilterButton = document.getElementById('export-this-filter');
    if (exportCurrentFilterButton) {
        console.log("'このフィルタを保存' button found, adding event listener.");
        exportCurrentFilterButton.addEventListener('click', function () {
            exportFilters('current'); // 「current」モードでエクスポート
        });
    } else {
        console.error("'このフィルタを保存' button not found!");
    }

    // 「このフィルタを複製」ボタンにイベントリスナーを設定
    const duplicateFilterButton = document.getElementById('duplicate-this-filter');
    if (duplicateFilterButton) {
        console.log("'このフィルタを複製' button found, adding event listener.");
        duplicateFilterButton.addEventListener('click', duplicateCurrentFilter);
    } else {
        console.error("'このフィルタを複製' button not found!");
    }

    // 「このフィルタを削除」ボタンにイベントリスナーを設定
    const deleteFilterButton = document.getElementById('delete-this-filter');
    if (deleteFilterButton) {
        console.log("'このフィルタを削除' button found, adding event listener.");
        deleteFilterButton.addEventListener('click', deleteCurrentFilter);
    } else {
        console.error("'このフィルタを削除' button not found!");
    }

    // エクスポート・インポートボタンのイベントリスナー設定
    const exportAllButton = document.getElementById('export-filter');
    if (exportAllButton) {
        exportAllButton.addEventListener('click', function () {
            exportFilters('all');
        });
    } else {
        console.error("'すべてのフィルタをエクスポート' ボタンが見つかりません");
    }

    const importButton = document.getElementById('import-filter');
    if (importButton) {
        importButton.addEventListener('click', showImportDialog);
    } else {
        console.error("'フィルタをインポート' ボタンが見つかりません");
    }


    console.log("manager.js setup complete.");
});

// フィルタ処理に関する入力要素のイベント設定を行う関数
function setupFilterProcessEvents() {
    // チェックボックスのイベントリスナー設定
    document.querySelectorAll('.filter-process-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateCurrentFilterData);

        // 関連する入力要素の有効/無効を切り替える処理
        const relatedInput = checkbox.closest('.filter-process-item').querySelector('input[type="text"]');
        const relatedSelect = checkbox.closest('.filter-process-item').querySelector('select');

        if (relatedInput) {
            checkbox.addEventListener('change', () => {
                relatedInput.disabled = !checkbox.checked;
                // チェックが外れたら入力値もクリア
                if (!checkbox.checked) {
                    relatedInput.value = '';
                    updateCurrentFilterData(); // データも更新
                }
            });
            // 初期状態を設定
            relatedInput.disabled = !checkbox.checked;
        }

        if (relatedSelect) {
            checkbox.addEventListener('change', () => {
                relatedSelect.disabled = !checkbox.checked;
                // チェックが外れたら選択値をクリア
                if (!checkbox.checked) {
                    relatedSelect.value = ''; // デフォルト値に戻す
                    updateCurrentFilterData(); // データも更新
                }
            });
            // 初期状態を設定
            relatedSelect.disabled = !checkbox.checked;
        }
    });

    // テキスト入力フィールドのイベントリスナー設定
    document.querySelectorAll('.filter-process-item input[type="text"]').forEach(input => {
        input.addEventListener('input', function () {
            console.log(`テキスト入力変更: ${this.id} = ${this.value}`);
            updateCurrentFilterData();
        });
    });

    // セレクトボックスのイベントリスナー設定
    document.querySelectorAll('.filter-process-item select').forEach(select => {
        select.addEventListener('change', function () {
            console.log(`セレクトボックス変更: ${this.id} = ${this.value}`);
            updateCurrentFilterData();
        });
    });

    // サイズ条件の入力要素のイベントリスナー設定
    const sizeValueInput = document.getElementById('condition-size-value-input');
    const sizeOperatorSelect = document.getElementById('condition-size-operator');
    const sizeUnitSelect = document.getElementById('condition-size-unit');

    if (sizeValueInput) {
        sizeValueInput.addEventListener('input', function () {
            console.log(`サイズ値変更: ${this.value}`);
            updateCurrentFilterData();
        });
    }

    if (sizeOperatorSelect) {
        sizeOperatorSelect.addEventListener('change', function () {
            console.log(`サイズ演算子変更: ${this.value}`);
            updateCurrentFilterData();
        });
    }

    if (sizeUnitSelect) {
        sizeUnitSelect.addEventListener('change', function () {
            console.log(`サイズ単位変更: ${this.value}`);
            updateCurrentFilterData();
        });
    }

    // 添付ファイルチェックボックスのイベントリスナー設定
    const hasAttachmentCheckbox = document.getElementById('condition-has-attachment');
    if (hasAttachmentCheckbox) {
        hasAttachmentCheckbox.addEventListener('change', function () {
            console.log(`添付ファイル条件変更: ${this.checked}`);
            updateCurrentFilterData();
        });
    }
}


//----------------------------------------------------------------------
// 2. ユーティリティ関数
//----------------------------------------------------------------------

// チップを作成 (汎用化)
function createChip(text, type) {
    const chip = document.createElement('span');
    chip.classList.add('chip', type);
    chip.appendChild(document.createTextNode(text));
    return chip;
}

// 入力フォーム内のチップに削除ボタンを追加するヘルパー関数
function addRemoveButtonToInputChip(chip) {
    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-chip'); // 入力フォーム内削除用共通クラス
    removeButton.textContent = '✕'; // バツ印
    removeButton.type = 'button'; // フォーム送信を防ぐ
    chip.appendChild(removeButton);
}

// ORグループの開始を示す要素を作成（2個目以降のORグループとORグループの間用）
function createOrGroupIndicator() {
    const orIndicator = document.createElement('span');
    orIndicator.classList.add('or-indicator'); // 共通クラス
    orIndicator.textContent = 'OR';
    return orIndicator;
}

// ORグループ単位の削除ボタンを作成
function createOrGroupRemoveButton() {
    const removeButton = document.createElement('button');
    removeButton.classList.add('remove-or-group-button'); // ORグループ削除用共通クラス
    removeButton.textContent = '✕';
    removeButton.type = 'button';
    return removeButton;
}

// XMLの特殊文字をエスケープする関数
function escapeXml(unsafe) {
    if (!unsafe) return '';

    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;'; // 直接エスケープシーケンスを使用
        }
    });
}

// XML特殊文字をデコードする関数（インポート時に使用）
function unescapeXml(escapedXml) {
    if (!escapedXml) return '';

    return escapedXml
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, '\'')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

// 環境判定関数（拡張機能環境かどうか）
function isExtensionEnvironment() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
}

//----------------------------------------------------------------------
// 3. データモデル関連
//----------------------------------------------------------------------

// 無題のフィルタデータを作成する関数
function createNewFilterData() {
    // デフォルト値を持つ無題のフィルタオブジェクトを生成
    const newFilter = {
        id: Date.now().toString(), // シンプルなIDとしてタイムスタンプを使用
        name: "",
        conditions: { // フィルタ条件の初期値は空またはデフォルト値
            from: [],
            to: [],
            subject: [],
            includes: [],
            excludes: [],
            size: {
                operator: 'larger_than',
                value: null,
                unit: 's_smb'
            },
            hasAttachment: false
        },
        actions: { // フィルタ処理の初期値は全てfalseまたはデフォルト値
            skipInbox: false,
            markAsRead: false,
            star: false,
            applyLabel: { enabled: false, labelName: '' },
            forward: { enabled: false, forwardAddress: '' },
            delete: false,
            notSpam: false,
            alwaysImportant: false,
            neverImportant: false,
            applyCategory: { enabled: false, category: '' }
        }
    };
    return newFilter;
}

// デバウンス付きで保存をスケジュールする関数
function scheduleSaveFilters() {
    // すでにタイマーがあればクリア（連続入力をまとめる）
    if (saveTimerId !== null) {
        clearTimeout(saveTimerId);
    }

    // 最後の変更から 3000ms 後に1回だけ保存
    saveTimerId = setTimeout(() => {
        saveTimerId = null;
        // ここで既存の保存関数を呼ぶ
        saveFiltersToStorage();
    }, 3000); // 好みで 1000〜3000ms くらいに調整
}

// フィルタデータを保存する関数
function saveFiltersToStorage() {
    // 現在の nodes から保存用構造を作成
    const storedNodes = buildStoredNodesFromRuntimeNodes();

    if (isExtensionEnvironment()) {
        const payload = {
            filters: filters,
            nodesStructure: storedNodes
        };

        chrome.storage.local.set(payload, function () {
            if (chrome.runtime.lastError) {
                console.error('フィルタ設定のローカルストレージへの保存に失敗しました:', chrome.runtime.lastError);
            } else {
                console.log('フィルタ設定（filters + nodesStructure）が保存されました（chrome.storage.local）');
            }
        });
    } else {
        try {
            localStorage.setItem('gmail_filters', JSON.stringify(filters));
            localStorage.setItem('gmail_filter_nodes_structure', JSON.stringify(storedNodes));
            console.log('フィルタ設定（filters + nodesStructure）が保存されました（localStorage）');
        } catch (e) {
            console.error('ローカルストレージへの保存中にエラーが発生しました:', e);
        }
    }
}


// 保存されたフィルタデータを反映する関数
/**
 * @param {any[] | null} loadedFilters
 * @param {StoredNode[] | null} loadedNodesStructure
 */
function handleLoadedData(loadedFilters, loadedNodesStructure) {
    if (loadedFilters && Array.isArray(loadedFilters) && loadedFilters.length > 0) {
        filters = loadedFilters;
        console.log('保存されたフィルタを読み込みました:', filters.length, '件');

        // nodesStructure があればそれを元に nodes を復元、なければ filters から構築
        if (loadedNodesStructure && Array.isArray(loadedNodesStructure) && loadedNodesStructure.length > 0) {
            nodes = buildRuntimeNodesFromStored(loadedNodesStructure, filters);
            console.log('保存された nodesStructure から nodes を復元しました。', nodes);
        } else {
            nodes = buildNodesFromFilters(filters);
            console.log('nodesStructure が無いため、filters から nodes を新規構築しました。', nodes);
        }

        // フィルタ一覧を描画
        renderFilterList();

        // 最初のフィルタを選択
        if (filters.length > 0) {
            selectFilter(0);
        }
    } else {
        console.log("ストレージからフィルタが見つからないか、データが無効です。初期フィルタを作成します。");
        const initialFilter = createNewFilterData();
        filters = [initialFilter];

        // nodes もフィルタ1件から構築
        nodes = buildNodesFromFilters(filters);

        renderFilterList();
        selectFilterById(initialFilter.id);
        saveFiltersToStorage();
    }

    updateDeleteButtonState();
}


// 保存されたフィルタデータを読み込む関数
function loadFiltersFromStorage() {
    console.log("ストレージからフィルタデータの読み込みを開始します");

    if (isExtensionEnvironment()) {
        // filters と nodesStructure をまとめて読む
        chrome.storage.local.get(['filters', 'nodesStructure'], function (localResult) {
            if (chrome.runtime.lastError) {
                console.error('ローカルストレージの読み込みに失敗:', chrome.runtime.lastError);
                return;
            }

            if (localResult.filters && Array.isArray(localResult.filters) && localResult.filters.length > 0) {
                console.log('ローカルストレージからフィルタを読み込みました。');
                handleLoadedData(localResult.filters, localResult.nodesStructure || null);
            } else {
                console.log('ローカルストレージにフィルタが見つかりません。同期ストレージを確認します。');
                // 旧バージョンユーザーのために sync からも探し、見つかったら local へ移行
                loadFiltersFromSyncAndMigrate();
            }
        });
    } else {
        try {
            const raw = localStorage.getItem('gmail_filters');
            const rawNodes = localStorage.getItem('gmail_filter_nodes_structure');
            if (raw) {
                const parsedFilters = JSON.parse(raw);
                const parsedNodes = rawNodes ? JSON.parse(rawNodes) : null;
                handleLoadedData(parsedFilters, parsedNodes);
            } else {
                console.log('localStorage にフィルタが見つかりません。初期データを作成します。');
                handleLoadedData(null, null);
            }
        } catch (e) {
            console.error('ローカルストレージの読み込み中にエラーが発生しました:', e);
            handleLoadedData(null, null);
        }
    }
}


function loadFiltersFromSyncAndMigrate() {
    chrome.storage.sync.get('filters', function (syncResult) {
        if (chrome.runtime.lastError) {
            console.error('同期ストレージの読み込みに失敗:', chrome.runtime.lastError);
            // 何もないなら初期フィルタ作成
            handleLoadedData(null);
            return;
        }

        if (syncResult.filters && Array.isArray(syncResult.filters) && syncResult.filters.length > 0) {
            console.log('同期ストレージからフィルタを読み込みました。ローカルへ移行します。');

            const migrated = syncResult.filters;

            // 1. ローカルへ保存（新しい正規の保存先）
            chrome.storage.local.set({ 'filters': migrated }, function () {
                if (chrome.runtime.lastError) {
                    console.error('同期→ローカル移行時の保存に失敗:', chrome.runtime.lastError);
                } else {
                    console.log('フィルタをローカルストレージに移行しました。');
                }
            });

            // 2. UIへ反映
            handleLoadedData(migrated);

            // 3. （任意）sync 側の filters を削除して容量を空けてもいい
            // chrome.storage.sync.remove('filters');
        } else {
            console.log('同期ストレージにもフィルタが見つかりません。初期フィルタを作成します。');
            handleLoadedData(null);
        }
    });
}


// 同期ストレージの読み込みに失敗した場合のフォールバック関数
function loadFiltersFromLocalAsFallback() {
    console.warn('フォールバック：ローカルストレージからフィルタを読み込みます。');
    chrome.storage.local.get('filters', function (result) {
        if (result.filters) {
            console.log('フォールバック読み込み成功。');
            handleLoadedData(result.filters);
        } else {
            console.error('フォールバック読み込み失敗。初期データを作成します。');
            handleLoadedData(null);
        }
    });
}

// 右ペインの入力値の変更を現在のフィルタデータに反映させる関数
function updateCurrentFilterData() {
    console.log("Updating current filter data...");
    if (currentFilterIndex === -1 || !filters[currentFilterIndex]) {
        console.warn("No filter selected or filter data missing to update.");
        return; // フィルタが選択されていない場合やフィルタデータが存在しない場合は何もしない
    }

    const currentFilter = filters[currentFilterIndex];

    // フィルタ名入力欄の値を取得してデータに反映
    updateFilterName(currentFilter);

    // 条件項目のDOM要素からフィルタデータを更新
    updateFilterConditions(currentFilter);

    // アクション（処理）項目のDOM要素からフィルタデータを更新
    updateFilterActions(currentFilter);

    // 変更を保存
    scheduleSaveFilters();

    console.log("Updated filter data:", currentFilter);
}

// フィルタ名を更新する関数
function updateFilterName(currentFilter) {
    const filterNameInput = document.getElementById('filter-name-input');
    if (filterNameInput) {
        const newFilterName = filterNameInput.value.trim();
        currentFilter.name = newFilterName;

        const filterListUl = document.getElementById('filter-list');
        if (!filterListUl) {
            console.warn('#filter-list not found when updating filter name.');
            return;
        }

        const selectedItemButton =
            filterListUl.querySelector(`.item[data-filter-id="${currentFilter.id}"] button`);
        if (selectedItemButton) {
            selectedItemButton.textContent =
                currentFilter.name || chrome.i18n.getMessage('managerFilterListUnnamed');
            console.log(`Left pane filter name updated to: "${selectedItemButton.textContent}"`);
        }
    }
}


// 条件項目のDOM要素からフィルタデータを更新する関数
function updateFilterConditions(currentFilter) {
    document.querySelectorAll('.filter-condition-item').forEach(conditionItemElement => {
        const conditionType = conditionItemElement.dataset.conditionType;

        // AND/OR入力UIを持つ条件の場合
        const inputElement = conditionItemElement.querySelector('.app-form-input');
        const addAndButton = conditionItemElement.querySelector('.add-and-button');
        const addOrButton = conditionItemElement.querySelector('.add-or-button');
        const chipsDisplay = conditionItemElement.querySelector('.condition-chips-display');
        const inputAndButtonContainer = conditionItemElement.querySelector('.input-and-button-container');

        const hasAndOrElements = inputElement && addAndButton && addOrButton && chipsDisplay && inputAndButtonContainer;

        if (hasAndOrElements) {
            const conditionData = [];

            // 1. 入力フォーム内のチップと入力値からAND条件グループを構築（最初のORグループ）
            const currentAndGroup = [];

            // inputAndButtonContainer の子要素を順番に取得
            const inputContainerChildren = inputAndButtonContainer.childNodes;
            inputContainerChildren.forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE) { // 要素ノードの場合
                    if (child.classList.contains('chip')) {
                        const value = child.textContent.replace('✕', '').trim(); // チップのテキストから削除ボタンの✕を除去
                        if (child.classList.contains('address-chip')) {
                            currentAndGroup.push(value);
                        } else if (child.classList.contains('operator-chip') && value === 'AND') {
                            currentAndGroup.push('AND');
                        }
                    }
                } else if (child.nodeType === Node.TEXT_NODE) { // テキストノードの場合（入力フィールドの値）
                    const value = child.textContent.trim();
                    if (value !== '' && child === inputElement) { // 入力フィールド自体のテキストコンテンツ
                        // これは発生しないはずですが、念のため
                    }
                }
            });

            // 現在入力中のテキストをAND条件として追加
            const currentInputValue = inputElement.value.trim();
            if (currentInputValue !== '') {
                // 既存のチップがある場合、最後の要素がANDでなければANDを追加
                if (currentAndGroup.length > 0 && currentAndGroup[currentAndGroup.length - 1] !== 'AND') {
                    currentAndGroup.push('AND');
                }
                currentAndGroup.push(currentInputValue);
            }

            // 構築した最初のAND条件グループを conditionData に追加（ORグループの最初の要素）
            if (currentAndGroup.length > 0) {
                conditionData.push(currentAndGroup);
            }

            // 2. 下部のチップ表示エリア（chipsDisplay）からORグループを取得
            // chipsDisplay の子要素（ORインジケーターとORグループ）を順番に取得
            const displayChildren = chipsDisplay.childNodes;
            let currentOrGroup = null;

            displayChildren.forEach(child => {
                if (child.nodeType === Node.ELEMENT_NODE) { // 要素ノードの場合
                    if (child.classList.contains('or-group')) {
                        // 新しいORグループの開始
                        currentOrGroup = [];
                        // ORグループ内のチップを取得（削除ボタン以外）
                        const chips = child.querySelectorAll('.chip:not(.remove-or-group-button)');
                        chips.forEach(chip => {
                            const value = chip.textContent.trim();
                            if (chip.classList.contains('address-chip')) {
                                currentOrGroup.push(value);
                            } else if (chip.classList.contains('operator-chip') && value === 'AND') {
                                currentOrGroup.push('AND');
                            }
                        });
                        if (currentOrGroup.length > 0) {
                            // ORグループの最後に不要なANDが残っていれば削除
                            if (currentOrGroup[currentOrGroup.length - 1] === 'AND') {
                                currentOrGroup.pop();
                            }
                            conditionData.push(currentOrGroup);
                        }
                        currentOrGroup = null; // ORグループの処理完了
                    } else if (child.classList.contains('or-indicator')) {
                        // ORインジケーターはデータの区切りとして認識するが、データ構造には追加しない
                        // ここでは特に何もしなくても良い
                    }
                }
            });

            // 構築した条件データをフィルタデータに反映
            currentFilter.conditions[conditionType] = conditionData;
        } else if (conditionType === 'size') {
            // サイズ条件の状態を取得してデータに反映
            const sizeOperatorSelect = conditionItemElement.querySelector('#condition-size-operator');
            const sizeValueInput = conditionItemElement.querySelector('#condition-size-value-input');
            const sizeUnitSelect = conditionItemElement.querySelector('#condition-size-unit');
            if (sizeOperatorSelect && sizeValueInput && sizeUnitSelect) {
                currentFilter.conditions.size.operator = sizeOperatorSelect.value;
                currentFilter.conditions.size.value = parseInt(sizeValueInput.value, 10) || null; // 数値に変換、無効な場合はnull
                currentFilter.conditions.size.unit = sizeUnitSelect.value;
            }
        } else if (conditionType === 'has-attachment') {
            // 添付ファイルあり条件の状態を取得してデータに反映
            const hasAttachmentCheckbox = conditionItemElement.querySelector('#condition-has-attachment');
            if (hasAttachmentCheckbox) {
                currentFilter.conditions.hasAttachment = hasAttachmentCheckbox.checked;
            }
        }
    });
}

// フィルタアクション（処理）のDOM要素からフィルタデータを更新する関数
function updateFilterActions(currentFilter) {
    // 受信トレイをスキップ
    const skipInboxCheckbox = document.getElementById('process-skip-inbox');
    if (skipInboxCheckbox) {
        currentFilter.actions.skipInbox = skipInboxCheckbox.checked;
    }

    // 既読にする
    const markAsReadCheckbox = document.getElementById('process-mark-as-read');
    if (markAsReadCheckbox) {
        currentFilter.actions.markAsRead = markAsReadCheckbox.checked;
    }

    // スターを付ける
    const starCheckbox = document.getElementById('process-star');
    if (starCheckbox) {
        currentFilter.actions.star = starCheckbox.checked;
    }

    // ラベルを付ける
    const applyLabelCheckbox = document.getElementById('process-apply-label');
    const applyLabelInput = document.getElementById('process-label-name');
    if (applyLabelCheckbox && applyLabelInput) {
        currentFilter.actions.applyLabel.enabled = applyLabelCheckbox.checked;
        currentFilter.actions.applyLabel.labelName = applyLabelInput.value.trim();
    }

    // 転送する
    const forwardCheckbox = document.getElementById('process-forward');
    const forwardInput = document.getElementById('process-forward-address');
    if (forwardCheckbox && forwardInput) {
        currentFilter.actions.forward.enabled = forwardCheckbox.checked;
        currentFilter.actions.forward.forwardAddress = forwardInput.value.trim();
    }

    // 削除する
    const deleteCheckbox = document.getElementById('process-delete');
    if (deleteCheckbox) {
        currentFilter.actions.delete = deleteCheckbox.checked;

        // 削除機能が無効で、チェックがオンの場合の視覚的フィードバック
        if (currentFilter.actions.delete && !window.appSettings.enableDeleteAction) {
            const deleteLabel = deleteCheckbox.closest('label');
            if (deleteLabel) {
                deleteLabel.classList.add('warning-state');
            }
        } else {
            const deleteLabel = deleteCheckbox.closest('label');
            if (deleteLabel) {
                deleteLabel.classList.remove('warning-state');
            }
        }
    }

    // 迷惑メールにしない
    const notSpamCheckbox = document.getElementById('process-not-spam');
    if (notSpamCheckbox) {
        currentFilter.actions.notSpam = notSpamCheckbox.checked;
    }

    // 重要度設定
    const alwaysImportantCheckbox = document.getElementById('process-always-important');
    if (alwaysImportantCheckbox) {
        currentFilter.actions.alwaysImportant = alwaysImportantCheckbox.checked;
    }

    const neverImportantCheckbox = document.getElementById('process-never-important');
    if (neverImportantCheckbox) {
        currentFilter.actions.neverImportant = neverImportantCheckbox.checked;
    }

    // カテゴリ設定
    const applyCategoryCheckbox = document.getElementById('process-apply-category');
    const applyCategorySelect = document.getElementById('process-apply-category-select');
    if (applyCategoryCheckbox && applyCategorySelect) {
        currentFilter.actions.applyCategory.enabled = applyCategoryCheckbox.checked;

        // チェックボックスがオンの場合のみ値を保存
        if (applyCategoryCheckbox.checked) {
            currentFilter.actions.applyCategory.category = applyCategorySelect.value.trim();
        } else {
            // チェックがオフの場合は空に
            currentFilter.actions.applyCategory.category = '';
        }

        console.log(`カテゴリを設定: enabled=${applyCategoryCheckbox.checked}, category=${currentFilter.actions.applyCategory.category}`);
    }
}

// アプリ設定を保存する関数
function saveAppSettings() {
    if (isExtensionEnvironment()) {
        chrome.storage.sync.set({ 'appSettings': window.appSettings }, function () {
            if (chrome.runtime.lastError) {
                console.error('アプリ設定の同期ストレージへの保存に失敗:', chrome.runtime.lastError);
            } else {
                console.log('アプリ設定が保存されました（chrome.storage.sync）');
            }
        });
    } else {
        try {
            localStorage.setItem('gmail_filter_app_settings', JSON.stringify(window.appSettings));
            console.log('アプリ設定が保存されました（localStorage）');
        } catch (e) {
            console.error('アプリ設定の保存に失敗しました：', e);
        }
    }
}

// アプリ設定を読み込む
// 変更後
function loadAppSettings() {
    console.log("Loading app settings from storage.");
    if (isExtensionEnvironment()) {
        chrome.storage.sync.get('appSettings', function (syncResult) {
            if (chrome.runtime.lastError) {
                console.error('アプリ設定（sync）の読み込み失敗:', chrome.runtime.lastError);
                return;
            }

            if (syncResult.appSettings) {
                window.appSettings = syncResult.appSettings;
                console.log("App settings loaded from sync storage:", window.appSettings);
            } else {
                // 同期ストレージにない場合、ローカルから移行を試みる
                chrome.storage.local.get('appSettings', function (localResult) {
                    if (localResult.appSettings) {
                        console.log("ローカルからアプリ設定を検出し、同期ストレージへ移行します。");
                        window.appSettings = localResult.appSettings;
                        // 移行
                        saveAppSettings();
                    } else {
                        // どちらにもない場合はデフォルト設定を保存
                        console.log(chrome.i18n.getMessage('managerAppSettingsNotFound'));
                        saveAppSettings();
                    }
                });
            }
        });
    } else {
        // 開発環境のロジック
        const settings = localStorage.getItem('gmail_filter_app_settings');
        if (settings) {
            window.appSettings = JSON.parse(settings);
            console.log("App settings loaded from localStorage:", window.appSettings);
        } else {
            saveAppSettings();
        }
    }
}

//----------------------------------------------------------------------
// 4. UI表示/描画関連
//----------------------------------------------------------------------

// フィルタ一覧を更新する関数
function renderFilterList() {
    console.log("Rendering filter list...");
    const filterListUl = document.getElementById('filter-list');
    if (!filterListUl) {
        console.error("Filter list UL element not found!");
        return;
    }

    // 既存のフィルタ項目をクリア（「＋ フィルタを追加」ボタン以外）
    filterListUl.querySelectorAll('.item:not(#add-new-filter-item)').forEach(item => item.remove());

    // レンダリング前にIDの一意性をチェック
    const usedIds = new Set();
    let hasFixedIds = false;

    /** @type {Node[]} */
    let renderNodes;

    if (Array.isArray(nodes) && nodes.length > 0) {
        // nodes が存在するなら、それをそのまま描画ソースとする
        renderNodes = nodes;
    } else {
        // 保険として filters から FilterNode を作る（フォルダ未導入環境など）
        renderNodes = buildNodesFromFilters(filters);
        nodes = renderNodes;
    }

    renderNodes.forEach((node, index) => {
        if (!node) return;

        // =====================
        // フォルダ行の描画
        // =====================
        if (node.type === 'folder') {
            const folder = /** @type {FolderNode} */ (node);
            const listItem = document.createElement('li');
            listItem.classList.add('item', 'folder-item');
            listItem.dataset.folderId = folder.id;

            // ここで「開いているフォルダ」ならクラス追加
            if (!folder.collapsed) {
                listItem.classList.add('is-open-folder');
            }

            // ▼ フォルダヘッダー（1行目）コンテナ
            const header = document.createElement('div');
            header.classList.add('folder-header');

            const button = document.createElement('button');
            button.classList.add('filter-list-button', 'folder-button');
            button.type = 'button';

            const toggleIcon = document.createElement('span');
            toggleIcon.classList.add('material-symbols-outlined', 'folder-toggle-icon');
            toggleIcon.textContent = folder.collapsed ? 'folder' : 'folder_open';

            const text = document.createElement('span');
            text.classList.add('folder-title-text');
            text.textContent =
                folder.name ||
                chrome.i18n.getMessage('managerFolderListUnnamed') ||
                'Folder';

            button.appendChild(toggleIcon);
            button.appendChild(text);

            if (currentFolderId && currentFolderId === folder.id) {
                button.classList.add('active');
            }

            // ▼ フォルダのクリックイベント
            button.addEventListener('click', () => {
                // 1. 開閉状態をトグル
                folder.collapsed = !folder.collapsed;
                
                // 2. フィルタ・フォルダの選択状態を更新
                currentFolderId = folder.id;
                currentFilterIndex = -1;

                // 3. 保存して再描画
                saveFiltersToStorage();
                renderFilterList();
                
                // 4. 右ペインに詳細表示
                displayFolderDetails(folder);
            });

            const dragHandle = document.createElement('span');
            dragHandle.classList.add('drag-handle');
            dragHandle.innerHTML = '&#8942;&#8942;';

            // ▼ ヘッダーにまとめる（1行目）
            header.appendChild(button);
            header.appendChild(dragHandle);

            // li にはまずヘッダーを乗せる
            listItem.appendChild(header);

            // ▼ 子リスト（2行目以降）
            const childrenUl = document.createElement('ul');
            childrenUl.classList.add('folder-children');

            if (folder.collapsed) {
                childrenUl.style.display = 'none';
            }

            if (Array.isArray(folder.children) && folder.children.length > 0) {
                folder.children.forEach(childFilter => {
                    if (!childFilter || childFilter.type !== 'filter') return;

                    const childLi = document.createElement('li');
                    childLi.classList.add('item', 'folder-child-item');
                    childLi.dataset.filterId = childFilter.id;

                    // ▼ ボタン生成
                    const childButton = document.createElement('button');
                    childButton.classList.add('filter-list-button', 'filter-child-button');
                    childButton.type = 'button';
                    childButton.textContent =
                        childFilter.name ||
                        chrome.i18n.getMessage('managerFilterListUnnamed') ||
                        'Unnamed';

                    // ▼ 子要素であることを示すアイコンをボタン先頭に追加
                    const childIcon = document.createElement('span');
                    childIcon.classList.add(
                        'material-symbols-outlined',
                        'child-filter-icon'
                    );
                    // 好きなアイコン名に変えてOK（例: 'subdirectory_arrow_right', 'chevron_right' など）
                    childIcon.textContent = 'subdirectory_arrow_right';

                    // アイコンをボタンの先頭に挿入
                    childButton.prepend(childIcon);

                    // クリックでフィルタ選択
                    childButton.addEventListener('click', () => {
                        selectFilterById(childFilter.id);
                    });

                    const childDrag = document.createElement('span');
                    childDrag.classList.add('drag-handle');
                    childDrag.innerHTML = '&#8942;&#8942;';

                    if (currentFilterIndex !== -1 &&
                        currentFilterIndex < filters.length &&
                        filters[currentFilterIndex] &&
                        childFilter.id === filters[currentFilterIndex].id) {
                        childButton.classList.add('active');
                    }

                    childLi.appendChild(childButton);
                    childLi.appendChild(childDrag);
                    childrenUl.appendChild(childLi);
                });
            }

            // ヘッダーの「下」に子リストをぶら下げる
            listItem.appendChild(childrenUl);

            const addNewFilterItem = filterListUl.querySelector('#add-new-filter-item');
            if (addNewFilterItem) {
                addNewFilterItem.before(listItem);
            } else {
                filterListUl.appendChild(listItem);
            }

            return;
        }


        // =====================
        // 通常フィルタ行の描画
        // =====================
        const filter = /** @type {FilterNode} */ (node);

        console.log(`フィルタ #${index} ID: ${filter.id}, 名前: ${filter.name || "無題"}`);

        if (!filter.id || usedIds.has(filter.id)) {
            const oldId = filter.id || '(未設定)';
            filter.id = Date.now().toString() + "_" + index + "_" +
                Math.random().toString(36).substring(2, 10);
            console.log(`ID重複または未設定を検出! "${oldId}" → 新ID "${filter.id}" を生成しました`);
            hasFixedIds = true;
        }

        usedIds.add(filter.id);

        const listItem = document.createElement('li');
        listItem.classList.add('item');
        listItem.dataset.filterId = filter.id;
        listItem.dataset.filterIndex = String(index);

        const button = document.createElement('button');
        button.textContent =
            filter.name || chrome.i18n.getMessage('managerFilterListUnnamed');
        button.classList.add('filter-list-button');
        button.type = 'button';

        button.addEventListener('click', () => {
            selectFilterById(filter.id);
        });

        const dragHandle = document.createElement('span');
        dragHandle.classList.add('drag-handle');
        dragHandle.innerHTML = '&#8942;&#8942;';

        if (currentFilterIndex !== -1 &&
            currentFilterIndex < filters.length &&
            filter.id === filters[currentFilterIndex].id) {
            button.classList.add('active');
        }

        listItem.appendChild(button);
        listItem.appendChild(dragHandle);

        const addNewFilterItem = filterListUl.querySelector('#add-new-filter-item');
        if (addNewFilterItem) {
            addNewFilterItem.before(listItem);
        } else {
            filterListUl.appendChild(listItem);
        }
    });

    // ここで D&D を再初期化（フォルダ内 children を含める）
    setupFilterListSorting();

    if (hasFixedIds) {
        console.log("フィルタIDを修正したため、変更を保存します");
        saveFiltersToStorage();
    }

    console.log("Filter list rendering complete.");
}

// 選択されたフィルタのデータを右ペインに表示する関数
function displayFilterDetails(filter) {
    console.log("Displaying filter details:", filter);
    // 右ペインの要素をクリアする処理 (元のコードのまま)
    const filterNameInput = document.getElementById('filter-name-input');

    // フィルタ名入力欄の表示制御
    if (filterNameInput) {
        // フィルタデータが存在し、かつフィルタ名がデフォルト値の場合は空欄にする
        // "無題のフィルタ" を多言語化キーで比較
        if (filter && filter.name === chrome.i18n.getMessage('managerFilterListUnnamed')) { // ★ 多言語化 ★
            filterNameInput.value = ''; // 空文字列を設定
            console.log("Filter name is default, showing placeholder.");
        } else {
            // それ以外のフィルタ名の場合はその値を設定
            filterNameInput.value = filter ? filter.name : '';
            if (filter) {
                console.log(`Displaying filter name: "${filter.name}"`);
            }
        }
    }

    // フィルタデータがない場合の処理 (元のコードのまま)
    if (!filter) {
        console.warn("No filter data to display.");
        // フィルタデータがない場合は条件表示エリアも非表示にする (元のコードのまま)
        document.querySelectorAll('.filter-condition-item').forEach(conditionItemElement => {
            updateDisplayVisibilityOfCondition(conditionItemElement); // Assuming this function exists
        });
        // フィルタ名入力欄もクリア（既に上で処理済みですが念のため） (元のコードのまま)
        if (filterNameInput) {
            filterNameInput.value = '';
        }

        // フィルタデータがない場合もUIの状態を更新する必要があるかもしれないので、ここで呼び出す
        // 例: 削除機能が無効なら、フィルタがない状態でも削除関連UIは無効のまま表示されるべき場合など
        if (typeof updateUIBasedOnSettings === 'function') {
            updateUIBasedOnSettings(); // ★ フィルタがない場合も呼び出す ★
        } else {
            console.error("updateUIBasedOnSettings function not found!");
        }

        return; // フィルタデータがない場合はここで終了 (元のコードのまま)
    }

    // 全ての入力要素をクリア (Assuming this function exists)
    clearAllInputElements();

    // フィルタ名入力欄にデータを反映 (この部分は上の filterNameInput 制御と重複しているように見えるが、元のコードを維持)
    if (filterNameInput) {
        filterNameInput.value = filter.name;
    }

    // 各フィルタ条件のデータを右ペインに反映 (Assuming these functions exist)
    renderCondition('from', filter.conditions.from);
    renderCondition('to', filter.conditions.to);
    renderCondition('subject', filter.conditions.subject);
    renderCondition('includes', filter.conditions.includes);
    renderCondition('excludes', filter.conditions.excludes);

    // サイズ条件の反映 (元のコードのまま)
    const sizeOperatorSelect = document.getElementById('condition-size-operator');
    const sizeValueInput = document.getElementById('condition-size-value-input');
    const sizeUnitSelect = document.getElementById('condition-size-unit');
    if (sizeOperatorSelect && sizeValueInput && sizeUnitSelect) {
        sizeOperatorSelect.value = filter.conditions.size.operator;
        sizeValueInput.value = filter.conditions.size.value !== null ? filter.conditions.size.value : '';
        sizeUnitSelect.value = filter.conditions.size.unit;
    }

    // 添付ファイルあり条件の反映 (元のコードのまま)
    const hasAttachmentCheckbox = document.getElementById('condition-has-attachment');
    if (hasAttachmentCheckbox) {
        hasAttachmentCheckbox.checked = filter.conditions.hasAttachment;
    }

    // フィルタ処理（アクション）のデータを反映 (Assuming this function exists and populates action UI)
    displayFilterActions(filter); // <-- この関数がアクションUIを生成/更新するはずです

    // ★★★ ここに updateUIBasedOnSettings() の呼び出しを追加 ★★★
    // displayFilterActions が完了し、削除チェックボックスがDOMにある後に実行
    if (typeof updateUIBasedOnSettings === 'function') {
        updateUIBasedOnSettings(); // ★ フィルタデータがある場合に呼び出す ★
    } else {
        console.error("updateUIBasedOnSettings function not found!");
    }


    console.log("Filter details displayed."); // このログがあればその直前に追加
}

// 全ての入力要素をクリアする関数
function clearAllInputElements() {
    // 各条件入力エリアのチップと入力フィールドをクリア
    document.querySelectorAll('.filter-condition-item').forEach(conditionItemElement => {
        const chipsDisplay = conditionItemElement.querySelector('.condition-chips-display');
        const inputAndButtonContainer = conditionItemElement.querySelector('.input-and-button-container');
        const inputElement = conditionItemElement.querySelector('.app-form-input');

        if (chipsDisplay) chipsDisplay.innerHTML = '';
        if (inputAndButtonContainer) inputAndButtonContainer.querySelectorAll('.chip').forEach(chip => chip.remove());
        if (inputElement) inputElement.value = '';

        // OR接続テキストも非表示に戻す
        const orConnector = conditionItemElement.querySelector('.condition-or-connector');
        if (orConnector) orConnector.style.display = 'none';
    });

    // フィルタ処理のチェックボックス、入力欄、プルダウンをデフォルト状態に戻す
    document.querySelectorAll('.filter-process-item input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
    document.querySelectorAll('.filter-process-item input[type="text"]').forEach(input => {
        input.value = '';
        input.disabled = true;
    });
    document.querySelectorAll('.filter-process-item select').forEach(select => {
        select.value = '';
        select.disabled = true;
    });
}

// フィルタアクション（処理）のデータを右ペインに反映する関数
function displayFilterActions(filter) {
    const actions = filter.actions;

    // 受信トレイをスキップ
    const skipInboxCheckbox = document.getElementById('process-skip-inbox');
    if (skipInboxCheckbox) {
        skipInboxCheckbox.checked = actions.skipInbox;
    }

    // 既読にする
    const markAsReadCheckbox = document.getElementById('process-mark-as-read');
    if (markAsReadCheckbox) {
        markAsReadCheckbox.checked = actions.markAsRead;
    }

    // スターを付ける
    const starCheckbox = document.getElementById('process-star');
    if (starCheckbox) {
        starCheckbox.checked = actions.star;
    }

    // ラベルを付ける
    const applyLabelCheckbox = document.getElementById('process-apply-label');
    const applyLabelInput = document.getElementById('process-label-name');
    if (applyLabelCheckbox && applyLabelInput) {
        applyLabelCheckbox.checked = actions.applyLabel.enabled;
        applyLabelInput.value = actions.applyLabel.labelName;
        applyLabelInput.disabled = !actions.applyLabel.enabled;
    }

    // 転送する
    const forwardCheckbox = document.getElementById('process-forward');
    const forwardInput = document.getElementById('process-forward-address');
    if (forwardCheckbox && forwardInput) {
        forwardCheckbox.checked = actions.forward.enabled;
        forwardInput.value = actions.forward.forwardAddress;
        forwardInput.disabled = !actions.forward.enabled;
    }

    // 削除する
    const deleteCheckbox = document.getElementById('process-delete');
    if (deleteCheckbox) {
        deleteCheckbox.checked = actions.delete;
    }

    // 迷惑メールにしない
    const notSpamCheckbox = document.getElementById('process-not-spam');
    if (notSpamCheckbox) {
        notSpamCheckbox.checked = actions.notSpam;
    }

    // 常に重要マークを付ける
    const alwaysImportantCheckbox = document.getElementById('process-always-important');
    if (alwaysImportantCheckbox) {
        alwaysImportantCheckbox.checked = actions.alwaysImportant;
    }

    // 重要マークを付けない
    const neverImportantCheckbox = document.getElementById('process-never-important');
    if (neverImportantCheckbox) {
        neverImportantCheckbox.checked = actions.neverImportant;
    }

    // カテゴリを適用
    const applyCategoryCheckbox = document.getElementById('process-apply-category');
    const applyCategorySelect = document.getElementById('process-apply-category-select');
    if (applyCategoryCheckbox && applyCategorySelect) {
        applyCategoryCheckbox.checked = actions.applyCategory.enabled;

        if (actions.applyCategory.category) {
            applyCategorySelect.value = actions.applyCategory.category;
        } else {
            applyCategorySelect.value = '';
        }

        applyCategorySelect.disabled = !actions.applyCategory.enabled;

        console.log(`カテゴリを表示: enabled=${applyCategoryCheckbox.checked}, category=${applyCategorySelect.value}`);
    }
}

// フィルタデータの conditions 部分を右ペインの条件入力エリアのチップ表示に反映する関数
function renderCondition(conditionType, conditionData) {
    console.log(`Rendering condition: ${conditionType}`, conditionData);
    const conditionItemElement = document.querySelector(`.filter-condition-item[data-condition-type="${conditionType}"]`);
    if (!conditionItemElement) {
        console.warn(`Condition item element not found for type: ${conditionType}.`);
        return;
    }

    const chipsDisplay = conditionItemElement.querySelector('.condition-chips-display');
    const inputAndButtonContainer = conditionItemElement.querySelector('.input-and-button-container');
    const inputElement = conditionItemElement.querySelector('.app-form-input');

    // 既存のチップ表示と入力フォームを全てクリア
    if (chipsDisplay) {
        console.log('Clearing chips display.');
        chipsDisplay.innerHTML = '';
    }
    if (inputAndButtonContainer) {
        console.log('Clearing input form chips.');
        inputAndButtonContainer.querySelectorAll('.chip').forEach(chip => chip.remove());
    }
    if (inputElement) {
        console.log('Clearing input element value.');
        inputElement.value = '';
    }

    // OR接続テキストも非表示に戻す
    const orConnector = conditionItemElement.querySelector('.condition-or-connector');
    if (orConnector) orConnector.style.display = 'none';

    if (!conditionData || conditionData.length === 0) {
        // データがない場合は表示エリアを非表示にする
        updateDisplayVisibilityOfCondition(conditionItemElement);
        return;
    }

    // conditionData (Array<Array<string>>) を解析し、チップを生成して配置
    conditionData.forEach((orGroup, orIndex) => {
        // 最初のORグループの場合
        if (orIndex === 0) {
            renderFirstOrGroup(orGroup, inputElement);
        } else {
            // 2番目以降のORグループの場合
            renderAdditionalOrGroup(orGroup, chipsDisplay);
        }
    });

    // 表示エリアの表示/非表示を更新
    updateDisplayVisibilityOfCondition(conditionItemElement);
    console.log(`Finished rendering condition: ${conditionType}`);
}

// 最初のORグループを入力フォームに表示する関数
function renderFirstOrGroup(orGroup, inputElement) {
    if (orGroup.length > 0) {
        const lastValue = orGroup[orGroup.length - 1]; // 最後の要素を取得

        // 最後の要素を入力フォームに設定
        if (inputElement) {
            inputElement.value = lastValue;
        }

        // 最後の要素より前の要素を入力フォーム内のチップとして追加
        for (let i = 0; i < orGroup.length - 1; i++) {
            const item = orGroup[i];
            if (item === 'AND') {
                const operatorChip = createChip('AND', 'operator-chip');
                if (inputElement) inputElement.before(operatorChip);
            } else {
                const valueChip = createChip(item, 'address-chip');
                addRemoveButtonToInputChip(valueChip);
                if (inputElement) inputElement.before(valueChip);
            }
        }
    }
}

// 2番目以降のORグループを下部表示エリアに表示する関数
function renderAdditionalOrGroup(orGroup, chipsDisplay) {
    if (chipsDisplay) {
        // 既存のORグループが存在する場合のみ、ORインジケーターを追加
        if (chipsDisplay.querySelectorAll('.or-group').length > 0) {
            const orIndicator = createOrGroupIndicator();
            chipsDisplay.appendChild(orIndicator);
        }

        // ORグループ全体のコンテナを作成
        const orGroupContainer = document.createElement('div');
        orGroupContainer.classList.add('or-group');

        orGroup.forEach(item => {
            if (item === 'AND') {
                // AND演算子チップ
                const operatorChip = createChip('AND', 'operator-chip');
                orGroupContainer.appendChild(operatorChip);
            } else {
                // 値チップ
                const valueChip = createChip(item, 'address-chip');
                orGroupContainer.appendChild(valueChip);
            }
        });

        // ORグループ削除ボタンを追加
        const orGroupRemoveButton = createOrGroupRemoveButton();
        orGroupContainer.appendChild(orGroupRemoveButton);

        // ORグループコンテナを下部表示エリアに追加
        chipsDisplay.appendChild(orGroupContainer);
    }
}

// 条件項目の表示/非表示を更新するヘルパー関数
function updateDisplayVisibilityOfCondition(conditionItemElement) {
    const chipsDisplay = conditionItemElement.querySelector('.condition-chips-display');
    const orConnector = conditionItemElement.querySelector('.condition-or-connector');

    // AND/OR入力UIがない条件項目では、表示制御は不要
    const inputElement = conditionItemElement.querySelector('.app-form-input');
    const addAndButton = conditionItemElement.querySelector('.add-and-button');
    const addOrButton = conditionItemElement.querySelector('.add-or-button');
    const inputAndButtonContainer = conditionItemElement.querySelector('.input-and-button-container');
    const hasAndOrElements = inputElement && addAndButton && addOrButton && chipsDisplay && inputAndButtonContainer;

    if (!hasAndOrElements) {
        return;
    }

    if (chipsDisplay) {
        const orGroupCount = chipsDisplay.querySelectorAll('.or-group').length;
        if (orGroupCount === 0) {
            chipsDisplay.style.display = 'none';
            if (orConnector) {
                orConnector.style.display = 'none';
            }
        } else {
            chipsDisplay.style.display = 'flex';
            if (orConnector) {
                orConnector.style.display = 'block';
            }
        }
    }
}

// 削除ボタンの状態を更新する関数
function updateDeleteButtonState() {
    const deleteFilterButton = document.getElementById('delete-this-filter');
    if (deleteFilterButton) {
        // フィルタが1件以下の場合は削除ボタンを無効化
        if (filters.length <= 1) {
            deleteFilterButton.disabled = true;
            // ツールチップを多言語化
            deleteFilterButton.title = chrome.i18n.getMessage('managerActionDeleteTooltip');
            deleteFilterButton.classList.add('disabled-button');
        } else {
            deleteFilterButton.disabled = false;
            // ツールチップを多言語化
            deleteFilterButton.title = chrome.i18n.getMessage('managerActionDelete');
            deleteFilterButton.classList.remove('disabled-button');
        }
    }
}


// フィルタリストを最下部にスクロールする関数
function scrollFilterListToBottom() {
    const filterListContainer = document.querySelector('.filter-list .items');
    if (filterListContainer) {
        // スムーズなスクロールでリストの最下部に移動
        filterListContainer.scrollTo({
            top: filterListContainer.scrollHeight,
            behavior: 'smooth'
        });

        console.log("Scrolled filter list to bottom");
    }
}

// 設定に基づいてUIを更新する関数
function updateUIBasedOnSettings() {
    // 削除チェックボックスの状態を更新
    // チェックボックスのIDが 'process-delete' である前提
    const deleteCheckbox = document.getElementById('process-delete');
    if (deleteCheckbox) {
        // 削除機能が無効なら、チェックボックスを無効化
        // window.appSettings がグローバルに定義されている前提
        deleteCheckbox.disabled = !window.appSettings.enableDeleteAction;

        // 削除アクションのラベルスタイルを更新
        const deleteLabel = deleteCheckbox.closest('label');
        if (deleteLabel) {
            if (!window.appSettings.enableDeleteAction) { // ★ window.appSettings を参照 ★
                deleteLabel.classList.add('disabled-action');
                // 無効時の説明を追加
                // クラス名 'info-text' のspan要素を探す前提
                let infoSpan = deleteLabel.querySelector('.info-text');
                if (!infoSpan) {
                    infoSpan = document.createElement('span');
                    infoSpan.className = 'info-text'; // 元のクラス名を使用
                    infoSpan.style.marginLeft = '10px'; // スタイルも元のコードに合わせる
                    infoSpan.style.fontSize = '0.8em'; // スタイルも元のコードに合わせる
                    infoSpan.style.color = '#888'; // スタイルも元のコードに合わせる
                    deleteLabel.appendChild(infoSpan); // ラベル要素の子要素として追加
                }
                // 説明テキストを多言語化
                infoSpan.textContent = chrome.i18n.getMessage('managerProcessDeleteDisabledInfo'); // ★ 多言語化 ★

            } else {
                deleteLabel.classList.remove('disabled-action');
                // 有効時は説明を削除
                const infoSpan = deleteLabel.querySelector('.info-text'); // クラス名 'info-text' のspan要素を探す
                if (infoSpan) {
                    infoSpan.remove();
                }
            }
        }
    }
    // updateDeleteButtonState 関数を呼び出して、左側の削除ボタンの状態も更新
    updateDeleteButtonState(); // この関数が manager.js 内に定義されている前提
}

//----------------------------------------------------------------------
// 5. イベントハンドラと機能実装
//----------------------------------------------------------------------

// フィルタを選択し、右ペインに表示する関数 (IDで選択)
function selectFilterById(filterId) {
    console.log(`Attempting to select filter with ID: ${filterId}`);
    const index = filters.findIndex(filter => filter.id === filterId);

    // 該当フィルタが見つかった場合は index ベースの関数に委譲
    if (index !== -1) {
        selectFilter(index);
        return;
    }

    // 見つからなかった場合
    console.warn('selectFilterById: フィルタが見つかりません:', filterId);

    // 選択状態を解除
    currentFilterIndex = -1;
    currentFolderId = null;  // ★ フォルダ選択も解除

    // 左ペインの表示を更新（active解除など）
    renderFilterList();

    // 右ペイン：フィルタエディタを表示、フォルダエディタを非表示
    const filterEditor = document.getElementById('filter-editor');
    const folderEditor = document.getElementById('folder-editor');
    if (filterEditor && folderEditor) {
        filterEditor.style.display = '';
        folderEditor.style.display = 'none';
    }

    // 右ペイン内容をクリア
    displayFilterDetails(null);

    // 削除ボタン等の状態更新
    updateDeleteButtonState();
}


// フィルタを選択し、右ペインに表示する関数 (インデックスで選択)
function selectFilter(index) {
    console.log(`Selecting filter by index: ${index}`);

    // フィルタが1件もない場合
    if (!filters || filters.length === 0) {
        currentFilterIndex = -1;
        currentFolderId = null; // 念のためフォルダ選択も解除

        displayFilterDetails(null);
        updateDeleteButtonState();
        console.log("No filters available. Cleared right pane.");
        return;
    }

    // インデックスが範囲外の場合は補正
    if (index < 0) {
        index = 0;
    }
    if (index >= filters.length) {
        index = filters.length - 1;
    }

    // 選択中インデックスを更新
    currentFilterIndex = index;
    currentFolderId = null;  // ★ フォルダ選択を必ず解除する

    // 左ペイン全体を nodes ベースで再描画（active クラス付与もここに委譲）
    renderFilterList();

    // 右ペイン：フィルタエディタを表示、フォルダエディタを非表示
    const filterEditor = document.getElementById('filter-editor');
    const folderEditor = document.getElementById('folder-editor');
    if (filterEditor && folderEditor) {
        filterEditor.style.display = '';
        folderEditor.style.display = 'none';
    }

    // 右ペインに詳細を表示
    if (currentFilterIndex >= 0 && currentFilterIndex < filters.length) {
        displayFilterDetails(filters[currentFilterIndex]);
    } else {
        displayFilterDetails(null);
    }

    // 削除ボタンなどの状態更新
    updateDeleteButtonState();

    console.log(`Selected filter index: ${currentFilterIndex}`);
}

/**
 * フォルダIDを指定して選択状態にする
 * @param {string} folderId
 */
function selectFolderById(folderId) {
    if (!Array.isArray(nodes)) return;

    const folder = nodes.find(
        (n) => n && n.type === 'folder' && n.id === folderId
    );
    if (!folder) {
        console.warn('selectFolderById: フォルダが見つかりません:', folderId);
        return;
    }

    // フォルダ選択時はフィルタ選択を解除
    currentFilterIndex = -1;
    currentFolderId = folderId;

    // 左ペインのアクティブ状態を更新
    renderFilterList();

    // 右ペインをフォルダ編集モードに切り替え
    displayFolderDetails(folder);
}

/**
 * フォルダの詳細を右ペインに表示する
 * @param {FolderNode} folder
 */
function displayFolderDetails(folder) {
    const filterEditor = document.getElementById('filter-editor');
    const folderEditor = document.getElementById('folder-editor');
    const folderNameInput = /** @type {HTMLInputElement|null} */(
        document.getElementById('folder-name-input')
    );

    if (!folderEditor || !folderNameInput || !filterEditor) {
        console.error('Folder editor elements not found!');
        return;
    }

    // フォルダ編集モードに切り替え
    filterEditor.style.display = 'none';
    folderEditor.style.display = '';

    // 入力値を現在のフォルダ名に反映
    folderNameInput.value =
        folder.name ||
        chrome.i18n.getMessage('managerFolderListUnnamed') ||
        'Untitled folder';

    // 既存のハンドラをクリアしてから「1つだけ」付け直す
    folderNameInput.oninput = null;
    folderNameInput.onchange = null;

    // ★ addEventListener ではなく oninput に直接代入する
    folderNameInput.oninput = () => {
        const newName = folderNameInput.value;

        // 1) このフォルダオブジェクト自体を更新
        folder.name = newName;

        // 2) nodes 側の該当フォルダも同期（ID一致のみ）
        if (Array.isArray(nodes)) {
            nodes.forEach((n) => {
                if (n && n.type === 'folder' && n.id === folder.id) {
                    n.name = newName;
                }
            });
        }

        // 3) 左ペインのラベルだけ更新（フル再描画はしない）
        const filterListUl = document.getElementById('filter-list');
        if (filterListUl) {
            const titleSpan = filterListUl.querySelector(
                `.item.folder-item[data-folder-id="${folder.id}"] .folder-title-text`
            );
            if (titleSpan) {
                titleSpan.textContent =
                    newName ||
                    chrome.i18n.getMessage('managerFolderListUnnamed') ||
                    'Folder';
            }
        }

        // 4) ストレージへ永続化（nodesStructure も含めて）
        saveFiltersToStorage();
    };

    // ▼ フォルダ削除ボタンの設定も、同じ理由で onclick に一本化しておくと安全
    const deleteButton = document.getElementById('delete-this-folder');
    if (deleteButton) {
        deleteButton.onclick = null;
        deleteButton.onclick = () => {
            deleteThisFolderWithConfirm(folder);
        };
    }
}



// フィルタの処理を複製する関数
function duplicateCurrentProcess() {
    console.log("Attempting to duplicate current filter.");
    if (currentFilterIndex === -1) {
        console.warn("No filter selected to duplicate.");
        return; // 選択されているフィルタがない場合は何もしない
    }

    const originalFilter = filters[currentFilterIndex];

    // 新しいフィルタ作成時の conditions の初期値を定義
    // これを複製したフィルタの conditions に適用する
    const initialConditionsForNewFilter = {
        from: [],
        to: [],
        subject: [],
        includes: [],
        excludes: [],
        size: {
            operator: 'larger_than', // デフォルト値
            value: null,
            unit: 's_smb' // デフォルト値
        },
        hasAttachment: false
    };

    // フィルタデータのディープコピーを作成
    const duplicatedFilter = {
        id: Date.now().toString(),  // 新しい一意なIDを生成
        name: `${originalFilter.name} (Copied)`, // 名前に "(コピー)" を追加
        conditions: JSON.parse(JSON.stringify(initialConditionsForNewFilter)), // conditionsをディープコピーして初期状態にリセット
        actions: JSON.parse(JSON.stringify(originalFilter.actions || {})), // originalFilterからactionsをディープコピー
    }

    console.log("Original filter:", originalFilter);
    console.log("Duplicated filter:", duplicatedFilter);

    // 複製したフィルタを filters 配列に追加
    filters.push(duplicatedFilter);

    console.log("Duplicated filter added. Current filters:", filters);

    syncNodesFromFilters();

    // フィルタ一覧を再描画
    renderFilterList();

    // 複製されたフィルタを選択状態にする
    selectFilterById(duplicatedFilter.id);

    console.log("Filter duplicated and new filter selected.");

    // 変更を保存
    saveFiltersToStorage();
}

// フィルタを複製する関数
function duplicateCurrentFilter() {
    console.log("Attempting to duplicate current filter.");
    if (currentFilterIndex === -1) {
        console.warn("No filter selected to duplicate.");
        return; // 選択されているフィルタがない場合は何もしない
    }

    const originalFilter = filters[currentFilterIndex];

    // フィルタデータのディープコピーを作成
    const duplicatedFilter = JSON.parse(JSON.stringify(originalFilter));

    // 複製したフィルタに新しいIDと名前を設定
    duplicatedFilter.id = Date.now().toString(); // 新しい一意なIDを生成
    duplicatedFilter.name = `${originalFilter.name} (Copied)`; // 名前に "(コピー)" を追加

    console.log("Original filter:", originalFilter);
    console.log("Duplicated filter:", duplicatedFilter);

    // 複製したフィルタを filters 配列に追加
    filters.push(duplicatedFilter);

    console.log("Duplicated filter added. Current filters:", filters);

    syncNodesFromFilters();

    // フィルタ一覧を再描画
    renderFilterList();

    // 複製されたフィルタを選択状態にする
    selectFilterById(duplicatedFilter.id);

    console.log("Filter duplicated and new filter selected.");

    // 変更を保存
    saveFiltersToStorage();
}

// フィルタを削除する関数
function deleteCurrentFilter() {
    console.log("Attempting to delete current filter.");
    if (currentFilterIndex === -1) {
        console.warn("No filter selected to delete.");
        return; // 選択されているフィルタがない場合は何もしない
    }

    // フィルタが1件しかない場合は処理を中断
    if (filters.length <= 1) {
        console.warn("Cannot delete the last filter.");
        return;
    }

    // 確認ダイアログを表示
    const filterName = filters[currentFilterIndex].name;
    const isConfirmed = confirm(`フィルタ "${filterName}" を削除してもよろしいですか？\nこの操作は元に戻せません。`);

    if (!isConfirmed) {
        console.log("Filter deletion cancelled by user.");
        return; // ユーザーがキャンセルした場合
    }

    // ここで削除後に選択するインデックスを先に計算しておく
    const deleteIndex = currentFilterIndex;
    const newIndexToSelect = Math.min(currentFilterIndex, filters.length - 2);

    // 選択状態をクリアしてから削除する - この順番が重要！
    currentFilterIndex = -1;

    console.log(`Deleting filter at index: ${deleteIndex}`);
    filters.splice(deleteIndex, 1);
    console.log("Filter deleted. Remaining filters:", filters);

    syncNodesFromFilters();

    // レンダリング（この時点でcurrentFilterIndex = -1なのでエラーは起きない）
    renderFilterList();

    // 削除後の選択状態を決定
    if (filters.length === 0) {
        displayFilterDetails(null);
        console.log("All filters deleted. Right pane cleared.");
    } else {
        selectFilter(newIndexToSelect);
        console.log(`Filter deleted. Selecting filter at new index: ${newIndexToSelect}`);
    }

    // 削除ボタンの状態を更新
    updateDeleteButtonState();

    // 変更を保存
    saveFiltersToStorage();
}

// フィルタリストのドラッグ＆ドロップソート機能を設定する関数
function setupFilterListSorting() {
    const filterListUl = document.getElementById('filter-list');
    if (!filterListUl) {
        console.error("Filter list UL element not found for sorting!");
        return;
    }

    if (typeof Sortable === 'undefined') {
        console.warn('Sortable.js not loaded - drag & drop is disabled.');
        return;
    }

    // 既存インスタンスがあれば一旦破棄
    if (rootSortable) {
        try { rootSortable.destroy(); } catch (e) { console.warn('Failed to destroy rootSortable:', e); }
        rootSortable = null;
    }
    if (Array.isArray(folderChildrenSortables) && folderChildrenSortables.length > 0) {
        folderChildrenSortables.forEach(s => {
            try { s.destroy(); } catch (e) { console.warn('Failed to destroy children Sortable:', e); }
        });
        folderChildrenSortables = [];
    }

    console.log("Initializing Sortable.js for filter list (root + folders)");

    // ▼ 自動開閉用の状態管理変数
    let dragHoverTimer = null;      // 開くまでのタイマー
    let draggingItemType = null;    // 'filter' or 'folder'
    let lastHoveredFolderId = null; // 直前にホバーしていたフォルダID
    let dragSourceFolderId = null;  // ドラッグ開始元のフォルダID

    // ▼ 共通: フォルダ強調をクリアするヘルパー
    const clearFolderDropHighlight = () => {
        filterListUl
            .querySelectorAll('.folder-item.folder-drop-target')
            .forEach(li => li.classList.remove('folder-drop-target'));
    };

    // ▼ フォルダを視覚的に開閉するヘルパー
    const toggleFolderVisual = (folderLi, forceOpen = null) => {
        if (!folderLi) return;
        
        const folderId = folderLi.dataset.folderId;
        const childrenUl = folderLi.querySelector('ul.folder-children');
        const toggleIcon = folderLi.querySelector('.folder-toggle-icon');

        if (!childrenUl) return;

        const isCurrentlyOpen = childrenUl.style.display !== 'none';
        const shouldOpen = forceOpen !== null ? forceOpen : !isCurrentlyOpen;

        if (shouldOpen) {
            childrenUl.style.display = 'block';
            folderLi.classList.add('is-open-folder');
            if (toggleIcon) toggleIcon.textContent = 'folder_open';
        } else {
            childrenUl.style.display = 'none';
            folderLi.classList.remove('is-open-folder');
            if (toggleIcon) toggleIcon.textContent = 'folder';
        }
    };

    // ▼▼▼ 共通のドラッグ移動中ロジック (RootでもChildでもこれを使う) ▼▼▼
    const onMoveLogic = function(evt, originalEvent) {
        // フォルダ自体のドラッグ中は自動開閉しない
        if (draggingItemType === 'folder') {
            clearFolderDropHighlight();
            return; 
        }

        // カーソルの下にある要素（related）がフォルダかどうか判定
        const related = evt.related;
        // Sortableの仕様で、relatedがnullの場合や、期待と違う要素の場合があるためclosestで探す
        const folderLi = related ? related.closest('.folder-item') : null;
        const targetFolderId = folderLi ? folderLi.dataset.folderId : null;

        // 1. 以前ホバーしていたフォルダから離れた場合 -> 閉じる
        if (lastHoveredFolderId && lastHoveredFolderId !== targetFolderId) {
            // タイマーキャンセル
            if (dragHoverTimer) {
                clearTimeout(dragHoverTimer);
                dragHoverTimer = null;
            }
            
            // 直前にホバーしていたフォルダを閉じる
            const prevFolderLi = filterListUl.querySelector(`.folder-item[data-folder-id="${lastHoveredFolderId}"]`);
            if (prevFolderLi) {
                    // ★「ドラッグ開始元のフォルダ」でなければ閉じる
                    // （ドラッグ元は、マウスが離れても閉じずに待っていてほしい）
                    if (lastHoveredFolderId !== dragSourceFolderId) {
                        toggleFolderVisual(prevFolderLi, false);
                    }
            }
            
            clearFolderDropHighlight();
        }

        // 2. 新しいフォルダに乗った場合
        if (targetFolderId) {
            if (folderLi) folderLi.classList.add('folder-drop-target');

            // まだそのフォルダのアクション待機中でなければタイマーセット
            if (lastHoveredFolderId !== targetFolderId) {
                lastHoveredFolderId = targetFolderId;
                
                // 既存タイマーあれば消す
                if (dragHoverTimer) clearTimeout(dragHoverTimer);

                // 400ms後に開く予約
                dragHoverTimer = setTimeout(() => {
                    console.log('Auto-opening folder:', targetFolderId);
                    toggleFolderVisual(folderLi, true);
                    dragHoverTimer = null;
                }, 400);
            }
        } else {
            // フォルダ以外の場所にいる
            clearFolderDropHighlight();
            lastHoveredFolderId = null;
            if (dragHoverTimer) {
                clearTimeout(dragHoverTimer);
                dragHoverTimer = null;
            }
        }
    };
    // ▲▲▲ 共通ロジックここまで ▲▲▲


    // ▼ 共通の onEnd ハンドラ
    const handleSortEnd = function (evt) {
        console.log("Drag ended", evt);
        
        if (dragHoverTimer) {
            clearTimeout(dragHoverTimer);
            dragHoverTimer = null;
        }
        
        clearFolderDropHighlight();

        // ドロップされなかったフォルダを閉じる処理
        const droppedItem = evt.item;
        const parentList = droppedItem.parentNode;
        
        let destFolderId = null;
        if (parentList && parentList.classList.contains('folder-children')) {
            const folderItem = parentList.closest('.folder-item');
            if (folderItem) destFolderId = folderItem.dataset.folderId;
        }

        const allFolders = filterListUl.querySelectorAll('.folder-item');
        allFolders.forEach(folderLi => {
            const fId = folderLi.dataset.folderId;
            if (folderLi.classList.contains('is-open-folder')) {
                // ここに入っていないなら閉じる
                if (fId !== destFolderId) {
                    // ただし、ドラッグ元フォルダも、戻ってこなかったなら閉じていいのか？
                    // UX的には「元のフォルダに戻さなかった＝移動した」ので、元のフォルダも閉じてスッキリさせるのが正解
                    console.log(`Closing folder ${fId} (not dropped in)`);
                    toggleFolderVisual(folderLi, false);
                }
            }
        });

        rebuildNodesFromFilterListDOM();
        
        draggingItemType = null;
        lastHoveredFolderId = null;
        dragSourceFolderId = null;
    };

    // ▼ ルート用 Sortable
    rootSortable = new Sortable(filterListUl, {
        animation: 150,
        handle: '.drag-handle',
        draggable: '.item:not(#add-new-filter-item)',
        filter: '.filter-list-button',
        swapThreshold: 0.65,
        group: {
            name: 'filter-nodes',
            pull: true,
            put: true,
        },
        onStart(evt) {
            console.log('Root drag start', evt);
            dragSourceFolderId = null; // ルートからのドラッグ
            if (evt.item.classList.contains('folder-item')) {
                draggingItemType = 'folder';
            } else {
                draggingItemType = 'filter';
            }
        },
        onMove: onMoveLogic, // ★共通ロジックを適用
        onEnd: handleSortEnd,
    });


    // ▼ 各フォルダの children 用 Sortable
    const childrenLists = filterListUl.querySelectorAll('ul.folder-children');
    childrenLists.forEach(childrenUl => {
        const s = new Sortable(childrenUl, {
            animation: 150,
            handle: '.drag-handle',
            draggable: '.item',
            filter: '.filter-list-button',
            emptyInsertThreshold: 20, // 空フォルダに入れやすくする
            swapThreshold: 0.65,
            group: {
                name: 'filter-nodes',
                pull: true,
                put: (to, from, draggedEl) => {
                    if (draggedEl.classList.contains('folder-item')) return false;
                    return true;
                },
            },
            onStart(evt) {
                console.log('Child drag start');
                draggingItemType = 'filter';
                
                // ドラッグ元のフォルダIDを記録
                const parentFolder = evt.from.closest('.folder-item');
                if (parentFolder) {
                    dragSourceFolderId = parentFolder.dataset.folderId;
                }
            },
            onMove: onMoveLogic, // ★ここが重要！子ドラッグ時も共通ロジックを適用して他のフォルダに反応させる！
            onEnd: handleSortEnd,
        });
        folderChildrenSortables.push(s);
    });

    console.log("Sortable.js initialized for root and folder children (Unified onMove logic)");
}

/**
 * 今開いているフォルダを確認付きで削除する
 * - 子フィルタはルートに移動
 * - nodes / filters / UI を一貫して更新
 * @param {FolderNode} folder
 */
function deleteThisFolderWithConfirm(folder) {
    if (!folder || !folder.id) {
        console.warn('No folder to delete.');
        return;
    }

    if (!Array.isArray(nodes)) {
        console.warn('nodes is not an array. Abort folder deletion.');
        return;
    }

    // 対象フォルダを nodes から探す
    /** @type {FolderNode | null} */
    let targetFolder = null;
    for (const n of nodes) {
        if (n && n.type === 'folder' && n.id === folder.id) {
            targetFolder = n;
            break;
        }
    }

    if (!targetFolder) {
        console.warn('Target folder not found for id:', folder.id);
        return;
    }

    const folderName =
        targetFolder.name ||
        (chrome.i18n && chrome.i18n.getMessage('managerFolderListUnnamed')) ||
        'フォルダ';

    // 確認ダイアログ
    const isConfirmed = confirm(
        `フォルダ "${folderName}" を削除してもよろしいですか？\n` +
        `このフォルダ内のフィルタはルート一覧に移動します。\n` +
        `この操作は元に戻せません。`
    );

    if (!isConfirmed) {
        console.log('Folder deletion cancelled by user.');
        return;
    }

    // 子フィルタを退避
    const children = Array.isArray(targetFolder.children)
        ? targetFolder.children.slice()
        : [];

    // 1. nodes から当該フォルダを削除
    nodes = nodes.filter(n => !(n && n.type === 'folder' && n.id === targetFolder.id));

    // 2. 子フィルタを nodes の末尾に追加（ルートへ移動）
    children.forEach(f => {
        if (!f) return;
        f.type = 'filter';
        nodes.push(f);
    });

    // 3. filters にも順序を反映
    syncFiltersFromNodes();

    // 4. 保存・再描画
    saveFiltersToStorage();
    renderFilterList();

    // 5. 選択状態リセット
    currentFolderId = null;

    if (filters.length > 0) {
        // ひとまず先頭フィルタを選択
        selectFilter(0);
    } else {
        currentFilterIndex = -1;
        displayFilterDetails(null);
    }

    if (typeof updateDeleteButtonState === 'function') {
        updateDeleteButtonState();
    }

    console.log('Folder deleted successfully:', targetFolder.id);
}




// 並べ替え処理: nodes を直接並べ替え、結果を filters に反映する
function reorderFilters(oldIndex, newIndex) {
    console.log(`Reordering (nodes): ${oldIndex} -> ${newIndex}`);

    if (!Array.isArray(nodes) || nodes.length === 0) {
        console.warn('reorderFilters: nodes が空のため、処理をスキップします。');
        return;
    }

    // ★ 範囲チェックは filters ではなく nodes に対して行う
    if (oldIndex < 0 || newIndex < 0 || oldIndex >= nodes.length || newIndex >= nodes.length) {
        console.error(`Invalid indices for reordering: oldIndex=${oldIndex}, newIndex=${newIndex}, nodes.length=${nodes.length}`);
        return;
    }

    // 実際に nodes の要素を移動
    const moved = nodes.splice(oldIndex, 1)[0];
    nodes.splice(newIndex, 0, moved);

    console.log('nodes after reordering:',
        nodes.map(n => {
            if (n.type === 'folder') return `[FOLDER] ${n.name} (${n.id})`;
            return `[FILTER] ${n.name || '無題'} (${n.id})`;
        })
    );

    // nodes の変更を filters に反映（見た目の順序＝適用順）
    syncFiltersFromNodes();

    // 一覧を再描画
    renderFilterList();

    // 保存
    saveFiltersToStorage();

    console.log('Reordering finished.');
}

/**
 * filter-list の DOM 構造から nodes を再構築し、
 * filters の順序に反映して保存・再描画する。
 */
function rebuildNodesFromFilterListDOM() {
    const filterListUl = document.getElementById('filter-list');
    if (!filterListUl) {
        console.error('rebuildNodesFromFilterListDOM: #filter-list が見つかりません');
        return;
    }

    /** @type {Node[]} */
    const prevNodes = Array.isArray(nodes) ? nodes : [];

    // フォルダIDごとに「もともとの子数」を記録しておく（Cの自動削除用）
    const prevFolderChildCount = new Map();
    (function collectPrevFolders(list) {
        if (!Array.isArray(list)) return;
        list.forEach(n => {
            if (!n || n.type !== 'folder') return;
            const count = Array.isArray(n.children) ? n.children.length : 0;
            prevFolderChildCount.set(n.id, count);
            if (Array.isArray(n.children)) {
                collectPrevFolders(n.children);
            }
        });
    })(prevNodes);

    // フィルタID → FilterNode
    const filterMap = new Map();
    if (Array.isArray(filters)) {
        filters.forEach(f => {
            if (!f || !f.id) return;
            f.type = 'filter';
            filterMap.set(f.id, f);
        });
    }

    /** @type {Node[]} */
    const newNodes = [];

    // ルート直下の .item (add-new-filter-item を除く)
    const rootItems = filterListUl.querySelectorAll(':scope > .item:not(#add-new-filter-item)');
    rootItems.forEach(li => {
        const folderId = li.dataset.folderId;
        const filterId = li.dataset.filterId;

        // ▼ フォルダノード
        if (folderId) {
            // 以前の nodes から既存のフォルダ情報を探す（名前を維持するため）
            let prevFolder = prevNodes.find(
                n => n && n.type === 'folder' && n.id === folderId
            );

            // 開閉状態は「元のデータ」ではなく「現在の画面(DOM)の状態」を優先する
            // これにより、ドラッグ操作で自動的に開いた状態がそのまま保存される
            const isOpenInDom = li.classList.contains('is-open-folder');

            /** @type {FolderNode} */
            let folderNode;
            if (prevFolder && prevFolder.type === 'folder') {
                folderNode = {
                    type: 'folder',
                    id: prevFolder.id,
                    name: prevFolder.name,
                    collapsed: !isOpenInDom, // DOMが開いていれば collapsed=false
                    children: [],
                };
            } else {
                folderNode = {
                    type: 'folder',
                    id: folderId,
                    name: '',
                    collapsed: !isOpenInDom, // DOMが開いていれば collapsed=false
                    children: [],
                };
            }

            const childrenUl = li.querySelector('ul.folder-children');
            const children = [];
            if (childrenUl) {
                const childLis = childrenUl.querySelectorAll(':scope > .item');
                childLis.forEach(childLi => {
                    const childFilterId = childLi.dataset.filterId;
                    if (!childFilterId) return;
                    const filterNode = filterMap.get(childFilterId);
                    if (filterNode) {
                        filterNode.type = 'filter';
                        children.push(filterNode);
                    }
                });
            }
            folderNode.children = children;

            newNodes.push(folderNode);
            return;
        }

        // ▼ ルート直下フィルタノード
        if (filterId) {
            const filterNode = filterMap.get(filterId);
            if (filterNode) {
                filterNode.type = 'filter';
                newNodes.push(filterNode);
            }
        }
    });

    nodes = newNodes;
    console.log('rebuildNodesFromFilterListDOM: nodes updated from DOM:', nodes);

    // nodes → filters に順序を反映
    syncFiltersFromNodes();

    // 保存 ＆ 再描画
    saveFiltersToStorage();
    renderFilterList();
}

// 各条件項目にロジックを設定する関数
function setupConditionItem(conditionItemElement) {
    const inputElement = conditionItemElement.querySelector('.app-form-input');
    const addAndButton = conditionItemElement.querySelector('.add-and-button');
    const addOrButton = conditionItemElement.querySelector('.add-or-button');
    const chipsDisplay = conditionItemElement.querySelector('.condition-chips-display');
    const orConnector = conditionItemElement.querySelector('.condition-or-connector');
    const inputAndButtonContainer = conditionItemElement.querySelector('.input-and-button-container');

    const conditionType = conditionItemElement.dataset.conditionType;
    console.log(`Setting up logic for condition type: ${conditionType}`);

    // この条件項目がAND/OR入力UIを持つかどうかの判定に必要な要素
    const hasAndOrElements = inputElement && addAndButton && addOrButton && chipsDisplay && inputAndButtonContainer;

    // +OR ボタンのイベントリスナー設定
    setupOrButtonListener(addOrButton, inputElement, chipsDisplay, inputAndButtonContainer, conditionType, hasAndOrElements);

    // +AND ボタンのイベントリスナー設定
    setupAndButtonListener(addAndButton, inputElement, inputAndButtonContainer, conditionType, hasAndOrElements);

    // 入力フォーム内のチップ削除ボタンのイベントリスナー設定
    setupChipRemoveListener(inputAndButtonContainer, conditionType);

    // ORグループ削除ボタンのイベントリスナー設定
    setupOrGroupRemoveListener(chipsDisplay, conditionType);

    // 条件入力要素の変更イベントリスナー設定
    setupConditionChangeListeners(conditionItemElement, conditionType, hasAndOrElements, inputElement);

    // 初期表示状態を設定
    if (hasAndOrElements) {
        updateDisplayVisibilityOfCondition(conditionItemElement);
    }
}

// +OR ボタンのイベントリスナー設定
function setupOrButtonListener(addOrButton, inputElement, chipsDisplay, inputAndButtonContainer, conditionType, hasAndOrElements) {
    if (addOrButton && inputElement && chipsDisplay && inputAndButtonContainer && hasAndOrElements) {
        addOrButton.addEventListener('click', () => {
            const currentInput = inputElement.value.trim();
            const confirmedChips = inputAndButtonContainer.querySelectorAll('.chip');

            if (confirmedChips.length === 0 && currentInput === '') {
                console.log(`${conditionType}: Input form is empty, not adding OR condition.`);
                return;
            }

            // 入力フォーム内のチップと入力値をまとめて一つのAND条件グループとして取得
            const currentAndGroup = collectInputFormAndGroup(inputAndButtonContainer, inputElement);

            // 確定したAND条件グループを下部表示エリアに新しいORグループとして追加
            if (currentAndGroup.length > 0) {
                addOrGroupToDisplayArea(chipsDisplay, currentAndGroup);

                // 入力フォーム内をクリア
                clearInputForm(inputAndButtonContainer, inputElement);

                // OR条件が追加されたらフィルタデータを更新
                updateCurrentFilterData();

                console.log(`${conditionType}: OR condition added to display area.`);
            }
        });
    } else {
        console.log(`OR button or related elements not found for ${conditionType}. Skipping OR listener setup.`);
    }
}

// 入力フォーム内のAND条件グループを収集する関数
function collectInputFormAndGroup(inputAndButtonContainer, inputElement) {
    const currentAndGroup = [];
    // inputAndButtonContainer の子要素を順番に取得
    const inputContainerChildren = inputAndButtonContainer.childNodes;

    inputContainerChildren.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE && child.classList.contains('chip')) {
            const value = child.textContent.replace('✕', '').trim();
            if (child.classList.contains('address-chip')) {
                currentAndGroup.push(value);
            } else if (child.classList.contains('operator-chip') && value === 'AND') {
                currentAndGroup.push('AND');
            }
        }
    });

    const currentInputValue = inputElement.value.trim();
    if (currentInputValue !== '') {
        if (currentAndGroup.length > 0 && currentAndGroup[currentAndGroup.length - 1] !== 'AND') {
            currentAndGroup.push('AND');
        }
        currentAndGroup.push(currentInputValue);
    }

    // 最後のANDを削除
    if (currentAndGroup.length > 0 && currentAndGroup[currentAndGroup.length - 1] === 'AND') {
        currentAndGroup.pop();
    }

    return currentAndGroup;
}

// ORグループを下部表示エリアに追加する関数
function addOrGroupToDisplayArea(chipsDisplay, andGroup) {
    const conditionItemElement = chipsDisplay.closest('.filter-condition-item');
    const orConnector = conditionItemElement.querySelector('.condition-or-connector');

    // 既存のORグループが存在する場合のみ、ORインジケーターを追加
    if (chipsDisplay.querySelectorAll('.or-group').length > 0) {
        const orIndicator = createOrGroupIndicator();
        chipsDisplay.appendChild(orIndicator);
    }

    // ORグループ全体のコンテナを作成
    const orGroupContainer = document.createElement('div');
    orGroupContainer.classList.add('or-group');

    // ANDグループの各要素をORグループに追加
    andGroup.forEach(item => {
        if (item === 'AND') {
            const operatorChip = createChip('AND', 'operator-chip');
            orGroupContainer.appendChild(operatorChip);
        } else {
            const valueChip = createChip(item, 'address-chip');
            orGroupContainer.appendChild(valueChip);
        }
    });

    // ORグループ削除ボタンを追加
    const orGroupRemoveButton = createOrGroupRemoveButton();
    orGroupContainer.appendChild(orGroupRemoveButton);

    // ORグループコンテナを下部表示エリアに追加
    chipsDisplay.appendChild(orGroupContainer);

    // 表示状態を更新（OR接続テキストも含む）
    const orGroupCount = chipsDisplay.querySelectorAll('.or-group').length;
    if (orGroupCount > 0) {
        chipsDisplay.style.display = 'flex';
        if (orConnector) {
            orConnector.style.display = 'block';
        }
    } else {
        chipsDisplay.style.display = 'none';
        if (orConnector) {
            orConnector.style.display = 'none';
        }
    }
}

// 入力フォームをクリアする関数
function clearInputForm(inputAndButtonContainer, inputElement) {
    inputAndButtonContainer.querySelectorAll('.chip').forEach(chip => chip.remove());
    inputElement.value = '';
}

// +AND ボタンのイベントリスナー設定
function setupAndButtonListener(addAndButton, inputElement, inputAndButtonContainer, conditionType, hasAndOrElements) {
    if (addAndButton && inputElement && inputAndButtonContainer && hasAndOrElements) {
        addAndButton.addEventListener('click', () => {
            const value = inputElement.value.trim(); // 入力された値を取得
            if (value) {
                // 入力フォーム内でのAND条件追加ロジック
                const existingChips = inputAndButtonContainer.querySelectorAll('.chip');

                // 既存のチップが1つ以上あり、かつ最後のチップがAND演算子でない場合にAND演算子を追加
                if (existingChips.length > 0 && !existingChips[existingChips.length - 1].classList.contains('operator-chip')) {
                    const operatorChip = createChip('AND', 'operator-chip'); // AND演算子チップを作成
                    inputElement.before(operatorChip); // 入力フィールドの直前にANDチップを挿入
                }

                // 新しい値のチップを作成（入力フォーム内用は削除ボタン付き）
                const valueChip = createChip(value, 'address-chip');
                addRemoveButtonToInputChip(valueChip); // 削除ボタンを追加

                // 入力フィールドの直前に新しい値のチップを挿入
                inputElement.before(valueChip);

                // 入力フィールドの値はクリアする
                inputElement.value = '';

                // AND条件が追加されたらフィルタデータを更新
                updateCurrentFilterData();

                console.log(`${conditionType}: AND condition added within the input form.`);
            }
        });
    } else {
        console.log(`AND button or related elements not found for ${conditionType}. Skipping AND listener setup.`);
    }
}

// 入力フォーム内のチップ削除ボタンのイベントリスナー設定
function setupChipRemoveListener(inputAndButtonContainer, conditionType) {
    if (inputAndButtonContainer) {
        inputAndButtonContainer.addEventListener('click', (event) => {
            const removeButton = event.target.closest('button.remove-chip');

            if (removeButton) {
                const chipToRemove = removeButton.parentElement;

                if (chipToRemove && inputAndButtonContainer.contains(chipToRemove)) {
                    const isOperatorChip = chipToRemove.classList.contains('operator-chip');

                    if (!isOperatorChip) {
                        // 値のチップの場合、直後の要素がAND演算子チップであれば、それも削除
                        const nextElement = chipToRemove.nextElementSibling;
                        if (nextElement && nextElement.classList.contains('operator-chip')) {
                            nextElement.remove();
                        }
                    } else {
                        // 演算子チップの場合、直前の要素（値のチップ）も削除
                        const prevElement = chipToRemove.previousElementSibling;
                        if (prevElement && prevElement.classList.contains('chip') && inputAndButtonContainer.contains(prevElement)) {
                            prevElement.remove();
                        }
                    }

                    // チップをDOMから削除
                    chipToRemove.remove();

                    // チップが全てなくなった後に、最後にANDが残ってしまっている場合は削除
                    const remainingChips = inputAndButtonContainer.querySelectorAll('.chip');
                    const lastRemainingChip = remainingChips[remainingChips.length - 1];
                    if (lastRemainingChip && lastRemainingChip.classList.contains('operator-chip')) {
                        // 最後のチップがAND演算子かつ、その前に値のチップがない場合（ANDだけが残った場合）に削除
                        const prevElement = lastRemainingChip.previousElementSibling;
                        if (!prevElement || !prevElement.classList.contains('chip')) {
                            lastRemainingChip.remove();
                        }
                    }

                    // チップが削除されたらフィルタデータを更新
                    updateCurrentFilterData();

                    console.log(`${conditionType}: Chip removed from input form.`);
                }
            }
        });
    } else {
        console.log(`Input and button container not found for ${conditionType}. Skipping input chip remove listener setup.`);
    }
}

// ORグループ削除ボタンのイベントリスナー設定
function setupOrGroupRemoveListener(chipsDisplay, conditionType) {
    if (chipsDisplay) {
        chipsDisplay.addEventListener('click', (event) => {
            const removeButton = event.target.closest('button.remove-or-group-button');

            if (removeButton) {
                const orGroupContainer = removeButton.closest('.or-group');

                if (orGroupContainer) {
                    // 削除対象のORグループの前の要素がORインジケーターか確認
                    const prevElement = orGroupContainer.previousElementSibling;

                    // ORグループをDOMから削除
                    orGroupContainer.remove();

                    // もし前の要素がORインジケーターであれば、それも削除
                    if (prevElement && prevElement.classList.contains('or-indicator')) {
                        prevElement.remove();
                    }

                    // 表示状態を更新
                    updateDisplayVisibilityOfCondition(chipsDisplay.closest('.filter-condition-item'));

                    // ORグループが削除されたらフィルタデータを更新
                    updateCurrentFilterData();

                    console.log(`${conditionType}: OR group removed from display area.`);
                }
            }
        });
    } else {
        console.log(`Chips display area not found for ${conditionType}. Skipping OR group remove listener setup.`);
    }
}

// 条件入力要素の変更イベントリスナー設定
function setupConditionChangeListeners(conditionItemElement, conditionType, hasAndOrElements, inputElement) {
    if (conditionType === 'size') {
        // サイズ条件の入力要素
        const sizeOperatorSelect = conditionItemElement.querySelector('#condition-size-operator');
        const sizeValueInput = conditionItemElement.querySelector('#condition-size-value-input');
        const sizeUnitSelect = conditionItemElement.querySelector('#condition-size-unit');

        if (sizeOperatorSelect) sizeOperatorSelect.addEventListener('change', updateCurrentFilterData);
        if (sizeValueInput) sizeValueInput.addEventListener('input', updateCurrentFilterData);
        if (sizeUnitSelect) sizeUnitSelect.addEventListener('change', updateCurrentFilterData);
    } else if (conditionType === 'has-attachment') {
        // 添付ファイルあり条件のチェックボックス
        const hasAttachmentCheckbox = conditionItemElement.querySelector('#condition-has-attachment');
        if (hasAttachmentCheckbox) {
            hasAttachmentCheckbox.addEventListener('change', updateCurrentFilterData);
        }
    } else if (hasAndOrElements && inputElement) {
        // AND/OR入力UIを持つ条件項目の入力フィールド
        inputElement.addEventListener('input', updateCurrentFilterData); // 入力中にデータ更新
    }
}

//----------------------------------------------------------------------
// 6. XML処理関連
//----------------------------------------------------------------------

// フィルタのエクスポート処理を行う関数
function exportFilters(mode = 'all') {
    console.log(`Exporting filters in ${mode} mode.`);

    // 表示中のフィルタのみモードの場合のチェック
    if (mode === 'current' && currentFilterIndex === -1) {
        console.warn("No filter selected to export.");
        alert("エクスポートするフィルタが選択されていません。");
        return;
    }

    let filtersToExport;
    let nodesToExport; // ★ 追加: 構造データ
    let fileNamePrefix = 'gmailfilter';

    if (mode === 'current') {
        const currentFilter = filters[currentFilterIndex];
        filtersToExport = [currentFilter];
        
        // 単体エクスポートの場合は構造を含めず、単一ノードとして扱う（もしくはnull）
        // ここではシンプルに「単体フィルタ」として構造を作る
        nodesToExport = [{ type: 'filter', id: currentFilter.id }];

        const safeFilterName = currentFilter.name
            ? currentFilter.name.replace(/[\\\/\:\*\?\"\<\>\|]/g, '_').substring(0, 30)
            : "unnamed";
        fileNamePrefix = `gmailfilter_${safeFilterName}`;
    } else {
        // すべてのフィルタと、現在の全フォルダ構造を対象にする
        filtersToExport = filters;
        nodesToExport = buildStoredNodesFromRuntimeNodes(); // ★ 現在の構造を取得
        fileNamePrefix = 'gmailfilter_all';
    }

    // XMLデータを生成 (引数に nodesToExport を追加)
    const xmlContent = generateGmailFilterXML(filtersToExport, nodesToExport);

    const now = new Date();
    const dateStr = now.getFullYear() +
        ('0' + (now.getMonth() + 1)).slice(-2) +
        ('0' + now.getDate()).slice(-2);
    const timeStr = ('0' + now.getHours()).slice(-2) +
        ('0' + now.getMinutes()).slice(-2) +
        ('0' + now.getSeconds()).slice(-2);
    const fileName = `${fileNamePrefix}_${dateStr}_${timeStr}.xml`;

    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);

    const filterCount = filtersToExport.length;
    console.log(`Exported ${filterCount} filter(s) successfully.`);

    if (typeof window.showReviewRequestModal === 'function') {
        try {
            window.showReviewRequestModal();
        } catch (e) {
            console.error('showReviewRequestModal error:', e);
        }
    }
}

// インポートダイアログを表示する関数
function showImportDialog() {
    // ファイル選択ダイアログを表示
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';

    input.onchange = function (event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
            const xmlContent = e.target.result;
            // 処理を実行し、件数を受け取る
            const count = importFiltersFromXML(xmlContent);
            
            // ★ 多言語対応版のアラート
            if (count > 0) {
                // メッセージを取得（もし取得失敗したらデフォルトの日本語を表示）
                const msg = chrome.i18n.getMessage('alertOfImportSuccess', [String(count)]) || `${count}個のフィルタを正常にインポートしました。`;
                alert(msg);
            }
        };
        reader.onerror = function () {
            const errMsg = chrome.i18n.getMessage('alertOfImportFileError') || "ファイルの読み込み中にエラーが発生しました。";
            alert(errMsg);
        };
        reader.readAsText(file);
    };

    input.click();
}

// Gmail互換のXMLフィルタを生成する関数
function generateGmailFilterXML(filtersArray, nodesStructure = null) {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:apps="http://schemas.google.com/apps/2006">\n';
    xml += '  <title>Mail Filters</title>\n';

    // 各フィルタをXMLエントリに変換
    filtersArray.forEach((filter, index) => {
        xml += '  <entry>\n';
        xml += '    <category term="filter"></category>\n';

        // フィルタIDをコメント内に埋め込む（ここは変更なし）
        const nameComment = `${filter.name || ''} || id:${filter.id || ('gen_' + Date.now() + '_' + index)}`;
        xml += `    <title>${escapeXml(nameComment)}</title>\n`;
        xml += '    <content></content>\n';

        // フィルタ条件（各 generate* 関数は改行込みで適切な文字列を返す前提）
        const conditions = filter.conditions || {};
        if (conditions.from && conditions.from.length > 0) xml += generateFromConditionXML(conditions.from);
        if (conditions.to && conditions.to.length > 0) xml += generateToConditionXML(conditions.to);
        if (conditions.subject && conditions.subject.length > 0) xml += generateSubjectConditionXML(conditions.subject);
        if (conditions.includes && conditions.includes.length > 0) xml += generateHasTheWordConditionXML(conditions.includes);
        if (conditions.excludes && conditions.excludes.length > 0) xml += generateDoesNotHaveTheWordConditionXML(conditions.excludes);
        if (conditions.size && conditions.size.value !== null) xml += generateSizeConditionXML(conditions.size);
        if (conditions.hasAttachment) xml += '    <apps:property name="hasAttachment" value="true"/>\n';

        // フィルタ処理
        xml += generateActionXML(filter.actions || {});

        xml += '  </entry>\n';
    });

    xml += '</feed>\n';

    // フォルダ構造情報を XML の末尾に「コメント」として追記する（安全処理を行う）
    if (nodesStructure) {
        // JSON を作成
        const jsonStr = JSON.stringify(nodesStructure);

        // XML コメント内で禁止されているパターンを回避する
        // - '-->' は '--&gt;' に変換（閉じタグと誤解されないように）
        // - '--' の連続は XML コメントで禁止されるため、安全な代替に置換
        // 必要に応じて他のエスケープ処理を追加してください
        const safeJson = jsonStr.replace(/-->/g, '--&gt;').replace(/--/g, '- -');

        // コメントとして包む（識別タグ付き）
        xml += `<!-- GFM_STRUCTURE_DATA\n${safeJson}\n-->\n`;
    }

    return xml;
}

// フィルタアクションをXML形式に変換する関数
function generateActionXML(actions) {
    let xml = '';

    // 受信トレイをスキップ
    if (actions.skipInbox) {
        xml += '    <apps:property name="shouldArchive" value="true"/>\n';
    }

    // 既読にする
    if (actions.markAsRead) {
        xml += '    <apps:property name="shouldMarkAsRead" value="true"/>\n';
    }

    // スターを付ける
    if (actions.star) {
        xml += '    <apps:property name="shouldStar" value="true"/>\n';
    }

    // ラベルを付ける
    if (actions.applyLabel && actions.applyLabel.enabled && actions.applyLabel.labelName) {
        xml += `    <apps:property name="label" value="${escapeXml(actions.applyLabel.labelName)}"/>\n`;
    }

    // 転送する
    if (actions.forward && actions.forward.enabled && actions.forward.forwardAddress) {
        xml += `    <apps:property name="forwardTo" value="${escapeXml(actions.forward.forwardAddress)}"/>\n`;
    }

    // 削除する
    if (actions.delete && window.appSettings.enableDeleteAction) {
        xml += '    <apps:property name="shouldTrash" value="true"/>\n';
    } else if (actions.delete && !window.appSettings.enableDeleteAction) {
        // 削除アクションがチェックされているが機能無効の場合、コメントで残す
        xml += '    <!-- 削除機能が無効のため、shouldTrashアクションは無視されます -->\n';
    }


    // 迷惑メールにしない
    if (actions.notSpam) {
        xml += '    <apps:property name="shouldNeverSpam" value="true"/>\n';
    }

    // 重要度設定
    if (actions.alwaysImportant) {
        xml += '    <apps:property name="shouldAlwaysMarkAsImportant" value="true"/>\n';
    }

    if (actions.neverImportant) {
        xml += '    <apps:property name="shouldNeverMarkAsImportant" value="true"/>\n';
    }

    // カテゴリ設定
    if (actions.applyCategory && actions.applyCategory.enabled && actions.applyCategory.category) {
        xml += `    <apps:property name="smartLabelToApply" value="${escapeXml(actions.applyCategory.category)}"/>\n`;
    }

    return xml;
}

// 条件をXML形式に変換する共通関数
function generateConditionXML(conditions, propertyName) {
    if (!conditions || conditions.length === 0) return '';

    let xml = '';

    if (conditions.length > 1) {
        const conditionParts = conditions.map(orGroup => {
            const values = orGroup.filter(item => item !== 'AND');
            if (values.length === 1) {
                // ここではエスケープしない
                return values[0];
            } else {
                // ここでもエスケープしない
                const andCondition = values.join(' AND ');
                return `(${andCondition})`;
            }
        });

        const combinedQuery = conditionParts.join(' OR ');
        xml += `    <apps:property name="${propertyName}" value="${escapeXml(combinedQuery)}"/>\n`;
    } else if (conditions.length === 1) {
        const orGroup = conditions[0];
        const values = orGroup.filter(item => item !== 'AND');

        if (values.length === 1) {
            xml += `    <apps:property name="${propertyName}" value="${escapeXml(values[0])}"/>\n`;
        } else {
            const andCondition = values.join(' AND ');
            xml += `    <apps:property name="${propertyName}" value="${escapeXml(andCondition)}"/>\n`;
        }
    }

    return xml;
}


// FROM条件をXML形式に変換する関数
function generateFromConditionXML(fromConditions) {
    return generateConditionXML(fromConditions, 'from');
}

// TO条件をXML形式に変換する関数
function generateToConditionXML(toConditions) {
    return generateConditionXML(toConditions, 'to');
}

// 件名条件をXML形式に変換する関数
function generateSubjectConditionXML(subjectConditions) {
    return generateConditionXML(subjectConditions, 'subject');
}

// 含むキーワード条件をXML形式に変換する関数
function generateHasTheWordConditionXML(includesConditions) {
    return generateConditionXML(includesConditions, 'hasTheWord');
}

// 含まないキーワード条件をXML形式に変換する関数
function generateDoesNotHaveTheWordConditionXML(excludesConditions) {
    return generateConditionXML(excludesConditions, 'doesNotHaveTheWord');
}

// サイズ条件をXML形式に変換する関数
function generateSizeConditionXML(sizeCondition) {
    let xml = '';

    if (sizeCondition && (sizeCondition.value !== null && sizeCondition.value !== undefined)) {
        // Gmailフィルタ形式のサイズプロパティ名
        if (sizeCondition.operator === 'larger_than') {
            xml += `    <apps:property name="size" value="${sizeCondition.value}"/>\n`;
            xml += `    <apps:property name="sizeOperator" value="s_sl"/>\n`;
            xml += `    <apps:property name="sizeUnit" value="${sizeCondition.unit}"/>\n`;
        } else {
            // smaller_than の場合
            xml += `    <apps:property name="size" value="${sizeCondition.value}"/>\n`;
            xml += `    <apps:property name="sizeOperator" value="s_ss"/>\n`;
            xml += `    <apps:property name="sizeUnit" value="${sizeCondition.unit}"/>\n`;
        }
    }

    return xml;
}

// 条件文字列を解析して条件データ構造に変換する関数
function parseConditionString(conditionStr) {
    console.log(`条件文字列を解析: "${conditionStr}"`);

    // 空の条件文字列の場合は空配列を返す
    if (!conditionStr || conditionStr.trim() === '') {
        return [];
    }

    // 結果を格納する配列（OR条件ごとのグループの配列）
    const result = [];

    try {
        // OR で分割（正規表現ではなく、スペースを考慮して分割）
        // 括弧内のORは分割しないように注意
        let inParentheses = false;
        let currentPart = '';
        let orParts = [];

        for (let i = 0; i < conditionStr.length; i++) {
            const char = conditionStr[i];

            if (char === '(') {
                inParentheses = true;
                currentPart += char;
            } else if (char === ')') {
                inParentheses = false;
                currentPart += char;
            } else if (!inParentheses &&
                conditionStr.substring(i, i + 4) === ' OR ' &&
                (i === 0 || conditionStr[i - 1] !== '(') &&
                (i + 4 >= conditionStr.length || conditionStr[i + 4] !== ')')) {
                orParts.push(currentPart);
                currentPart = '';
                i += 3; // ' OR ' の残りをスキップ
            } else {
                currentPart += char;
            }
        }

        if (currentPart) {
            orParts.push(currentPart);
        }

        if (orParts.length === 0) {
            orParts = [conditionStr]; // 分割に失敗した場合は全体を1つの条件として扱う
        }

        console.log(`OR分割結果:`, orParts);

        orParts.forEach(orPart => {
            // 括弧を除去して整形
            const cleanPart = orPart.replace(/^\s*\(|\)\s*$/g, '').trim();
            console.log(`整形済み部分: "${cleanPart}"`);

            if (cleanPart.includes(' AND ')) {
                // AND条件の場合
                // 括弧内のANDは分割しないように注意
                let inParentheses = false;
                let currentPart = '';
                let andParts = [];

                for (let i = 0; i < cleanPart.length; i++) {
                    const char = cleanPart[i];

                    if (char === '(') {
                        inParentheses = true;
                        currentPart += char;
                    } else if (char === ')') {
                        inParentheses = false;
                        currentPart += char;
                    } else if (!inParentheses &&
                        cleanPart.substring(i, i + 5) === ' AND ' &&
                        (i === 0 || cleanPart[i - 1] !== '(') &&
                        (i + 5 >= cleanPart.length || cleanPart[i + 5] !== ')')) {
                        andParts.push(currentPart.trim());
                        currentPart = '';
                        i += 4; // ' AND ' の残りをスキップ
                    } else {
                        currentPart += char;
                    }
                }

                if (currentPart) {
                    andParts.push(currentPart.trim());
                }

                if (andParts.length === 0) {
                    andParts = [cleanPart]; // 分割に失敗した場合は全体を1つの条件として扱う
                }

                const andGroup = [];

                // 最初の値を追加
                andGroup.push(andParts[0]);

                // 残りの値はAND演算子を間に挟んで追加
                for (let i = 1; i < andParts.length; i++) {
                    andGroup.push('AND');
                    andGroup.push(andParts[i]);
                }

                console.log(`ANDグループ:`, andGroup);
                result.push(andGroup);
            } else {
                // 単一条件の場合
                console.log(`単一条件: "${cleanPart}"`);
                result.push([cleanPart]);
            }
        });
    } catch (error) {
        console.error(`条件文字列の解析中にエラー: ${error.message}`, error);
        // エラー時には単一条件として処理
        if (conditionStr && conditionStr.trim() !== '') {
            result.push([conditionStr]);
        }
    }

    console.log(`解析結果:`, result);
    return result;
}

// Gmailフィルタ形式のXMLからフィルタを読み込む関数
function importFiltersFromXML(xmlContent) {
    try {
        console.log("XMLのインポートを開始します");
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error("XML解析エラー: " + parserError.textContent);
        }

        const importedFilters = [];
        let importedStructure = null;

        // まず正規表現で XMLコメント内の構造データを探す
        // <feed>の外や中にあるコメントを抽出
        const structureMatch = xmlContent.match(/<!--\s*GFM_STRUCTURE_DATA\s*([\s\S]*?)\s*-->/);
        if (structureMatch && structureMatch[1]) {
            try {
                // XMLエスケープされた「--&gt;」を元に戻す（必要に応じて他のエスケープも復元）
                const jsonStr = structureMatch[1].replace(/--&gt;/g, '-->');
                importedStructure = JSON.parse(jsonStr);
                console.log("XMLコメントから構造データを検出・解析しました。", importedStructure);
            } catch (e) {
                console.warn("構造データの解析に失敗しました:", e);
            }
        }


        // 次に通常のフィルタエントリを処理
        const entries = xmlDoc.querySelectorAll('entry');
        console.log(`${entries.length}個のエントリを検出しました`);

        entries.forEach((entry, entryIndex) => {
            const titleElement = entry.querySelector('title');
            if (titleElement && titleElement.textContent === 'GFM_STRUCTURE_DATA') {
                 if (!importedStructure) {
                     const content = entry.querySelector('content');
                     if (content) {
                         try {
                             importedStructure = JSON.parse(unescapeXml(content.textContent));
                         } catch(e) {}
                     }
                 }
                 return;
            }

            const filter = createNewFilterData();
            filter.id = Date.now().toString() + "_" + entryIndex + "_" + Math.random().toString(36).substring(2, 10);

            extractFilterName(entry, filter);
            
            const properties = getPropertiesFromEntry(entry);
            properties.forEach(property => {
                processPropertyForImport(property, filter);
            });

            importedFilters.push(filter);
        });

        // インポートされたフィルタと構造データをハンドラに渡す
        handleImportedFilters(importedFilters, importedStructure);

        return importedFilters.length;
    } catch (error) {
        console.error("フィルタのインポート中にエラーが発生しました:", error);
        // エラーメッセージ (managerImportErrorキーを再利用)
        const msg = chrome.i18n.getMessage('managerImportError', [error.message]) || ("フィルタのインポート中にエラーが発生しました: " + error.message);
        alert(msg);
        return 0;
    }
}

/**
 * インポートされたフィルタと構造データの処理
 * @param {Array} importedFilters 
 * @param {Array|null} importedStructure - XMLから抽出した構造データ(nodes)
 */
function handleImportedFilters(importedFilters, importedStructure) {
    if (!importedFilters || importedFilters.length === 0) {
        // 有効なフィルタなし
        const msg = chrome.i18n.getMessage('alertImportNoValid') || "有効なフィルタが見つかりませんでした。";
        alert(msg);
        return;
    }

    // 構造データの有無メッセージ
    const structureMsgKey = importedStructure ? 'importMsgStructYes' : 'importMsgStructNo';
    const structureMsgDefault = importedStructure ? "（フォルダ構造を含みます）" : "（フォルダ構造なし・フラット）";
    const structureMsg = chrome.i18n.getMessage(structureMsgKey) || structureMsgDefault;

    // 確認ダイアログ
    const confirmMsg = chrome.i18n.getMessage('confirmImportMergeAction', [String(importedFilters.length), structureMsg]) 
        || `${importedFilters.length}個のフィルタを読み込みました${structureMsg}。\n\n[OK] = 既存の設定と「統合」する\n[キャンセル] = 既存の設定をすべて「置き換える」`;

    const isMerge = confirm(confirmMsg);

    // IDマッピングの作成
    const idMap = new Map();
    importedFilters.forEach(f => {
        if (f._importOldId) {
            idMap.set(f._importOldId, f.id);
            delete f._importOldId; 
        }
    });

    function mapStructureIds(structNodes) {
        if (!Array.isArray(structNodes)) return [];
        const mapped = [];
        
        structNodes.forEach(node => {
            if (node.type === 'filter') {
                const newId = idMap.get(node.id);
                if (newId) {
                    mapped.push({ type: 'filter', id: newId });
                }
            } else if (node.type === 'folder') {
                const newFolderId = 'folder_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 8);
                
                mapped.push({
                    type: 'folder',
                    id: newFolderId,
                    name: node.name,
                    collapsed: !!node.collapsed,
                    children: mapStructureIds(node.children)
                });
            }
        });
        return mapped;
    }

    let newNodesStructure = [];
    if (importedStructure) {
        newNodesStructure = mapStructureIds(importedStructure);
    } else {
        newNodesStructure = importedFilters.map(f => ({ type: 'filter', id: f.id }));
    }

    if (isMerge) {
        console.log("Merging imported filters...");
        filters = filters.concat(importedFilters);
        const importedRuntimeNodes = buildRuntimeNodesFromStored(newNodesStructure, importedFilters);
        if (!Array.isArray(nodes)) nodes = [];
        nodes = nodes.concat(importedRuntimeNodes);
    } else {
        console.log("Replacing all filters...");
        filters = importedFilters;
        nodes = buildRuntimeNodesFromStored(newNodesStructure, filters);
    }

    syncNodesFromFilters();
    renderFilterList();
    saveFiltersToStorage();

    if (filters.length > 0) {
        const firstNewFilter = importedFilters[0];
        if (firstNewFilter) {
            selectFilterById(firstNewFilter.id);
        } else {
            selectFilter(0);
        }
    } else {
        currentFilterIndex = -1;
        displayFilterDetails(null);
    }

    console.log(`${importedFilters.length}個のフィルタをインポート完了 (構造維持: ${!!importedStructure})`);
}
// XMLエントリからフィルタ名とIDを抽出する関数
function extractFilterName(entry, filter) {
    const titleElement = entry.querySelector('title');
    if (titleElement) {
        // 1. まず通常のテキストコンテンツを取得
        let rawTitle = titleElement.textContent || '';

        // 2. テキストが空の場合、コメントノード（）の中身を探す（旧規格対応）
        if (!rawTitle.trim()) {
            for (let i = 0; i < titleElement.childNodes.length; i++) {
                if (titleElement.childNodes[i].nodeType === 8) { // 8 = Node.COMMENT_NODE
                    rawTitle = titleElement.childNodes[i].data;
                    break;
                }
            }
        }

        // 3. 正規表現で「名前」と「ID」を分離する（新規格対応）
        // パターン: 任意の文字列 + " || id:" + 任意のID文字列
        const match = rawTitle.match(/^(.*?)\s*\|\|\s*id:(.*)$/);

        if (match) {
            // 新規格フィルタ用: "名前 || id:xxx" の形式
            filter.name = match[1].trim();
            const idPart = match[2].trim();
            if (idPart) {
                filter._importOldId = idPart;
            }
        } else {
            // 旧規格フィルタ用: 区切り文字がない場合
            const cleanName = rawTitle.trim();
            // "Mail Filter" はGmailのデフォルト名なので無視する
            if (cleanName && cleanName !== 'Mail Filter') {
                filter.name = cleanName;
            }
        }
        
        console.log(`フィルタ情報を検出: Name="${filter.name}", OldID="${filter._importOldId || 'none'}"`);
    }
}
// XMLエントリからプロパティ要素を取得する関数
function getPropertiesFromEntry(entry) {
    // 複数の方法でプロパティ要素を取得（互換性対応）
    let properties = entry.querySelectorAll('apps\\:property');
    if (properties.length === 0) {
        // 名前空間を無視して試行
        properties = entry.querySelectorAll('property');
    }
    if (properties.length === 0) {
        // 完全修飾名で試行
        properties = entry.querySelectorAll('*[name]');
    }
    return properties;
}

// プロパティ要素を処理する関数（アクション対応版）
function processPropertyForImport(property, filter) {
    const name = property.getAttribute('name');
    let value = property.getAttribute('value');

    // XMLエスケープ文字列をデコード
    value = unescapeXml(value);

    // console.log(`プロパティ: ${name} = ${value}`);

    try {
        switch (name) {
            // --- 条件プロパティ ---
            case 'from':
                filter.conditions.from = parseConditionString(value);
                break;
            case 'to':
                filter.conditions.to = parseConditionString(value);
                break;
            case 'subject':
                filter.conditions.subject = parseConditionString(value);
                break;
            case 'hasTheWord':
                filter.conditions.includes = parseConditionString(value);
                break;
            case 'doesNotHaveTheWord':
                filter.conditions.excludes = parseConditionString(value);
                break;
            case 'size':
                // サイズ条件は別途処理が必要だが、簡易的に数値だけ入れる（演算子等はデフォルト）
                filter.conditions.size.value = parseInt(value, 10);
                break;
            case 'sizeOperator':
                 if (value === 's_sl') filter.conditions.size.operator = 'larger_than';
                 if (value === 's_ss') filter.conditions.size.operator = 'smaller_than';
                 break;
            case 'sizeUnit':
                 filter.conditions.size.unit = value;
                 break;
            case 'hasAttachment':
                filter.conditions.hasAttachment = (value === 'true');
                break;

            // --- 処理（アクション）プロパティ ---
            case 'label':
                filter.actions.applyLabel.enabled = true;
                filter.actions.applyLabel.labelName = value;
                break;
            case 'forwardTo':
                filter.actions.forward.enabled = true;
                filter.actions.forward.forwardAddress = value;
                break;
            case 'shouldArchive':
                filter.actions.skipInbox = (value === 'true');
                break;
            case 'shouldMarkAsRead':
                filter.actions.markAsRead = (value === 'true');
                break;
            case 'shouldStar':
                filter.actions.star = (value === 'true');
                break;
            case 'shouldTrash':
                filter.actions.delete = (value === 'true');
                break;
            case 'shouldNeverSpam':
                filter.actions.notSpam = (value === 'true');
                break;
            case 'shouldAlwaysMarkAsImportant':
                filter.actions.alwaysImportant = (value === 'true');
                break;
            case 'shouldNeverMarkAsImportant':
                filter.actions.neverImportant = (value === 'true');
                break;
            case 'smartLabelToApply':
                filter.actions.applyCategory.enabled = true;
                filter.actions.applyCategory.category = value;
                break;

            default:
                // console.log(`未処理のプロパティ: ${name} = ${value}`);
                break;
        }
    } catch (error) {
        console.error(`プロパティ ${name} の処理中にエラー: ${error.message}`, error);
    }
}