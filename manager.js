// manager.js
// フィルタ管理画面のロジックを記述

console.log("Filter Manager tab loaded!");

// フィルタデータを保持するための配列（初期値として空の配列）
// 後で chrome.storage に保存するように修正します
let filters = [];

// 現在選択されているフィルタのインデックスを保持
let currentFilterIndex = -1;

// --- 汎用的なヘルパー関数（条件項目に依存しないもの） ---

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

// --- 無題のフィルタデータを作成する関数 ---
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

// --- フィルタ一覧を更新する関数 ---
function renderFilterList() {
    console.log("Rendering filter list...");
    const filterListUl = document.getElementById('filter-list');
    if (!filterListUl) {
        console.error("Filter list UL element not found!");
        return;
    }

    // 既存のフィルタ項目をクリア（「＋ フィルタを追加」ボタン以外）
    filterListUl.querySelectorAll('.filter-list-item:not(#add-new-filter-item)').forEach(item => item.remove());

    // filters 配列の各フィルタに対してリスト項目を作成
    filters.forEach((filter, index) => {
        const listItem = document.createElement('li');
        listItem.classList.add('filter-list-item');
        // データ属性としてフィルタのIDとインデックスを保持
        listItem.dataset.filterId = filter.id;
        listItem.dataset.filterIndex = index;

        const button = document.createElement('button');
        button.textContent = filter.name || "無題のフィルタ";
        button.classList.add('filter-list-button');
        button.type = 'button';

        // クリックイベントでフィルタを選択状態にする
        button.addEventListener('click', () => {
            selectFilterById(filter.id);
        });

        // ドラッグハンドルを追加（右側に配置）
        const dragHandle = document.createElement('span');
        dragHandle.classList.add('drag-handle');
        dragHandle.innerHTML = '&#8942;&#8942;'; // 縦に並んだ6点（2つの縦3点リーダー）

        // 現在選択されているフィルタであれば、アクティブなスタイルを適用
        if (filter.id === (filters[currentFilterIndex] ? filters[currentFilterIndex].id : null)) {
            listItem.classList.add('active');
        }

        // 子要素を追加（ボタンが先、ドラッグハンドルが後）
        listItem.appendChild(button);
        listItem.appendChild(dragHandle);

        // 「＋ フィルタを追加」ボタンの li 要素の前に挿入
        const addNewFilterItem = filterListUl.querySelector('#add-new-filter-item');
        if (addNewFilterItem) {
            addNewFilterItem.before(listItem);
        } else {
            filterListUl.appendChild(listItem);
        }
    });
    console.log("Filter list rendering complete.");
}

// --- フィルタを選択し、右ペインに表示する関数 (IDで選択) ---
function selectFilterById(filterId) {
    console.log(`Attempting to select filter with ID: ${filterId}`);
    const index = filters.findIndex(filter => filter.id === filterId);
    if (index !== -1) {
        selectFilter(index);
    } else {
        console.error(`Filter with ID ${filterId} not found.`);
        // 見つからなかった場合は、選択状態を解除するなど適切な処理を行う
        currentFilterIndex = -1;
        renderFilterList(); // 選択状態解除を反映
        // 右ペインをクリアする関数を呼び出すなど...
        displayFilterDetails(null); // 右ペインをクリアするためにnullを渡す
    }
}

