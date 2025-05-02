// manager.js
// フィルタ管理画面のロジックを記述

console.log("Filter Manager tab loaded!");

// --- 汎用的なヘルパー関数（条件項目に依存しないもの） ---

// アドレスチップを作成
function createAddressChip(address) {
    const chip = document.createElement('span');
    chip.classList.add('chip', 'address-chip'); // 共通クラス
    chip.appendChild(document.createTextNode(address));
    // 削除ボタンはORグループ単位と入力フォーム内チップに付けるため、ここでは付けません
    return chip;
}

// 演算子チップを作成
function createOperatorChip(operator) {
    const chip = document.createElement('span');
    chip.classList.add('chip', 'operator-chip'); // 共通クラス
    chip.appendChild(document.createTextNode(operator.toUpperCase()));
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


// --- 各条件項目にロジックを設定する関数 ---
function setupConditionItem(conditionItemElement) {
    // ★★★ この条件項目内の要素への参照を取得（共通クラスを使う） ★★★
    const inputElement = conditionItemElement.querySelector('.condition-input');
    const addAndButton = conditionItemElement.querySelector('.add-and-button');
    const addOrButton = conditionItemElement.querySelector('.add-or-button');
    const chipsDisplay = conditionItemElement.querySelector('.condition-chips-display'); // 下部ORグループ表示エリア
    const orConnector = conditionItemElement.querySelector('.condition-or-connector'); // OR接続テキスト
    const inputAndButtonContainer = conditionItemElement.querySelector('.input-and-button-container'); // 入力フォーム内削除用に使用

    // この条件項目のタイプを取得 (例: 'from', 'to', 'subject')
    const conditionType = conditionItemElement.dataset.conditionType;
    console.log(`Setting up logic for condition type: ${conditionType}`);


    // --- 下部表示エリアとOR接続テキストの表示/非表示を更新する関数 (この条件項目用) ---
    // ORグループ（chipsDisplayの子要素でクラスが'or-group'の要素）の数に基づいて表示/非表示を制御
    function updateDisplayVisibility() {
        // 下部表示エリアにあるORグループコンテナの数を正確にカウント
        const orGroupCount = chipsDisplay.querySelectorAll('.or-group').length;

        if (orGroupCount === 0) {
            // ORグループが0個の場合は、下部表示エリアとOR接続テキストを非表示
            chipsDisplay.style.display = 'none';
            if (orConnector) { // orConnector が存在する場合のみ操作
                 orConnector.style.display = 'none';
            }
        } else {
            // ORグループが1個以上の場合は、下部表示エリアとOR接続テキストを表示
            chipsDisplay.style.display = 'flex'; // CSSでflexに設定
             if (orConnector) { // orConnector が存在する場合のみ操作
                 orConnector.style.display = 'block'; // OR接続テキストはblock表示
            }
        }
    }


    // --- +OR ボタンのイベントリスナー (この条件項目用) ---
    addOrButton.addEventListener('click', () => {
        const currentInput = inputElement.value.trim();
        // 入力フォーム内の確定チップを取得（この条件項目内のinputAndButtonContainerから）
        const confirmedChips = inputAndButtonContainer.querySelectorAll('.chip');


        // 入力フォームの内容が全て空の場合は何もしない
        if (confirmedChips.length === 0 && currentInput === '') {
            console.log(`${conditionType}: Input form is empty, not adding OR condition.`);
            return;
        }

        const chipsArray = Array.from(confirmedChips);

        // 入力フォームの末尾に「AND」が追加されていたとき、ANDを削除する
        const lastChip = chipsArray[chipsArray.length - 1];
        if (lastChip && lastChip.classList.contains('operator-chip') && lastChip.textContent.toUpperCase() === 'AND') {
            chipsArray.pop();
        }


        // ★★★ 下部表示エリアに新しいORグループとしてチップを追加 ★★★

        // 新しいORグループ全体のコンテナを作成
        const orGroupContainer = document.createElement('div');
        orGroupContainer.classList.add('or-group'); // 共通クラス

        // ★★★ 下部表示エリアに既にORグループが存在する場合のみ、ORインジケーターを下部表示エリアの末尾に追加 ★★★
        // chipsDisplay の子要素（ORグループ）の数を正確にカウント
        const existingOrGroupCount = chipsDisplay.querySelectorAll('.or-group').length;

        if (existingOrGroupCount > 0) { // 既にORグループが1個以上存在する場合 (= 追加されるORグループが2個目以降の場合)
            const orIndicator = createOrGroupIndicator(); // ORインジケーターを作成（共通クラス）
            // ORインジケーターは、既存の最後のORグループの後、新しいORグループの前に挿入
            chipsDisplay.appendChild(orIndicator);
        }


        // 入力フォームから取得した確定チップを新しいORグループコンテナにコピーして追加
        chipsArray.forEach(chip => {
            if (chip.classList.contains('address-chip')) {
                const address = chip.textContent.replace('✕', '').trim();
                const addressChip = createAddressChip(address); // 下部エリア用は削除ボタンなし
                orGroupContainer.appendChild(addressChip);
            } else if (chip.classList.contains('operator-chip')) {
                const operator = chip.textContent.trim();
                const operatorChip = createOperatorChip(operator);
                orGroupContainer.appendChild(operatorChip);
            }
        });

        // 現在入力中のテキストがあれば、それもアドレスチップとして新しいORグループコンテナに追加
        if (currentInput !== '') {
             const addressChip = createAddressChip(currentInput); // 下部エリア用は削除ボタンなし
             orGroupContainer.appendChild(addressChip);
        }

        // ORグループ全体の削除ボタンを作成し、ORグループコンテナに追加
        const orGroupRemoveButton = createOrGroupRemoveButton(); // ORグループ削除用共通クラス
        orGroupContainer.appendChild(orGroupRemoveButton);


        // ★★★ 完成したORグループ全体を下部表示エリアの末尾に追加 ★★★
        // ORインジケーターを追加した場合は、その後にORグループを追加
        chipsDisplay.appendChild(orGroupContainer);


        // ★★★ 下部表示エリアとOR接続テキストの表示状態を更新 ★★★
        updateDisplayVisibility();


        // ★★★ 入力フォーム内の確定部分と入力中のテキストをクリア ★★★
        // 入力フォーム内の確定チップを全て削除（この条件項目内のinputAndButtonContainerから）
        inputAndButtonContainer.querySelectorAll('.chip').forEach(chip => chip.remove());
        // 入力フィールドの値をクリア
        inputElement.value = '';


        // TODO: この条件項目のチップリストの状態からクエリ構文の一部を生成するロジックを呼び出す
        // generateConditionQueryString(conditionItemElement);

        console.log(`${conditionType}: OR condition added to display area.`);
    });


    // --- +AND ボタンのイベントリスナー (この条件項目用) ---
    addAndButton.addEventListener('click', () => {
        const address = inputElement.value.trim();

         if (address) {
             // ★★★ 入力フォーム内でのAND条件追加ロジック ★★★

             // 確定したアドレスのチップを作成（入力フォーム内用は削除ボタン付き）
             const addressChip = createAddressChip(address);
             addRemoveButtonToInputChip(addressChip); // 削除ボタンを追加（共通クラス）

             // AND演算子チップを作成
             const operatorChip = createOperatorChip('AND'); // 共通クラス

             // 入力フィールドの直前に、アドレスチップとAND演算子チップを挿入
             // inputAndButtonContainer の中で、inputElement の前に挿入
             // アドレスチップを先に挿入し、その直後にAND演算子チップを挿入
             inputElement.before(addressChip);
             addressChip.after(operatorChip); // addressChip の直後に挿入


             // 入力フィールドの値はクリアする
             inputElement.value = '';


             // TODO: この条件項目のチップリストの状態からクエリ構文の一部を生成するロジックを呼び出す
             // generateConditionQueryString(conditionItemElement);

             console.log(`${conditionType}: AND condition added within the input form.`);
         }
    });


    // --- 入力フォーム内のチップに対するイベント委譲を使った削除ボタンのイベントリスナー (この条件項目用) ---
    // この条件項目内のinputAndButtonContainerにイベントリスナーを設定
    inputAndButtonContainer.addEventListener('click', (event) => {
        const removeButton = event.target.closest('button.remove-chip'); // 共通クラスで検索

        if (removeButton) {
            // ★★★ 入力フォーム内のチップ削除ロジック ★★★
            const addressChip = removeButton.closest('.address-chip'); // 共通クラスで親チップを取得

            // チップが入力フォーム内にあることを確認 (この条件項目内のinputAndButtonContainerに属するか)
            if (addressChip && inputAndButtonContainer.contains(addressChip)) {
                // 削除対象のアドレスチップの直後の要素がAND演算子チップであるか確認
                const nextElement = addressChip.nextElementSibling;

                // アドレスチップをDOMから削除
                addressChip.remove();

                // もし直後の要素がAND演算子チップであれば、それも削除
                if (nextElement && nextElement.classList.contains('operator-chip')) {
                     nextElement.remove();
                }

                // TODO: 削除後にこの条件項目のクエリ構文を再生成するロジックを呼び出す
                // generateConditionQueryString(conditionItemElement);

                console.log(`${conditionType}: Address chip removed from input form.`);
            }
        }
    });


    // --- 下部の ORグループ表示エリア全体に対するイベント委譲を使った ORグループ削除ボタンのイベントリスナー (この条件項目用) ---
    // この条件項目内のchipsDisplayにイベントリスナーを設定
    chipsDisplay.addEventListener('click', (event) => {
        const removeButton = event.target.closest('button.remove-or-group-button'); // 共通クラスで検索

        if (removeButton) {
            // ★★★ ORグループ削除ロジック ★★★
            const orGroupContainer = removeButton.closest('.or-group'); // 共通クラスで親ORグループを取得

            if (orGroupContainer) {
                // 削除対象のORグループの前の要素がORインジケーターか確認
                const prevElement = orGroupContainer.previousElementSibling;

                // ORグループをDOMから削除
                orGroupContainer.remove();

                // もし前の要素がORインジケーターであれば、それも削除
                // ただし、削除されたORグループが最初のORグループだった場合は、前の要素はORインジケーターではない
                if (prevElement && prevElement.classList.contains('or-indicator')) { // 共通クラスで判定
                     prevElement.remove();
                }


                // ★★★ 下部表示エリアとOR接続テキストの表示状態を更新 ★★★
                updateDisplayVisibility();

                // TODO: 削除後にこの条件項目のクエリ構文を再生成するロジックを呼び出す
                // generateConditionQueryString(conditionItemElement);

                console.log(`${conditionType}: OR group removed from display area.`);
            }
        }
    });


    // TODO: この条件項目のチップリストの状態からクエリ構文の一部を生成する関数 (conditionItemElement を引数に取る)
    // function generateConditionQueryString(conditionItemElement) { ... }


    // ★★★ この条件項目の初期表示状態を設定 ★★★
    updateDisplayVisibility();
}


// --- ページの読み込みが完了したら、各条件項目にロジックを設定 ---
document.addEventListener('DOMContentLoaded', () => {
    // 全ての条件項目要素を取得
    const conditionItems = document.querySelectorAll('.condition-item'); // 共通クラス

    // 各条件項目に対して setupConditionItem 関数を呼び出す
    conditionItems.forEach(item => {
        setupConditionItem(item);
    });

     // TODO: 全ての条件項目から生成されたクエリ構文全体を組み立てるロジックを呼び出す
     // generateFullQueryString();
});


// TODO: 他の条件のUIやロジック、フィルタ一覧表示、インポート/エクスポートなどを実装