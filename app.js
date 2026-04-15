$(document).ready(function () {
    let timetableData = {};
    let currentSettings = null;
    let currentMode = 'today';
    const periods = [
        { id: 1, start: '08:50', end: '09:35' },
        { id: 2, start: '09:35', end: '10:20' },
        { id: 3, start: '10:30', end: '11:15' },
        { id: 4, start: '11:15', end: '12:00' },
        { id: 5, start: '12:50', end: '13:35' },
        { id: 6, start: '13:35', end: '14:20' },
        { id: 7, start: '14:30', end: '15:15' },
        { id: 8, start: '15:15', end: '16:00' }
    ];
    $.getJSON('timetable.json', function (data) {
        timetableData = data;
        const classes = Object.keys(timetableData);
        classes.forEach(function (cls) {
            $('#main-class').append($('<option>').val(cls).text(cls));
            $('.sub-class').append($('<option>').val(cls).text(cls));
        });
        loadSettings();
    }).fail(function () {
        alert("時間割データの読み込みに失敗しました。JSONファイルやサーバー環境を確認してください。");
    });
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
    function createSubjectCell(subjectData) {
        if (!subjectData) return '---';
        if (typeof subjectData === 'string') {
            return `<div class="subject-name">${subjectData}</div>`;
        }
        const name = subjectData.name || '---';
        const room = subjectData.room ? `<div class="detail-item">📍 ${subjectData.room}</div>` : '';
        const items = subjectData.items ? `<div class="detail-item">🎒 ${subjectData.items}</div>` : '';
        if (!room && !items) {
            return `<div class="subject-name">${name}</div>`;
        }
        return `
            <div class="subject-name">${name}</div>
            <details class="subject-details">
                <summary>詳細/持物</summary>
                <div class="details-content">
                    ${room}
                    ${items}
                </div>
            </details>
        `;
    }
    function getCurrentStatus() {
        const now = new Date();
        const h = now.getHours();
        const m = now.getMinutes();
        const timeStr = (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);

        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            if (timeStr >= p.start && timeStr <= p.end) {
                return i;
            }
        }
        return -1;
    }
    function renderTodayView(settings) {
        $('#timetable-section').hide();
        $('#today-section').show();

        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayMapJa = ['日', '月', '火', '水', '木', '金', '土'];
        const dInfo = new Date().getDay();
        const todayStr = dayMap[dInfo];
        const todayJa = dayMapJa[dInfo];

        $('#today-title').text('本日の時間割 (' + todayJa + '曜日)');
        if (todayStr === 'sun' || todayStr === 'sat') {
            $('.table-container').hide();
            $('#today-no-class-msg').show();
            return;
        } else {
            $('.table-container').show();
            $('#today-no-class-msg').hide();
        }

        const allClassesToView = [settings.main].concat(settings.subs);
        const $headerRow = $('#today-header-row');
        $headerRow.empty();
        $headerRow.append($('<th>').text('時限'));
        allClassesToView.forEach(function (cls, idx) {
            $headerRow.append($('<th>').text(cls + (idx === 0 ? '(メイン)' : '')));
        });
        const $tbody = $('#today-body');
        $tbody.empty();
        const currentPeriodIdx = getCurrentStatus();

        for (let i = 0; i < periods.length; i++) {
            const $tr = $('<tr>');
            if (i === currentPeriodIdx) {
                $tr.addClass('highlight-row');
            }
            const periodText = (i + 1) + '限\n<span style="font-size:0.7em; color:#777; display:block;">'
                + periods[i].start + '-' + periods[i].end + '</span>';
            $tr.append($('<th>').html(periodText));
            allClassesToView.forEach(function (cls) {
                const data = timetableData[cls];
                const item = (data && data[todayStr]) ? data[todayStr][Math.floor(i / 2)] : null;
                const isHalf = Array.isArray(item);

                if (i % 2 === 0) {
                    const subjectData = isHalf ? item[0] : item;
                    const $td = $('<td>').html(createSubjectCell(subjectData));
                    if (!isHalf) {
                        $td.attr('rowspan', 2);
                    }
                    $tr.append($td);
                } else {
                    if (isHalf) {
                        const subjectData = item[1];
                        const $td = $('<td>').html(createSubjectCell(subjectData));
                        $tr.append($td);
                    }
                }
            });

            $tbody.append($tr);
        }
    }
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
                const item = (data[day]) ? data[day][Math.floor(i / 2)] : null;
                const isHalf = Array.isArray(item);

                if (i % 2 === 0) {
                    const subjectData = isHalf ? item[0] : item;
                    const $td = $('<td>').html(createSubjectCell(subjectData));
                    if (!isHalf) {
                        $td.attr('rowspan', 2);
                    }
                    $tr.append($td);
                } else {
                    if (isHalf) {
                        const subjectData = item[1];
                        const $td = $('<td>').html(createSubjectCell(subjectData));
                        $tr.append($td);
                    }
                }
            });
            $tbody.append($tr);
        }
    }
});