// --- 選択されたフィルタのデータを右ペインに表示する関数 ---
function displayFilterDetails(filter) {
    console.log("Displaying filter details:", filter);
    // 右ペインの要素をクリアする処理（フィルタが選択されていない場合や無題のフィルタ表示前）
    const filterNameInput = document.getElementById('filter-name-input');

    // ★★★ フィルタ名入力欄の表示制御を修正 ★★★
    if (filterNameInput) {
        // フィルタデータが存在し、かつフィルタ名がデフォルト値の場合は空欄にする
        if (filter && filter.name === "無題のフィルタ") {
            filterNameInput.value = ''; // 空文字列を設定
            console.log("Filter name is default, showing placeholder."); // ログを追加
        } else {
            // それ以外のフィルタ名の場合はその値を設定
            filterNameInput.value = filter ? filter.name : '';
            if (filter) {
                console.log(`Displaying filter name: "${filter.name}"`); // ログを追加
            }
        }
    }

    if (!filter) {
        console.warn("No filter data to display.");
        // フィルタデータがない場合は条件表示エリアも非表示にする
        document.querySelectorAll('.filter-condition-item').forEach(conditionItemElement => {
            updateDisplayVisibilityOfCondition(conditionItemElement);
        });
        // フィルタ名入力欄もクリア（既に上で処理済みですが念のため）
        if (filterNameInput) {
            filterNameInput.value = '';
        }
        return; // フィルタデータがない場合はここで終了
    }

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


    // 例: フィルタ処理のチェックボックス、入力欄、プルダウンをデフォルト状態に戻す
    document.querySelectorAll('.filter-process-item input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);
    document.querySelectorAll('.filter-process-item input[type="text"]').forEach(input => { input.value = ''; input.disabled = true; });
    document.querySelectorAll('.filter-process-item select').forEach(select => { select.value = ''; select.disabled = true; }); // プルダウンのデフォルト値を適宜修正


    if (!filter) {
        console.warn("No filter data to display.");
        // フィルタデータがない場合は条件表示エリアも非表示にする
        document.querySelectorAll('.filter-condition-item').forEach(conditionItemElement => {
            updateDisplayVisibilityOfCondition(conditionItemElement);
        });
        return; // フィルタデータがない場合はここで終了
    }

    // フィルタ名入力欄にデータを反映
    if (filterNameInput) {
        filterNameInput.value = filter.name;
    }

    // ★★★ 各フィルタ条件のデータを右ペインに反映 ★★★
    renderCondition('from', filter.conditions.from);
    renderCondition('to', filter.conditions.to);
    renderCondition('subject', filter.conditions.subject);
    renderCondition('includes', filter.conditions.includes);
    renderCondition('excludes', filter.conditions.excludes);

    // サイズ条件の反映
    const sizeOperatorSelect = document.getElementById('condition-size-operator');
    const sizeValueInput = document.getElementById('condition-size-value-input');
    const sizeUnitSelect = document.getElementById('condition-size-unit');
    if (sizeOperatorSelect && sizeValueInput && sizeUnitSelect) {
        sizeOperatorSelect.value = filter.conditions.size.operator;
        sizeValueInput.value = filter.conditions.size.value !== null ? filter.conditions.size.value : '';
        sizeUnitSelect.value = filter.conditions.size.unit
    }

    // 添付ファイルあり条件の反映
    const hasAttachmentCheckbox = document.getElementById('condition-has-attachment');
    if (hasAttachmentCheckbox) {
        hasAttachmentCheckbox.checked = filter.conditions.hasAttachment;
    }

    // ★★★ フィルタ処理（チェックボックス、入力欄、プルダウン）のデータを右ペインに反映 ★★★
    // filter.actions のデータ構造を元に、右ペインの入力要素の状態を設定します。
    // 例: フィルタ処理 - 各入力要素にデータを反映
    const skipInboxCheckbox = document.getElementById('process-skip-inbox');
    if (skipInboxCheckbox) {
        skipInboxCheckbox.checked = filter.actions.skipInbox;
    }
    const markAsReadCheckbox = document.getElementById('process-mark-as-read');
    if (markAsReadCheckbox) {
        markAsReadCheckbox.checked = filter.actions.markAsRead;
    }
    const starCheckbox = document.getElementById('process-star');
    if (starCheckbox) {
        starCheckbox.checked = filter.actions.star;
    }
    const applyLabelCheckbox = document.getElementById('process-apply-label');
    const applyLabelInput = document.getElementById('process-label-name');
    if (applyLabelCheckbox && applyLabelInput) {
        applyLabelCheckbox.checked = filter.actions.applyLabel.enabled;
        applyLabelInput.value = filter.actions.applyLabel.labelName;
        applyLabelInput.disabled = !filter.actions.applyLabel.enabled; // チェック状態に応じて入力欄を有効/無効にする
        // 手動でdisabled状態を切り替えるためのイベントリスナー（display時にも必要）
        // ここで一度だけ設定すれば良い場合が多いですが、DOM再生成の可能性を考慮してここで設定することも有効です。
        // ただし、DOMContentLoaded で設定したリスナーがあれば重複に注意が必要です。
        // 一旦、DOMContentLoaded 側のリスナーに任せます。
        // applyLabelCheckbox.onchange = () => { applyLabelInput.disabled = !applyLabelCheckbox.checked; };
    }
    const forwardCheckbox = document.getElementById('process-forward');
    const forwardInput = document.getElementById('process-forward-address');
    if (forwardCheckbox && forwardInput) {
        forwardCheckbox.checked = filter.actions.forward.enabled;
        forwardInput.value = filter.actions.forward.forwardAddress;
        forwardInput.disabled = !filter.actions.forward.enabled; // チェック状態に応じて入力欄を有効/無効にする
        // forwardCheckbox.onchange = () => { forwardInput.disabled = !forwardCheckbox.checked; };
    }
    const deleteCheckbox = document.getElementById('process-delete');
    if (deleteCheckbox) {
        deleteCheckbox.checked = filter.actions.delete;
    }
    const notSpamCheckbox = document.getElementById('process-not-spam');
    if (notSpamCheckbox) {
        notSpamCheckbox.checked = filter.actions.notSpam;
    }
    const alwaysImportantCheckbox = document.getElementById('process-always-important');
    if (alwaysImportantCheckbox) {
        alwaysImportantCheckbox.checked = filter.actions.alwaysImportant;
    }
    const neverImportantCheckbox = document.getElementById('process-never-important');
    if (neverImportantCheckbox) {
        neverImportantCheckbox.checked = filter.actions.neverImportant;
    }
    // displayFilterDetails関数内のカテゴリ設定部分
    const applyCategoryCheckbox = document.getElementById('process-apply-category');
    const applyCategorySelect = document.getElementById('process-apply-category-select');
    if (applyCategoryCheckbox && applyCategorySelect) {
        // チェックボックスの状態を設定
        applyCategoryCheckbox.checked = filter.actions.applyCategory.enabled;

        // セレクトボックスの値を設定（空の場合はデフォルトの空白値にする）
        if (filter.actions.applyCategory.category) {
            applyCategorySelect.value = filter.actions.applyCategory.category;
        } else {
            applyCategorySelect.value = '';
        }

        // チェック状態に応じてセレクトボックスを有効/無効化
        applyCategorySelect.disabled = !filter.actions.applyCategory.enabled;

        // デバッグ用ログ
        console.log(`カテゴリを表示: enabled=${applyCategoryCheckbox.checked}, category=${applyCategorySelect.value}`);
    }
}

// --- フィルタを選択し、右ペインに表示する関数 (インデックスで選択) ---
function selectFilter(index) {
    console.log(`Selecting filter by index: ${index}`);
    if (index < 0 || index >= filters.length) {
        console.error(`Invalid filter index: ${index}`);
        return;
    }

    // 既存の選択状態を解除
    const filterListUl = document.getElementById('filter-list');
    if (filterListUl) {
        filterListUl.querySelectorAll('.filter-list-item').forEach(item => item.classList.remove('active'));
    }


    // 無題のフィルタを選択状態にする
    currentFilterIndex = index;
    const selectedItem = filterListUl.querySelector(`.filter-list-item[data-filter-index="${index}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }

    // 選択されたフィルタのデータを右ペインに表示する
    displayFilterDetails(filters[currentFilterIndex]);

    console.log(`Selected filter index: ${currentFilterIndex}`);

    // 削除ボタンの状態を更新
    updateDeleteButtonState();
}

// --- 条件項目の表示/非表示を更新するヘルパー関数（renderCondition内で使用） ---
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

// --- フィルタデータの conditions 部分を右ペインの条件入力エリアのチップ表示に反映する関数 ---
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
        console.log('Clearing chips display.'); // ログを追加
        chipsDisplay.innerHTML = '';
    }
    if (inputAndButtonContainer) {
        console.log('Clearing input form chips.'); // ログを追加
        inputAndButtonContainer.querySelectorAll('.chip').forEach(chip => chip.remove());
    }
    if (inputElement) {
        console.log('Clearing input element value.'); // ログを追加
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
            // --- 修正箇所: 最初のORグループの要素を、最後の要素を入力フォームに、それ以前をチップとして表示 ---
            if (orGroup.length > 0) {
                const lastValue = orGroup[orGroup.length - 1]; // 最後の要素を取得

                // 最後の要素を入力フォームに設定
                if (inputElement) {
                    inputElement.value = lastValue;
                }

                // 最後の要素より前の要素を入力フォーム内のチップとして追加
                for (let i = 0; i < orGroup.length - 1; i++) { // 最後の要素の手前までループ
                    const item = orGroup[i];
                    if (item === 'AND') {
                        const operatorChip = createChip('AND', 'operator-chip');
                        if (inputElement) inputElement.before(operatorChip); // inputElement の前に挿入
                    } else {
                        const valueChip = createChip(item, 'address-chip'); // address-chip クラスを流用
                        addRemoveButtonToInputChip(valueChip); // 削除ボタンを追加
                        if (inputElement) inputElement.before(valueChip); // inputElement の前に挿入
                    }
                }
            }
            // --- 修正箇所終了 ---

            // 最初のORグループに対応する下部表示エリアは空のまま（入力フォームで表現されるため）

        } else {
            // 2番目以降のORグループの場合
            if (chipsDisplay) {
                // 既存のORグループ（下部表示エリアにあるもの）が存在する場合のみ、ORインジケーターを追加
                if (chipsDisplay.querySelectorAll('.or-group').length > 0) {
                    const orIndicator = createOrGroupIndicator();
                    chipsDisplay.appendChild(orIndicator);
                }

                // ORグループ全体のコンテナを作成
                const orGroupContainer = document.createElement('div');
                orGroupContainer.classList.add('or-group');

                orGroup.forEach((item, itemIndex) => {
                    if (item === 'AND') {
                        // AND演算子チップ
                        const operatorChip = createChip('AND', 'operator-chip');
                        orGroupContainer.appendChild(operatorChip);
                    } else {
                        // 値（アドレスやキーワード）チップ
                        const valueChip = createChip(item, 'address-chip'); // address-chip クラスを流用
                        // 下部表示エリアのチップには削除ボタンを付けない（ORグループごと削除するため）
                        // addRemoveButtonToInputChip(valueChip); // これは不要
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
    });

    // 表示エリアの表示/非表示を更新
    updateDisplayVisibilityOfCondition(conditionItemElement);
    console.log(`Finished rendering condition: ${conditionType}`); // ログを追加
}

// --- 右ペインの入力値の変更を現在のフィルタデータに反映させる関数 ---
function updateCurrentFilterData() {
    console.log("Updating current filter data...");
    if (currentFilterIndex === -1 || !filters[currentFilterIndex]) {
        console.warn("No filter selected or filter data missing to update.");
        return; // フィルタが選択されていない場合やフィルタデータが存在しない場合は何もしない
    }

    const currentFilter = filters[currentFilterIndex];

    // フィルタ名入力欄の値を取得してデータに反映
    const filterNameInput = document.getElementById('filter-name-input');
    if (filterNameInput) {
        const newFilterName = filterNameInput.value.trim();
        currentFilter.name = newFilterName; // フィルタデータ自体は入力された通りに更新

        // フィルタ名の変更を左ペインのフィルタ一覧に直接反映
        const filterListUl = document.getElementById('filter-list');
        // data-filter-id を使って該当要素を特定
        const selectedItemButton = filterListUl.querySelector(`.filter-list-item[data-filter-id="${currentFilter.id}"] button`);
        if (selectedItemButton) {
            // ★★★ ここを修正: フィルタ名が空の場合はデフォルト名を表示 ★★★
            selectedItemButton.textContent = currentFilter.name || "無題のフィルタ"; // データ上のフィルタ名が空ならデフォルト名を使用
            console.log(`Left pane filter name updated to: "${selectedItemButton.textContent}"`); // ログを追加
        }
    }

    // ★★★ 各条件項目のDOMからフィルタデータの conditions 部分を構築して反映 ★★★
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
                currentFilter.conditions.size.value = parseInt(sizeValueInput.value, 10) || null; // 数値に変換、無効な場合は0
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

    // 例：フィルタ処理 - チェックボックス、入力欄、プルダウンの状態を取得してデータに反映
    const skipInboxCheckbox = document.getElementById('process-skip-inbox');
    if (skipInboxCheckbox) {
        currentFilter.actions.skipInbox = skipInboxCheckbox.checked;
    }
    const markAsReadCheckbox = document.getElementById('process-mark-as-read');
    if (markAsReadCheckbox) {
        currentFilter.actions.markAsRead = markAsReadCheckbox.checked;
    }
    const starCheckbox = document.getElementById('process-star');
    if (starCheckbox) {
        currentFilter.actions.star = starCheckbox.checked;
    }
    const applyLabelCheckbox = document.getElementById('process-apply-label');
    const applyLabelInput = document.getElementById('process-label-name');
    if (applyLabelCheckbox && applyLabelInput) {
        currentFilter.actions.applyLabel.enabled = applyLabelCheckbox.checked;
        currentFilter.actions.applyLabel.labelName = applyLabelInput.value.trim();
    }
    const forwardCheckbox = document.getElementById('process-forward');
    const forwardInput = document.getElementById('process-forward-address');
    if (forwardCheckbox && forwardInput) {
        currentFilter.actions.forward.enabled = forwardCheckbox.checked;
        forwardInput.value = forwardInput.value.trim();
        currentFilter.actions.forward.forwardAddress = forwardInput.value.trim();
    }
    const deleteCheckbox = document.getElementById('process-delete');
    if (deleteCheckbox) {
        currentFilter.actions.delete = deleteCheckbox.checked;
    }
    const notSpamCheckbox = document.getElementById('process-not-spam');
    if (notSpamCheckbox) {
        currentFilter.actions.notSpam = notSpamCheckbox.checked;
    }
    const alwaysImportantCheckbox = document.getElementById('process-always-important');
    if (alwaysImportantCheckbox) {
        currentFilter.actions.alwaysImportant = alwaysImportantCheckbox.checked;
    }
    const neverImportantCheckbox = document.getElementById('process-never-important');
    if (neverImportantCheckbox) {
        currentFilter.actions.neverImportant = neverImportantCheckbox.checked;
    }
    // updateCurrentFilterData関数内の修正
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

        // デバッグ用ログ
        console.log(`カテゴリを設定: enabled=${applyCategoryCheckbox.checked}, category=${currentFilter.actions.applyCategory.category}`);
    }

    console.log("Updated filter data:", currentFilter);
}

// --- 各条件項目にロジックを設定する関数 ---
function setupConditionItem(conditionItemElement) {
    const inputElement = conditionItemElement.querySelector('.app-form-input');
    const addAndButton = conditionItemElement.querySelector('.add-and-button');
    const addOrButton = conditionItemElement.querySelector('.add-or-button');
    const chipsDisplay = conditionItemElement.querySelector('.condition-chips-display');
    const orConnector = conditionItemElement.querySelector('.condition-or-connector'); // OR接続テキストは省略可能
    const inputAndButtonContainer = conditionItemElement.querySelector('.input-and-button-container'); // 入力フォーム内のコンテナ

    const conditionType = conditionItemElement.dataset.conditionType;
    console.log(`Setting up logic for condition type: ${conditionType}`);

    // この条件項目がAND/OR入力UIを持つかどうかの判定に必要な要素
    const hasAndOrElements = inputElement && addAndButton && addOrButton && chipsDisplay && inputAndButtonContainer;


    // 下部表示エリアとOR接続テキストの表示/非表示を更新する関数 (この条件項目用)
    function updateDisplayVisibility() {
        // AND/OR入力UIがない条件項目では、表示制御は不要
        if (!hasAndOrElements) {
            return;
        }
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

    // +OR ボタンのイベントリスナー
    // +OR ボタンのイベントリスナーが必要な要素が全て揃っているかチェック
    if (addOrButton && inputElement && chipsDisplay && inputAndButtonContainer) {
        addOrButton.addEventListener('click', () => {
            const currentInput = inputElement.value.trim();
            const confirmedChips = inputAndButtonContainer.querySelectorAll('.chip');

            if (confirmedChips.length === 0 && currentInput === '') {
                console.log(`${conditionType}: Input form is empty, not adding OR condition.`);
                return;
            }

            // 入力フォーム内のチップと入力値をまとめて一つのAND条件グループとして取得
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


            // 確定したAND条件グループを下部表示エリアに新しいORグループとして追加
            if (currentAndGroup.length > 0) {
                const orGroupContainer = document.createElement('div');
                orGroupContainer.classList.add('or-group');

                // 既存のORグループ（下部表示エリアにあるもの）が存在する場合のみ、ORインジケーターを下部表示エリアの末尾に追加
                if (chipsDisplay.querySelectorAll('.or-group').length > 0) {
                    const orIndicator = createOrGroupIndicator();
                    chipsDisplay.appendChild(orIndicator);
                }


                currentAndGroup.forEach(item => {
                    if (item === 'AND') {
                        const operatorChip = createChip('AND', 'operator-chip');
                        orGroupContainer.appendChild(operatorChip);
                    } else {
                        const valueChip = createChip(item, 'address-chip');
                        orGroupContainer.appendChild(valueChip);
                    }
                });

                const orGroupRemoveButton = createOrGroupRemoveButton();
                orGroupContainer.appendChild(orGroupRemoveButton);

                chipsDisplay.appendChild(orGroupContainer);


                updateDisplayVisibility();

                // 入力フォーム内の確定部分と入力中のテキストをクリア
                inputAndButtonContainer.querySelectorAll('.chip').forEach(chip => chip.remove());
                inputElement.value = '';

                // OR条件が追加されたらフィルタデータを更新
                updateCurrentFilterData();

                console.log(`${conditionType}: OR condition added to display area.`);
            }
        });
    } else {
        console.log(`OR button or related elements not found for ${conditionType}. Skipping OR listener setup.`);
    }


    // +AND ボタンのイベントリスナー
    // +AND ボタンのイベントリスナーが必要な要素が全て揃っているかチェック
    if (addAndButton && inputElement && inputAndButtonContainer) {
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


    // 入力フォーム内のチップに対するイベント委譲を使った削除ボタンのイベントリスナー
    // 入力フォーム内のチップ削除リスナーが必要な要素が全て揃っているかチェック
    if (inputAndButtonContainer) {
        inputAndButtonContainer.addEventListener('click', (event) => {
            const removeButton = event.target.closest('button.remove-chip');

            if (removeButton) {
                const chipToRemove = removeButton.parentElement;

                if (chipToRemove && inputAndButtonContainer.contains(chipToRemove)) {
                    const isOperatorChip = chipToRemove.classList.contains('operator-chip');

                    // 削除対象のチップが演算子チップでない場合 (値のチップの場合)
                    if (!isOperatorChip) {
                        // 直後の要素がAND演算子チップであれば、それも削除
                        const nextElement = chipToRemove.nextElementSibling;
                        if (nextElement && nextElement.classList.contains('operator-chip')) {
                            nextElement.remove();
                        }
                    } else { // 削除対象のチップが演算子チップの場合
                        // 直前の要素（値のチップ）が入力フォーム内のチップであれば、それも削除
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


    // 下部の ORグループ表示エリア全体に対するイベント委譲を使った ORグループ削除ボタンのイベントリスナー
    if (chipsDisplay) { // 要素の存在チェックを追加
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

                    updateDisplayVisibility();

                    // ORグループが削除されたらフィルタデータを更新
                    updateCurrentFilterData();

                    console.log(`${conditionType}: OR group removed from display area.`);
                }
            }
        });
    } else {
        console.log(`Chips display area not found for ${conditionType}. Skipping OR group remove listener setup.`);
    }


    // サイズ、添付ファイルありなどの条件項目内の入力要素の変更を監視し、
    // その変更をフィルタデータに反映させるイベントリスナーを設定します。
    // これは AND/OR 入力とは異なるため、個別の要素に対して設定します。

    if (conditionType === 'size') {
        const sizeOperatorSelect = conditionItemElement.querySelector('#condition-size-operator');
        const sizeValueInput = conditionItemElement.querySelector('#condition-size-value-input');
        const sizeUnitSelect = conditionItemElement.querySelector('#condition-size-unit');
        if (sizeOperatorSelect) {
            sizeOperatorSelect.addEventListener('change', updateCurrentFilterData);
        }
        if (sizeValueInput) {
            sizeValueInput.addEventListener('input', updateCurrentFilterData);
        }
        if (sizeUnitSelect) {
            sizeUnitSelect.addEventListener('change', updateCurrentFilterData);
        }
    } else if (conditionType === 'has-attachment') {
        const hasAttachmentCheckbox = conditionItemElement.querySelector('#condition-has-attachment');
        if (hasAttachmentCheckbox) {
            hasAttachmentCheckbox.addEventListener('change', updateCurrentFilterData);
        }
    } else if (hasAndOrElements) { // AND/OR入力UIを持つ条件項目の入力フィールドの変更も監視
        if (inputElement) {
            inputElement.addEventListener('input', updateCurrentFilterData); // 入力中にデータ更新
        }
    }

    // ★★★ この条件項目の初期表示状態を設定 ★★★
    // AND/OR入力UIを持つ条件項目のみ表示制御が必要
    if (hasAndOrElements) {
        updateDisplayVisibility();
    }
}

// --- フィルタを複製する関数 ---
function duplicateCurrentFilter() {
    console.log("Attempting to duplicate current filter.");
    if (currentFilterIndex === -1) {
        console.warn("No filter selected to duplicate.");
        return; // 選択されているフィルタがない場合は何もしない
    }

    const originalFilter = filters[currentFilterIndex];

    // ★★★ フィルタデータのディープコピーを作成 ★★★
    // JSON.parse(JSON.stringify()) は、簡単なオブジェクトのディープコピーに便利ですが、
    // Dateオブジェクトや関数などが含まれる場合は別の方法を検討する必要があります。
    // 今回のフィルタデータ構造であれば問題ないでしょう。
    const duplicatedFilter = JSON.parse(JSON.stringify(originalFilter));

    // ★★★ 複製したフィルタに新しいIDと名前を設定 ★★★
    duplicatedFilter.id = Date.now().toString(); // 新しい一意なIDを生成
    duplicatedFilter.name = `${originalFilter.name} (コピー)`; // 名前に "(コピー)" を追加

    console.log("Original filter:", originalFilter);
    console.log("Duplicated filter:", duplicatedFilter);

    // 複製したフィルタを filters 配列に追加
    // シンプルに配列の末尾に追加します
    filters.push(duplicatedFilter);

    console.log("Duplicated filter added. Current filters:", filters);

    // フィルタ一覧を再描画
    renderFilterList();

    // 複製されたフィルタを選択状態にする
    // 追加したフィルタのIDで選択します
    selectFilterById(duplicatedFilter.id);

    console.log("Filter duplicated and new filter selected.");

    // TODO: chrome.storage にフィルタデータを保存する処理を呼び出す (後で実装)
    // saveFiltersToStorage();
}

// --- フィルタを削除する関数 ---
function deleteCurrentFilter() {
    console.log("Attempting to delete current filter.");
    if (currentFilterIndex === -1) {
        console.warn("No filter selected to delete.");
        return; // 選択されているフィルタがない場合は何もしない
    }

    // フィルタが1件しかない場合は処理を中断（アラートは表示しない）
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

    console.log(`Deleting filter at index: ${currentFilterIndex}`);
    filters.splice(currentFilterIndex, 1);
    console.log("Filter deleted. Remaining filters:", filters);
    renderFilterList();

    // 削除後の選択状態を決定
    if (filters.length === 0) {
        currentFilterIndex = -1;
        displayFilterDetails(null);
        console.log("All filters deleted. Right pane cleared.");
    } else {
        const newIndexToSelect = Math.min(currentFilterIndex, filters.length - 1);
        selectFilter(newIndexToSelect);
        console.log(`Filter deleted. Selecting filter at new index: ${newIndexToSelect}`);
    }

    // 削除ボタンの状態を更新
    updateDeleteButtonState();
}

// --- 削除ボタンの状態を更新する関数 ---
function updateDeleteButtonState() {
    const deleteFilterButton = document.getElementById('delete-this-filter');
    if (deleteFilterButton) {
        // フィルタが1件以下の場合は削除ボタンを無効化
        if (filters.length <= 1) {
            deleteFilterButton.disabled = true;
            deleteFilterButton.title = "最低1件のフィルタは必要です";
            deleteFilterButton.classList.add('disabled-button');
        } else {
            deleteFilterButton.disabled = false;
            deleteFilterButton.title = "このフィルタを削除";
            deleteFilterButton.classList.remove('disabled-button');
        }
    }
}

// フィルタリストのドラッグ＆ドロップソート機能
function setupFilterListSorting() {
    const filterListUl = document.getElementById('filter-list');
    if (!filterListUl) {
        console.error("Filter list UL element not found for sorting!");
        return;
    }

    // Sortable.jsライブラリを使用する場合
    if (typeof Sortable !== 'undefined') {
        console.log("Initializing Sortable.js for filter list");

        new Sortable(filterListUl, {
            animation: 150,
            handle: '.drag-handle', // ドラッグハンドルのみドラッグ可能に
            draggable: '.filter-list-item:not(#add-new-filter-item)', // 「＋ フィルタを追加」ボタン以外をドラッグ可能に
            filter: '.filter-list-button', // ボタン自体はドラッグの開始エリアとしない
            onStart: function (evt) {
                console.log("Drag started", evt);
            },
            onEnd: function (evt) {
                console.log("Drag ended", evt);
                // ドラッグ終了時に配列の順序を更新（add-new-filter-itemの位置を考慮）

                // フィルタ項目のインデックスを調整（add-new-filter-itemを考慮）
                const oldIndex = evt.oldIndex;
                const newIndex = evt.newIndex;

                console.log(`Moving filter from index ${oldIndex} to ${newIndex}`);

                // 配列の順序を更新
                reorderFilters(oldIndex, newIndex);
            }
        });

        console.log("Sortable.js initialized for filter list");
    } else {
        console.warn('Sortable.js not loaded - drag & drop ordering unavailable');
    }
}

// filters配列の順序を更新する関数
function reorderFilters(oldIndex, newIndex) {
    console.log(`Reordering filters: ${oldIndex} -> ${newIndex}`);

    // 範囲チェック
    if (oldIndex >= filters.length || newIndex >= filters.length || oldIndex < 0 || newIndex < 0) {
        console.error(`Invalid indices for reordering: oldIndex=${oldIndex}, newIndex=${newIndex}, filters.length=${filters.length}`);
        return;
    }

    // 現在選択中のフィルタのIDを保存
    const currentFilterId = filters[currentFilterIndex]?.id;
    console.log(`Current active filter ID before reordering: ${currentFilterId}`);

    // 配列の要素を移動
    const movedFilter = filters.splice(oldIndex, 1)[0];
    filters.splice(newIndex, 0, movedFilter);

    console.log("Filters after reordering:", filters.map(f => `${f.id}:${f.name || "無題"}`));

    // currentFilterIndexを更新（IDで一致するフィルタを検索）
    if (currentFilterId) {
        const newIndex = filters.findIndex(filter => filter.id === currentFilterId);
        if (newIndex !== -1) {
            currentFilterIndex = newIndex;
            console.log(`Updated currentFilterIndex to ${currentFilterIndex} for filter ID ${currentFilterId}`);
        }
    }

    // 新しい順序でフィルタ一覧を再描画
    renderFilterList();

    console.log("Filters reordered successfully");

    // TODO: フィルタデータを保存
    // saveFiltersToStorage();
}

// Gmail互換のXMLフィルタを生成する関数
function generateGmailFilterXML() {
    // XMLのヘッダー
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<feed xmlns="http://www.w3.org/2005/Atom" xmlns:apps="http://schemas.google.com/apps/2006">\n';
    xml += '  <title>Mail Filters</title>\n';

    // 各フィルタをXMLエントリに変換
    filters.forEach(filter => {
        xml += '  <entry>\n';
        xml += '    <category term="filter"></category>\n';
        xml += `    <title><!-- ${filter.name} --></title>\n`; // フィルタ名をXMLコメントとして埋め込み
        xml += '    <content></content>\n';

        // フィルタ条件をXMLに変換
        const conditions = filter.conditions;

        // From条件
        if (conditions.from && conditions.from.length > 0) {
            xml += generateFromConditionXML(conditions.from);
        }

        // To条件
        if (conditions.to && conditions.to.length > 0) {
            xml += generateToConditionXML(conditions.to);
        }

        // 件名条件
        if (conditions.subject && conditions.subject.length > 0) {
            xml += generateSubjectConditionXML(conditions.subject);
        }

        // メール内容に含むキーワード条件
        if (conditions.includes && conditions.includes.length > 0) {
            xml += generateHasTheWordConditionXML(conditions.includes);
        }

        // メール内容に含まないキーワード条件
        if (conditions.excludes && conditions.excludes.length > 0) {
            xml += generateDoesNotHaveTheWordConditionXML(conditions.excludes);
        }

        // サイズ条件
        if (conditions.size && conditions.size.value !== null) {
            xml += generateSizeConditionXML(conditions.size);
        }

        // 添付ファイルあり条件
        if (conditions.hasAttachment) {
            xml += '    <apps:property name="hasAttachment" value="true"/>\n';
        }

        // フィルタ処理アクションをXMLに変換
        const actions = filter.actions;

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
        if (actions.delete) {
            xml += '    <apps:property name="shouldTrash" value="true"/>\n';
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

        xml += '  </entry>\n';
    });

    xml += '</feed>';
    return xml;
}

// XMLの特殊文字をエスケープする関数
function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

// 「フィルタを保存する」ボタンの処理を実装
document.getElementById('export-filter').addEventListener('click', function () {
    // XMLデータを生成
    const xmlContent = generateGmailFilterXML();

    // 現在の日時を取得してファイル名を生成
    const now = new Date();
    const dateStr = now.getFullYear() +
        ('0' + (now.getMonth() + 1)).slice(-2) +
        ('0' + now.getDate()).slice(-2);
    const timeStr = ('0' + now.getHours()).slice(-2) +
        ('0' + now.getMinutes()).slice(-2) +
        ('0' + now.getSeconds()).slice(-2);
    const fileName = `gmailfilter_${dateStr}_${timeStr}.xml`;

    // XMLをダウンロード
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    // クリーンアップ
    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
});

// FROM条件をXML形式に変換する関数
function generateFromConditionXML(fromConditions) {
    let xml = '';

    // 複数のORグループがある場合は複合条件として処理
    if (fromConditions.length > 1) {
        // OR条件グループをフォーマット
        const includeParts = fromConditions.map(orGroup => {
            // ANDキーワードを除去して実際の値だけを取得
            const values = orGroup.filter(item => item !== 'AND');
            if (values.length === 1) {
                // 単一値の場合はそのまま
                return escapeXml(values[0]);
            } else {
                // 複数値（AND条件）の場合は括弧でグループ化
                const andCondition = values.map(v => escapeXml(v)).join(' AND ');
                return `(${andCondition})`;
            }
        });

        // すべてのOR条件を組み合わせる
        const combinedQuery = includeParts.join(' OR ');
        xml += `    <apps:property name="from" value="${escapeXml(combinedQuery)}"/>\n`;
    } else if (fromConditions.length === 1) {
        // 単一のORグループの場合
        const orGroup = fromConditions[0];
        // ANDキーワードを除去して実際の値だけを取得
        const values = orGroup.filter(item => item !== 'AND');

        if (values.length === 1) {
            // 単一のキーワードの場合
            xml += `    <apps:property name="from" value="${escapeXml(values[0])}"/>\n`;
        } else {
            // 複数キーワード（AND条件）の場合
            const andCondition = values.map(v => escapeXml(v)).join(' AND ');
            xml += `    <apps:property name="from" value="${escapeXml(andCondition)}"/>\n`;
        }
    }

    return xml;
}

// TO条件をXML形式に変換する関数
function generateToConditionXML(toConditions) {
    let xml = '';

    // 複数のORグループがある場合は複合条件として処理
    if (toConditions.length > 1) {
        // OR条件グループをフォーマット
        const includeParts = toConditions.map(orGroup => {
            // ANDキーワードを除去して実際の値だけを取得
            const values = orGroup.filter(item => item !== 'AND');
            if (values.length === 1) {
                // 単一値の場合はそのまま
                return escapeXml(values[0]);
            } else {
                // 複数値（AND条件）の場合は括弧でグループ化
                const andCondition = values.map(v => escapeXml(v)).join(' AND ');
                return `(${andCondition})`;
            }
        });

        // すべてのOR条件を組み合わせる
        const combinedQuery = includeParts.join(' OR ');
        xml += `    <apps:property name="to" value="${escapeXml(combinedQuery)}"/>\n`;
    } else if (toConditions.length === 1) {
        // 単一のORグループの場合
        const orGroup = toConditions[0];
        // ANDキーワードを除去して実際の値だけを取得
        const values = orGroup.filter(item => item !== 'AND');

        if (values.length === 1) {
            // 単一のキーワードの場合
            xml += `    <apps:property name="to" value="${escapeXml(values[0])}"/>\n`;
        } else {
            // 複数キーワード（AND条件）の場合
            const andCondition = values.map(v => escapeXml(v)).join(' AND ');
            xml += `    <apps:property name="to" value="${escapeXml(andCondition)}"/>\n`;
        }
    }

    return xml;
}

// 件名条件をXML形式に変換する関数
function generateSubjectConditionXML(subjectConditions) {
    let xml = '';

    // 複数のORグループがある場合は複合条件として処理
    if (subjectConditions.length > 1) {
        // OR条件グループをフォーマット
        const includeParts = subjectConditions.map(orGroup => {
            // ANDキーワードを除去して実際の値だけを取得
            const values = orGroup.filter(item => item !== 'AND');
            if (values.length === 1) {
                // 単一値の場合はそのまま
                return escapeXml(values[0]);
            } else {
                // 複数値（AND条件）の場合は括弧でグループ化
                const andCondition = values.map(v => escapeXml(v)).join(' AND ');
                return `(${andCondition})`;
            }
        });

        // すべてのOR条件を組み合わせる
        const combinedQuery = includeParts.join(' OR ');
        xml += `    <apps:property name="subject" value="${escapeXml(combinedQuery)}"/>\n`;
    } else if (subjectConditions.length === 1) {
        // 単一のORグループの場合
        const orGroup = subjectConditions[0];
        // ANDキーワードを除去して実際の値だけを取得
        const values = orGroup.filter(item => item !== 'AND');

        if (values.length === 1) {
            // 単一のキーワードの場合
            xml += `    <apps:property name="subject" value="${escapeXml(values[0])}"/>\n`;
        } else {
            // 複数キーワード（AND条件）の場合
            const andCondition = values.map(v => escapeXml(v)).join(' AND ');
            xml += `    <apps:property name="subject" value="${escapeXml(andCondition)}"/>\n`;
        }
    }

    return xml;
}

// 含むキーワード条件をXML形式に変換する関数
function generateHasTheWordConditionXML(includesConditions) {
    let xml = '';

    // 複数のORグループがある場合は複合条件として処理
    if (includesConditions.length > 1) {
        // OR条件グループをフォーマット
        const includeParts = includesConditions.map(orGroup => {
            // ANDキーワードを除去して実際の値だけを取得
            const values = orGroup.filter(item => item !== 'AND');
            if (values.length === 1) {
                // 単一値の場合はそのまま
                return escapeXml(values[0]);
            } else {
                // 複数値（AND条件）の場合は括弧でグループ化
                const andCondition = values.map(v => escapeXml(v)).join(' AND ');
                return `(${andCondition})`;
            }
        });

        // すべてのOR条件を組み合わせる
        const combinedQuery = includeParts.join(' OR ');
        xml += `    <apps:property name="hasTheWord" value="${escapeXml(combinedQuery)}"/>\n`;
    } else if (includesConditions.length === 1) {
        // 単一のORグループの場合
        const orGroup = includesConditions[0];
        // ANDキーワードを除去して実際の値だけを取得
        const values = orGroup.filter(item => item !== 'AND');

        if (values.length === 1) {
            // 単一のキーワードの場合
            xml += `    <apps:property name="hasTheWord" value="${escapeXml(values[0])}"/>\n`;
        } else {
            // 複数キーワード（AND条件）の場合
            const andCondition = values.map(v => escapeXml(v)).join(' AND ');
            xml += `    <apps:property name="hasTheWord" value="${escapeXml(andCondition)}"/>\n`;
        }
    }

    return xml;
}

// 含まないキーワード条件をXML形式に変換する関数
function generateDoesNotHaveTheWordConditionXML(excludesConditions) {
    let xml = '';

    // 複数のORグループがある場合は複合条件として処理
    if (excludesConditions.length > 1) {
        // OR条件グループをフォーマット
        const includeParts = excludesConditions.map(orGroup => {
            // ANDキーワードを除去して実際の値だけを取得
            const values = orGroup.filter(item => item !== 'AND');
            if (values.length === 1) {
                // 単一値の場合はそのまま
                return escapeXml(values[0]);
            } else {
                // 複数値（AND条件）の場合は括弧でグループ化
                const andCondition = values.map(v => escapeXml(v)).join(' AND ');
                return `(${andCondition})`;
            }
        });

        // すべてのOR条件を組み合わせる
        const combinedQuery = includeParts.join(' OR ');
        xml += `    <apps:property name="doesNotHaveTheWord" value="${escapeXml(combinedQuery)}"/>\n`;
    } else if (excludesConditions.length === 1) {
        // 単一のORグループの場合
        const orGroup = excludesConditions[0];
        // ANDキーワードを除去して実際の値だけを取得
        const values = orGroup.filter(item => item !== 'AND');

        if (values.length === 1) {
            // 単一のキーワードの場合
            xml += `    <apps:property name="doesNotHaveTheWord" value="${escapeXml(values[0])}"/>\n`;
        } else {
            // 複数キーワード（AND条件）の場合
            const andCondition = values.map(v => escapeXml(v)).join(' AND ');
            xml += `    <apps:property name="doesNotHaveTheWord" value="${escapeXml(andCondition)}"/>\n`;
        }
    }

    return xml;
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

// Gmailフィルタ形式のXMLからフィルタを読み込む関数
// Gmailフィルタ形式のXMLからフィルタを読み込む関数
function importFiltersFromXML(xmlContent) {
    try {
        console.log("XMLのインポートを開始します");
        // XMLパーサーを作成
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlContent, "application/xml");

        // XMLパースエラーをチェック
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error("XML解析エラー: " + parserError.textContent);
        }

        // 全エントリを取得
        const entries = xmlDoc.querySelectorAll('entry');
        const importedFilters = [];

        // 各エントリーを処理
        entries.forEach(entry => {
            // 新しいフィルタオブジェクトを作成
            const filter = createNewFilterData();

            // フィルタ名を取得（XMLコメント内）
            const titleElement = entry.querySelector('title');
            if (titleElement) {
                const titleContent = titleElement.innerHTML;
                const nameMatch = titleContent.match(/<!--\s*(.*?)\s*-->/);
                if (nameMatch && nameMatch[1]) {
                    filter.name = nameMatch[1].trim();
                    console.log(`フィルタ名を検出: "${filter.name}"`);
                }
            }

            // 各プロパティを取得
            const properties = entry.querySelectorAll('apps\\:property');
            properties.forEach(property => {
                const name = property.getAttribute('name');
                const value = property.getAttribute('value');

                // プロパティに基づいてフィルタを設定
                switch (name) {
                    case 'from':
                        filter.conditions.from = [[value]];
                        break;
                    case 'to':
                        filter.conditions.to = [[value]];
                        break;
                    case 'subject':
                        filter.conditions.subject = [[value]];
                        break;
                    case 'hasTheWord':
                        // 簡略化: 単一の条件として扱う
                        filter.conditions.includes = [[value]];
                        break;
                    case 'doesNotHaveTheWord':
                        filter.conditions.excludes = [[value]];
                        break;
                    case 'hasAttachment':
                        filter.conditions.hasAttachment = (value === 'true');
                        break;
                    case 'size':
                    case 'sizeOperator':
                    case 'sizeUnit':
                        if (name === 'size') {
                            filter.conditions.size.value = parseInt(value) || 0;
                        }
                        if (name === 'sizeOperator') {
                            filter.conditions.size.operator = (value === 's_sl') ? 'larger_than' : 'smaller_than';
                        }
                        if (name === 'sizeUnit') {
                            filter.conditions.size.unit = value;
                        }
                        break;
                    // アクション(処理)の設定
                    case 'shouldArchive':
                        filter.actions.skipInbox = (value === 'true');
                        break;
                    case 'shouldMarkAsRead':
                        filter.actions.markAsRead = (value === 'true');
                        break;
                    case 'shouldStar':
                        filter.actions.star = (value === 'true');
                        break;
                    case 'label':
                        filter.actions.applyLabel.enabled = true;
                        filter.actions.applyLabel.labelName = value;
                        break;
                    case 'forwardTo':
                        filter.actions.forward.enabled = true;
                        filter.actions.forward.forwardAddress = value;
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
                }
            });

            console.log("インポートされたフィルタ:", filter);
            importedFilters.push(filter);
        });

        // 既存のフィルタと結合するか、置き換えるか確認
        if (filters.length > 0 && importedFilters.length > 0) {
            if (confirm(`${importedFilters.length}個のフィルタを読み込みました。既存の${filters.length}個のフィルタと統合しますか？「キャンセル」を選択すると、既存のフィルタを全て置き換えます。`)) {
                // 統合する場合
                filters = filters.concat(importedFilters);
            } else {
                // 置き換える場合
                filters = importedFilters;
            }
        } else {
            // 既存のフィルタがない場合は置き換え
            filters = importedFilters;
        }

        // フィルタ一覧を更新
        renderFilterList();

        // 最初のフィルタを選択
        if (filters.length > 0) {
            selectFilter(0);
        } else {
            currentFilterIndex = -1;
            displayFilterDetails(null);
        }

        console.log(`${importedFilters.length}個のフィルタを正常にインポートしました`);
        return importedFilters.length;
    } catch (error) {
        console.error("フィルタのインポート中にエラーが発生しました:", error);
        alert("フィルタのインポート中にエラーが発生しました: " + error.message);
        return 0;
    }
}

// 「フィルタを読み込む」ボタンの処理を実装
document.getElementById('import-filter').addEventListener('click', function () {
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
            const count = importFiltersFromXML(xmlContent);
            if (count > 0) {
                alert(`${count}個のフィルタを正常にインポートしました。`);
            }
        };
        reader.onerror = function () {
            alert("ファイルの読み込み中にエラーが発生しました。");
        };
        reader.readAsText(file);
    };

    input.click();
});

// --- ページの読み込みが完了したら実行される処理 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded event fired.");
    // 全ての条件項目要素を取得し、ロジックを設定
    const conditionItems = document.querySelectorAll('.filter-condition-item');
    if (conditionItems.length > 0) {
        conditionItems.forEach(item => {
            setupConditionItem(item);
        });
    } else {
        console.warn("No filter condition items found.");
    }
    // ドラッグアンドドロップ機能の初期化
    setupFilterListSorting();
    // 「＋ フィルタを追加」ボタンにイベントリスナーを設定
    const addNewFilterButton = document.getElementById('add-new-filter');
    if (addNewFilterButton) {
        console.log("'+ フィルタを追加' button found, adding event listener.");
        addNewFilterButton.addEventListener('click', () => {
            console.log("'+ フィルタを追加' button clicked!");
            const newFilter = createNewFilterData(); // 無題のフィルタデータを作成
            filters.push(newFilter); // filters 配列に追加
            console.log("New filter added:", newFilter);
            console.log("Current filters:", filters);
            renderFilterList(); // フィルタ一覧を更新
            // 無題のフィルタのIDで選択する
            selectFilterById(newFilter.id);
            console.log("New filter should be rendered and selected.");
            // 削除ボタンの状態を更新
            updateDeleteButtonState();
        });
    } else {
        console.error("'+ フィルタを追加' button not found!");
    }
    // フィルタ名入力欄の input イベントを監視し、値が変更されたらフィルタデータを更新
    const filterNameInput = document.getElementById('filter-name-input');
    if (filterNameInput) {
        filterNameInput.addEventListener('input', () => {
            updateCurrentFilterData();
        });
    }
    // フィルタ処理に関する入力要素（チェックボックス、プルダウン、テキスト入力）にイベントリスナーを設定
    document.querySelectorAll('.filter-process-item input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateCurrentFilterData);
        // ラベルや転送先アドレス、カテゴリの入力要素の有効/無効を切り替えるイベントリスナー
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
                    relatedSelect.value = ''; // デフォルト値に戻す（例：最初のoptionの値）
                    updateCurrentFilterData(); // データも更新
                }
            });
            // 初期状態を設定
            relatedSelect.disabled = !checkbox.checked;
        }
    });
    // テキスト入力フィールドの監視
    document.querySelectorAll('.filter-process-item input[type="text"]').forEach(input => {
        // input イベントで値の変更を監視
        input.addEventListener('input', function () {
            console.log(`テキスト入力変更: ${this.id} = ${this.value}`);
            updateCurrentFilterData(); // データ更新
        });
    });
    // フィルタ処理のセレクトボックス監視
    document.querySelectorAll('.filter-process-item select').forEach(select => {
        // change イベントで値の変更を監視
        select.addEventListener('change', function () {
            console.log(`セレクトボックス変更: ${this.id} = ${this.value}`);
            updateCurrentFilterData(); // データ更新
        });
    });

    // サイズ条件に関する入力要素の監視
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

    // 添付ファイルチェックボックスの監視
    const hasAttachmentCheckbox = document.getElementById('condition-has-attachment');
    if (hasAttachmentCheckbox) {
        hasAttachmentCheckbox.addEventListener('change', function () {
            console.log(`添付ファイル条件変更: ${this.checked}`);
            updateCurrentFilterData();
        });
    }

    // TODO: 既存のフィルタデータがあれば chrome.storage から読み込む処理を実装 (後で)
    // 初期表示として空のフィルタリストを作成し、最初のフィルタを選択状態にする
    if (filters.length === 0) {
        console.log("No filters found, creating initial filter.");
        const initialFilter = createNewFilterData();
        filters.push(initialFilter);
        renderFilterList();
        selectFilterById(initialFilter.id); // IDで選択
    } else {
        // 既存のフィルタがある場合は、最初のフィルタを選択状態にする
        console.log(`Found ${filters.length} filters, selecting the first one.`);
        renderFilterList();
        selectFilter(0);
    }
    // 「このフィルタを複製」ボタンにイベントリスナーを設定
    const duplicateFilterButton = document.getElementById('duplicate-this-filter');
    if (duplicateFilterButton) {
        console.log("'このフィルタを複製' button found, adding event listener.");
        duplicateFilterButton.addEventListener('click', () => {
            console.log("'このフィルタを複製' button clicked!");
            duplicateCurrentFilter(); // フィルタ複製関数を呼び出し
        });
    } else {
        console.error("'このフィルタを複製' button not found!");
    }
    // 「このフィルタを削除」ボタンにイベントリスナーを設定
    const deleteFilterButton = document.getElementById('delete-this-filter');
    if (deleteFilterButton) {
        console.log("'このフィルタを削除' button found, adding event listener.");
        deleteFilterButton.addEventListener('click', () => {
            console.log("'このフィルタを削除' button clicked!");
            deleteCurrentFilter(); // フィルタ削除関数を呼び出し
        });
    } else {
        console.error("'このフィルタを削除' button not found!");
    }
    console.log("manager.js setup complete.");
});