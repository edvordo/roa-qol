// ==UserScript==
// @name         RoA-QoL
// @namespace    Reltorakii_is_awesome
// @version      2.0.0
// @description  try to take over the world!
// @author       Reltorakii
// @icon         https://rawgit.com/edvordo/roa-qol/master/resources/img/logo-32.png?rev=180707
// @match        https://*.avabur.com/game*
// @match        http://*.avabur.com/game*
// @resource     QoLCSS             https://rawgit.com/edvordo/roa-qol/master/resources/css/qol.css?rev=180707
// @resource     QoLTrackerWorker   https://rawgit.com/edvordo/roa-qol/master/workers/trackerSaveWorker.js?rev=180707
// @resource     QoLProcessorWorker https://rawgit.com/edvordo/roa-qol/master/workers/trackerProcessorWorker.js?rev=180707
// @resource     QoLHeaderHTML      https://rawgit.com/edvordo/roa-qol/master/resources/templates/header.180707
// @resource     QoLSettingsHTML    https://rawgit.com/edvordo/roa-qol/master/resources/templates/settings.html?rev=180707
// @require      https://rawgit.com/edvordo/roa-qol/master/common.js?rev=180707
// @require      https://cdn.rawgit.com/omichelsen/compare-versions/v3.1.0/index.js
// @require      https://rawgit.com/ejci/favico.js/master/favico.js
// @require      https://cdn.rawgit.com/nodeca/pako/1.0.6/dist/pako.min.js
// @require      https://raw.githubusercontent.com/lodash/lodash/4.17.4/dist/lodash.min.js
// @require      https://cdn.rawgit.com/markdown-it/markdown-it/8.4.1/dist/markdown-it.min.js
// @downloadURL  https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @updateURL    https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==
(function (window, $) {

    if (typeof MutationObserver.prototype.restart !== 'function') {
        MutationObserver.prototype.observeArguments = []; // internal variable to store the args
        MutationObserver.prototype.originalObserve = MutationObserver.prototype.observe; // save the original implementation
        MutationObserver.prototype.observe = function (target, options) { // overwrite the function
            this.observeArguments = [target, options];
            return this.originalObserve.apply(this, this.observeArguments);
        };
        MutationObserver.prototype.restart = function () { // and finally add the restart function
            return this.originalObserve.apply(this, this.observeArguments);
        };
    }

    let QoL = (function QoL () {

        const GAME_TIME_ZONE = 'America/New_York';

        const INTERNAL_UPDATE_URI = 'https://api.github.com/repos/edvordo/roa-qol/contents/RoA-QoL.user.js';

        const TRACKER_SAVE_KEY = 'QoLTracker';

        const DEFAULT_SETTINGS = {
            badge_stamina: true,
            badge_fatigue: true,
            badge_event: true,
            house_tooltips: true,
            event_abbreviation: true,
            char_count: true,
            command_helper: false,
            fame_own_gems: true,
            event_ratio_message: true,
            event_ratio_chat_prepare: true,
            tracker: {
                fame: true,
                crystals: true,
                platinum: true,
                gold: true,
                food: true,
                wood: true,
                iron: true,
                stone: true,
                mats: true,
                frags: true,
                strength: true,
                health: true,
                coordination: true,
                agility: true,
                average_damage: true,
                captcha: false,
            },
        };

        const SETTINGS_SAVE_KEY = 'QolSettings';

        const WORKERS = {};

        const VARIABLES = {
            username: '',
            FI: null,
            chatDirection: 'up',
            checkForUpdateTimer: 6 * 60 * 60 * 1000, // 6 hours
            gems: {},

            eventRewardsRegex: /([0-9,]+) Event Points? and ([0-9,]+) Platinum/,

            settings: DEFAULT_SETTINGS,

            QoLStats: {
                e: {}, // elements
                d: {}, // data
                bs: moment.tz(GAME_TIME_ZONE),
                hs: moment.tz(GAME_TIME_ZONE),
                cts: moment.tz(GAME_TIME_ZONE),
                cas: moment.tz(GAME_TIME_ZONE),
                b: 0, // battles
                h: 0, // harvests
                ct: 0, // crafts
                ca: 0, // varves
                na: 0, // next action
                PlXPReq: 0,
                FoodXPReq: 0,
                WoodXPReq: 0,
                IronXPReq: 0,
                StoneXPReq: 0,
                CrftXPReq: 0,
                CarvXPReq: 0,
            },

            tracker: {
                fame: {},
                crystals: {},
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
                avgDmStrStat: {},
            },
            tracked: {
                stuff: ['Fame', 'Crystals', 'Platinum', 'Gold', 'Mats', 'Frags', 'Food', 'Wood', 'Iron', 'Stone'],
                stuffDD: ['Strength', 'Health', 'Coordination', 'Agility'],
                stuffLC: [],
                stuffDDLC: [],
                map: {},
            },
            house: {
                rooms: {},
                roomNameMap: {},
            },
            hub: {
                tab: '',
                subtab: 'platinum',
            },
            twoWeeksAgo: moment.tz(GAME_TIME_ZONE).subtract(2, 'weeks').format('YYYY-MM-DD 00:00:00'),
        };

        const TEMPLATES = {
            headerHTML: GM_getResourceText('QoLHeaderHTML'),
            hubHTML: '',
            dashboardHTML: ``,
        };

        const OBSERVERS = {
            toggleable: {
                eventAbbreviator () {
                    let regexes = {
                        attack: /You .+ (Bow|Sword|Staff|fists).+([0-9]+ times? hitting [0-9]+ times?), dealing .+ damage.$/i,
                        // You cast 1 spell at [Vermin] Boss Forty-two, dealing 2,127,514,765 damage.
                        spellcast: /^You cast [0-9]+ spell.+dealing .+ damage.$/i,
                        summary: /([0-9,]+ adventurers? (have|has) ([^\s]+)(, dealing)? [0-9,]+)/g,
                        heal: /You healed [0-9,]+ HP!$/i,
                        counter: /You counter .+ ([0-9,]+ times?).+ dealing .* damage.$/i,
                        bosshit: /^\[.+] Boss .+ dealing [0-9,]+ damage\.$/,
                        bossmiss: /^\[.+] Boss .+ but misses!$/i,
                        res: /^You found ([0-9,]+) ([a-z]+)\.$/i,
                        craft: /^You smashed down .* Hammer ([0-9,]+) times\. .* (\+[0-9,.%]+ [a-z\s]+) to the item\.$/i,
                        craft_sub: /(\+[0-9,.%]+ [a-z\s]+)/ig,
                        carve: /^You carefully slice.*Saw ([0-9,]+) times?\..+ ([0-9,]+)\.$/i,
                    };
                    let o = new MutationObserver(function (ml) {
                        for (let m of ml) {
                            if (m.addedNodes.length) {
                                let a = m.addedNodes[0].textContent;

                                let parse;

                                if ((parse = a.match(regexes.attack)) !== null) {
                                    let spans = m.addedNodes[0].querySelectorAll('span:not(.ally)');
                                    let iconMap = {
                                        'bow': '\uD83C\uDFF9 ',
                                        'sword': '\u2694 ',
                                        'staff': '\u2728 ',
                                        'fists': '\uD83D\uDC4A ',
                                    };
                                    m.addedNodes[0].innerHTML = '';
                                    m.addedNodes[0].appendChild(document.createTextNode(iconMap[parse[1].toLowerCase()] + ' +'));
                                    let dmgSpan = spans[spans.length === 4 ? 3 : 2];
                                    dmgSpan.setAttribute('title', spans[spans.length === 4 ? 2 : 1].textContent);
                                    m.addedNodes[0].appendChild(dmgSpan); // dmg
                                    m.addedNodes[0].appendChild(document.createTextNode(' damage'));
                                    let attemptsAndHits = parse[2].replace('times hitting', 'attempts').replace('times', 'hits');
                                    m.addedNodes[0].appendChild(document.createTextNode(` (${attemptsAndHits}`));
                                    if (spans.length === 4) {
                                        m.addedNodes[0].appendChild(document.createTextNode(` / `));
                                        m.addedNodes[0].appendChild(spans[0]);
                                    }
                                    m.addedNodes[0].appendChild(document.createTextNode(`)`));
                                } else if ((parse = a.match(regexes.spellcast)) !== null) {
                                    let spans = m.addedNodes[0].querySelectorAll('span:not(.ally)');

                                    m.addedNodes[0].innerHTML = '';
                                    // m.addedNodes[0].appendChild(document.createTextNode('\u2606\u5F61 +'));
                                    m.addedNodes[0].appendChild(document.createTextNode('\uD83C\uDF20 +'));
                                    let dmgSpan = spans[2];
                                    dmgSpan.setAttribute('title', spans[1].textContent);
                                    m.addedNodes[0].appendChild(dmgSpan); // dmg
                                    m.addedNodes[0].appendChild(document.createTextNode(' damage'));
                                    m.addedNodes[0].appendChild(document.createTextNode(` (${spans[0].textContent})`));
                                } else if ((parse = a.match(regexes.summary)) !== null) {
                                    let spans = m.addedNodes[0].querySelectorAll('span');
                                    m.addedNodes[0].innerHTML = '';

                                    let xAdv;

                                    xAdv = spans[0];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[1]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' resources, '));

                                    xAdv = spans[2];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[3]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' damage, '));

                                    xAdv = spans[4];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[5]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' bonuses and '));

                                    xAdv = spans[6];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[7]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' resonance'));
                                } else if ((parse = a.match(regexes.heal)) !== null) {
                                    let span = m.addedNodes[0].querySelector('span');
                                    m.addedNodes[0].innerHTML = '';

                                    m.addedNodes[0].appendChild(document.createTextNode('+'));
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.counter)) !== null) {
                                    let spans = m.addedNodes[0].querySelectorAll('span');
                                    m.addedNodes[0].innerHTML = '';

                                    m.addedNodes[0].appendChild(document.createTextNode('\u2194'));
                                    m.addedNodes[0].appendChild(spans[1]);
                                    m.addedNodes[0].appendChild(document.createTextNode(` (${parse[1]})`));
                                } else if ((parse = a.match(regexes.bosshit)) !== null) {
                                    let span = m.addedNodes[0].querySelector('span:last-child');
                                    m.addedNodes[0].innerHTML = '';

                                    m.addedNodes[0].appendChild(document.createTextNode('\uD83C\uDFAF'));
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.bossmiss)) !== null) {
                                    let boss = m.addedNodes[0].querySelector('span:first-child');
                                    m.addedNodes[0].innerHTML = '';
                                    let span = document.createElement('span');
                                    span.setAttribute('title', boss.textContent);
                                    span.textContent = '\uD83D\uDF9C boss missed';
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.res)) !== null) {
                                    let iconMap = {
                                        'food': '\uD83C\uDFA3 ',
                                        'wood': '\uD83C\uDF32 ',
                                        'iron': '\u26CF ',
                                        'stone': '\uD83D\uDC8E ',
                                    };
                                    m.addedNodes[0].innerHTML = '';
                                    m.addedNodes[0].appendChild(document.createTextNode(`${iconMap[parse[2]]} `));

                                    let span = document.createElement('span');
                                    span.classList.add(parse[2]);
                                    span.textContent = `+${parse[1]} ${parse[2]}`;
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.craft)) !== null) {
                                    let parse2 = a.match(regexes.craft_sub);
                                    parse2 = parse2.map(item => item.replace(' to the item', ''));
                                    m.addedNodes[0].innerHTML = '';
                                    m.addedNodes[0].appendChild(document.createTextNode(`\uD83D\uDD28 `));

                                    let span = document.createElement('span');
                                    span.classList.add('crafting');
                                    span.textContent = `+${parse[1]} bonuses`;
                                    span.setAttribute('title', `${parse2.join('\n')}`);
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.carve)) !== null) {
                                    let parse2 = a.match(regexes.craft_sub);
                                    m.addedNodes[0].innerHTML = '';
                                    m.addedNodes[0].appendChild(document.createTextNode(`\uD83D\uDC8E `));

                                    let span = document.createElement('span');
                                    span.classList.add('carving');
                                    span.textContent = `+${parse[2]} resonance`;
                                    m.addedNodes[0].appendChild(span);
                                } else {
                                    console.log(m.addedNodes[0].outerHTML);
                                    console.log(m.addedNodes[0].textContent);
                                }
                            }
                        }
                    });
                    o.observe(document.querySelector('#gauntletText'), {childList: true});
                    // o.disconnect();
                    return o;
                },
            },
            general: {
                fameOwnGemsObserver: new MutationObserver(
                    function (ml) {
                        for (let m of ml) {
                            if (m.type !== 'childList' || m.addedNodes.length === 0) {
                                continue;
                            }
                            let rowLastTd = m.addedNodes[0].querySelector('td:last-child');
                            if (rowLastTd === null || rowLastTd.getAttributeNames().indexOf('data-gemid') === -1) {
                                continue;
                            }
                            let gemId = rowLastTd.getAttribute('data-gemid');
                            if (!VARIABLES.gems.hasOwnProperty(gemId)) {
                                continue;
                            }
                            let gem = VARIABLES.gems[gemId];
                            if (gem.o === VARIABLES.username) {
                                continue;
                            }

                            let a = document.createElement('a');
                            a.textContent = '[Fame Own]';
                            a.setAttribute('data-gemid', gem.i);
                            a.setAttribute('class', 'RoAQoL-fameown-gem');
                            rowLastTd.appendChild(document.createTextNode(' '));
                            rowLastTd.appendChild(a);
                        }
                    },
                ),
            },
        };

        const fn = {
            helpers: {
                scrollToBottom (selector) {
                    $(selector).animate({
                        scrollTop: $(selector).prop('scrollHeight'),
                    });
                },
                initObserver (name, attrName, selector) {
                    let o = new MutationObserver(function (ml) {
                        for (let m of ml) {
                            if (m.type === 'attributes' && m.attributeName === attrName) {
                                let oldValue = m.oldValue;
                                let nowValue = m.target.getAttribute(m.attributeName);
                                if (oldValue && nowValue && oldValue !== nowValue) {
                                    VARIABLES.tracker[name][(new Date).toJSON()] = parseInt(nowValue.replace(/,/g, ''));
                                }
                            }
                        }
                    });
                    o.observe(document.querySelector(selector), {attributes: true, attributeOldValue: true});
                    // o.disconnect();
                    return o;
                },
                togglePerHourSection (section) {
                    $('.rq-h').addClass('hidden');
                    $(`.rq-h.rq-${section}`).removeClass('hidden');
                },
                updateFavico (to, text = null, bg = null) {
                    let _bg = bg;
                    if (bg === null) {
                        _bg = parseInt(to) > 0 ? '#050' : '#a00';
                    }
                    let _text = text === null ? Math.abs(to) : text;
                    VARIABLES.FI.badge(_text, {bgColor: _bg});
                },
                hubToggleTo (div = null) {
                    $('#RQ-hub-sections > div').hide();
                    if (div !== null) {
                        $(div).fadeIn();
                    }
                },
                updateStats (type, data) {
                    let now = moment.tz(GAME_TIME_ZONE);
                    let hour = 60 * 60 * 1000;
                    let tmpl = '<h5>Based upon</h5>{total} {label} over {count} {type} since {since}<h5>Would be gain / h</h5>{wannabe} / h';
                    let map = {};
                    let count = 0;
                    let trackingStart = new Date();
                    if (type === 'battle') {
                        map = {
                            XPPerHour: {d: 'BattleXPPerHour', l: 'XP', c: data.xp},
                            BattleGoldPerHour: {d: '', l: 'Gold', c: data.g},
                            BattleClanXPPerHour: {d: '', l: 'XP', c: data.cxp},
                            BattleClanGoldPerHour: {d: '', l: 'Gold', c: data.cg},
                        };
                        count = VARIABLES.QoLStats.b;
                        trackingStart = VARIABLES.QoLStats.bs;
                    } else if (type === 'TS') {
                        map = {
                            XPPerHour: {d: 'TSXPPerHour', l: 'XP', c: data.xp},
                            TSResourcesPerHour: {d: '', l: 'Resources', c: data.a},
                            TSClanResourcesPerHour: {d: '', l: 'Resources', c: data.ca},
                        };
                        count = VARIABLES.QoLStats.h;
                        trackingStart = VARIABLES.QoLStats.hs;
                    } else if (type === 'Crafting') {
                        map = {
                            XPPerHour: {d: 'CTXPPerHour', l: 'XP', c: data.xp},
                        };
                        count = VARIABLES.QoLStats.ct;
                        trackingStart = VARIABLES.QoLStats.cts;
                    } else if (type === 'Carving') {
                        map = {
                            XPPerHour: {d: 'CAXPPerHour', l: 'XP', c: data.xp},
                        };
                        count = VARIABLES.QoLStats.ca;
                        trackingStart = VARIABLES.QoLStats.cas;
                    }

                    for (let e in map) {
                        let ed = map[e].d !== '' ? map[e].d : e;

                        //"<h5>Based upon</h5>" + commatize(Math.floor(startXP))+" XP over "+battles+" battles since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*xp))+" / h"
                        let obj = {
                            total: VARIABLES.QoLStats.d[ed].format(),
                            label: map[e].l,
                            count: count.format(),
                            since: trackingStart.format('Do MMM Y HH:mm:ss'),
                            type: `${type} actions`,
                            wannabe: (Math.floor(hour / VARIABLES.QoLStats.na * map[e].c)).format(),
                        };

                        VARIABLES.QoLStats.e[e]
                            .text((VARIABLES.QoLStats.d[ed] / (now - trackingStart) * hour).format())
                            .attr({'data-original-title': tmpl.formatQoL(obj)});

                    }
                },
                toggleSetting (key, set = false) {
                    if (typeof set === 'boolean') {
                        let element = document.querySelector(`.qol-setting[data-key="${key}"]`);
                        if (element && element.type === 'checkbox') {
                            element.checked = set;
                        }
                    }
                },
                populateToSettingsTemplate () {
                    for (let key in VARIABLES.settings) {
                        if (!VARIABLES.settings.hasOwnProperty(key)) {
                            continue;
                        }
                        let value = VARIABLES.settings[key];
                        if (typeof value === 'boolean') {
                            fn.helpers.toggleSetting(key, value, false);
                            continue;
                        }

                        if (true === _.isPlainObject(value)) {
                            for (let key2 in value) {
                                if (!value.hasOwnProperty(key2)) {
                                    continue;
                                }
                                let value2 = value[key2];
                                if (typeof value2 === 'boolean') {
                                    fn.helpers.toggleSetting(`${key}-${key2}`, value2, false);
                                    continue;
                                }
                            }
                        }
                    }
                },
                addMessageToChat (message) {
                    if (VARIABLES.chatDirection === 'up') {
                        $('#chatMessageList').prepend(message);
                    } else {
                        $('#chatMessageList').append(message);
                        fn.helpers.scrollToBottom('#chatMessageListWrapper');
                    }
                },
            },
            /** private / internal / helper methods */
            __: {
                checkForUpdate () {
                    let version = '';
                    document.querySelector('#RQ-dashboard-update-last').textContent = moment.tz(GAME_TIME_ZONE).format('Do MMM HH:mm:ss');
                    fetch(INTERNAL_UPDATE_URI)
                        .then(response => response.json())
                        .then(data => {
                            let match = atob(data.content).match(/\/\/\s+@version\s+([^\n]+)/);
                            version = match[1];

                            if (compareVersions(GM_info.script.version, version) < 0) {
                                let message = `<li>[${moment.tz(GAME_TIME_ZONE).format('HH:mm:ss')}] <span class="chat_notification">RoA-QoL has been updated to version ${version}! <a href="https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js" target="_blank">Update</a> | <a href="https://github.com/edvordo/roa-qol/commits/master" target="_blank">CommitLog</a></span></li>`;
                                document.querySelector('#RoA-QoL-open-hub').classList.add('qol-update-ready');
                            } else {
                                setInterval(fn.__.checkForUpdate, VARIABLES.checkForUpdateTimer);
                            }
                        });
                },
                getUpdateLog () {
                    let container = document.getElementById('RQ-dashboard-update-log');
                    container.innerHTML = '';

                    let detailsTemplate = document.createElement('details');
                    let summaryTemplate = document.createElement('summary');
                    let dateTemplate = document.createElement('div');
                    dateTemplate.classList.add('text-right');
                    dateTemplate.classList.add('text-muted');
                    fetch('https://api.github.com/repos/edvordo/roa-qol/releases')
                        .then(response => response.json())
                        .then(releases => {
                            for (let release of releases) {
                                // release.name, release.body, new Date(release.published_at), release.html_url;
                                let lines = release.body.split(/\n/);
                                let detail = detailsTemplate.cloneNode();
                                let summary = summaryTemplate.cloneNode();
                                let date = dateTemplate.cloneNode();

                                summary.textContent = `${release.name} - ${lines[0]}`;

                                detail.appendChild(summary);
                                detail.insertAdjacentHTML('beforeend', markdownit().render(release.body));

                                date.textContent = moment.tz(release.published_at, GAME_TIME_ZONE).format('Do MMMM Y HH:mm:ss');

                                detail.appendChild(date);

                                container.appendChild(detail);
                            }
                        });
                },

                resetFavico () {
                    VARIABLES.FI.badge(0);
                },

                setupWorkers () {
                    WORKERS.trackerSaveWorker = new Worker('data:application/javascript;base64,' + btoa(GM_getResourceText('QoLTrackerWorker')));
                    WORKERS.trackerSaveWorker.onmessage = e => {
                        let d = e.data;

                        if (typeof d !== 'object') {
                            return false;
                        }
                        switch (d.a) {
                            case 'ts': // tracker save
                                localStorage.setItem(`${TRACKER_SAVE_KEY}-${d.s}`, d.d);
                                document.querySelector('#RQ-dashboard-history-last-save').textContent = moment.tz(GAME_TIME_ZONE).format('Do MMM HH:mm:ss');
                                break;

                            case 'tls': // tracker load section
                                VARIABLES.tracker[d.s] = d.d;
                                break;

                            default:
                                break;
                        }
                    };

                    WORKERS.trackerProccessor = new Worker('data:application/javascript;base64,' + btoa(GM_getResourceText('QoLProcessorWorker')));
                    WORKERS.trackerProccessor.onmessage = e => {
                        let d = e.data;

                        if (typeof d !== 'object') {
                            return false;
                        }

                        switch (d.a) {
                            case 'graphData':
                                fn.__.showChart('#RQ-hub-chart-' + d.i, d.i, d.gd);
                                break;

                            case 'cleanData':
                                VARIABLES.tracker[d.i] = d.d;
                                break;

                            case 'statsSummary':
                                document.querySelector(`#RQ-hub-chart-${d.i}-subtitle`).textContent = d.d;
                                break;

                            case 'statsCaption':
                                document.querySelector(`table#RQ-hub-stats-${d.i} > caption`).textContent = `~${d.d.format(3)} / day`;
                                break;

                            case 'dataTableDailyData':
                                if (d.d.length) {
                                    let dt = $(`#RQ-hub-stats-${d.i}`).DataTable();
                                    dt.clear();
                                    for (let item of d.d) {
                                        // item[1] = item[1].format();
                                        // item[2] = `~${item[2].format(3)} / h`;
                                        dt.row.add(item);
                                    }
                                    dt.draw();
                                }
                                break;

                            case 'statADGraphData':
                                fn.__.showChart('#RQ-hub-chart-avg-dmg', 'Average Damage', d.cd);
                                break;

                            case 'statADTableData':
                                if (d.td.length) {
                                    let dt = $('#RQ-hub-stats-avg-dmg-data').DataTable();
                                    dt.clear();
                                    for (let item of d.td) {
                                        // for (let i = 0; i < 5; i++) {
                                        //     item[i + 1] = item[i + 1].format();
                                        // }
                                        dt.row.add(item);
                                    }
                                    dt.draw();
                                }
                                break;

                            default:
                                break;
                        }
                    };
                    WORKERS.trackerSaveWorker.postMessage({a: 'setGTZ', gtz: GAME_TIME_ZONE});
                },
                setupObservers () {
                    OBSERVERS.toggleable.fame = fn.helpers.initObserver('fame', 'title', 'td#fame_points');
                    OBSERVERS.toggleable.crystals = fn.helpers.initObserver('crystals', 'title', 'td.crystals');
                    OBSERVERS.toggleable.platinum = fn.helpers.initObserver('platinum', 'title', 'td.myplatinum');
                    OBSERVERS.toggleable.gold = fn.helpers.initObserver('gold', 'title', 'td.mygold');
                    OBSERVERS.toggleable.mats = fn.helpers.initObserver('mats', 'title', 'td.mycrafting_materials');
                    OBSERVERS.toggleable.frags = fn.helpers.initObserver('frags', 'title', 'td.mygem_fragments');
                    OBSERVERS.toggleable.food = fn.helpers.initObserver('food', 'title', 'td.myfood');
                    OBSERVERS.toggleable.wood = fn.helpers.initObserver('wood', 'title', 'td.mywood');
                    OBSERVERS.toggleable.iron = fn.helpers.initObserver('iron', 'title', 'td.myiron');
                    OBSERVERS.toggleable.stone = fn.helpers.initObserver('stone', 'title', 'td.mystone');
                    OBSERVERS.toggleable.strength = fn.helpers.initObserver('strength', 'data-base', 'td#strength');
                    OBSERVERS.toggleable.health = fn.helpers.initObserver('health', 'data-base', 'td#health');
                    OBSERVERS.toggleable.coordination = fn.helpers.initObserver('coordination', 'data-base', 'td#coordination');
                    OBSERVERS.toggleable.agility = fn.helpers.initObserver('agility', 'data-base', 'td#agility');
                    OBSERVERS.toggleable.eventAbbreviator = OBSERVERS.toggleable.eventAbbreviator();
                },

                setupCSS () {
                    GM_addStyle(GM_getResourceText('QoLCSS'));
                },
                setupHTML () {
                    // per hour table
                    let td = document.createElement('td');
                    td.insertAdjacentHTML('afterbegin', TEMPLATES.headerHTML);
                    document.querySelector('#allThemTables > tbody > tr').appendChild(td);

                    // qol hub
                    document.querySelector('#modalContent').insertAdjacentHTML('beforeend', TEMPLATES.hubHTML);
                    $('#RQ-hub-wrapper .dropdown-toggle').dropdown();
                    $('#RQ-hub-stats-avg-dmg-data').DataTable({searching: false, ordering: false});

                },
                setupTemplates () {
                    let chartsContentTmpl = '';
                    let chartsTabsTmpl = '';

                    for (let resName of VARIABLES.tracked.stuff.concat(VARIABLES.tracked.stuffDD)) {
                        if (VARIABLES.tracked.stuffDD.indexOf(resName) === -1) {
                            chartsTabsTmpl += `<li class="${resName === 'Platinum' ? 'active' : ''}">
    <a href="#RQ-hub-${resName.toLowerCase()}-chart-tab" data-resname="${resName.toLowerCase()}">${resName}</a>
</li>`;
                        }
                        chartsContentTmpl += `
    <div class="tab-pane ${resName === 'Platinum' ? 'active' : ''}" id="RQ-hub-${resName.toLowerCase()}-chart-tab">
        <h3 class="text-center">${resName} gains</h3>
        <div class="text-center" iD="RQ-hub-chart-${resName.toLowerCase()}-subtitle"></div>
        <div id="RQ-hub-chart-${resName.toLowerCase()}" style="width:100%;height:300px;"></div>
        <table id="RQ-hub-stats-${resName.toLowerCase()}" class="table table-condensed table-bordered rq-styled">
            <caption class="text-center"></caption>
            <thead>
                <tr>
                    <th>Date</th>
                    <th class="text-right">Total</th>
                    <th class="text-right">${resName} / h</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>
    </div>`;
                    }

                    chartsTabsTmpl += `<li class="dropdown">
    <a href="#" data-toggle="dropdown">Base Stats <span class="caret"></span></a>
        <ul class="dropdown-menu">`;
                    for (let resName of VARIABLES.tracked.stuffDD) {

                        chartsTabsTmpl += `<li class="">
    <a href="#RQ-hub-${resName.toLowerCase()}-chart-tab" data-resname="${resName.toLowerCase()}">${resName}</a>
</li>`;
                    }
                    chartsTabsTmpl += `</ul></li>`;

                    TEMPLATES.hubHTML = `<div id="RQ-hub-wrapper" style="display:none">
    <div class="btn-group">
        <button type="button" class="btn btn-primary" id="RQ-hub-dashboard">Dashboard</button>
        <button type="button" class="btn btn-primary" id="RQ-hub-settings">Settings</button>
        <button type="button" class="btn btn-primary" id="RQ-hub-charts">Charts</button>
        <button type="button" class="btn btn-primary" id="RQ-hub-stats">Stats</button>
    </div>
    <hr>
    <div id="RQ-hub-sections">
        <div id="RQ-hub-dashboard-wrapper">
            <h4 class="text-center">Dashboard</h4>
            <div class="row">
                <div class="col-md-4">
                    <h4 class="text-center">Update log</h4>
                    <div id="RQ-dashboard-update-log" class="small"></div>
                </div>
                <div class="col-md-4">
                    <h4 class="text-center">Overview</h4>
                    <table class="table table-condensed rq-styled">
                        <tr>
                            <td>Last tracker save</td>
                            <td id="RQ-dashboard-history-last-save" class="text-right"></td>
                        </tr>
                        <tr>
                            <td>Last check for update</td>
                            <td id="RQ-dashboard-update-last" class="text-right"></td>
                        </tr>
                    </table>                
                </div>
                <div class="col-md-4">
                    <h4 class="text-center">localStorage status</h4>
                    <div class="text-center text-muted small">clicking the item will delete it (there is a confirmation)</div>
                    <div id="RQ-dashboard-localstorage-state" class="btn-group-vertical btn-group-xs"></div>
                </div>
            </div>
        </div>
        <div id="RQ-hub-settings-wrapper" style="display: none;">
            ${GM_getResourceText('QoLSettingsHTML')}
        </div>
        <div id="RQ-hub-charts-wrapper" style="display: none;">
            <ul class="nav nav-tabs" id="RQ-hub-charts-tabs">${chartsTabsTmpl}</ul>
            <div class="tab-content">${chartsContentTmpl}</div>
        </div>
        <div id="RQ-hub-stats-info-wrapper" style="display: none;">
            <h3 class="text-center">Strength &raquo; AVG damage</h3>
            <div class="text-center" iD="RQ-hub-chart-avg-dmg-subtitle"></div>
            <div id="RQ-hub-chart-avg-dmg" style="width:100%;height:300px;"></div>
            <table id="RQ-hub-stats-avg-dmg-data" class="table table-condensed table-bordered rq-styled">
                <caption class="text-center"></caption>
                <thead>
                    <tr>
                        <th>Since</th>
                        <th>Base strength</th>
                        <th>Total strength</th>
                        <th>Total damage</th>
                        <th>Actions</th>
                        <th>AVG damage</th>
                    </tr>
                </thead>
                <tbody>
                </tbody>
            </table>
        </div>
        </div>
    </div>
</div>`;
                },
                setupLoops () {
                    setInterval(fn.__.saveTracker, 6E4); // once a minute ..
                    setTimeout(fn.__.checkForUpdate, 30 * 1000);
                    setInterval(fn.__.cleanUpTracker, 60 * 60 * 1000); // every hour
                    setInterval(fn.__.resetFavico, 30 * 1000); // every 30 seconds
                },
                setupVariables () {
                    // per hour
                    $('#QoLStats td[id][data-toggle]').each(function (i, e) {
                        e = $(e);
                        VARIABLES.QoLStats.e[e.attr('id')] = e;
                        VARIABLES.QoLStats.d[e.attr('id')] = 0;

                        // $('#XPPerHour, #BattleClanXPPerHour, #BattleGoldPerHour, #BattleClanGoldPerHour, #TSResourcesPerHour, #TSClanResourcesPerHour')
                        //     .tooltip({placement: 'auto left', container: 'body', html: true});

                        $(`#${e.attr('id')}`).tooltip({placement: 'auto left', container: 'body', html: true});
                    });
                    VARIABLES.QoLStats.d.BattleXPPerHour = 0;
                    VARIABLES.QoLStats.d.TSXPPerHour = 0;
                    VARIABLES.QoLStats.d.CTXPPerHour = 0;
                    VARIABLES.QoLStats.d.CAXPPerHour = 0;

                    VARIABLES.username = document.querySelector('#username').textContent;

                    VARIABLES.FI = new Favico({animation: 'none'});
                    VARIABLES.FI.badge('QoL');

                    VARIABLES.tracked.stuffLC = VARIABLES.tracked.stuff.map(i => i.toLowerCase());
                    VARIABLES.tracked.stuffDDLC = VARIABLES.tracked.stuffDD.map(i => i.toLowerCase());

                    VARIABLES.tracked.stuff.forEach(i => {
                        VARIABLES.tracked.map[i.toLowerCase()] = i;
                    });

                    for (let stat of VARIABLES.tracked.stuffDDLC.concat(VARIABLES.tracked.stuffLC)) {
                        $(`#RQ-hub-stats-${stat.toLowerCase()}`).DataTable({
                            searching: false,
                            ordering: false,
                            paging: false,
                            info: false,
                            aoColumns: [
                                {sClass: 'text-left'},
                                {sClass: 'text-right'},
                                {sClass: 'text-right'},
                            ],
                        });
                    }
                },
                setupLevelRequirements (player) {
                    VARIABLES.QoLStats.PlXPReq = player.levelCost;
                    VARIABLES.QoLStats.FoodXPReq = player.fishing.tnl;
                    VARIABLES.QoLStats.WoodXPReq = player.woodcutting.tnl;
                    VARIABLES.QoLStats.IronXPReq = player.mining.tnl;
                    VARIABLES.QoLStats.StoneXPReq = player.stonecutting.tnl;
                    VARIABLES.QoLStats.CrftXPReq = player.crafting.tnl;
                    VARIABLES.QoLStats.CarvXPReq = player.carving.tnl;
                },

                localStorageStats () {
                    let t = 0;
                    let h = document.querySelector('#RQ-dashboard-localstorage-state');

                    h.innerHTML = '';

                    let el = document.createElement('button');
                    el.classList.add('btn');
                    el.classList.add('btn-block');
                    el.setAttribute('type', 'button');

                    for (let item in localStorage) {
                        if (localStorage.getItem(item)) {
                            let x = el.cloneNode();
                            x.classList.add('btn-primary');
                            x.classList.add('roa-ls-remove');
                            x.setAttribute('data-ls-key', item);
                            let size = localStorage.getItem(item).length;
                            x.innerHTML = `${item}<span class="badge">${size.format()}</span>`;
                            h.appendChild(x);
                            t += size;
                        }
                    }
                    let x = el.cloneNode();
                    x.classList.add('btn-info');
                    x.innerHTML = `Total<span class="badge">${t.format()}</span>`;
                    h.appendChild(x);
                },

                saveSettings () {
                    localStorage.setItem(SETTINGS_SAVE_KEY, JSON.stringify(VARIABLES.settings));
                },
                loadSettings () {
                    let settings = localStorage.getItem(SETTINGS_SAVE_KEY);

                    try {
                        settings = JSON.parse(settings);

                        VARIABLES.settings = _.defaultsDeep(settings, DEFAULT_SETTINGS);
                    } catch (e) {
                        log('Failed to parse settings ..');
                    }
                    fn.helpers.populateToSettingsTemplate();
                    fn.__.saveSettings();
                    fn.__.applySettings();
                },
                applySettings () {
                    // tracked stuff from fame to stats, except average damage vs. strength
                    for (let item of VARIABLES.tracked.stuffLC.concat(VARIABLES.tracked.stuffDDLC)) {
                        if (!OBSERVERS.toggleable.hasOwnProperty(item)) {
                            continue;
                        }
                        if (!VARIABLES.settings.tracker.hasOwnProperty(item)) {
                            continue;
                        }
                        let tab = document.querySelector(`[data-resname="${item}"]`);
                        tab.classList.add('hidden');
                        OBSERVERS.toggleable[item].disconnect();
                        if (VARIABLES.settings.tracker[item]) {
                            OBSERVERS.toggleable[item].restart();
                            tab.classList.remove('hidden');
                        }
                    }

                    let tab = document.querySelector(`#RQ-hub-stats`);
                    tab.classList.add('hidden');
                    if (VARIABLES.settings.tracker.average_damage) {
                        tab.classList.remove('hidden');
                    }

                    // event abbreviator
                    OBSERVERS.toggleable.eventAbbreviator.disconnect();
                    if (VARIABLES.settings.event_abbreviation) {
                        OBSERVERS.toggleable.eventAbbreviator.restart();
                    }

                    // chat limiter
                    document.querySelector('#chatMessageWrapper').removeAttribute('data-limiter');
                    if (VARIABLES.settings.char_count) {
                        document.querySelector('#chatMessageWrapper').setAttribute('data-limiter', '0 / 400');
                    }

                },
                processSettingChange (element, ...hierarchy) {
                    if (1 === hierarchy.length) {
                        let setting = hierarchy.pop();
                        if (!VARIABLES.settings.hasOwnProperty(setting)) {
                            return false;
                        }
                        if (element.type === 'checkbox') {
                            VARIABLES.settings[setting] = !!element.checked;
                        }
                    } else if (hierarchy.length === 2) {
                        let [top, sub] = hierarchy;
                        if (!VARIABLES.settings.hasOwnProperty(top) || !VARIABLES.settings[top].hasOwnProperty(sub)) {
                            return false;
                        }
                        if (element.type === 'checkbox') {
                            VARIABLES.settings[top][sub] = !!element.checked;
                        }
                    }
                    fn.__.applySettings();
                    fn.__.saveSettings();
                },

                registerFameOwnGemTableObserver () {
                    OBSERVERS.general.fameOwnGemsObserver.observe(document.querySelector('table#inventoryOtherTable'), {childList: true});
                    setTimeout(() => {
                        log('Disconnecting gem list observer');
                        OBSERVERS.general.fameOwnGemsObserver.disconnect();
                        log('Reset Gems list');
                        VARIABLES.gems = {};
                    }, 2E3);
                },

                saveHouseInfo () {
                    sessionStorage.setItem('RoAHouse', JSON.stringify(VARIABLES.house));
                },
                loadHouseInfo () {
                    let houseInfo = sessionStorage.getItem('RoAHouse');
                    if (houseInfo) {
                        VARIABLES.house = JSON.parse(houseInfo);
                        //placeholder for changes to this object
                        fn.__.saveHouseInfo();
                    }
                },
                updateRooms (roomList) {
                    for (let room of roomList) {
                        if (!VARIABLES.house.rooms.hasOwnProperty(room.room_type)) {
                            VARIABLES.house.rooms[room.room_type] = {
                                items: {},
                            };
                        }
                        VARIABLES.house.roomNameMap[room.room_type] = room.name;
                    }
                },
                updateHouseRoom (roomType, items) {
                    for (let item of items) {
                        VARIABLES.house.rooms[roomType].items[item.item_type] = item;
                        setTimeout(fn.__.setRoomItemTooltip, 500, roomType, item.item_type, item);
                    }
                },
                setRoomItemTooltip (roomType, itemType, data) {
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
                },

                logAvgDmg (battle) {
                    if (!VARIABLES.settings.tracker.average_damage) {
                        return;
                    }

                    if (battle.b.r === 0) {
                        return;
                    }

                    let dmgType = $('#weaponskill').text().split(' ')[0];
                    if (!VARIABLES.tracker.avgDmStrStat.hasOwnProperty(dmgType)) {
                        VARIABLES.tracker.avgDmStrStat[dmgType] = {};
                    }

                    if (!VARIABLES.tracker.avgDmStrStat[dmgType].hasOwnProperty(battle.p.strength.base)) {
                        VARIABLES.tracker.avgDmStrStat[dmgType][battle.p.strength.base] = {
                            total: battle.p.strength.total,
                            dmg: 0,
                            a: 0,
                            s: Date.now(),
                        };
                    }
                    VARIABLES.tracker.avgDmStrStat[dmgType][battle.p.strength.base].dmg += battle.b.p.dm;
                    VARIABLES.tracker.avgDmStrStat[dmgType][battle.p.strength.base].a++;
                },

                saveTracker () {
                    WORKERS.trackerSaveWorker.postMessage({a: 'trackerSave', t: VARIABLES.tracker});
                },
                loadTracker () {
                    let _tracker = {};
                    let _tracker1 = localStorage.getItem(TRACKER_SAVE_KEY);
                    let _tracker2 = localStorage.getItem(`${TRACKER_SAVE_KEY}-platinum`);
                    if (_tracker2) {
                        for (let section in VARIABLES.tracker) {
                            let sectionData = localStorage.getItem(`${TRACKER_SAVE_KEY}-${section}`);
                            if (sectionData) {
                                WORKERS.trackerSaveWorker.postMessage({
                                    a: 'trackerLoadSection',
                                    s: section,
                                    d: sectionData,
                                });
                            }
                        }
                    } else if (_tracker1) {
                        try {
                            _tracker = JSON.parse(_tracker1);
                        } catch (e) {
                            log(`Failure while loading tracker info "${e.message}"`);
                            _tracker = VARIABLES.tracker;
                        }
                        VARIABLES.tracker = _tracker;
                        // changes for 1.0.6
                        if (!VARIABLES.tracker.hasOwnProperty('gold')) {
                            VARIABLES.tracker.gold = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('mats')) {
                            VARIABLES.tracker.mats = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('frags')) {
                            VARIABLES.tracker.frags = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('food')) {
                            VARIABLES.tracker.food = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('wood')) {
                            VARIABLES.tracker.wood = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('iron')) {
                            VARIABLES.tracker.iron = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('stone')) {
                            VARIABLES.tracker.stone = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('strength')) {
                            VARIABLES.tracker.strength = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('health')) {
                            VARIABLES.tracker.health = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('coordination')) {
                            VARIABLES.tracker.coordination = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('agility')) {
                            VARIABLES.tracker.agility = {};
                        }
                        if (!VARIABLES.tracker.hasOwnProperty('avgDmStrStat')) {
                            VARIABLES.tracker.avgDmStrStat = {};
                        }
                        fn.__.saveTracker();
                    }
                    if (_tracker1) {
                        localStorage.removeItem(TRACKER_SAVE_KEY);
                    }
                },
                cleanUpTracker () {
                    for (let section in VARIABLES.tracker) {
                        if (!VARIABLES.tracker.hasOwnProperty(section)) {
                            continue;
                        }
                        if (section === 'avgDmStrStat') {
                            continue;
                        }
                        WORKERS.trackerProccessor.postMessage({
                            a: 'trackerCleanup',
                            d: VARIABLES.tracker[section],
                            i: section,
                            mc: VARIABLES.twoWeeksAgo,
                        });
                    }
                },

                showStats () {
                    document.querySelector('#RQ-hub-stats-avg-dmg-data tbody').innerHTML = '<tr><td colspan="6" class="text-center"><em>No available data</em></td></tr>';

                    let currentSkill = document.querySelector('#weaponskill').textContent.split(' ')[0];
                    if (!VARIABLES.tracker.avgDmStrStat.hasOwnProperty(currentSkill)) {
                        return;
                    }
                    document.querySelector('#RQ-hub-chart-avg-dmg-subtitle').textContent = currentSkill;
                    WORKERS.trackerProccessor.postMessage({
                        a: 'processStatAvgDamage',
                        cs: currentSkill,
                        d: VARIABLES.tracker.avgDmStrStat[currentSkill],
                    });
                },
                showChart (elem, name = '', data = []) {
                    if (data.length) {
                        new Dygraph(document.querySelector(elem), data, {
                            labels: ['Time', name],
                            axes: {
                                y: {
                                    valueFormatter: val => val.format(),
                                    axisLabelFormatter: val => val.abbr(),
                                },
                                x: {
                                    valueFormatter: val => moment.tz(val, GAME_TIME_ZONE).format('Do MMM HH:mm:ss'),
                                },
                            },
                        });
                    }
                },
                showTrackerStatsSection (section) {
                    let list = VARIABLES.tracked.stuffLC.concat(VARIABLES.tracked.stuffDDLC);
                    if (null === section || list.indexOf(section) === -1) {
                        section = VARIABLES.hub.subtab;
                    }

                    VARIABLES.hub.subtab = section;

                    document.querySelector(`#RQ-hub-stats-${section} tbody`).innerHTML = '<tr><td colspan="3" class="text-center"><em>Loading data ...</em></td></tr>';
                    WORKERS.trackerProccessor.postMessage({
                        a: 'processItem',
                        d: VARIABLES.tracker[section],
                        i: section,
                        mc: VARIABLES.twoWeeksAgo,
                    });
                },

                startup () {
                    return {
                        'Starting save worker ..': fn.__.setupWorkers,
                        'Setting up styles ..': fn.__.setupCSS,
                        'Setting up templates ..': fn.__.setupTemplates,
                        'Setting up HTML ..': fn.__.setupHTML,
                        'Setting up variables ..': fn.__.setupVariables,
                        'Setting up observers ..': fn.__.setupObservers,
                        'Loading settings ..': fn.__.loadSettings,
                        'Starting loops ..': fn.__.setupLoops,
                        'Loading tracker info ..': fn.__.loadTracker,
                        'Loading house info ..': fn.__.loadHouseInfo,
                    };
                },

                init () {
                    log('Starting up ..');
                    let startup = fn.__.startup();
                    for (let message in startup) {
                        if (!startup.hasOwnProperty(message)) {
                            continue;
                        }
                        log(message);
                        startup[message]();
                    }
                },
            },
            /** public QoL object methods */
            API: {
                addFameOwnGemsButton (gems) {
                    if (!VARIABLES.settings.fame_own_gems) {
                        return;
                    }
                    for (let gem of gems) {
                        VARIABLES.gems[gem.i] = gem;
                    }
                    fn.__.registerFameOwnGemTableObserver();
                },

                handleHouseData (type, data) {
                    if (!VARIABLES.settings.house_tooltips) {
                        return;
                    }
                    if (type === 'house') {
                        fn.__.updateRooms(data.rooms);
                    } else if (type === 'room') {
                        fn.__.updateHouseRoom(data.room.room_type, data.room.items);
                    }
                    fn.__.saveHouseInfo();
                },

                setChatDirection (dir) {
                    VARIABLES.chatDirection = dir;
                },
                updateMessageLimit (msgBox) {
                    if (!VARIABLES.settings.char_count) {
                        return;
                    }
                    let lng = $(msgBox).text().replace(/\/(w [^\s]+ |r |re |me |m |h |c |t |a |wire.*)/i, '').length;
                    document.querySelector('#chatMessageWrapper').setAttribute('data-limiter', `${lng} / 400`);
                },

                processLoginInfo (data) {
                    if (data.hasOwnProperty('p')) {
                        fn.__.setupLevelRequirements(data.p);
                        if (data.p.hasOwnProperty('chatScroll')) {
                            fn.API.setChatDirection(data.p.chatScroll);
                        }
                    }
                },
                changeSetting (setting, element) {
                    fn.__.processSettingChange(element, ...setting.split('-'));
                },

                processBattle (message) {
                    if (message.hasOwnProperty('results')) {
                        let data = message.results;

                        fn.helpers.togglePerHourSection('battle');

                        VARIABLES.QoLStats.b++;
                        if (data.hasOwnProperty('b')) {
                            VARIABLES.QoLStats.d.BattleXPPerHour += data.b.xp;
                            VARIABLES.QoLStats.d.BattleGoldPerHour += data.b.g;
                            VARIABLES.QoLStats.d.BattleClanXPPerHour += data.b.hasOwnProperty('cxp') ? data.b.cxp : 0;
                            VARIABLES.QoLStats.d.BattleClanGoldPerHour += data.b.hasOwnProperty('cg') ? data.b.cg : 0;
                            if (VARIABLES.QoLStats.PlXPReq > 0 && data.b.r === 1) { // won
                                let eta;
                                if (data.b.xp === 0) {
                                    eta = 'never';
                                } else {
                                    eta = (VARIABLES.QoLStats.PlXPReq - data.p.currentXP) / data.b.xp * data.p.next_action;
                                    eta = eta.toTimeEstimate();
                                }
                                VARIABLES.QoLStats.e.LevelETA.text(eta);
                            }
                            fn.__.logAvgDmg(data);
                        }
                        VARIABLES.QoLStats.na = data.p.next_action;

                        fn.helpers.updateStats('battle', data.b);
                        if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                        if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                    }
                },
                processTS (message) {
                    if (message.hasOwnProperty('results')) {
                        let data = message.results;
                        fn.helpers.togglePerHourSection('harvest');

                        VARIABLES.QoLStats.h++;
                        if (data.hasOwnProperty('a')) {
                            VARIABLES.QoLStats.d.TSXPPerHour += data.a.xp;
                            VARIABLES.QoLStats.d.TSResourcesPerHour += data.a.hasOwnProperty('a') ? data.a.a : 0;
                            VARIABLES.QoLStats.d.TSClanResourcesPerHour += data.a.hasOwnProperty('ca') ? data.a.ca : 0;
                            VARIABLES.QoLStats.e.TSResourcesPerHour.removeClass('food wood iron stone').addClass(data.a.r);
                            let token = data.a.r;
                            token = token.charAt(0).toUpperCase() + token.substr(1) + 'XPReq';
                            let skill = data.a.s;
                            VARIABLES.QoLStats[token] = data.p[skill].tnl;
                            let eta;
                            if (data.a.xp === 0) {
                                eta = 'never';
                            } else {
                                eta = (VARIABLES.QoLStats[token] - data.p[skill].xp) / data.a.xp * data.p.next_action;
                                eta = eta.toTimeEstimate();
                            }
                            VARIABLES.QoLStats.e.LevelETA.text(eta);
                        }
                        VARIABLES.QoLStats.na = data.p.next_action;
                        fn.helpers.updateStats('TS', data.a);
                        if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                        if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                    }
                },
                processCraft (message) {
                    if (message.hasOwnProperty('results')) {
                        let data = message.results;
                        fn.helpers.togglePerHourSection('craft');

                        VARIABLES.QoLStats.ct++;
                        if (data.hasOwnProperty('a')) {
                            VARIABLES.QoLStats.d.CTXPPerHour += data.a.xp;
                            let token = 'CTXPReq';
                            VARIABLES.QoLStats[token] = data.p['crafting'].tnl;
                            let eta;
                            if (data.a.xp === 0) {
                                eta = 'never';
                            } else {
                                eta = (VARIABLES.QoLStats[token] - data.p['crafting'].xp) / data.a.xp * data.p.next_action;
                                eta = eta.toTimeEstimate();
                            }
                            VARIABLES.QoLStats.e.LevelETA.text(eta);
                        }
                        VARIABLES.QoLStats.na = data.p.next_action;
                        fn.helpers.updateStats('Crafting', data.a);
                        if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                        if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                    }
                },
                processCarve (message) {
                    if (message.hasOwnProperty('results')) {
                        let data = message.results;
                        fn.helpers.togglePerHourSection('carve');

                        VARIABLES.QoLStats.ca++;
                        if (data.hasOwnProperty('a')) {
                            VARIABLES.QoLStats.d.CAXPPerHour += data.a.xp;
                            let token = 'CAXPReq';
                            VARIABLES.QoLStats[token] = data.p['carving'].tnl;
                            let eta;
                            if (data.a.xp === 0) {
                                eta = 'never';
                            } else {
                                eta = (VARIABLES.QoLStats[token] - data.p['carving'].xp) / data.a.xp * data.p.next_action;
                                eta = eta.toTimeEstimate();
                            }
                            VARIABLES.QoLStats.e.LevelETA.text(eta);
                        }
                        VARIABLES.QoLStats.na = data.p.next_action;
                        fn.helpers.updateStats('Carving', data.a);
                        if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                        if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                            fn.helpers.updateFavico(data.p.autos_remaining);
                        }
                    }
                },
                processEventUpdate (message) {
                    fn.helpers.togglePerHourSection('event-update');

                    $('#EventTotalParticipants').text((message.attacker_count + message.harvester_count + message.crafter_count + message.carver_count).format());
                    $('#EventBattlingParticipants').text(message.attacker_count.format());
                    $('#EventHarvestingParticipants').text(message.harvester_count.format());
                    $('#EventCraftingParticipants').text(message.crafter_count.format());
                    $('#EventCarvingParticipants').text(message.carver_count.format());
                },
                processEventAction (message) {
                    if (VARIABLES.settings.badge_event) {
                        fn.helpers.updateFavico(message.results.stamina, (message.results.time_remaining * 1000).toTimeRemaining(true).replace(':', ''), '#ff1493');
                    }
                },

                closeHub () {
                    $('#RQ-hub-wrapper').hide();
                    fn.helpers.hubToggleTo();
                },
                hubShowSection (main, sub = null) {
                    fn.helpers.hubToggleTo(`#RQ-hub-${main}-wrapper`);
                    switch (main) {
                        case 'charts':
                            fn.__.showTrackerStatsSection(sub);
                            break;

                        case 'stats-info':
                            fn.__.showStats();
                            break;

                        case 'dashboard':
                            fn.__.localStorageStats();
                            fn.__.getUpdateLog();
                            break;
                    }
                },

                resetHourlyStats (section) {
                    switch (section) {
                        case 'battle':
                            VARIABLES.QoLStats.bs = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.b = 0;
                            VARIABLES.QoLStats.BattleXPPerHour = 0;
                            VARIABLES.QoLStats.BattleGoldPerHour = 0;
                            VARIABLES.QoLStats.BattleClanXPPerHour = 0;
                            VARIABLES.QoLStats.BattleClanGoldPerHour = 0;
                            break;

                        case 'ts':
                            VARIABLES.QoLStats.hs = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.h = 0;
                            VARIABLES.QoLStats.TSXPPerHour = 0;
                            VARIABLES.QoLStats.TSResourcesPerHour = 0;
                            VARIABLES.QoLStats.TSClanResourcesPerHour = 0;
                            VARIABLES.QoLStats.TSResourcesPerHour = 0;
                            break;

                        case 'craft':
                            VARIABLES.QoLStats.cts = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.ct = 0;
                            VARIABLES.QoLStats.CTXPPerHour = 0;
                            break;

                        case 'carve':
                            VARIABLES.QoLStats.cas = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.ca = 0;
                            VARIABLES.QoLStats.CAXPPerHour = 0;
                            break;

                        default:
                            // :)
                            break;
                    }
                },

                removeLocalStorageItem (item, force = false) {
                    if (null !== localStorage.getItem(item)) {
                        localStorage.removeItem(item);
                    }
                    if (item === SETTINGS_SAVE_KEY) {
                        fn.__.saveSettings();
                    }
                    fn.__.localStorageStats();
                },

                getEventRewardsRegex () {
                    return VARIABLES.eventRewardsRegex;
                },

                showEventRewardRatio (rewardMessage) {
                    if (!VARIABLES.settings.event_ratio_message) {
                        return;
                    }
                    let [_, ep, plat] = rewardMessage.match(VARIABLES.eventRewardsRegex);

                    ep = parseInt(ep.replace(',', ''));
                    plat = parseInt(plat.replace(',', ''));

                    let ratio = plat / ep;

                    let message = `<li>[${moment.tz(GAME_TIME_ZONE).format('HH:mm:ss')}] <span class="chat_notification">Your Platinum to Event Points ratio was ~${ratio.toFixed(5)}. (${ep.format()}/${plat.format()}/${ratio.toFixed(5)})</span> </li>`;
                    fn.helpers.addMessageToChat(message);
                    console.log(VARIABLES.settings.event_ratio_chat_prepare);
                    console.log(document.querySelector('#chatMessage').textContent);
                    if (true === VARIABLES.settings.event_ratio_chat_prepare && document.querySelector('#chatMessage').textContent === '') {
                        document.querySelector('#chatMessage').textContent = `${ep.format()}/${plat.format()}/${ratio.toFixed(5)}`;
                    }
                },
            },
        };

        fn.__.init();

        return fn.API;
    })(window);

    $(document).on('roa-ws:battle', function (e, data) {
        QoL.processBattle(data);
    });

    $(document).on('roa-ws:harvest', function (e, data) {
        QoL.processTS(data);
    });

    $(document).on('roa-ws:craft', function (e, data) {
        QoL.processCraft(data);
    });

    $(document).on('roa-ws:carve', function (e, data) {
        QoL.processCarve(data);
    });

    $(document).on('roa-ws:event_update', function (e, data) {
        QoL.processEventUpdate(data);
    });

    $(document).on('roa-ws:event_action', function (e, data) {
        QoL.processEventAction(data);
    });

    $(document).on('roa-ws:login_info', function (e, data) {
        QoL.processLoginInfo(data);
    });

    $(document).on('roa-ws:page:house', function (e, data) {
        QoL.handleHouseData('house', data);
    });

    $(document).on('roa-ws:page:house_room', function (e, data) {
        QoL.handleHouseData('room', data);
    });

    $(document).on('roa-ws:page:settings_preferences, roa-ws:page:settings_preferences_change', function (e, d) {
        // 12 is the relevant option ..
        // d.preferences[12] can be "0" or "1" (yes, string) => 0 - default, 1 - retarded
        QoL.setChatDirection(d.preferences[12] === '1' ? 'down' : 'up');
    });

    // $(document).on("roa-ws:message", function(e, data){
    //     // was thinking lightweight markdown formatting
    // });

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
        QoL.hubShowSection('dashboard');
    });

    $(document).on('click', '#modalBackground', function () {
        QoL.closeHub();
    });

    $(document).on('click', '#RQ-hub-charts', function () {
        QoL.hubShowSection('charts');
    });

    $(document).on('click', '#RQ-hub-charts-tabs a', function (e) {
        e.preventDefault();
        if ($(this).data('resname')) {
            $(this).tab('show');
            QoL.hubShowSection('charts', $(this).data('resname'));
        }
    });

    $(document).on('click', '#RQ-hub-stats', function () {
        QoL.hubShowSection('stats-info');

    });

    $(document).on('click', '#RQ-hub-settings', function () {
        QoL.hubShowSection('settings');
    });

    $(document).on('click', '#RQ-hub-dashboard', function () {
        QoL.hubShowSection('dashboard');
    });

    $(document).on('click', '#clearBattleStats', function () {
        QoL.resetHourlyStats('battle');
    });

    $(document).on('click', '#clearTradeskillStats', function () {
        QoL.resetHourlyStats('ts');
    });

    $(document).on('click', '#clearCraftingStats', function () {
        QoL.resetHourlyStats('craft');
    });

    $(document).on('click', '#clearCarvingStats', function () {
        QoL.resetHourlyStats('carve');
    });

    $(document).on('change', '.qol-setting', function () {
        QoL.changeSetting(this.getAttribute('data-key'), this);
    });

    $(document).on('roa-ws:notification', function (e, data) {
        if (data.m.match(QoL.getEventRewardsRegex())) {
            QoL.showEventRewardRatio(data.m);
        }
    });

    $(document).on('click', '.roa-ls-remove', function () {
        let lsKey = this.getAttribute('data-ls-key');
        $.confirm({
            title: 'localStorage intem deletetion',
            message: `Are you sure you want to remove ${lsKey} localStorage entry?<br>If this entry is from an userscript, you may need to refresh before it's reentered by said script.`,
            buttons: {
                Remove: {
                    class: 'green',
                    action: function () {
                        QoL.removeLocalStorageItem(lsKey);
                    },
                },
                Cancel: {
                    class: 'red',
                    action: function () {},
                },
            },
        });
    });
})(window, jQuery);