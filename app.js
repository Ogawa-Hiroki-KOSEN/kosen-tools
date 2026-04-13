$(document).ready(function () {
    let timetableData = {}; // JSONから読み込んだデータを保持
    let currentSettings = null; // 現在の設定情報を保持
    let currentMode = 'today'; // 'today' or 'weekly'

    // 時間割の時限の設定（一般的な高専の90分授業・休憩時間例）
    const periods = [
        { id: 1, start: '08:50', end: '10:20' },
        { id: 2, start: '10:30', end: '12:00' },
        { id: 3, start: '12:50', end: '14:20' },
        { id: 4, start: '14:30', end: '16:00' }
    ];

    // 1. JSONデータの読み込み
    $.getJSON('timetable.json', function (data) {
        timetableData = data;
        const classes = Object.keys(timetableData);

        // selectの選択肢を生成
        classes.forEach(function (cls) {
            $('#main-class').append($('<option>').val(cls).text(cls));
            $('.sub-class').append($('<option>').val(cls).text(cls));
        });

        // 2. 保存されている設定の読み込み
        loadSettings();
    }).fail(function () {
        alert("時間割データの読み込みに失敗しました。JSONファイルやサーバー環境を確認してください。");
    });

    // --- モーダルの開閉処理 ---
    $('#menu-btn').on('click', function () {
        $('#settings-modal').fadeIn(200);
    });

    $('#close-modal').on('click', function () {
        $('#settings-modal').fadeOut(200);
    });

    $(window).on('click', function (event) {
        if ($(event.target).is('#settings-modal')) {
            $('#settings-modal').fadeOut(200);
        }
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
            if (val && val !== mainClass && !subClasses.includes(val)) {
                subClasses.push(val);
            }
        });

        currentSettings = { main: mainClass, subs: subClasses };
        localStorage.setItem('kosenTimetableSettings', JSON.stringify(currentSettings));

        applyCurrentMode();
        $('#save-msg').fadeIn().delay(800).fadeOut(function () {
            $('#settings-modal').fadeOut(200);
        });
    });

    // --- 表示モード切り替え処理 ---
    $('#btn-today-view').on('click', function () {
        if (currentMode !== 'today') {
            currentMode = 'today';
            $('.toggle-btn').removeClass('active');
            $(this).addClass('active');
            applyCurrentMode();
        }
    });

    $('#btn-weekly-view').on('click', function () {
        if (currentMode !== 'weekly') {
            currentMode = 'weekly';
            $('.toggle-btn').removeClass('active');
            $(this).addClass('active');
            applyCurrentMode();
        }
    });

    // --- タブ切り替え処理 (週間表示用) ---
    $('#class-tabs').on('click', 'li', function () {
        $('#class-tabs li').removeClass('active');
        $(this).addClass('active');

        const targetClass = $(this).data('class');
        drawWeeklyTable(targetClass);
    });

    function loadSettings() {
        const saved = localStorage.getItem('kosenTimetableSettings');
        if (saved) {
            currentSettings = JSON.parse(saved);
            $('#main-class').val(currentSettings.main);
            $('.sub-class').each(function (index) {
                if (currentSettings.subs[index]) {
                    $(this).val(currentSettings.subs[index]);
                } else {
                    $(this).val("");
                }
            });
            applyCurrentMode();
        } else {
            $('#settings-modal').fadeIn(200);
        }
    }

    function applyCurrentMode() {
        if (!currentSettings) return;
        $('#view-toggle').show();

        if (currentMode === 'today') {
            renderTodayView(currentSettings);
        } else {
            renderWeeklyView(currentSettings);
        }
    }

    // --- 時間割セルの作成ヘルパー (教室情報などのFold対応) ---
    function createSubjectCell(subjectData) {
        if (!subjectData) return '---';

        // 過去の互換性のために、単なる文字列（"数学"など）の場合はそのまま返す
        if (typeof subjectData === 'string') {
            return `<div class="subject-name">${subjectData}</div>`;
        }

        // オブジェクトとして定義されている場合
        const name = subjectData.name || '---';
        const room = subjectData.room ? `<div class="detail-item">📍 ${subjectData.room}</div>` : '';
        const items = subjectData.items ? `<div class="detail-item">🎒 ${subjectData.items}</div>` : '';

        // 持ち物や場所の設定がない場合は名前だけ返す
        if (!room && !items) {
            return `<div class="subject-name">${name}</div>`;
        }

        // Fold（detailsタグ）機能をつけて返す
        return `
            <div class="subject-name">${name}</div>
            <details class="subject-details">
                <summary>詳細・持ち物</summary>
                <div class="details-content">
                    ${room}
                    ${items}
                </div>
            </details>
        `;
    }

    // --- 現在受けている授業の時限を判定するヘルパー ---
    function getCurrentStatus() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const timeStr = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);

        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            // もし授業時間内なら
            if (timeStr >= p.start && timeStr <= p.end) {
                return i; // 0-indexed (4コマなら0〜3)
            }
        }
        return -1; // 授業時間外
    }

    // --- 本日の時間割描画 ---
    function renderTodayView(settings) {
        $('#timetable-section').hide();
        $('#today-section').show();

        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayMapJa = ['日', '月', '火', '水', '木', '金', '土'];
        const dInfo = new Date().getDay();
        const todayStr = dayMap[dInfo];
        const todayJa = dayMapJa[dInfo];

        $('#today-title').text('本日の時間割 (' + todayJa + '曜日)');

        // 休日判定
        if (todayStr === 'sun' || todayStr === 'sat') {
            $('.table-container').hide();
            $('#today-no-class-msg').show();
            return;
        } else {
            $('.table-container').show();
            $('#today-no-class-msg').hide();
        }

        const allClassesToView = [settings.main].concat(settings.subs);

        // ヘッダー作成
        const $headerRow = $('#today-header-row');
        $headerRow.empty();
        $headerRow.append($('<th>').text('時限'));
        allClassesToView.forEach(function (cls, idx) {
            $headerRow.append($('<th>').text(cls + (idx === 0 ? '(メイン)' : '')));
        });

        // ボディ作成
        const $tbody = $('#today-body');
        $tbody.empty();
        const currentPeriodIdx = getCurrentStatus();

        for (let i = 0; i < periods.length; i++) {
            const $tr = $('<tr>');

            // 現在の授業時間をハイライト
            if (i === currentPeriodIdx) {
                $tr.addClass('highlight-row');
            }

            // 時限セル + 時間を小さく表示
            const periodText = (i + 1) + '限\n<span style="font-size:0.7em; color:#777; display:block;">'
                + periods[i].start + '-' + periods[i].end + '</span>';
            $tr.append($('<th>').html(periodText));

            // 各クラスの科目を並べる
            allClassesToView.forEach(function (cls) {
                const data = timetableData[cls];
                const subjectData = (data && data[todayStr] && data[todayStr][i]) ? data[todayStr][i] : null;
                $tr.append($('<td>').html(createSubjectCell(subjectData)));
            });

            $tbody.append($tr);
        }
    }

    // --- 週間一覧描画 ---
    function renderWeeklyView(settings) {
        $('#today-section').hide();
        $('#timetable-section').show();

        const $tabs = $('#class-tabs');
        $tabs.empty();

        const allClassesToView = [settings.main].concat(settings.subs);

        allClassesToView.forEach(function (cls, index) {
            const $li = $('<li>')
                .text(cls + (index === 0 ? ' (メイン)' : ''))
                .data('class', cls);

            if (index === 0) $li.addClass('active');
            $tabs.append($li);
        });

        drawWeeklyTable(settings.main);
    }

    function drawWeeklyTable(targetClass) {
        const $tbody = $('#timetable tbody');
        $tbody.empty();

        const data = timetableData[targetClass];
        if (!data) return;

        const maxPeriods = periods.length;
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];

        for (let i = 0; i < maxPeriods; i++) {
            const $tr = $('<tr>');
            $tr.append($('<th>').text((i + 1) + '限'));
            days.forEach(function (day) {
                const subjectData = data[day] && data[day][i] ? data[day][i] : null;
                $tr.append($('<td>').html(createSubjectCell(subjectData)));
            });
            $tbody.append($tr);
        }
    }
});
