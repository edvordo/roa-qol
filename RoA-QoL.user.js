// ==UserScript==
// @name         RoA-QoL
// @namespace    Reltorakii_is_awesome
// @version      1.0.6-beta-2
// @description  try to take over the world!
// @author       Reltorakii
// @match        http*://*.avabur.com/game*
// @resource     DygraphCSS        https://cdnjs.cloudflare.com/ajax/libs/dygraph/2.1.0/dygraph.min.css
// @resource     ChartistCSS        https://cdn.rawgit.com/gionkunz/chartist-js/v0.11.0/dist/chartist.min.css
// @resource     ChartistTTipCSS    https://cdn.rawgit.com/tmmdata/chartist-plugin-tooltip/v0.0.18/dist/chartist-plugin-tooltip.css
// @require      https://cdn.rawgit.com/omichelsen/compare-versions/v3.1.0/index.js
// @require      https://rawgit.com/ejci/favico.js/master/favico.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/dygraph/2.1.0/dygraph.min.js
// @require      https://cdn.rawgit.com/gionkunz/chartist-js/v0.11.0/dist/chartist.min.js
// @require      https://cdn.rawgit.com/tmmdata/chartist-plugin-tooltip/v0.0.18/dist/chartist-plugin-tooltip.min.js
// @downloadURL  https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @updateURL    https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

