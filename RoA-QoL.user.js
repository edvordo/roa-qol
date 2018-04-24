// ==UserScript==
// @name         RoA-QoL
// @namespace    Reltorakii_is_awesome
// @version      1.0.1
// @description  try to take over the world!
// @author       Reltorakii
// @match        https://*.avabur.com/game*
// @require      https://rawgit.com/ejci/favico.js/master/favico.js
// @downloadURL  https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @updateURL    https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @grant        none
// ==/UserScript==

(function (window, $) {

    function log (message) {
        console.log(`[${(new Date).toLocaleTimeString()}] [RoA-QoL (v${GM_info.script.version})] ${message}`);
    }

    let QoL = (function QoL () {
        let house = {
            rooms: {},
            roomNameMap: {},
        };

        let trackerSaveKey = 'QoLTracker';
        let tracker = {
            platinum: {},
        };

        let FI;

        let headerHTML = `<table id="QoLStats">
  <tbody>
    <tr>
      <td class="left">XP / h:</td>
      <td class="right" id="XPPerHour" data-toggle="tooltip" title="0" style="color:#FF7;"></td>
    </tr>
    <tr class="hidden" id="BattleClanXPPerHourTR">
      <td class="left">Clan XP / h:</td>
      <td class="right" id="BattleClanXPPerHour" data-toggle="tooltip" title="0" style="color:#FF7;"></td>
    </tr>
    <tr class="hidden" id="BattleGoldPerHourTR">
      <td class="left">Gold / h:</td>
      <td class="right" id="BattleGoldPerHour" data-toggle="tooltip" title="0" style="color:#FFD700;"></td>
    </tr>
    <tr class="hidden" id="BattleClanGoldPerHourTR">
      <td class="left">Clan Gold / h:</td>
      <td class="right" id="BattleClanGoldPerHour" data-toggle="tooltip" title="0" style="color:#FFD700;"></td>
    </tr>
    <tr class="hidden" id="TSResourcesPerHourTR">
      <td class="left">Res / h:</td>
      <td class="right" id="TSResourcesPerHour" data-toggle="tooltip" title="0"></td>
    </tr>
    <tr class="hidden" id="TSClanResourcesPerHourTR">
      <td class="left">Clan Res / h:</td>
      <td class="right" id="TSClanResourcesPerHour" data-toggle="tooltip" title="0"></td>
    </tr>
    <tr>
      <td class="left">ETA to level:</td>
      <td class="right" id="LevelETA" data-toggle="tooltip" title="0"></td>
    </tr>
    <tr>
      <td colspan="2" align="center"></td>
    </tr>
  </tbody>
</table>`;

        let QoLStats = {
            e: {},
            d: {},
            s: new Date(),
            b: 0,
            h: 0,
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
                estimate = '< 1minute';
            }

            return estimate;
        };

        Number.prototype.toTimeRemaining = function () {
            // time in miliseconds, a.k.a. Date.now()
            let value = this.valueOf() / 1000;

            let seconds = value % 60;
            let minutes = Math.floor(value / 60) % 60;
            let hours = Math.floor(value / 60 / 60) % 60;

            let result = [];
            if (hours > 0) result.push(`${hours}h`);
            if (minutes > 0) result.push(`${minutes}m`);
            result.push(`${seconds}s`);

            return result.join(' ');
        };

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
        `).appendTo('body');
            $('<td>').append(headerHTML)
                .addClass('col-xs-2 hidden-xs hidden-sm')
                .appendTo('#allThemTables > tbody > tr');
            $('#QoLStats [id]').each(function (i, e) {
                e = $(e);
                QoLStats.e[e.attr('id')] = e;
                QoLStats.d[e.attr('id')] = 0;
            });
            QoLStats.d.BattleXPPerHour = 0;
            QoLStats.d.TSXPPerHour = 0;

            __loadHouseInfo();
            __loadTracker();

            FI = new Favico({animation: 'none'});
            FI.badge(0);

            $('#XPPerHour, #BattleClanXPPerHour, #BattleGoldPerHour, #BattleClanGoldPerHour, #TSResourcesPerHour, #TSClanResourcesPerHour')
                .tooltip({placement: 'auto left', container: 'body', html: true});
            $('#chatMessageWrapper').attr('data-limiter', '0 / 400');
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
            for (let x in QoLStats.e) {
                if (QoLStats.e.hasOwnProperty(x)) {
                    if (x.match(/^Battle.*TR$/)) {
                        QoLStats.e[x].removeClass('hidden');
                    } else if (x.match(/.*TR$/)) {
                        QoLStats.e[x].addClass('hidden');
                    }
                }
            }
        }

        function __toggleTS () {
            // log('Switching to TS');
            for (let x in QoLStats.e) {
                if (QoLStats.e.hasOwnProperty(x)) {
                    if (x.match(/^TS.*TR$/)) {
                        QoLStats.e[x].removeClass('hidden');
                    } else if (x.match(/.*TR$/)) {
                        QoLStats.e[x].addClass('hidden');
                    }
                }
            }
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
            }
            for (let e in map) {
                let ed = map[e].d !== '' ? map[e].d : e;

                //"<h5>Based upon</h5>" + commatize(Math.floor(startXP))+" XP over "+battles+" battles since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*xp))+" / h"
                let obj = {
                    total: QoLStats.d[ed].format(),
                    label: map[e].l,
                    count: count.format(),
                    since: QoLStats.s.toLocaleString(),
                    type: `${type} actions`,
                    wannabe: (Math.floor(hour / QoLStats.na * map[e].c)).format(),
                };

                QoLStats.e[e].text((QoLStats.d[ed] / (now - QoLStats.s) * hour).format())
                    .attr({'data-original-title': tmpl.formatQoL(obj)});
            }
            /*
            QoLStats.e.XPPerHour.text((QoLStats.d.BattleXPPerHour / (now - QoLStats.s) * hour).format());
            QoLStats.e.BattleGoldPerHour.text((QoLStats.d.BattleGoldPerHour / (now - QoLStats.s) * hour).format());
            QoLStats.e.BattleClanXPPerHour.text((QoLStats.d.BattleClanXPPerHour / (now - QoLStats.s) * hour).format());
            QoLStats.e.BattleClanGoldPerHour.text((QoLStats.d.BattleClanGoldPerHour / (now - QoLStats.s) * hour).format());
            */
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

        function _proccessLI (data) {
            // dunno yet
            if (data.hasOwnProperty('p')) {
                __setupLevelRequirements(data.p);
            }
        }

        function _updateMSGLimit (msgBox) {
            let lng = $(msgBox).text().length;
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
                    log (`Failure while loading tracker info "${e.message}"`);
                    _tracker = tracker;
                }
                tracker = _tracker;
                __saveTracker();
            }
            __platObserver();
        }

        //window.onload = __setup;
        window.addEventListener('load', __setup, {once: true});

        return {
            //proccess: _proccess,
            proccessBattle: _proccessBattle,
            proccessTS: _proccessTS,
            proccessLoginInfo: _proccessLI,
            proccessHouse: _handleHouseData,
            updateMessageLimit: _updateMSGLimit,
        };
    })(window);

    $(document).on('roa-ws:battle', function (e, data) {
        QoL.proccessBattle(data);
    });

    $(document).on('roa-ws:harvest', function (e, data) {
        QoL.proccessTS(data);
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

    /*$(document).on("roa-ws:message", function(e, data){
        console.log(data);
    });*/

    $(document).on('keyup', '#chatMessage', function (e) {
        setTimeout(QoL.updateMessageLimit, 500, e.target);
    });
})(window, jQuery);