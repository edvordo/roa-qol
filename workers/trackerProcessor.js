importScripts('https://beta.avabur.com/js/moment.js', 'https://beta.avabur.com/js/moment-timezone-with-data.js');
let generalFormat = 'Do MMM';
let captionFormat = 'Do MMM HH:mm';
let GTZ = 'America/New_York';
onmessage = event => {
    let d = event.data;

    if (typeof d !== 'object') {
        return false;
    }

    function dailyAverages (data, item) {
        let keys = Object.keys(data);
        if (0 === keys.length) {
            // ????
            return;
        }
        let stats = {d: {}};
        let firstTS = keys.shift();
        let lastTS = keys.pop();
        let currentValue = data[firstTS];
        let total = 0;
        for (let ts in data) {
            lastTS = ts;
            let amount = data[ts] - currentValue;
            if (amount < 0) {
                amount = 0;
            }
            total += amount;
            currentValue = data[ts];
            let dt = moment.tz(ts, GTZ);

            let dayKey = dt.format(generalFormat);
            if (!stats.d.hasOwnProperty(dayKey)) {
                stats.d[dayKey] = {t: 0, l: []};
            }
            stats.d[dayKey].t += amount;
            stats.d[dayKey].l.push(amount);
        }

        let summary = moment.tz(firstTS, GTZ).format(captionFormat);
        if (lastTS) {
            summary += ' - ' + moment.tz(lastTS, GTZ).format(captionFormat);
        } else {
            summary += ' - now';
        }

        postMessage({a: 'statsSummary', d: summary, i: item});

        let caption = total / ((moment.tz(lastTS, GTZ).valueOf() - moment.tz(firstTS, GTZ).valueOf()) / (60 * 60 * 24 * 1000));
        postMessage({a: 'statsCaption', d: caption, i: item});

        let dataTable = [];
        for (let stamp in stats.d) {
            if (stats.d.hasOwnProperty(stamp)) {
                dataTable.push([
                    stamp,
                    stats.d[stamp].t,
                    stats.d[stamp].t / 24,
                ]);
            }
        }
        postMessage({a: 'dataTableDailyData', d: dataTable, i: item});
    }

    switch (d.a) {
        case 'setFormat':
            generalFormat = d.f;
            break;

        case 'setGTZ':
            GTZ = d.gtz;
            break;

        case 'processItem':
            /*
                d.d   - tracker item data
                d.i   - item name
                d.gtz - GAME_TIME_ZONE
                d.mc  - moment compare to (twoWeeksAgo)
             */
            let graphData = [];
            let allData = [];
            for (let timestamp in d.d) {
                if (!d.d.hasOwnProperty(timestamp)) {
                    continue;
                }
                let rts = moment.tz(timestamp, GTZ);
                if (rts.format('YYYY-MM-DD HH:mm:ss') < d.mc) {
                    delete d.d[timestamp];
                    continue;
                }
                graphData.push([
                    rts.toDate(),
                    d.d[timestamp],
                ]);
                allData.push([
                    rts.format(generalFormat),
                    d.d[timestamp],
                ]);
            }
            postMessage({a: 'graphData', i: d.i, d: d.d, gd: graphData});
            postMessage({a: 'dataTableData', i: d.i, dtd: allData});
            dailyAverages(d.d, d.i);
            break;

        case 'trackerCleanup':
            for (let timestamp in d.d) {
                if (!d.d.hasOwnProperty(timestamp)) {
                    continue;
                }
                let rts = moment.tz(timestamp, GTZ);
                if (rts.format('YYYY-MM-DD HH:mm:ss') < d.mc) {
                    delete d.d[timestamp];
                    continue;
                }
                break;
            }
            postMessage({a: 'cleanData',i: d.i, d: d.d});
            break;
    }

};