(function (window, $) {

    function log (message) {
        console.log(`[${moment().format('MMM Do Y HH:mm:ss')}] [RoA-QoL (v${GM_info.script.version})] ${message}`);
    }

    let QoL = (function QoL () {
        let house = {
            rooms: {},
            roomNameMap: {},
        };

        let trackerSaveKey = 'QoLTracker';
        let tracker = {
            platinum: {},
            gold: {},
            mats: {},
            frags: {},
            food: {},
            wood: {},
            iron: {},
            stone: {},
            strength: {},
            health: {},
            coordination: {},
            agility: {},
        };

        let gameTimeZone = 'America/New_York';

        let FI;

        const INTERNAL_UPDATE_URI = 'https://api.github.com/repos/edvordo/roa-qol/contents/RoA-QoL.user.js';

        let username;

        let gems = {};

        // let platObserver, goldObserver, matsObserver, fragsObeserver;

        let chatDirection = 'up';

        let chartsContentTmpl = '';
        let chartsTabsTmpl = '';

        let trackedStuff = ['Platinum', 'Gold', 'Mats', 'Frags', 'Food', 'Wood', 'Iron', 'Stone'];
        let trackedStuffDD = ['Strength', 'Health', 'Coordination', 'Agility'];
        let trackedStuffLC = trackedStuff.map(i => i.toLowerCase());
        let trackedStuffDDLC = trackedStuffDD.map(i => i.toLowerCase());

        for (let resName of trackedStuff.concat(trackedStuffDD)) {
            if (trackedStuffDD.indexOf(resName) === -1) {
                chartsTabsTmpl += `<li class="${resName === 'Platinum' ? 'active' : ''}">
    <a href="#RQ-hub-${resName.toLowerCase()}-chart-tab" data-resname="${resName.toLowerCase()}">${resName}</a>
</li>`;
            }
            chartsContentTmpl += `
    <div class="tab-pane ${resName === 'Platinum' ? 'active' : ''}" id="RQ-hub-${resName.toLowerCase()}-chart-tab">
        <h3 class="text-center">${resName} gains</h3>
        <div class="text-center" iD="RQ-hub-chart-${resName.toLowerCase()}-subtitle"></div>
        <div id="RQ-hub-chart-${resName.toLowerCase()}" style="width:100%;height:300px;"></div>
        <table id="RQ-hub-stats-${resName.toLowerCase()}" class="table table-condensed">
            <caption class="text-center"></caption>
            <thead>
                <tr>
                    <th>Date</th>
                    <th class="text-right">Total</th>
                    <th class="text-right">${resName} / h</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colspan="3"><em>No available data</em></td>
                </tr>
            </tbody>
        </table>
    </div>`;
        }

        chartsTabsTmpl += `<li class="dropdown">
    <a href="#" data-toggle="dropdown">Base Stats <span class="caret"></span></a>
        <ul class="dropdown-menu">`;
        for (let resName of trackedStuffDD) {

            chartsTabsTmpl += `<li class="">
    <a href="#RQ-hub-${resName.toLowerCase()}-chart-tab" data-resname="${resName.toLowerCase()}">${resName}</a>
</li>`;
        }
        chartsTabsTmpl += `</ul></li>`

        let headerHTML = `
            <table id="QoLStats">
                <tbody>
                <tr>
                    <td class="left">XP / h:</td>
                    <td class="right" id="XPPerHour" data-toggle="tooltip" title="0" style="color:#FF7;"></td>
                </tr>
                <tr class="hidden rq-h rq-battle">
                    <td class="left">Clan XP / h:</td>
                    <td class="right" id="BattleClanXPPerHour" data-toggle="tooltip" title="0" style="color:#FF7;"></td>
                </tr>
                <tr class="hidden rq-h rq-battle">
                    <td class="left">Gold / h:</td>
                    <td class="right" id="BattleGoldPerHour" data-toggle="tooltip" title="0"
                        style="color:#FFD700;"></td>
                </tr>
                <tr class="hidden rq-h rq-battle">
                    <td class="left">Clan Gold / h:</td>
                    <td class="right" id="BattleClanGoldPerHour" data-toggle="tooltip" title="0"
                        style="color:#FFD700;"></td>
                </tr>
                <tr class="hidden rq-h rq-harvest">
                    <td class="left">Res / h:</td>
                    <td class="right" id="TSResourcesPerHour" data-toggle="tooltip" title="0"></td>
                </tr>
                <tr class="hidden rq-h rq-harvest">
                    <td class="left">Clan Res / h:</td>
                    <td class="right" id="TSClanResourcesPerHour" data-toggle="tooltip" title="0"></td>
                </tr>
                <tr>
                    <td class="left">ETA to level:</td>
                    <td class="right" id="LevelETA" data-toggle="tooltip" title="0"></td>
                </tr>
                <tr>
                    <td colspan="2" align="center">
                        <a href="javascript:void(0)" class="topLink" id="RoA-QoL-open-hub">RoA-QoL Hub</a>
                    </td>
                </tr>
                </tbody>
            </table>`;

        let hubHTML = `<div id="RQ-hub-wrapper" style="display:none">
    <div class="btn-group">
        <button type="button" class="btn btn-primary" id="RQ-hub-charts">Charts</button>
    </div>
    <hr>
    <div id="RQ-hub-sections">
        <div id="RQ-hub-charts-wrapper" style="display: none;">
            <ul class="nav nav-tabs" id="RQ-hub-charts-tabs">${chartsTabsTmpl}</ul>
            <div class="tab-content">${chartsContentTmpl}</div>
        </div>
    </div>
</div>`;

        let QoLStats = {
            e: {},
            d: {},
            s: new Date(),
            b: 0,
            h: 0,
            ct: 0,
            na: 0,
            PlXPReq: 0,
            FoodXPReq: 0,
            WoodXPReq: 0,
            IronXPReq: 0,
            StoneXPReq: 0,
            CrftXPReq: 0,
            CarvXPReq: 0,
        };
        // curtesy of http://stackoverflow.com/a/18234317
        String.prototype.formatQoL = String.prototype.formatQoL || function () {
            let str = this.toString();
            if (arguments.length) {
                let t = typeof arguments[0];
                let key;
                let args = ('string' === t || 'number' === t) ?
                    Array.prototype.slice.call(arguments)
                    : arguments[0];

                for (key in args) {
                    str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key]);
                }
            }

            return str;
        };

        Number.prototype.toTimeEstimate = function () {
            let _minute = 1000 * 60;
            let _hour = _minute * 60;
            let _day = _hour * 24;
            let _month = _day * 30;

            let estimate = '~';
            let num = this.valueOf();

            let months = Math.floor(num / _month);
            num = num % _month;

            let days = Math.floor(num / _day);
            num = num % _day;

            let hours = Math.floor(num / _hour);
            num = num % _hour;

            let minutes = Math.floor(num / _minute);

            if (months > 0) {
                estimate += `${months}mon, ${days}d`;
            } else if (days > 0) {
                estimate += `${days}d, ${hours}h`;
            } else if (hours > 0) {
                estimate += `${hours}h, ${minutes}min`;
            } else if (minutes > 5) {
                estimate += `${minutes} minutes`;
            } else {
                estimate = `~${num.toTimeRemaining()}`;
            }

            return estimate;
        };

        Number.prototype.toTimeRemaining = function () {
            // time in miliseconds, a.k.a. Date.now()
            let value = this.valueOf() / 1000;

            let seconds = Math.floor(value) % 60;
            let minutes = Math.floor(value / 60) % 60;
            let hours = Math.floor(value / 60 / 60) % 60;

            let result = [];
            if (hours > 0) result.push(`${hours}h`);
            if (minutes > 0) result.push(`${minutes}m`);
            result.push(`${seconds}s`);

            return result.join(' ');
        };

        Number.prototype.abbr = function () {
            let value = this.valueOf();

            let markers = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'S', 'O', 'N', 'Dd'];

            let index = 0;
            while (value >= 1000) {
                index++;
                value /= 1000;
            }

            return `${Math.floor(value * 10) / 10}${markers[index]}`;
        };

        function scrollToBottom (selector) {
            $(selector).animate({
                scrollTop: $(selector).prop('scrollHeight'),
            });
        }

        function __checkForUpdate () {
            let version = '';

            fetch(INTERNAL_UPDATE_URI)
                .then(response => response.json())
                .then(data => {
                    let match = atob(data.content).match(/\/\/\s+@version\s+([^\n]+)/);
                    version = match[1];

                    if (compareVersions(GM_info.script.version, version) < 0) {
                        let message = `<li>[${moment.tz(gameTimeZone).format('HH:mm:ss')}] <span class="chat_notification">RoA-QoL has been updated to version ${version}! <a href="https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js" target="_blank">Update</a> | <a href="https://github.com/edvordo/roa-qol/commits/master" target="_blank">CommitLog</a></span></li>`;
                        if (chatDirection === 'up') {
                            $('#chatMessageList').prepend(message);
                        } else {
                            $('#chatMessageList').append(message);
                            scrollToBottom('#chatMessageListWrapper');
                        }
                    } else {
                        checkForUpdateTimer = setTimeout(__checkForUpdate, 24 * 60 * 60 * 1000);
                    }
                });
        }

        function __setup () {
            log('Starting setup');
            $('<style>').attr('id', 'RoA-QoL-styles').append(`
        .houseLabel{
            display: block;
            text-decoration:
            none !important;
        }
        div#chatMessageWrapper:before {
            content: attr(data-limiter);
            font-size: 10px;
            position: absolute;
            top: -8px;
            z-index: 1;
            background: var(--btn-background-color);
            border: 1px solid var(--border-color);
            right: 110px;
        }
        .ct-label {
            color: #d2d2d2;
        }
        .ct-series-a .ct-line {
            stroke-width: 2px;
            stroke: var(--action-color);
        }
        .ct-series-a .ct-point {
            stroke: var(--action-color);
            stroke-width: 4px;
            stroke-linecap: square;
        }
        table#QoLStats tbody tr td:first-child {
            white-space: nowrap;
            overflow: hidden;
        }
        ul#RQ-hub-charts-tabs a {
            text-decoration: none;
        }
        ul#RQ-hub-charts-tabs li.active a, ul#RQ-hub-charts-tabs li a:hover {
            background: var(--btn-background-color);
            color: #fff;
        }
        div#RQ-hub-wrapper div.tab-pane.active {
            color: #fff;
        }
        .dygraph-legend {
            background: var(--btn-background-color);
        }
        .dygraph-legend > span {
            display: block;
        }
        .dygraph-axis-label {
            color: #fff;
        }
        `).appendTo('body');
            $('<td>').append(headerHTML)
                .addClass('col-xs-2 hidden-xs hidden-sm')
                .appendTo('#allThemTables > tbody > tr');
            $('#QoLStats [id]').each(function (i, e) {
                e = $(e);
                QoLStats.e[e.attr('id')] = e;
                QoLStats.d[e.attr('id')] = 0;
            });
            $('#modalContent').append(hubHTML);
            $('#RQ-hub-wrapper .dropdown-toggle').dropdown()
            QoLStats.d.BattleXPPerHour = 0;
            QoLStats.d.TSXPPerHour = 0;
            QoLStats.d.CTXPPerHour = 0;

            __loadHouseInfo();
            __loadTracker();
            setTimeout(__checkForUpdate, 5E3);

            FI = new Favico({animation: 'none'});
            FI.badge(0);

            $('#XPPerHour, #BattleClanXPPerHour, #BattleGoldPerHour, #BattleClanGoldPerHour, #TSResourcesPerHour, #TSClanResourcesPerHour')
                .tooltip({placement: 'auto left', container: 'body', html: true});
            $('#chatMessageWrapper').attr('data-limiter', '0 / 400');
            username = $('#username').text();
            GM_addStyle(GM_getResourceText('DygraphCSS'));
            GM_addStyle(GM_getResourceText('ChartistCSS'));
            GM_addStyle(GM_getResourceText('ChartistTTipCSS'));
        }

        function __saveHouseInfo () {
            sessionStorage.setItem('RoAHouse', JSON.stringify(house));
        }

        function __loadHouseInfo () {
            log('Loading house info');
            let houseInfo = sessionStorage.getItem('RoAHouse');
            if (houseInfo) {
                house = JSON.parse(houseInfo);
                //placeholder for changes to this object
                __saveHouseInfo();
            }
        }

        function __updateRooms (roomList) {
            for (let room of roomList) {
                if (!house.rooms.hasOwnProperty(room.room_type)) {
                    house.rooms[room.room_type] = {
                        items: {},
                    };
                }
                house.roomNameMap[room.room_type] = room.name;
            }
        }

        function __updateHouseRoom (roomType, items) {
            for (let item of items) {
                house.rooms[roomType].items[item.item_type] = item;
                setTimeout(__setRoomItemTooltip, 500, roomType, item.item_type, item);
            }
        }

        function __setRoomItemTooltip (roomType, itemType, data) {
            let tooltip = `<h5>Level upgrade</h5>
        <a class="houseLabel">Cost</a>
            <div>${data.level_upgrade_cost}</div>
            <a class="houseLabel">Time</a>
            <div>${data.level_upgrade_time}</div>`;
            $(`a[data-roomtype="${roomType}"][data-itemtype="${itemType}"]`).tooltip({
                placement: 'auto left',
                html: true,
                container: 'body',
                title: tooltip,
            });
        }

        function _handleHouseData (type, data) {
            if (type === 'house') {
                __updateRooms(data.rooms);
            } else if (type === 'room') {
                __updateHouseRoom(data.room.room_type, data.room.items);
            }
            __saveHouseInfo();
        }

        function __toggleBattle () {
            // log('Switching to battle');
            $('.rq-h').addClass('hidden');
            $('.rq-h.rq-battle').removeClass('hidden');
        }

        function __toggleTS () {
            // log('Switching to TS');
            $('.rq-h').addClass('hidden');
            $('.rq-h.rq-harvest').removeClass('hidden');
        }

        function __toggleCT () {
            // log('Switching to TS');
            $('.rq-h').addClass('hidden');
            // $('.rq-h.rq-harvest').removeClass('hidden');
        }

        function __updateFavico (to) {
            let color = to > 0 ? '#050' : '#a00';
            FI.badge(Math.abs(to), {bgColor: color});
        }

        function __updateStats (type, data) {
            let now = new Date();
            let hour = 60 * 60 * 1000;
            let tmpl = '<h5>Based upon</h5>{total} {label} over {count} {type} since {since}<h5>Would be gain / h</h5>{wannabe} / h';
            let map = {};
            let count = 0;
            if (type === 'battle') {
                map = {
                    XPPerHour: {d: 'BattleXPPerHour', l: 'XP', c: data.xp},
                    BattleGoldPerHour: {d: '', l: 'Gold', c: data.g},
                    BattleClanXPPerHour: {d: '', l: 'XP', c: data.cxp},
                    BattleClanGoldPerHour: {d: '', l: 'Gold', c: data.cg},
                };
                count = QoLStats.b;
            } else if (type === 'TS') {
                map = {
                    XPPerHour: {d: 'TSXPPerHour', l: 'XP', c: data.xp},
                    TSResourcesPerHour: {d: '', l: 'Resources', c: data.a},
                    TSClanResourcesPerHour: {d: '', l: 'Resources', c: data.ca},
                };
                count = QoLStats.h;
            } else if (type === 'Crafting') {
                map = {
                    XPPerHour: {d: 'CTXPPerHour', l: 'XP', c: data.xp},
                };
                count = QoLStats.ct;
            }
            // console.log(map);
            for (let e in map) {
                let ed = map[e].d !== '' ? map[e].d : e;

                //"<h5>Based upon</h5>" + commatize(Math.floor(startXP))+" XP over "+battles+" battles since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*xp))+" / h"
                let obj = {
                    total: QoLStats.d[ed].format(),
                    label: map[e].l,
                    count: count.format(),
                    since: moment.tz(QoLStats.s, gameTimeZone).format('MMM Do Y HH:mm:ss'),
                    type: `${type} actions`,
                    wannabe: (Math.floor(hour / QoLStats.na * map[e].c)).format(),
                };

                QoLStats.e[e].text((QoLStats.d[ed] / (now - QoLStats.s) * hour).format())
                    .attr({'data-original-title': tmpl.formatQoL(obj)});
            }
        }

        function __battle (data) {
            __toggleBattle();
            QoLStats.b++;
            if (data.hasOwnProperty('b')) {
                QoLStats.d.BattleXPPerHour += data.b.xp;
                QoLStats.d.BattleGoldPerHour += data.b.g;
                QoLStats.d.BattleClanXPPerHour += data.b.hasOwnProperty('cxp') ? data.b.cxp : 0;
                QoLStats.d.BattleClanGoldPerHour += data.b.hasOwnProperty('cg') ? data.b.cg : 0;
                if (QoLStats.PlXPReq > 0 && data.b.r === 1) { // won
                    let eta;
                    if (data.b.xp === 0) {
                        eta = 'never';
                    } else {
                        eta = (QoLStats.PlXPReq - data.p.currentXP) / data.b.xp * data.p.next_action;
                        eta = eta.toTimeEstimate();
                    }
                    QoLStats.e.LevelETA.text(eta);
                }
            }
            QoLStats.na = data.p.next_action;

            __updateStats('battle', data.b);
            __updateFavico(data.p.autos_remaining);
        }

        function __TS (data) {
            __toggleTS();
            QoLStats.h++;
            if (data.hasOwnProperty('a')) {
                QoLStats.d.TSXPPerHour += data.a.xp;
                QoLStats.d.TSResourcesPerHour += data.a.hasOwnProperty('a') ? data.a.a : 0;
                QoLStats.d.TSClanResourcesPerHour += data.a.hasOwnProperty('ca') ? data.a.ca : 0;
                QoLStats.e.TSResourcesPerHour.removeClass('food wood iron stone').addClass(data.a.r);
                let token = data.a.r;
                token = token.charAt(0).toUpperCase() + token.substr(1) + 'XPReq';
                let skill = data.a.s;
                QoLStats[token] = data.p[skill].tnl;
                let eta;
                if (data.a.xp === 0) {
                    eta = 'never';
                } else {
                    eta = (QoLStats[token] - data.p[skill].xp) / data.a.xp * data.p.next_action;
                    eta = eta.toTimeEstimate();
                }
                QoLStats.e.LevelETA.text(eta);
            }
            QoLStats.na = data.p.next_action;
            __updateStats('TS', data.a);
            __updateFavico(data.p.autos_remaining);
        }

        function __CT (data) {
            __toggleCT();
            QoLStats.ct++;
            if (data.hasOwnProperty('a')) {
                QoLStats.d.CTXPPerHour += data.a.xp;
                let token = 'CTXPReq';
                QoLStats[token] = data.p['crafting'].tnl;
                let eta;
                if (data.a.xp === 0) {
                    eta = 'never';
                } else {
                    eta = (QoLStats[token] - data.p['crafting'].xp) / data.a.xp * data.p.next_action;
                    eta = eta.toTimeEstimate();
                }
                QoLStats.e.LevelETA.text(eta);
            }
            QoLStats.na = data.p.next_action;
            __updateStats('Crafting', data.a);
            __updateFavico(data.p.autos_remaining);
        }

        function __setupLevelRequirements (player) {
            log('Setup level reqs');
            QoLStats.PlXPReq = player.levelCost;
            QoLStats.FoodXPReq = player.fishing.tnl;
            QoLStats.WoodXPReq = player.woodcutting.tnl;
            QoLStats.IronXPReq = player.mining.tnl;
            QoLStats.StoneXPReq = player.stonecutting.tnl;
            QoLStats.CrftXPReq = player.crafting.tnl;
            QoLStats.CarvXPReq = player.carving.tnl;
        }

        function _proccessBattle (message) {
            if (message.hasOwnProperty('results')) {
                __battle(message.results);
            }
        }

        function _proccessTS (message) {
            if (message.hasOwnProperty('results')) {
                __TS(message.results);
            }
        }

        function _proccessCraft (message) {
            if (message.hasOwnProperty('results')) {
                __CT(message.results);
            }
        }

        function _proccessLI (data) {
            // dunno yet
            if (data.hasOwnProperty('p')) {
                __setupLevelRequirements(data.p);
                if (data.p.hasOwnProperty('chatScroll')) {
                    _setChatDirection(data.p.chatScroll);
                }
            }
        }

        function _updateMSGLimit (msgBox) {
            let lng = $(msgBox).text().replace(/\/(w [^\s]+ |r |re |me |m |h |c |t |a |wire.*)/i, '').length;
            $('#chatMessageWrapper').attr('data-limiter', `${lng} / 400`);
        }

        function __platObserver () {
            log('Starting plat observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.platinum[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.myplatinum'), {attributes: true, attributeOldValue: true});
        }

        function __goldObserver () {
            log('Starting gold observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.gold[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.mygold'), {attributes: true, attributeOldValue: true});
        }

        function __matsObserver () {
            log('Starting mats observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.mats[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.mycrafting_materials'), {attributes: true, attributeOldValue: true});
        }

        function __fragsObserver () {
            log('Starting fragsobserver');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.frags[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.mygem_fragments'), {attributes: true, attributeOldValue: true});
        }

        function __foodObserver () {
            log('Starting food observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.food[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.myfood'), {attributes: true, attributeOldValue: true});
        }

        function __woodObserver () {
            log('Starting wood observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.wood[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.mywood'), {attributes: true, attributeOldValue: true});
        }

        function __ironObserver () {
            log('Starting iron observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.iron[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.myiron'), {attributes: true, attributeOldValue: true});
        }

        function __stoneObserver () {
            log('Starting stone observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'title') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.stone[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td.mystone'), {attributes: true, attributeOldValue: true});
        }

        function __strengthObserver () {
            log('Starting stat strength observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'data-base') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.strength[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td#strength'), {attributes: true, attributeOldValue: true});
        }

        function __healthObserver () {
            log('Starting stat health observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'data-base') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.health[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td#health'), {attributes: true, attributeOldValue: true});
        }

        function __coordinationObserver () {
            log('Starting stat coordination observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'data-base') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.coordination[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td#coordination'), {attributes: true, attributeOldValue: true});
        }

        function __agilityObserver () {
            log('Starting stat agility observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type === 'attributes' && m.attributeName === 'data-base') {
                        let oldValue = m.oldValue;
                        let nowValue = m.target.getAttribute(m.attributeName);
                        if (oldValue && nowValue && oldValue !== nowValue) {
                            tracker.agility[(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                            __saveTracker();
                        }
                    }
                }
            });
            o.observe(document.querySelector('td#agility'), {attributes: true, attributeOldValue: true});
        }

        function __saveTracker () {
            localStorage.setItem(trackerSaveKey, JSON.stringify(tracker));
        }

        function __loadTracker () {
            log('Loading tracker');
            let _tracker = localStorage.getItem(trackerSaveKey);
            if (_tracker) {
                try {
                    _tracker = JSON.parse(_tracker);
                } catch (e) {
                    log(`Failure while loading tracker info "${e.message}"`);
                    _tracker = tracker;
                }
                tracker = _tracker;
                if (!tracker.hasOwnProperty('gold')) {
                    tracker['gold'] = {};
                }
                if (!tracker.hasOwnProperty('mats')) {
                    tracker['mats'] = {};
                }
                if (!tracker.hasOwnProperty('frags')) {
                    tracker['frags'] = {};
                }
                if (!tracker.hasOwnProperty('food')) {
                    tracker['food'] = {};
                }
                if (!tracker.hasOwnProperty('wood')) {
                    tracker['wood'] = {};
                }
                if (!tracker.hasOwnProperty('iron')) {
                    tracker['iron'] = {};
                }
                if (!tracker.hasOwnProperty('stone')) {
                    tracker['stone'] = {};
                }
                if (!tracker.hasOwnProperty('strength')) {
                    tracker['strength'] = {};
                }
                if (!tracker.hasOwnProperty('health')) {
                    tracker['health'] = {};
                }
                if (!tracker.hasOwnProperty('coordination')) {
                    tracker['coordination'] = {};
                }
                if (!tracker.hasOwnProperty('agility')) {
                    tracker['agility'] = {};
                }
                __saveTracker();
            }
            __platObserver();
            __goldObserver();
            __matsObserver();
            __fragsObserver();
            __foodObserver();
            __woodObserver();
            __ironObserver();
            __stoneObserver();
            __strengthObserver();
            __healthObserver();
            __coordinationObserver();
            __agilityObserver();
        }

        function __registerFameOwnGemTableObserver () {
            log('Starting gem list observer');
            let o = new MutationObserver(function (ml) {
                for (let m of ml) {
                    if (m.type !== 'childList' || m.addedNodes.length === 0) {
                        continue;
                    }
                    let rowLastTd = m.addedNodes[0].querySelector('td:last-child');
                    if (rowLastTd === null || rowLastTd.getAttributeNames().indexOf('data-gemid') === -1) {
                        continue;
                    }
                    let gemId = rowLastTd.getAttribute('data-gemid');
                    if (!gems.hasOwnProperty(gemId)) {
                        continue;
                    }
                    let gem = gems[gemId];
                    if (gem.o === username) {
                        continue;
                    }

                    let a = document.createElement('a');
                    a.textContent = '[Fame Own]';
                    a.setAttribute('data-gemid', gem.i);
                    a.setAttribute('class', 'RoAQoL-fameown-gem');
                    rowLastTd.appendChild(document.createTextNode(' '));
                    rowLastTd.appendChild(a);
                }
            });
            o.observe(document.querySelector('table#inventoryTable'), {childList: true});
            setTimeout(() => {
                log('Disconnecting gem list observer');
                o.disconnect();
                log('Reset Gems list');
                gems = {};
            }, 2E3);
        }

        function _fameOwnGems (_gems) {
            for (let gem of _gems) {
                gems[gem.i] = gem;
            }
            __registerFameOwnGemTableObserver();
        }

        function __hubToggleTo (div = null) {
            $('#RQ-hub-sections > div').hide();
            if (div !== null) {
                $(div).fadeIn();
            }
        }

        function _closeHub () {
            $('#RQ-hub-wrapper').hide();
            __hubToggleTo();
        }

        function __showChart (elem, name = '', data = []) {
            if (data.length) {
                new Dygraph(document.querySelector(elem), data, {
                    labels: ['Time', name],
                    axes: {
                        y: {
                            valueFormatter: val => val.format(),
                            axisLabelFormatter: val => val.abbr(),
                        },
                        x: {
                            valueFormatter: val => moment.tz(val, gameTimeZone).format('MMM Do HH:mm:ss'),
                        }
                    }
                });
            }
            // new Chartist.Line(elem, {
            //     series: [
            //         {
            //             name: name,
            //             data: data,
            //         },
            //     ],
            // }, {
            //     axisX: {
            //         type: Chartist.FixedScaleAxis,
            //         divisor: 10,
            //         labelInterpolationFnc: function (value) {
            //             return moment.tz(value, gameTimeZone).format('MMM Do HH:mm');
            //         },
            //     },
            //     axisY: {
            //         labelInterpolationFnc (value) {
            //             return value.abbr();
            //         },
            //     },
            //     lineSmooth: Chartist.Interpolation.simple(),
            //     // showPoint: false,
            //     low: 0,
            //     showArea: false,
            //     plugins: [
            //         Chartist.plugins.tooltip({
            //             tooltipFnc: function (meta, value) {
            //                 let [ts, res] = value.split(',');
            //                 return parseInt(res).format();
            //             },
            //         }),
            //     ],
            // });
        }

        function __showTrackerStats (section) {
            let stats = {d: {}};
            let data = tracker[section];
            let keys = Object.keys(data);
            if (keys.length === 0) {
                return;
            }
            let firstTS = keys.shift();
            let was = data[firstTS];
            let lastTS = firstTS;
            let totalRes = 0;
            for (let time in data) {
                lastTS = time;
                let resVal = data[time] - was;
                if (resVal < 0) {
                    resVal = 0;
                }
                totalRes += resVal;
                was = data[time];
                let dt = moment.tz(time, gameTimeZone);

                let dayKey = `${dt.format('MMM Do')}`;
                if (!stats.d.hasOwnProperty(dayKey)) {
                    stats.d[dayKey] = {t: 0, ph: 0};
                }
                stats.d[dayKey].t += resVal;
                stats.d[dayKey].ph = stats.d[dayKey].t / 24;
            }
            let summary = `${moment.tz(firstTS, gameTimeZone).format('MMM Do HH:mm')}`;
                summary += ` - `;
                summary += `${moment.tz(lastTS, gameTimeZone).format('MMM Do HH:mm')}`;
            document.querySelector(`#RQ-hub-chart-${section}-subtitle`).textContent = summary;

            let perDayStat = `~${(totalRes / ((moment(lastTS).valueOf() - moment(firstTS).valueOf()) / (60 * 60 * 24 * 1000))).format(3)} / day`;
            document.querySelector(`table#RQ-hub-stats-${section} > caption`).textContent = perDayStat;
            let resStatsTableBody = document.querySelector(`table#RQ-hub-stats-${section} > tbody`);
                resStatsTableBody.innerHTML = '';
            for (let date in stats.d) {
                let stat = stats.d[date];
                let tr = document.createElement('tr');

                let td;

                td = document.createElement('td');
                td.textContent = date;
                tr.appendChild(td);

                td = document.createElement('td');
                td.classList.add('text-right');
                td.textContent = stat.t.format();
                tr.appendChild(td);

                td = document.createElement('td');
                td.classList.add('text-right');
                td.textContent = `~${stat.ph.format(3)} / h`;
                tr.appendChild(td);

                resStatsTableBody.appendChild(tr);
            }
        }

        function _showCharts (one = null) {
            __hubToggleTo('#RQ-hub-charts-wrapper');
            let twoWeeksago = moment.tz(gameTimeZone).subtract(2, 'weeks').format('YYYY-MM-DD 00:00:00');

            list = trackedStuffLC.concat(trackedStuffDDLC);
            if (one !== null && list.indexOf(one) !== -1) {
                list = [one];
            }

            for (let res of list) {
                let resData = [];
                for (let timestamp in tracker[res]) {
                    if (!tracker[res].hasOwnProperty(timestamp)) {
                        continue;
                    }
                    let rts = moment.tz(timestamp, gameTimeZone).format('YYYY-MM-DD HH:mm:ss');
                    if (rts < twoWeeksago) {
                        delete tracker[res][timestamp];
                        continue;
                    }
                    let resValue = tracker[res][timestamp];
                    resData.push([
                        moment.tz(timestamp, gameTimeZone).toDate(),
                        resValue,
                    ]);
                }
                __saveTracker();
                __showChart('#RQ-hub-chart-' + res,  res, resData);
                __showTrackerStats(res);
            }
        }

        function _setChatDirection (dir) {
            chatDirection = dir;
        }

        //window.onload = __setup;
        window.addEventListener('load', __setup, {once: true});

        return {
            //proccess: _proccess,
            proccessBattle: _proccessBattle,
            proccessTS: _proccessTS,
            proccessCraft: _proccessCraft,
            proccessLoginInfo: _proccessLI,
            proccessHouse: _handleHouseData,
            updateMessageLimit: _updateMSGLimit,
            addFameOwnGemsButton: _fameOwnGems,
            showCharts: _showCharts,
            closeHub: _closeHub,
            setChatDirection: _setChatDirection,
        };
    })(window);

    $(document).on('roa-ws:battle', function (e, data) {
        QoL.proccessBattle(data);
    });

    $(document).on('roa-ws:harvest', function (e, data) {
        QoL.proccessTS(data);
    });

    $(document).on('roa-ws:craft', function (e, data) {
        QoL.proccessCraft(data);
    });

    $(document).on('roa-ws:login_info', function (e, data) {
        QoL.proccessLoginInfo(data);
    });

    $(document).on('roa-ws:page:house', function (e, data) {
        QoL.proccessHouse('house', data);
    });

    $(document).on('roa-ws:page:house_room', function (e, data) {
        QoL.proccessHouse('room', data);
    });

    $(document).on('roa-ws:page:settings_preferences, roa-ws:page:settings_preferences_change', function (e, d) {
        // 12 is the relevant option ..
        // d.preferences[12] can be "0" or "1" (yes, string) => 0 - default, 1 - retarded
        QoL.setChatDirection(d.preferences[12] === '1' ? 'down' : 'up');
    });

    /*$(document).on("roa-ws:message", function(e, data){
        console.log(data);
    });*/

    $(document).on('keyup', '#chatMessage', function (e) {
        setTimeout(QoL.updateMessageLimit, 500, e.target);
    });

    $(document).on('roa-ws:page:inventory_gems', function (e, d) {
        QoL.addFameOwnGemsButton(d.result);
    });

    $(document).on('click', '.RoAQoL-fameown-gem', function (e) {
        // <button class="confirm_gem_ownership" data-currency="fame" data-gid="381974">Become Owner<br>for 30 Fame Points</button>
        let button = document.createElement('button');
        button.setAttribute('class', 'confirm_gem_ownership');
        button.setAttribute('data-currency', 'fame');
        button.setAttribute('data-gid', e.target.getAttribute('data-gemid'));
        document.querySelector('#modal2Content').appendChild(button);
        button.click();
    });

    $(document).on('click', '#RoA-QoL-open-hub', function () {
        $('#modalTitle').text('RoA-QoL - HUB');
        $('#modalWrapper, #modalBackground, #RQ-hub-wrapper').show();
    });

    $(document).on('click', '#modalBackground', function () {
        QoL.closeHub();
    });

    $(document).on('click', '#RQ-hub-charts', function () {
        QoL.showCharts();
    });

    $(document).on('click', '#RQ-hub-charts-tabs a', function (e) {
        e.preventDefault();
        if ($(this).data('resname')) {
            $(this).tab('show');
            QoL.showCharts($(this).data('resname'));
        }
    });
})(window, jQuery);