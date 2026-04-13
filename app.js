$(document).ready(function () {
    let timetableData = {}; // JSONから読み込んだデータを保持

    // 1. JSONデータの読み込み
    $.getJSON('timetable.json', function (data) {
        timetableData = data;
        const classes = Object.keys(timetableData);

        // selectの選択肢を生成
        classes.forEach(function (cls) {
            $('#main-class').append($('<option>').val(cls).text(cls));
            $('.sub-class').append($('<option>').val(cls).text(cls));
        });

        // 2. 保存されている設定の読み込み (localStorage)
        loadSettings();
    }).fail(function () {
        alert("時間割データの読み込みに失敗しました。JSONファイルやサーバー環境を確認してください。");
    });

    // --- 設定の保存処理 ---
    $('#save-settings').on('click', function () {
        const mainClass = $('#main-class').val();

        if (!mainClass) {
            alert("マイクラス(メイン)を選択してください。");
            return;
        }

        const subClasses = [];
        $('.sub-class').each(function () {
            const val = $(this).val();
            // 重複と空文字を除外
            if (val && val !== mainClass && !subClasses.includes(val)) {
                subClasses.push(val);
            }
        });

        // localStorageに保存（ブラウザを閉じても消えない）
        const settings = {
            main: mainClass,
            subs: subClasses
        };
        localStorage.setItem('kosenTimetableSettings', JSON.stringify(settings));

        // 保存完了メッセージ
        $('#save-msg').fadeIn().delay(1500).fadeOut();

        // 画面を更新
        renderTimetable(settings);
    });

    // --- タブ切り替え処理 (イベント委譲) ---
    $('#class-tabs').on('click', 'li', function () {
        // 見た目の切り替え
        $('#class-tabs li').removeClass('active');
        $(this).addClass('active');

        // クリックしたクラスの時間割を描画
        const targetClass = $(this).data('class');
        drawTable(targetClass);
    });

    // --- ローカルストレージからの読み込み ---
    function loadSettings() {
        const saved = localStorage.getItem('kosenTimetableSettings');
        if (saved) {
            const settings = JSON.parse(saved);

            // セレクトボックスの復元
            $('#main-class').val(settings.main);
            $('.sub-class').each(function (index) {
                if (settings.subs[index]) {
                    $(this).val(settings.subs[index]);
                } else {
                    $(this).val("");
                }
            });

            // 時間割エリアを表示
            renderTimetable(settings);
        }
    }

    // --- 時間割UI（タブ＋表）の準備 ---
    function renderTimetable(settings) {
        $('#timetable-section').show();
        const $tabs = $('#class-tabs');
        $tabs.empty();

        const allClassesToView = [settings.main].concat(settings.subs);

        // タブの生成
        allClassesToView.forEach(function (cls, index) {
            const $li = $('<li>')
                .text(cls + (index === 0 ? ' (メイン)' : ''))
                .data('class', cls);

            if (index === 0) {
                $li.addClass('active');
            }
            $tabs.append($li);
        });

        // 最初にメインクラスの時間割を描画
        drawTable(settings.main);
    }

    // --- 実際のテーブル描画処理 ---
    function drawTable(targetClass) {
        const $tbody = $('#timetable tbody');
        $tbody.empty();

        const data = timetableData[targetClass];
        if (!data) return;

        // 高専は通常4コマ(90分)を想定。JSONの配列の長さに合わせて行を作る
        const maxPeriods = 4;
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];

        for (let i = 0; i < maxPeriods; i++) {
            const $tr = $('<tr>');
            // 時限セル
            $tr.append($('<th>').text((i + 1) + '限'));

            // 月〜金の授業を挿入
            days.forEach(function (day) {
                const subject = data[day] && data[day][i] ? data[day][i] : '';
                $tr.append($('<td>').text(subject));
            });

            $tbody.append($tr);
        }
    }
});