// ==UserScript==
// @name         RoA-QoL
// @namespace    Reltorakii_is_awesome
// @version      2.9.9
// @description  try to take over the world!
// @author       Reltorakii
// @icon         https://cdn.jsdelivr.net/gh/edvordo/roa-qol@2.8.4/resources/img/logo-32.png
// @match        https://*.avabur.com/game*
// @match        http://*.avabur.com/game*
// @resource     QoLCSS             https://cdn.jsdelivr.net/gh/edvordo/roa-qol@2.8.6/resources/css/qol.css
// @resource     QoLHeaderHTML      https://cdn.jsdelivr.net/gh/edvordo/roa-qol@2.9.9/resources/templates/header.html
// @resource     QoLSettingsHTML    https://cdn.jsdelivr.net/gh/edvordo/roa-qol@2.9.7/resources/templates/settings.html
// @resource     SpectrumCSS        https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.0/spectrum.min.css
// @resource     favicon.ico        https://cdn.jsdelivr.net/gh/edvordo/roa-qol@2.8.8/resources/img/favicon.ico
// @require      https://cdn.jsdelivr.net/gh/edvordo/roa-qol@2.9.0/common.js
// @require      https://cdn.jsdelivr.net/gh/ejci/favico.js@0.3.10/favico.js
// @require      https://cdn.jsdelivr.net/gh/omichelsen/compare-versions@3.1.0/index.js
// @require      https://cdn.jsdelivr.net/gh/lodash/lodash@4.17.4/dist/lodash.min.js
// @require      https://cdn.jsdelivr.net/gh/markdown-it/markdown-it@8.4.1/dist/markdown-it.min.js
// @require      https://cdn.jsdelivr.net/npm/vue@2.6.14
// @require      https://cdn.jsdelivr.net/gh/ujjwalguptaofficial/JsStore@2.3.1/dist/jsstore.worker.min.js
// @require      https://cdn.jsdelivr.net/gh/ujjwalguptaofficial/JsStore@2.3.1/dist/jsstore.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/spectrum/1.8.0/spectrum.min.js
// @downloadURL  https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @updateURL    https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @grant        GM_info
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// ==/UserScript==
(function (window, $) {

    'use strict';

    if (typeof MutationObserver.prototype.restart !== 'function') {
        MutationObserver.prototype.observeArguments = []; // internal variable to store the args
        MutationObserver.prototype.originalObserve  = MutationObserver.prototype.observe; // save the original implementation
        MutationObserver.prototype.observe          = function (target, options) { // overwrite the function
            this.observeArguments = [target, options];
            return this.originalObserve.apply(this, this.observeArguments);
        };
        MutationObserver.prototype.restart          = function () { // and finally add the restart function
            return this.originalObserve.apply(this, this.observeArguments);
        };
    }

    let QoL = (function QoL() {

        const GAME_TIME_ZONE = 'UTC';

        const INTERNAL_UPDATE_URI   = 'https://api.github.com/repos/edvordo/roa-qol/contents/RoA-QoL.user.js';
        const INTERNAL_TAGS_URL     = 'https://api.github.com/repos/edvordo/roa-qol/tags';
        const INTERNAL_RELEASES_URL = 'https://api.github.com/repos/edvordo/roa-qol/releases';

        const TRACKER_SAVE_KEY = 'QoLTracker';

        const QOL_DB_NAME        = 'RQDB';
        const TRACKER_TBL_NAME   = 'tracker';
        const AVGDMGSTR_TBL_NAME = 'average_damage_to_strength';

        const DB_QUEUE               = {};
        DB_QUEUE[TRACKER_TBL_NAME]   = [];
        DB_QUEUE[AVGDMGSTR_TBL_NAME] = [];

        const TRACKER_DB_SCHEMA = {
            name  : QOL_DB_NAME,
            tables: [
                {
                    name   : TRACKER_TBL_NAME,
                    columns: [
                        new JsStore.Column('id').options([JsStore.COL_OPTION.PrimaryKey, JsStore.COL_OPTION.AutoIncrement]).setDataType(JsStore.DATA_TYPE.Number),
                        new JsStore.Column('ts').setDataType(JsStore.DATA_TYPE.String),
                        new JsStore.Column('d').setDataType(JsStore.DATA_TYPE.String),
                        new JsStore.Column('v').setDataType(JsStore.DATA_TYPE.Number),
                        new JsStore.Column('g').setDataType(JsStore.DATA_TYPE.Number).setDefault(0).disableSearch(),
                        new JsStore.Column('t').setDataType(JsStore.DATA_TYPE.String),
                    ]
                },
                {
                    name   : AVGDMGSTR_TBL_NAME,
                    columns: [
                        new JsStore.Column('id').options([JsStore.COL_OPTION.PrimaryKey, JsStore.COL_OPTION.AutoIncrement]).setDataType(JsStore.DATA_TYPE.Number),
                        new JsStore.Column('ts').setDataType(JsStore.DATA_TYPE.String),
                        new JsStore.Column('s').setDataType(JsStore.DATA_TYPE.Number).disableSearch(),
                        new JsStore.Column('a').setDataType(JsStore.DATA_TYPE.Number).disableSearch(),
                        new JsStore.Column('d').setDataType(JsStore.DATA_TYPE.Number).disableSearch(),
                        new JsStore.Column('dt').setDataType(JsStore.DATA_TYPE.Number).disableSearch(),
                        new JsStore.Column('t').setDataType(JsStore.DATA_TYPE.String),
                    ]
                }
            ]
        };

        const DEFAULT_SETTINGS = {
            badge_stamina              : true,
            badge_fatigue              : true,
            badge_event                : true,
            house_tooltips             : true,
            event_abbreviation         : true,
            char_count                 : true,
            command_helper             : false,
            fame_own_gems              : true,
            mass_gem_send_all_by_row   : true,
            event_ratio_message        : true,
            event_ratio_chat_prepare   : true,
            set_max_quest_reward       : true,
            clan_donations_modes       : true,
            drop_tracker               : true,
            chat_content_swap          : false,
            user_color_messages        : true,
            use_username_based_color   : false,
            prefill_all_to_sell        : false,
            estimate_quest_completion  : true,
            undercut_by_one            : false,
            crystal_shop_cry_info      : false,
            crystal_shop_prefill_to_buy: false,
            export_ingredients         : true,
            user_color_set             : {},
            timer_estimates            : false,
            jump_mobs_increment        : 11,
            jump_mobs_speed            : 50,
            gains_period_days          : false,
            remember_chat_height       : true,
            effects_timers             : true,
            abbreviate_stats_in_header : true,
            tracker                    : {
                fame          : true,
                crystals      : true,
                platinum      : true,
                gold          : true,
                food          : true,
                wood          : true,
                iron          : true,
                stone         : true,
                mats          : true,
                frags         : true,
                strength      : true,
                health        : true,
                coordination  : true,
                agility       : true,
                average_damage: true,
                captcha       : false,
            },
        };

        const SETTINGS_SAVE_KEY = 'QolSettings';

        const VARIABLES = {
            username           : '',
            FI                 : null,
            chatDirection      : 'up',
            checkForUpdateTimer: 6 * 60 * 60 * 1000, // 6 hours
            gems               : {},

            eventRewardsRegex: /([0-9,]+) Event Points? and ([0-9,]+) Platinum/,

            settings: DEFAULT_SETTINGS,

            QoLStats: {
                e         : {}, // elements
                d         : {}, // data
                bs        : moment.tz(GAME_TIME_ZONE),
                hs        : moment.tz(GAME_TIME_ZONE),
                cts       : moment.tz(GAME_TIME_ZONE),
                cas       : moment.tz(GAME_TIME_ZONE),
                b         : 0, // battles
                h         : 0, // harvests
                ct        : 0, // crafts
                ca        : 0, // varves
                na        : 0, // next action
                PlXPReq   : 0,
                FoodXPReq : 0,
                WoodXPReq : 0,
                IronXPReq : 0,
                StoneXPReq: 0,
                CrftXPReq : 0,
                CarvXPReq : 0,
            },

            tracker: [
                'fame',
                'crystals',
                'platinum',
                'gold',
                'mats',
                'frags',
                'food',
                'wood',
                'iron',
                'stone',
                'strength',
                'health',
                'coordination',
                'agility',
                'avgDmStrStat'
            ],
            jsstore: {
                db     : new JsStore.Instance(),
                tracker: {
                    latest: null
                },
                avg_dmg: {
                    latest: null
                }
            },
            tracked: {
                stuff    : ['Fame', 'Crystals', 'Platinum', 'Gold', 'Mats', 'Frags', 'Food', 'Wood', 'Iron', 'Stone'],
                stuffDD  : ['Strength', 'Health', 'Coordination', 'Agility'],
                stuffLC  : [],
                stuffDDLC: [],
                map      : {},
            },

            house: {
                rooms      : {},
                roomNameMap: {},
            },
            hub  : {
                tab   : 'dashboard',
                subtab: 'platinum',
            },

            trackerHistoryThreshold: () => moment.tz(GAME_TIME_ZONE).subtract(14, 'days').format('YYYY-MM-DD 00:00:00'),

            drop_tracker: {
                trackerStart: moment.tz(GAME_TIME_ZONE).format('Do MMM Y HH:mm:ss'),
                actions     : {battle: 0, TS: 0, craft: 0, carve: 0},
                random_drops: {
                    total     : {battle: {t: 0, a: null}, TS: {t: 0, a: null}, craft: {t: 0, a: null}, carve: {t: 0, a: null}},
                    plundering: {battle: {t: 0, a: 0}, TS: {t: 0, a: 0}, craft: {t: 0, a: 0}, carve: {t: 0, a: 0}},
                    multi_drop: {battle: {t: 0, a: 0}, TS: {t: 0, a: 0}, craft: {t: 0, a: 0}, carve: {t: 0, a: 0}},
                    items     : {battle: {t: 0, a: 0}, TS: {t: 0, a: 0}, craft: {t: 0, a: 0}, carve: {t: 0, a: 0}}
                },
                stats_drops : {
                    total     : {battle: {t: 0, a: null}, TS: {t: 0, a: null}, craft: {t: 0, a: null}, carve: {t: 0, a: null}},
                    growth    : {battle: {t: 0, a: 0}, TS: {t: 0, a: 0}, craft: {t: 0, a: 0}, carve: {t: 0, a: 0}},
                    multi_stat: {battle: {t: 0, a: 0}, TS: {t: 0, a: 0}, craft: {t: 0, a: 0}, carve: {t: 0, a: 0}},
                }
            },

            tagMap: {},

            donationsTable: document.querySelector('#myClanDonationTable'),

            battleQuestsDropRates: {
                kill    : 1,
                marble  : 2,
                rabbit  : 3,
                talisman: 4,
                vial    : 5,
                tome    : 6,
                torch   : 7,
                heirloom: 8,
                perfum  : 9,
                document: 10
            },

            ingredientExportData: '',

            marketData: {}
        };

        // noinspection JSUnresolvedFunction
        const TEMPLATES = {
            headerHTML               : GM_getResourceText('QoLHeaderHTML'),
            hubHTML                  : '',
            dashboardHTML            : ``,
            clanDonationsModeSelector: `<div class="form-group row" id="RQ-clan-donation-mode-selector-wrapper">
    <div class="col-md-6 col-lg-5">
        <div class="input-group input-group-sm">
            <span class="input-group-btn"><button type="button" class="btn btn-primary" style="margin-top: 0;">View mode</button></span>
            <select class="form-control" id="RQ-clan-donation-mode-selector">
                <option value="abbr">Abbreviated</option>
                <option value="full">Full</option>
                <option value="percent">Percentage</option>
            </select>
            <span class="input-group-btn"><button type="button" class="btn btn-primary" style="margin-top: 0;" id="RQ-donation-table-loaded"></button></span>
        </div>
    </div>
</div>`,
            profileTooltipUserColor  : `<span class="RQ-user-color-option"> · </span><a class="RQ-user-color-option" id="RQ-user-color-set">Colori[z]e</a>`
        };

        const OBSERVERS = {
            toggleable: {
                eventAbbreviator() {
                    let regexes = {
                        attack   : /You .+ (Bow|Sword|Staff|fists).+([0-9]+ times? hitting [0-9]+ times?), dealing .+ damage.$/i,
                        // You cast 1 spell at [Vermin] Boss Forty-two, dealing 2,127,514,765 damage.
                        spellcast: /^You cast [0-9]+ spell.+dealing .+ damage.$/i,
                        summary  : /([0-9,]+ adventurers? (have|has) ([^\s]+)(, dealing)? [0-9,]+)/g,
                        heal     : /You healed [0-9,]+ HP!$/i,
                        counter  : /You counter .+ ([0-9,]+ times?).+ dealing .* damage.$/i,
                        bosshit  : /^\[.+] Boss .+ dealing [0-9,]+ damage\.$/,
                        bossmiss : /^\[.+] Boss .+ but misses!$/i,
                        res      : /^You found ([0-9,]+) ([a-z]+)\.$/i,
                        craft    : /^You smashed down .* Hammer ([0-9,]+) times\. .* (\+[0-9,.%]+ [a-z\s]+) to the item\.$/i,
                        craft_sub: /(\+[0-9,.%]+ [a-z\s]+)/ig,
                        carve    : /^You carefully slice.*Saw ([0-9,]+) times?\..+ ([0-9,]+)\.$/i,
                    };
                    let o       = new MutationObserver(function (ml) {
                        for (let m of ml) {
                            if (m.addedNodes.length) {
                                let a = m.addedNodes[0].textContent;

                                let parse;

                                if ((parse = a.match(regexes.attack)) !== null) {
                                    let spans                 = m.addedNodes[0].querySelectorAll('span:not(.ally)');
                                    let iconMap               = {
                                        'bow'  : '\uD83C\uDFF9 ',
                                        'sword': '\u2694 ',
                                        'staff': '\u2728 ',
                                        'fists': '\uD83D\uDC4A ',
                                    };
                                    m.addedNodes[0].innerHTML = '';
                                    m.addedNodes[0].appendChild(document.createTextNode(iconMap[parse[1].toLowerCase()] + ' +'));
                                    let dmgSpan         = spans[spans.length === 4 ? 3 : 2];
                                    let originalDamage  = dmgSpan.textContent;
                                    dmgSpan.textContent = parseFloat(originalDamage.replace(/,/g, '')).abbr();
                                    dmgSpan.setAttribute(
                                        'title',
                                        originalDamage + '\n' + spans[spans.length === 4 ? 2 : 1].textContent
                                    );
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
                                    let spans                 = m.addedNodes[0].querySelectorAll('span');
                                    m.addedNodes[0].innerHTML = '';

                                    let xAdv;

                                    xAdv             = spans[0];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[1]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' resources, '));

                                    xAdv             = spans[2];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[3]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' damage, '));

                                    xAdv             = spans[4];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[5]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' bonuses and '));

                                    xAdv             = spans[6];
                                    xAdv.textContent = xAdv.textContent.replace(/.+/, '+');
                                    m.addedNodes[0].appendChild(xAdv);
                                    m.addedNodes[0].appendChild(spans[7]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' resonance'));
                                } else if ((parse = a.match(regexes.heal)) !== null) {
                                    let span                  = m.addedNodes[0].querySelector('span');
                                    m.addedNodes[0].innerHTML = '';

                                    m.addedNodes[0].appendChild(document.createTextNode('+'));
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.counter)) !== null) {
                                    let spans                 = m.addedNodes[0].querySelectorAll('span');
                                    m.addedNodes[0].innerHTML = '';

                                    m.addedNodes[0].appendChild(document.createTextNode('\u2194 '));
                                    let originalDamage = spans[1].textContent;
                                    spans[1].textContent = parseFloat(spans[1].textContent.replace(/,/g, '')).abbr();
                                    spans[1].setAttribute('title', originalDamage);
                                    m.addedNodes[0].appendChild(spans[1]);
                                    m.addedNodes[0].appendChild(document.createTextNode(' counter damage'));
                                    m.addedNodes[0].appendChild(document.createTextNode(` (${parse[1]})`));
                                } else if ((parse = a.match(regexes.bosshit)) !== null) {
                                    let span                  = m.addedNodes[0].querySelector('span:last-child');
                                    m.addedNodes[0].innerHTML = '';

                                    m.addedNodes[0].appendChild(document.createTextNode('\uD83C\uDFAF'));
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.bossmiss)) !== null) {
                                    let boss                  = m.addedNodes[0].querySelector('span:first-child');
                                    m.addedNodes[0].innerHTML = '';
                                    let span                  = document.createElement('span');
                                    span.setAttribute('title', boss.textContent);
                                    span.textContent = '\uD83D\uDF9C boss missed';
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.res)) !== null) {
                                    let iconMap               = {
                                        'food' : '\uD83C\uDFA3 ',
                                        'wood' : '\uD83C\uDF32 ',
                                        'iron' : '\u26CF ',
                                        'stone': '\uD83D\uDC8E ',
                                    };
                                    m.addedNodes[0].innerHTML = '';
                                    m.addedNodes[0].appendChild(document.createTextNode(`${iconMap[parse[2]]} `));

                                    let span = document.createElement('span');
                                    span.classList.add(parse[2]);
                                    span.textContent = `+${parse[1]} ${parse[2]}`;
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.craft)) !== null) {
                                    let parse2                = a.match(regexes.craft_sub);
                                    parse2                    = parse2.map(item => item.replace(' to the item', ''));
                                    m.addedNodes[0].innerHTML = '';
                                    m.addedNodes[0].appendChild(document.createTextNode(`\uD83D\uDD28 `));

                                    let span = document.createElement('span');
                                    span.classList.add('crafting');
                                    span.textContent = `+${parse[1]} bonuses`;
                                    span.setAttribute('title', `${parse2.join('\n')}`);
                                    m.addedNodes[0].appendChild(span);
                                } else if ((parse = a.match(regexes.carve)) !== null) {
                                    let parse2                = a.match(regexes.craft_sub);
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
                    o.disconnect();
                    return o;
                },
                chatMessagesObserver() {
                    let o = new MutationObserver(mutationList => {
                        mutationList.forEach(mutation => {
                            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                for (let node of mutation.addedNodes) {
                                    fn.__.dyeUserMessage(node);
                                }
                            }
                        });
                    });
                    o.observe(document.querySelector('#chatMessageList'), {childList: true});
                    o.observe(document.querySelector('#chatMessageHistory'), {childList: true});
                    return o;
                },
                chatMessageListWrapperHeightObserver() {
                    const o = new MutationObserver((mutationList) => {
                          mutationList.forEach(mutation => {
                              if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                                  localStorage.setItem('chatMessageListWrapperHeight', mutation.target.style.height);
                              }
                          });
                    });

                    o.observe(document.querySelector('#chatMessageListWrapper'), { attributeFilter: ['style'] });
                    return o;
                },
                effectsObserver() {
                    let o = new MutationObserver(mutationList => {
                        mutationList.forEach(mutation => {
                            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                                for (let node of mutation.addedNodes) {
                                    const effectTimeInfoElement = node.querySelector('.col-xs-6.col-md-12.col-lg-7');

                                    let regExp = /([0-9]+[hms])/g;
                                    if (true === regExp.test(effectTimeInfoElement.textContent)) {
                                        const matches = effectTimeInfoElement.textContent.match(regExp);
                                        let hours = parseInt(matches.find(i => i[i.length - 1] === 'h') || 0) * 60 * 60;
                                        let minutes = parseInt(matches.find(i => i[i.length - 1] === 'm') || 0) * 60;
                                        let seconds = parseInt(matches.find(i => i[i.length - 1] === 's') || 0);

                                        effectTimeInfoElement.textContent = ((hours + minutes + seconds) * 1000).toTimeEstimate();
                                    }
                                }
                            }
                        });
                    });

                    o.observe(document.querySelector('#effectTable'), { childList: true });

                    return o;
                },
                houseQuickBuildTimestamps: new MutationObserver(mutationList => {
                    mutationList.forEach(mutation => {
                        if ('childList' === mutation.type && mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach(i => {
                                let total = fn.helpers.computeTotalTimeInSeconds(i.textContent);
                                if (0 === total) {
                                    return false;
                                }
                                let when = moment.tz(GAME_TIME_ZONE).add(total, 'seconds');
                                let span = document.createElement('span');
                                span.classList.add('small');
                                span.classList.add('rq-timer');
                                span.setAttribute('data-seconds', total);
                                span.textContent = ` (${when.format('MMM DD HH:mm:ss')})`;
                                i.appendChild(span);
                            });
                        }
                    });
                }),
                houseItemBuildTimestamps : new MutationObserver(mutationList => {
                    let parent = document.querySelector('#houseRoomItemLevelUpgradeTimeCost');
                    mutationList.forEach(mutation => {
                        if ('childList' === mutation.type && mutation.addedNodes.length > 0) {
                            mutation.addedNodes.forEach(i => {
                                let total = fn.helpers.computeTotalTimeInSeconds(i.textContent);
                                if (0 === total) {
                                    return false;
                                }
                                let when = moment.tz(GAME_TIME_ZONE).add(total, 'seconds');
                                let span = document.createElement('span');
                                span.classList.add('small');
                                span.classList.add('rq-timer');
                                span.setAttribute('data-seconds', total);
                                span.textContent = ` (${when.format('MMM DD HH:mm:ss')})`;
                                parent.appendChild(span);
                            });
                        }
                    });
                })
            },
            general   : {
                fameOwnGemsObserver   : new MutationObserver(
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
                            /** @namespace gem.o */
                            /** @namespace gem.i */
                            let gem = VARIABLES.gems[gemId];
                            if (gem.o === VARIABLES.username) {
                                continue;
                            }

                            let a         = document.createElement('a');
                            a.textContent = '[Fame Own]';
                            a.setAttribute('data-gemid', gem.i);
                            a.setAttribute('class', 'RoAQoL-fameown-gem');
                            rowLastTd.appendChild(document.createTextNode(' '));
                            rowLastTd.appendChild(a);
                        }
                    }
                ),
                splicingMenuGemsPicker: new MutationObserver(_.debounce(function () {
                    document.querySelectorAll('#carve_splice_secondary option').forEach(fn.helpers.colorGemOption);
                }, 100)),
                craftingTableQueue: new MutationObserver(_.debounce(() => {
                    VARIABLES.QoLStats.d.CraftCarveQueueETA = [...document.querySelectorAll('#craft_sortable .itemWithTooltip')]
                      .map(item => JSON.parse(item.dataset.json))
                      .map(item => ({ mc: item.mc, mr: item.mr }))
                      .reduce((carry, { mc, mr }) => carry += (mr - mc), 0);
                }, 100)),
                carvingTableQueue: new MutationObserver(_.debounce(() => {
                    VARIABLES.QoLStats.d.CraftCarveQueueETA = [...document.querySelectorAll('#carve_sortable .gemWithTooltip')]
                      .map(item => JSON.parse(item.dataset.json))
                      // {"i":11503003,"res":"","n":"Synthetic Zirconium of Training","c":"zirconium","o":"Reltorakii","l":70,"s":65535,"s2":null,"b":[""],"mr":914,"mc":849}
                      .map(item => ({ mc: item.mc, mr: item.mr }))
                      .reduce((carry, { mc, mr }) => carry += (mr - mc), 0);
                }, 100))
            },
        };

        const fn = {
            helpers: {
                scrollToBottom(selector) {
                    $(selector).animate({
                        scrollTop: $(selector).prop('scrollHeight'),
                    });
                },
                initObserver(name, attrName, selector) {
                    let o = new MutationObserver(function (ml) {
                        if (VARIABLES.jsstore.tracker.latest === null) {
                            return;
                        }
                        for (let m of ml) {
                            if (m.type !== 'attributes' || m.attributeName !== attrName) {
                                continue;
                            }
                            let oldValue = m.oldValue;
                            let nowValue = m.target.getAttribute(m.attributeName);

                            if (!oldValue || !nowValue || oldValue === nowValue) {
                                continue;
                            }
                            let ts = moment.tz(GAME_TIME_ZONE);
                            let d  = ts.format('Y-MM-DD');
                            let v  = parseInt(nowValue.replace(/,/g, ''));

                            let latest = v;
                            if (
                                VARIABLES.jsstore.tracker.latest.hasOwnProperty(d) &&
                                VARIABLES.jsstore.tracker.latest[d].hasOwnProperty(name)
                            ) {
                                latest = VARIABLES.jsstore.tracker.latest[d][name];
                            }

                            let gain = 0;
                            if (v > latest) {
                                gain = v - latest;
                            }

                            let item = {
                                ts: ts.format(),
                                d : d,
                                v : v,
                                g : gain,
                                t : name,
                            };
                            DB_QUEUE[TRACKER_TBL_NAME].push(item);
                            if (!VARIABLES.jsstore.tracker.latest.hasOwnProperty(d)) {
                                VARIABLES.jsstore.tracker.latest[d] = {};
                            }
                            VARIABLES.jsstore.tracker.latest[d][name] = v;
                        }
                    });
                    o.observe(document.querySelector(selector), {attributes: true, attributeOldValue: true});
                    o.disconnect();
                    return o;
                },
                togglePerHourSection(section) {
                    $('.rq-h').addClass('hidden');
                    $(`.rq-h.rq-${section}`).removeClass('hidden');
                },
                updateFavico(to, text = null, bg = null) {
                    let _bg = bg;
                    if (bg === null) {
                        _bg = parseInt(to) > 0 ? '#050' : '#a00';
                    }
                    let _text = text === null ? Math.abs(to) : text;
                    VARIABLES.FI.badge(_text, {bgColor: _bg});
                },
                hubToggleTo(div = null) {
                    $('#RQ-hub-sections > div').hide();
                    if (div !== null) {
                        $(div).fadeIn();
                    }
                },
                updateStats(type, data) {
                    let now           = moment.tz(GAME_TIME_ZONE);
                    let hour          = 60 * 60 * 1000;
                    let period        = hour * (true === VARIABLES.settings.gains_period_days ? 24 : 1);
                    let tmpl          = '<h5>Based upon</h5>{total} {label} over {count} {type} since {since}<h5>Would be gain / {period}</h5>{wannabe} / {period}';
                    let map           = {};
                    let count         = 0;
                    let trackingStart = new Date();
                    if (type === 'battle') {
                        map           = {
                            XPPerHour            : {d: 'BattleXPPerHour', l: 'XP', c: data.xp},
                            BattleGoldPerHour    : {d: '', l: 'Gold', c: data.g},
                            BattleClanXPPerHour  : {d: '', l: 'XP', c: data.cxp},
                            BattleClanGoldPerHour: {d: '', l: 'Gold', c: data.cg},
                        };
                        count         = VARIABLES.QoLStats.b;
                        trackingStart = VARIABLES.QoLStats.bs;
                    } else if (type === 'TS') {
                        map           = {
                            XPPerHour             : {d: 'TSXPPerHour', l: 'XP', c: data.xp},
                            TSResourcesPerHour    : {d: '', l: 'Resources', c: data.a},
                            TSClanResourcesPerHour: {d: '', l: 'Resources', c: data.ca},
                        };
                        count         = VARIABLES.QoLStats.h;
                        trackingStart = VARIABLES.QoLStats.hs;
                    } else if (type === 'Crafting') {
                        map           = {
                            XPPerHour: {d: 'CTXPPerHour', l: 'XP', c: data.xp},
                        };
                        count         = VARIABLES.QoLStats.ct;
                        trackingStart = VARIABLES.QoLStats.cts;
                    } else if (type === 'Carving') {
                        map           = {
                            XPPerHour: {d: 'CAXPPerHour', l: 'XP', c: data.xp},
                        };
                        count         = VARIABLES.QoLStats.ca;
                        trackingStart = VARIABLES.QoLStats.cas;
                    }

                    for (let e in map) {
                        if (!map.hasOwnProperty(e)) {
                            continue;
                        }
                        let ed = map[e].d !== '' ? map[e].d : e;

                        //<h5>Based upon</h5>{total} {label} over {count} {type} since {since}<h5>Would be gain / {period}</h5>{wannabe} / {period}
                        let obj = {
                            total  : VARIABLES.QoLStats.d[ed].format(),
                            label  : map[e].l,
                            count  : count.format(),
                            since  : trackingStart.format('Do MMM Y HH:mm:ss'),
                            type   : `${type} actions`,
                            period   : true === VARIABLES.settings.gains_period_days ? 'd' : 'h',
                            wannabe: (Math.floor((period) / VARIABLES.QoLStats.na * map[e].c)).format(),
                        };

                        VARIABLES.QoLStats.e[e]
                            .text((VARIABLES.QoLStats.d[ed] / (now - trackingStart) * period)[VARIABLES.settings.abbreviate_stats_in_header ? 'abbr' : 'format']())
                            .attr({'data-original-title': tmpl.formatQoL(obj)});

                    }

                    if (type === 'Crafting') {
                        let obj = {
                            total  : VARIABLES.QoLStats.d.CraftCarveQueueETA.format(),
                            label  : '',
                            mats: data.ad.format(),
                            time: (VARIABLES.QoLStats.na / 1000).format(3),
                            disclaimer: VARIABLES.QoLStats.d.CraftCarveQueueETA === 0 ? `<h6>--------</h6>If this shows zero, open crafting table page in house`: ''
                        };

                        VARIABLES.QoLStats.e.CraftCarveQueueETA
                          .attr({ 'data-original-title': `<h5>Based upon</h5>{total} crafting materials required to complete all items in queue at {mats} mats used every action and {time}s action timer{disclaimer}`.formatQoL(obj) });
                    }

                    if (type === 'Carving') {
                        let obj = {
                            total  : VARIABLES.QoLStats.d.CraftCarveQueueETA.format(),
                            label  : '',
                            frags: data.ad.format(),
                            time: (VARIABLES.QoLStats.na / 1000).format(3),
                            disclaimer: VARIABLES.QoLStats.d.CraftCarveQueueETA === 0 ? `<h6>--------</h6>If this shows zero, open carving bench page in house`: ''
                        };

                        VARIABLES.QoLStats.e.CraftCarveQueueETA
                          .attr({ 'data-original-title': `<h5>Based upon</h5>{total} gem fragments required to complete all gems in queue at {frags} fragments used every action and {time}s action timer{disclaimer}`.formatQoL(obj) });
                    }
                },
                toggleSetting(key, set = false) {
                    if (typeof set === 'boolean') {
                        let element = document.querySelector(`.qol-setting[data-key="${key}"]`);
                        if (element && element.type === 'checkbox') {
                            element.checked = set;
                        }
                    }
                },
                populateToSettingsTemplate() {
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
                                }
                            }
                        }
                    }
                },
                addMessageToChat(message) {
                    if (VARIABLES.chatDirection === 'up') {
                        $('#chatMessageList').prepend(message);
                    } else {
                        $('#chatMessageList').append(message);
                        fn.helpers.scrollToBottom('#chatMessageListWrapper');
                    }
                },
                chatContentSwap() {
                    let navWrapper     = document.querySelector('#navWrapper');
                    let contentWrapper = document.querySelector('#contentWrapper');
                    let chatWrapper    = document.querySelector('#chatWrapper');
                    if (VARIABLES.settings.chat_content_swap && navWrapper.nextElementSibling.getAttribute('id') === 'contentWrapper') {
                        // swap
                        chatWrapper.insertAdjacentElement('afterend', contentWrapper);
                        navWrapper.insertAdjacentElement('afterend', chatWrapper);
                        return;
                    }

                    if (!VARIABLES.settings.chat_content_swap && navWrapper.nextElementSibling.getAttribute('id') === 'chatWrapper') {
                        // revert
                        contentWrapper.insertAdjacentElement('afterend', chatWrapper);
                        navWrapper.insertAdjacentElement('afterend', contentWrapper);
                    }
                },
                swapLabelsForGains() {
                    const period = true === VARIABLES.settings.gains_period_days ? '/ d:' : '/ h:';
                    $('.rq-h > td.left')
                      .filter((i,e) => /\/ [hd]:$/.test(e.textContent.trim()))
                      .each((i, e) => e.textContent = e.textContent.replace(/\/ ([hd]):$/,  period));
                },
                colorGemOption(option) {
                    if (option.tagName !== 'OPTION') {
                        return;
                    }
                    if (!option.getAttribute('value')) {
                        return;
                    }
                    let className = option.textContent.match(/\[L:\d+] [a-z]+ ([a-z]+)/i);
                    if (!className) {
                        return;
                    }
                    className = className[1].toLowerCase();
                    option.classList.add(className);
                },
                /**
                 * Courtesy of @Shylight and http://jsfiddle.net/sUK45/2189/
                 * @param {string} str
                 * @returns {string}
                 */
                stringToColor(str) {
                    let hash = 0;
                    for (let i = 0; i < str.length; i++) {
                        hash = str.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    let color = '#';
                    for (let i = 0; i < 3; i++) {
                        let value = (hash >> (i * 8)) & 0xFF;
                        color += ('00' + value.toString(16)).substr(-2);
                    }
                    // currently commented out
                    // need to figure out a way to get the background color first
                    return /*fn.helpers.adjustColorToBg(*/color/*)*/;
                },
                computeTotalTimeInSeconds(message) {
                    let time = message.match(/(\d+) (hours?|minutes?|seconds?)/gi);
                    if (null === time) {
                        return 0;
                    }
                    let total = 0;
                    time.forEach(i => {
                        let h = i.match(/(\d+) hour/);
                        let m = i.match(/(\d+) minut/);
                        let s = i.match(/(\d+) second/);
                        if (h) {
                            total += parseInt(h[1]) * 3600;
                        }
                        if (m) {
                            total += parseInt(m[1]) * 60;
                        }
                        if (s) {
                            total += parseInt(s[1]);
                        }
                    });
                    return total;
                },

                /** ft. Gimrin - go bug him about hte bulgarian constants */
                colorLightness(colorChannel) {
                    if (colorChannel <= 0.03928) {
                        return colorChannel / 12.92;
                    }
                    return (Math.pow(((colorChannel + 0.055) / 1.055), 2.4));
                },
                adjustColorToBg(c) {
                    let color = tinycolor(c);
                    let bg    = tinycolor("0c0c0c");
                    console.log(window.getComputedStyle(document.querySelector('body')).backgroundColor.ensureHEXColor());

                    let colorRGB = color.toRgb();
                    let bgRGB    = bg.toRgb();

                    let cL = 0.2126 * fn.helpers.colorLightness(colorRGB.r / 255) + 0.7152 * fn.helpers.colorLightness(colorRGB.g / 255) + 0.0722 * fn.helpers.colorLightness(colorRGB.b / 255);
                    let bL = 0.2126 * fn.helpers.colorLightness(bgRGB.r / 255) + 0.7152 * fn.helpers.colorLightness(bgRGB.g / 255) + 0.0722 * fn.helpers.colorLightness(bgRGB.b / 255);

                    let contrast = (Math.max(cL, bL) + 0.05) / (Math.min(cL, bL) + 0.05);

                    if (contrast < 7) {
                        let amount = (25 + (7 - contrast) / 7 * 25);
                        if (bg.isDark()) {
                            color.brighten(amount);
                        } else {
                            color.darken(amount);
                        }
                    }

                    return color.toHexString();

                },

                /**
                 * Don't ask, I stole this form Vysn, which is a minified code,
                 * I just best-guessed the variable names, don't really wanna
                 * recreate this function myself
                 *
                 * @param from
                 * @param desired
                 * @param firstCost
                 * @param nextCost
                 * @param scale
                 * @returns {number}
                 */
                getNextItemPrice(from, desired, firstCost, nextCost, scale) {
                    from      = parseFloat(from);
                    desired   = parseFloat(desired);
                    firstCost = parseFloat(firstCost);
                    nextCost  = parseFloat(nextCost);
                    scale     = parseFloat(scale);

                    let original     = from;
                    let ratio        = Math.floor((original - 1) / scale) + 1;
                    let costFromZero = (original) * (firstCost - nextCost) + nextCost * (original * (ratio) - scale * ratio * (ratio - 1) / 2);

                    original         = (from + desired);
                    ratio            = Math.floor((original - 1) / scale) + 1;
                    let costFromNext = (original) * (firstCost - nextCost) + nextCost * (original * (ratio) - scale * ratio * (ratio - 1) / 2);

                    return costFromNext - costFromZero;
                },
                jumpQuestMob(jumpOffset) {
                    const selectedQuestMob = $('#quest_enemy_list').children('option:selected');
                    const oldValue = parseInt(selectedQuestMob.attr('value'));

                    if(oldValue > 626) {
                        const oldName = selectedQuestMob.attr('name');
                        const newValue = oldValue + (VARIABLES.settings.jump_mobs_increment * jumpOffset);
                        const newName = oldName.split('#')[0] +'#' + (newValue - 626);
                        fn.helpers.addQuestMobIfNeeded(newValue, newName);
                        $('#quest_enemy_list').val(newValue);
                    }
                },
                addQuestMobIfNeeded(newValue, newName) {
                    if($(`#quest_enemy_list option[value="${newValue}"]`).length === 0) {
                        $('#quest_enemy_list').append(`<option value="${newValue}" name="${newName}">${newName}</option>`);
                    }
                },
            },
            /** private / internal / helper methods */
            __     : {
                checkForUpdate() {
                    let version = '';

                    document.querySelector('#RQ-dashboard-update-last').textContent = moment.tz(GAME_TIME_ZONE).format('Do MMM HH:mm:ss');
                    fetch(INTERNAL_UPDATE_URI)
                        .then(response => response.json())
                        .then(data => {
                            let match = atob(data.content).match(/\/\/\s+@version\s+([^\n]+)/);
                            version   = match[1];

                            if (compareVersions(GM_info.script.version, version) < 0) {
                                document.querySelector('#RoA-QoL-open-hub').classList.add('qol-update-ready');
                                document.querySelector('#RQ-dashboard-update-ready').classList.remove('hidden');
                                fn.__.buildTagMap();
                            } else {
                                setTimeout(fn.__.checkForUpdate, VARIABLES.checkForUpdateTimer);
                            }
                        });
                },
                buildTagMap() {
                    fetch(INTERNAL_TAGS_URL)
                        .then(res => res.json())
                        .then(res => {
                            VARIABLES.tagMap = {};
                            let lastTag      = null;
                            for (let tag of res) {
                                if (null === lastTag) {
                                    lastTag = tag.name;
                                    continue;
                                }
                                VARIABLES.tagMap[tag.name] = lastTag;
                                lastTag                    = tag.name;
                            }
                        });
                },
                getUpdateLog() {
                    let container       = document.getElementById('RQ-dashboard-update-log');
                    container.innerHTML = '';

                    let detailsTemplate = document.createElement('details');
                    let summaryTemplate = document.createElement('summary');
                    let dateTemplate    = document.createElement('div');
                    dateTemplate.classList.add('text-right');
                    dateTemplate.classList.add('text-muted');
                    dateTemplate.classList.add('small');
                    fetch(INTERNAL_RELEASES_URL)
                        .then(response => response.json())
                        .then(releases => {
                            for (let release of releases) {
                                // release.name, release.body, new Date(release.published_at), release.html_url;
                                let lines   = release.body.split(/\n/);
                                let detail  = detailsTemplate.cloneNode();
                                let summary = summaryTemplate.cloneNode();
                                let date    = dateTemplate.cloneNode();

                                summary.textContent = `${release.name} - ${lines[0]}`;

                                date.textContent = moment.tz(release.published_at, GAME_TIME_ZONE)
                                    .format('Do MMMM Y HH:mm:ss');

                                summary.appendChild(date);

                                detail.appendChild(summary);
                                detail.setAttribute('data-version', release.tag_name);
                                detail.insertAdjacentHTML('beforeend', markdownit({html: true}).render(release.body));
                                if (compareVersions(release.tag_name, GM_info.script.version) > 0) {
                                    detail.setAttribute('open', null);
                                    detail.classList.add('qol-new-log');
                                }

                                container.appendChild(detail);
                            }
                        });
                    if (VARIABLES.tagMap.hasOwnProperty(GM_info.script.version)) {
                        document
                            .querySelector('#RQ-update-changes-compare')
                            .setAttribute(
                                'href',
                                `https://github.com/edvordo/roa-qol/compare/${GM_info.script.version}...${VARIABLES.tagMap[GM_info.script.version]}`
                            );
                    }
                },
                saveDatabaseQueue() {
                    let data;

                    data = DB_QUEUE[TRACKER_TBL_NAME];
                    if (data.length > 0) {
                        VARIABLES.jsstore.db.insert({
                            into  : TRACKER_TBL_NAME,
                            values: data,
                            return: true
                        }).then(rows => {
                            if (rows.length > 0) {
                                DB_QUEUE[TRACKER_TBL_NAME] = [];
                            }
                        });
                    }

                    data = DB_QUEUE[AVGDMGSTR_TBL_NAME];
                    if (data.length > 0) {
                        VARIABLES.jsstore.db.insert({
                            into  : AVGDMGSTR_TBL_NAME,
                            values: data,
                            return: true
                        }).then(rows => {
                            if (rows.length > 0) {
                                DB_QUEUE[AVGDMGSTR_TBL_NAME] = [];
                            }
                        });
                    }
                },

                resetFavico() {
                    VARIABLES.FI.badge(0);
                },

                setupIndexedDB() {
                    VARIABLES.jsstore.db.isDbExist(QOL_DB_NAME).then(exists => {
                        if (exists) {
                            VARIABLES.jsstore.db.openDb(QOL_DB_NAME).then(() => {
                                log('opened IDB');
                                fn.__.getLatestTrackerValues();
                            }).catch(e => console.error(e));
                        } else {
                            VARIABLES.jsstore.db.createDb(TRACKER_DB_SCHEMA).then(() => {
                                log('created IDB');
                                fn.__.getLatestTrackerValues();
                            }).catch(e => console.error(e));
                        }
                    }).catch(error => {
                        console.error('RoA-QoL failed to create db: ', error.message);
                    });
                    // VARIABLES.jsstore.db.isDbExist({
                    //     dbName: QOL_DB_NAME,
                    //     table : {
                    //         name   : AVGDMGSTR_TBL_NAME,
                    //         version: 3
                    //     }
                    // }).then(exists => {
                    //     console.log(exists);
                    //     if (exists) {
                    //         VARIABLES.jsstore.db.openDb(QOL_DB_NAME).then(() => {
                    //             log('opened IDB');
                    //             fn.__.getLatestTrackerValues();
                    //         }).catch(e => console.error(e));
                    //     } else {
                    //         VARIABLES.jsstore.db.createDb(TRACKER_DB_SCHEMA).then(() => {
                    //             log('updated db chema');
                    //             fn.__.getLatestTrackerValues();
                    //         }).catch(e => console.error(e));
                    //     }
                    // });
                    unsafeWindow.roajsstore = VARIABLES.jsstore.db;
                },
                getLatestTrackerValues() {
                    VARIABLES.jsstore.db.select({from: TRACKER_TBL_NAME, groupBy: 't'}).then(res => {
                        VARIABLES.jsstore.tracker.latest = {};
                        res.map(item => {
                            if (!VARIABLES.jsstore.tracker.latest.hasOwnProperty(item.d)) {
                                VARIABLES.jsstore.tracker.latest[item.d] = {};
                            }
                            VARIABLES.jsstore.tracker.latest[item.d][item.t] = item.v;
                        });
                        log('Loaded latest data');
                    });
                    VARIABLES.jsstore.db.select({
                        from   : AVGDMGSTR_TBL_NAME,
                        groupBy: 't',
                    }).then(res => {
                        let item = res.shift();
                        if (item) {
                            VARIABLES.jsstore.avg_dmg.latest         = {};
                            VARIABLES.jsstore.avg_dmg.latest[item.s] = item;
                        }
                        log('Loaded latest data');
                    });
                },
                setupObservers() {
                    OBSERVERS.toggleable.fame                 = fn.helpers.initObserver('fame', 'title', 'td#fame_points');
                    OBSERVERS.toggleable.crystals             = fn.helpers.initObserver('crystals', 'title', 'td.crystals');
                    OBSERVERS.toggleable.platinum             = fn.helpers.initObserver('platinum', 'title', 'td.myplatinum');
                    OBSERVERS.toggleable.gold                 = fn.helpers.initObserver('gold', 'title', 'td.mygold');
                    OBSERVERS.toggleable.mats                 = fn.helpers.initObserver('mats', 'title', 'td.mycrafting_materials');
                    OBSERVERS.toggleable.frags                = fn.helpers.initObserver('frags', 'title', 'td.mygem_fragments');
                    OBSERVERS.toggleable.food                 = fn.helpers.initObserver('food', 'title', 'td.myfood');
                    OBSERVERS.toggleable.wood                 = fn.helpers.initObserver('wood', 'title', 'td.mywood');
                    OBSERVERS.toggleable.iron                 = fn.helpers.initObserver('iron', 'title', 'td.myiron');
                    OBSERVERS.toggleable.stone                = fn.helpers.initObserver('stone', 'title', 'td.mystone');
                    OBSERVERS.toggleable.strength             = fn.helpers.initObserver('strength', 'data-base', 'td#strength');
                    OBSERVERS.toggleable.health               = fn.helpers.initObserver('health', 'data-base', 'td#health');
                    OBSERVERS.toggleable.coordination         = fn.helpers.initObserver('coordination', 'data-base', 'td#coordination');
                    OBSERVERS.toggleable.agility              = fn.helpers.initObserver('agility', 'data-base', 'td#agility');
                    OBSERVERS.toggleable.eventAbbreviator     = OBSERVERS.toggleable.eventAbbreviator();
                    OBSERVERS.toggleable.chatMessagesObserver = OBSERVERS.toggleable.chatMessagesObserver();
                    OBSERVERS.toggleable.chatMessageListWrapperHeightObserver = OBSERVERS.toggleable.chatMessageListWrapperHeightObserver();
                    OBSERVERS.toggleable.effectsObserver      = OBSERVERS.toggleable.effectsObserver();

                    OBSERVERS.toggleable.houseQuickBuildTimestamps.observe(document.querySelector('#houseQuickBuildList'), {childList: true});
                    OBSERVERS.toggleable.houseItemBuildTimestamps.observe(document.querySelector('#houseRoomItemLevelUpgradeTimeCost'), {childList: true, characterData: true});
                },

                loadMarketLatestData() {
                    log('loading market data');
                    fetch('https://roa.edvor.do/api/latest-market-tracker-data')
                        .then(res => res.json())
                        .then(data => {
                            data                 = JSON.parse(JSON.stringify(data));
                            VARIABLES.marketData = data;
                            setTimeout(fn.__.loadMarketLatestData, 30 * 60 * 1000);
                        });
                },

                setupCSS() {
                    GM_addStyle(GM_getResourceText('SpectrumCSS'));
                    GM_addStyle(GM_getResourceText('QoLCSS'));
                },
                setupHTML() {
                    // per hour table
                    let td = document.createElement('td');
                    td.insertAdjacentHTML('afterbegin', TEMPLATES.headerHTML);
                    document.querySelector('#allThemTables > tbody > tr').appendChild(td);

                    // qol hub
                    document.querySelector('#modalContent').insertAdjacentHTML('beforeend', TEMPLATES.hubHTML);
                    $('#RQ-hub-wrapper .dropdown-toggle').dropdown();
                    $('#RQ-hub-stats-avg-dmg-data').DataTable({searching: false, ordering: false});

                    document.querySelector('#myClanDonationWrapper').insertAdjacentHTML('afterbegin', TEMPLATES.clanDonationsModeSelector);
                    document.querySelector('#chatSendMessage').classList.add('btn-block');
                    document.querySelector('#profileOptionTooltip').insertAdjacentHTML('beforeend', TEMPLATES.profileTooltipUserColor);

                    let div = document.createElement('div');
                    div.classList.add('center');
                    div.classList.add('small');
                    div.classList.add('RQ-quest-estimate');
                    document.querySelector('#battleQuest').insertAdjacentElement('beforeend', div.cloneNode());
                    document.querySelector('#tradeskillQuest').insertAdjacentElement('beforeend', div.cloneNode());
                    document.querySelector('#professionQuest').insertAdjacentElement('beforeend', div.cloneNode());

                    document.querySelector('#massButtonHolder').insertAdjacentHTML('beforeend', '<a id="RQ-export-ingredients-for-bento" class="small hidden">[Export]</a>');

                    document.querySelector('#activityWrapper > div').insertAdjacentHTML('beforeend', '<a id="RQ-open-to-drop-tracker" class="small col-xs-12">[QoL Drop Tracker]</a>');

                    document.querySelector('head').insertAdjacentHTML('beforeend', `<link rel="icon" href="${GM_getResourceURL('favicon.ico')}" type="image/x-icon" />`);
                },
                setupTemplates() {
                    let chartsContentTmpl = '';
                    let chartsTabsTmpl    = '';

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
        <div class="row">
            <div class="col-xs-12">
                <div class="btn-group">
                    <button type="button" class="btn btn-primary" id="RQ-hub-dashboard">Dashboard</button>
                    <button type="button" class="btn btn-primary" id="RQ-hub-charts">Charts</button>
                    <button type="button" class="btn btn-primary" id="RQ-hub-stats">Stats</button>
                    <button type="button" class="btn btn-primary" id="RQ-hub-drop-tracker">Drop tracker</button>
                    <button type="button" class="btn btn-primary" id="RQ-hub-settings">Settings</button>
                </div>
            </div>
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
                        <table class="table table-condensed rq-styled small">
                            <tr>
                                <td>Script version</td>
                                <td class="text-right">${GM_info.script.version}</td>
                            </tr>
                            <tr>
                                <td>Author</td>
                                <td class="text-right"><a class="profileLink">Reltorakii</a></td>
                            </tr>
                            <tr>
                                <td>Script homepage</td>
                                <td class="text-right"><a href="https://github.com/edvordo/roa-qol" target="_blank>edvordo/roa-qol">edvordo/roa-qol</a></td>
                            </tr>
                            <tr>
                                <td>Last check for update</td>
                                <td id="RQ-dashboard-update-last" class="text-right"></td>
                            </tr>
                            <tr class="hidden" id="RQ-dashboard-update-ready">
                                <td colspan="2" class="text-center">
                                    <h4 class="text-center">Update ready!</h4>
                                    <a href="${GM_info.script.updateURL}" target="_blank" class="'btn btn-link btn-block">Update now!</a>
                                    <a href="" id="RQ-update-changes-compare" target="_blank" class="'btn btn-link btn-block">View code changes</a>
                                </td>
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
            <div id="RQ-hub-drop-tracker-wrapper">
            <h4 class="text-center">Drop tracker</h4>
            <div class="row">
                <div class="col-xs-12">
                    <div id="rq-dt-table">
                        <div class="text-center">Tracked since: {{ drop_tracker.trackerStart }}</div>
                        <table class="table table-condensed table-bordered rq-styled small">
                            <thead>
                                <tr>
                                    <th><button class="btn btn-xs" @click="resetDropTracker()">reset everything</button></th>
                                    <th v-for="(actions, category) in drop_tracker.actions" class="text-right" colspan="3"  v-if="actions > 0">
                                    {{ category.ucWords() }}: {{ actions.format() }}
                                    <button class="btn btn-xs" @click="resetCategory(category)">reset</button>
                                    </th>
                                    <th class="text-right">Total</th>
                                </tr>
                                <tr><th class="text-center" colspan="15">Drops</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="(categories, item) in drop_tracker.random_drops" :class="colorClassFor(item)">
                                    <td width="20%">{{ item.split('_').join(' ').ucWords() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.battle > 0" width="7%" :title="categories.battle.t.format()">{{ categories.battle.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.battle > 0" width="7%">{{ categories.battle.a !== null ? categories.battle.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.battle > 0" width="4%" title="Drop rate %">{{ dropRate('random_drops', item, 'battle') }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.TS > 0" width="7%" :title="categories.TS.t.format()">{{ categories.TS.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.TS > 0" width="7%">{{ categories.TS.a !== null ? categories.TS.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.TS > 0" width="4%"  title="Drop rate %">{{ dropRate('random_drops', item, 'TS') }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.craft > 0" width="7%" :title="categories.craft.t.format()">{{ categories.craft.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.craft > 0" width="7%">{{ categories.craft.a !== null ? categories.craft.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.craft > 0" width="4%"  title="Drop rate %">{{ dropRate('random_drops', item, 'craft') }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.carve > 0" width="7%" :title="categories.carve.t.format()">{{ categories.carve.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.carve > 0" width="7%">{{ categories.carve.a !== null ? categories.carve.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.carve > 0" width="4%"  title="Drop rate %">{{ dropRate('random_drops', item, 'carve') }}</td>
                                    <th class="text-right" width="7%" :title="getTotal('random_drops', item).format()">{{ getTotal('random_drops', item).abbr() }}</th>
                                    <!--th class="text-right" width="7%" title="per hour">~{{ getPerHour('random_drops', item).format(2) }}</th-->
                                </tr>
                            </tbody>
                            <thead>
                                <tr><th class="text-center" colspan="15">Stats</th></tr>
                            </thead>
                            <tbody>
                                <tr v-for="(categories, item) in drop_tracker.stats_drops" :class="colorClassFor(item)">
                                    <td>{{ item.split('_').join(' ').ucWords() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.battle > 0" :title="categories.battle.t.format()">{{ categories.battle.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.battle > 0">{{ categories.battle.a !== null ? categories.battle.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.battle > 0" title="Drop rate %">{{ dropRate('stats_drops', item, 'battle') }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.TS > 0" :title="categories.TS.t.format()">{{ categories.TS.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.TS > 0">{{ categories.TS.a !== null ? categories.TS.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.TS > 0" title="Drop rate %">{{ dropRate('stats_drops', item, 'TS') }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.craft > 0" :title="categories.craft.t.format()">{{ categories.craft.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.craft > 0">{{ categories.craft.a !== null ? categories.craft.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.craft > 0" title="Drop rate %">{{ dropRate('stats_drops', item, 'craft') }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.carve > 0" :title="categories.carve.t.format()">{{ categories.carve.t.abbr() }}</td>
                                    <td class="text-right" v-if="drop_tracker.actions.carve > 0">{{ categories.carve.a !== null ? categories.carve.a.format() : 'Actions' }}</td>
                                    <td class="text-right dt-section-divider" v-if="drop_tracker.actions.carve > 0" title="Drop rate %">{{ dropRate('stats_drops', item, 'carve') }}</td>
                                    <th class="text-right" :title="getTotal('stats_drops', item).format()">{{ getTotal('stats_drops', item).abbr() }}</th>
                                    <!--th class="text-right" width="7%" title="per hour">~{{ getPerHour('stats_drops', item).format(2) }}</th-->
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
        </div>
    </div>
</div>`;
                },
                setupVue() {
                    new Vue({
                        debug  : true,
                        el     : '#rq-dt-table',
                        data   : VARIABLES,
                        methods: {
                            getTotal(section, item) {
                                if (!this.drop_tracker.hasOwnProperty(section)) {
                                    return 0;
                                }
                                if (!this.drop_tracker[section].hasOwnProperty(item)) {
                                    return 0;
                                }
                                let values = Object.values(this.drop_tracker[section][item]);

                                return values.reduce((carry, value) => carry + value.t, 0);
                            },
                            // getPerHour(section, item) {
                            //     let total = this.getTotal(section, item);
                            //     let diff = moment.tz(GAME_TIME_ZONE) - this.drop_tracker.trackerStart;
                            //     return values.reduce((carry, value) => carry + value.t, 0);
                            // },
                            colorClassFor(item) {
                                return {
                                    'crystals'          : item === 'crystals',
                                    'platinum'          : item === 'platinum coins',
                                    'gold'              : item === 'gold coins',
                                    'crafting_materials': item === 'crafting materials',
                                    'gem_fragments'     : item === 'gem fragments',
                                    'ruby'              : item === 'strength',
                                    'opal'              : item === 'health',
                                    'sapphire'          : item === 'coordination',
                                    'emerald'           : item === 'agility',
                                };
                            },
                            resetCategory(category) {
                                if (this.drop_tracker.actions.hasOwnProperty(category)) {
                                    this.drop_tracker.actions[category] = 0;
                                }
                                for (let section of ['random_drops', 'stats_drops']) {
                                    if (!this.drop_tracker.hasOwnProperty(section)) {
                                        continue;
                                    }
                                    for (let item in this.drop_tracker[section]) {
                                        if (!this.drop_tracker[section].hasOwnProperty(item)) {
                                            continue;
                                        }
                                        if (!this.drop_tracker[section][item].hasOwnProperty(category)) {
                                            continue;
                                        }
                                        if (null !== this.drop_tracker[section][item][category].a) {
                                            this.drop_tracker[section][item][category] = {t: 0, a: 0};
                                        } else {
                                            this.drop_tracker[section][item][category].t = 0;
                                        }
                                    }
                                }
                            },
                            resetDropTracker() {
                                for (let category in this.drop_tracker.actions) {
                                    if (!this.drop_tracker.actions.hasOwnProperty(category)) {
                                        continue;
                                    }
                                    this.resetCategory(category);
                                }
                                this.drop_tracker.trackerStart = moment.tz(GAME_TIME_ZONE).format('Do MMM Y HH:mm:ss');
                            },
                            dropRate(section, item, type) {
                                if (!this.drop_tracker.hasOwnProperty(section)) {
                                    return '';
                                }
                                if (!this.drop_tracker[section].hasOwnProperty(item)) {
                                    return '';
                                }
                                if (!this.drop_tracker[section][item].hasOwnProperty(type)) {
                                    return '';
                                }
                                let data        = this.drop_tracker[section][item][type];
                                let lookAtTotal = ['plundering', 'multi_drop', 'items', 'growth', 'multistat_chance'];
                                let base        = data.a ? data.a : data.t;
                                if (lookAtTotal.indexOf(item) !== -1 || section === 'stats_drops') {
                                    base = data.t;
                                }

                                let dropRate = ((base / this.drop_tracker.actions[type]) * 100);
                                if (isNaN(dropRate)) {
                                    return '-';
                                }

                                return dropRate.format(2) + '%';
                            },
                        }
                    });
                },
                setupLoops() {
                    setTimeout(fn.__.checkForUpdate, 10 * 1000);
                    setInterval(fn.__.cleanUpTracker, 6 * 60 * 60 * 1000); // every 6 hours
                    setTimeout(fn.__.cleanUpTracker, 5 * 60 * 1000); // First one after 5 minutes
                    setInterval(fn.__.resetFavico, 30 * 1000); // every 30 seconds
                    setInterval(fn.__.saveDatabaseQueue, 5 * 60 * 1000); // every 5 minutes
                    setTimeout(fn.__.loadMarketLatestData, 10 * 1000);
                },
                setupVariables() {
                    // per hour
                    $('#QoLStats td[id][data-toggle]').each(function (i, e) {
                        e = $(e);

                        VARIABLES.QoLStats.e[e.attr('id')] = e;
                        VARIABLES.QoLStats.d[e.attr('id')] = 0;

                        $(`#${e.attr('id')}`).tooltip({placement: 'auto left', container: 'body', html: true});
                    });
                    VARIABLES.QoLStats.d.BattleXPPerHour = 0;
                    VARIABLES.QoLStats.d.TSXPPerHour     = 0;
                    VARIABLES.QoLStats.d.CTXPPerHour     = 0;
                    VARIABLES.QoLStats.d.CAXPPerHour     = 0;

                    VARIABLES.username = document.querySelector('#username').textContent;

                    VARIABLES.FI = new Favico({animation: 'none'});
                    VARIABLES.FI.badge('QoL');

                    VARIABLES.tracked.stuffLC   = VARIABLES.tracked.stuff.map(i => i.toLowerCase());
                    VARIABLES.tracked.stuffDDLC = VARIABLES.tracked.stuffDD.map(i => i.toLowerCase());

                    VARIABLES.tracked.stuff.forEach(i => {
                        VARIABLES.tracked.map[i.toLowerCase()] = i;
                    });

                    for (let stat of VARIABLES.tracked.stuffDDLC.concat(VARIABLES.tracked.stuffLC)) {
                        $(`#RQ-hub-stats-${stat.toLowerCase()}`).DataTable({
                            searching: false,
                            ordering : false,
                            paging   : false,
                            info     : false,
                            aoColumns: [
                                {sClass: 'text-left'},
                                {sClass: 'text-right'},
                                {sClass: 'text-right'},
                            ],
                        });
                    }
                },
                setupLevelRequirements(player) {
                    VARIABLES.QoLStats.PlXPReq    = player.levelCost;
                },

                localStorageStats() {
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
                            let size    = localStorage.getItem(item).length;
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

                saveSettings() {
                    localStorage.setItem(SETTINGS_SAVE_KEY, JSON.stringify(VARIABLES.settings));
                },
                loadSettings() {
                    let settings = localStorage.getItem(SETTINGS_SAVE_KEY);

                    try {
                        settings = JSON.parse(settings);

                        VARIABLES.settings = _.defaultsDeep(settings, DEFAULT_SETTINGS);
                    } catch (e) {
                        log('Failed to parse settings ..');
                    }
                    fn.helpers.populateToSettingsTemplate();
                    fn.__.saveSettings();
                    fn.__.applySettings(true);

                    for (let item of VARIABLES.tracker) {
                        localStorage.removeItem(TRACKER_SAVE_KEY + '-' + item);
                    }
                },
                applySettings() {
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

                    let tabSTS = document.querySelector(`#RQ-hub-stats`);
                    tabSTS.classList.add('hidden');
                    if (VARIABLES.settings.tracker.average_damage) {
                        tabSTS.classList.remove('hidden');
                    }

                    let tabDT = document.querySelector(`#RQ-hub-drop-tracker`);
                    tabDT.classList.add('hidden');
                    if (VARIABLES.settings.drop_tracker) {
                        tabDT.classList.remove('hidden');
                    }

                    // event abbreviator
                    OBSERVERS.toggleable.eventAbbreviator.disconnect();
                    if (VARIABLES.settings.event_abbreviation) {
                        OBSERVERS.toggleable.eventAbbreviator.restart();
                    }

                    // effects timers
                    OBSERVERS.toggleable.effectsObserver.disconnect();
                    if (VARIABLES.settings.effects_timers) {
                        OBSERVERS.toggleable.effectsObserver.restart();
                    }

                    OBSERVERS.toggleable.chatMessageListWrapperHeightObserver.disconnect();
                    if (true === VARIABLES.settings.remember_chat_height) {
                        OBSERVERS.toggleable.chatMessageListWrapperHeightObserver.restart();
                        const chatMessageListWrapperHeight = localStorage.getItem('chatMessageListWrapperHeight');
                        if (null !== chatMessageListWrapperHeight) {
                            document.querySelector('#chatMessageListWrapper').style.height = chatMessageListWrapperHeight;
                        }
                    }

                    // chat limiter
                    document.querySelector('#chatMessageWrapper').removeAttribute('data-limiter');
                    if (VARIABLES.settings.char_count) {
                        document.querySelector('#chatMessageWrapper').setAttribute('data-limiter', '0 / 400');
                    }

                    if (true === VARIABLES.settings.clan_donations_modes) {
                        document.querySelector('#RQ-clan-donation-mode-selector-wrapper').classList.remove('hidden');
                    } else {
                        document.querySelector('#RQ-clan-donation-mode-selector-wrapper').classList.add('hidden');
                    }

                    fn.helpers.chatContentSwap();
                    fn.helpers.swapLabelsForGains();

                    document.querySelectorAll('.RQ-user-color-option').forEach(el => {
                        if (VARIABLES.settings.user_color_messages) {
                            el.classList.remove('hidden');
                        } else {
                            el.classList.add('hidden');
                        }
                    });
                    fn.__.dyeUserMessages();
                },
                processSettingChange(element, ...hierarchy) {
                    if (1 === hierarchy.length) {
                        let setting = hierarchy.pop();
                        if (!VARIABLES.settings.hasOwnProperty(setting)) {
                            return false;
                        }
                        if (element.type === 'checkbox') {
                            VARIABLES.settings[setting] = !!element.checked;
                        }
                        if (element.type === 'number') {
                            VARIABLES.settings[setting] = Number(element.value);
                        }
                    } else if (hierarchy.length === 2) {
                        let [top, sub] = hierarchy;
                        if (!VARIABLES.settings.hasOwnProperty(top) || !VARIABLES.settings[top].hasOwnProperty(sub)) {
                            return false;
                        }
                        if (element.type === 'checkbox') {
                            VARIABLES.settings[top][sub] = !!element.checked;
                        }
                        if (element.type === 'number') {
                            VARIABLES.settings[setting] = Number(element.value);
                        }
                    }
                    fn.__.applySettings();
                    fn.__.saveSettings();
                },

                registerFameOwnGemTableObserver() {
                    OBSERVERS.general.fameOwnGemsObserver.observe(document.querySelector('table#inventoryOtherTable'), {childList: true});
                    setTimeout(() => {
                        log('Disconnecting gem list observer');
                        OBSERVERS.general.fameOwnGemsObserver.disconnect();
                        log('Reset Gems list');
                        VARIABLES.gems = {};
                    }, 2E3);
                },

                saveHouseInfo() {
                    sessionStorage.setItem('RoAHouse', JSON.stringify(VARIABLES.house));
                },
                loadHouseInfo() {
                    let houseInfo = sessionStorage.getItem('RoAHouse');
                    if (houseInfo) {
                        VARIABLES.house = JSON.parse(houseInfo);
                        //placeholder for changes to this object
                        fn.__.saveHouseInfo();
                    }
                },
                updateRooms(roomList) {
                    for (let room of roomList) {
                        if (!VARIABLES.house.rooms.hasOwnProperty(room.room_type)) {
                            VARIABLES.house.rooms[room.room_type] = {
                                items: {},
                            };
                        }
                        VARIABLES.house.roomNameMap[room.room_type] = room.name;
                    }
                },
                updateHouseRoom(roomType, items) {
                    for (let item of items) {
                        VARIABLES.house.rooms[roomType].items[item.item_type] = item;
                        setTimeout(fn.__.setRoomItemTooltip, 500, roomType, item.item_type, item);
                    }
                },
                setRoomItemTooltip(roomType, itemType, data) {
                    let tooltip = `<h5>Level upgrade</h5>
        <a class="houseLabel">Cost</a>
            <div>${data.level_upgrade_cost}</div>
            <a class="houseLabel">Time</a>
            <div>${data.level_upgrade_time}</div>`;
                    $(`a[data-roomtype="${roomType}"][data-itemtype="${itemType}"]`).tooltip({
                        placement: 'auto left',
                        html     : true,
                        container: 'body',
                        title    : tooltip,
                    });
                },

                logAvgDmg(battle) {
                    if (!VARIABLES.settings.tracker.average_damage) {
                        return;
                    }

                    if (battle.b.r === 0) {
                        return;
                    }

                    let dmgType = $('#weaponskill').text().split(' ')[0];

                    let ts = moment.tz(GAME_TIME_ZONE);
                    if (null === VARIABLES.jsstore.avg_dmg.latest) {
                        VARIABLES.jsstore.avg_dmg.latest = {};
                    }
                    if(battle.p.strength) {
                        if (VARIABLES.jsstore.avg_dmg.latest.hasOwnProperty(battle.p.strength.base)) {
                            VARIABLES.jsstore.avg_dmg.latest[battle.p.strength.base].a++;
                            VARIABLES.jsstore.avg_dmg.latest[battle.p.strength.base].d += battle.b.p.dm;
                        } else {
                            if (Object.keys(VARIABLES.jsstore.avg_dmg.latest).length > 0) {
                                let key = Object.keys(VARIABLES.jsstore.avg_dmg.latest).pop();

                                DB_QUEUE[AVGDMGSTR_TBL_NAME].push(VARIABLES.jsstore.avg_dmg.latest[key]);
                                delete VARIABLES.jsstore.avg_dmg.latest[key];
                            }
                            VARIABLES.jsstore.avg_dmg.latest[battle.p.strength.base] = {
                                ts: ts.format(),
                                s : battle.p.strength.base,
                                dt: battle.p.strength.total,
                                a : 1,
                                d : battle.b.p.dm,
                                t : dmgType
                            };
                        }
                    }
                },
                cleanUpTracker() {
                    VARIABLES.jsstore.db.remove({
                        from : TRACKER_TBL_NAME,
                        where: {
                            ts: {
                                '<=': VARIABLES.trackerHistoryThreshold()
                            }
                        }
                    });
                    VARIABLES.jsstore.db.remove({
                        from : AVGDMGSTR_TBL_NAME,
                        where: {
                            ts: {
                                '<=': VARIABLES.trackerHistoryThreshold()
                            }
                        }
                    });
                },

                showStats() {
                    document.querySelector('#RQ-hub-stats-avg-dmg-data tbody').innerHTML = '<tr><td colspan="6" class="text-center"><em>No available data</em></td></tr>';

                    let currentSkill = document.querySelector('#weaponskill').textContent.split(' ')[0];

                    document.querySelector('#RQ-hub-chart-avg-dmg-subtitle').textContent = currentSkill;
                    VARIABLES.jsstore.db.select({
                        from : AVGDMGSTR_TBL_NAME,
                        where: {
                            t: currentSkill
                        },
                        order: {
                            by: 'ts'
                        }
                    }).then(rows => {
                        if (0 === rows.length) {
                            return;
                        }
                        let chartData = [];
                        let tableData = [];
                        for (let row of rows) {
                            let ts = moment.tz(row.ts, GAME_TIME_ZONE);
                            chartData.push([
                                ts.toDate(),
                                row.d / row.a
                            ]);
                            tableData.push([
                                ts.format('Do MMM HH:mm:ss'),
                                row.s.format(),
                                row.dt.format(),
                                row.d.abbr(),
                                row.a.format(),
                                (row.d / row.a).abbr()
                            ]);
                        }
                        if (tableData) {
                            let dt = $('#RQ-hub-stats-avg-dmg-data').DataTable();
                            dt.clear();
                            dt.rows.add(tableData);
                            dt.draw();
                        }
                        fn.__.showChart('#RQ-hub-chart-avg-dmg', 'Average damage', chartData);
                    });
                },
                showChart(elem, name = '', data = []) {
                    if (data.length) {
                        new Dygraph(document.querySelector(elem), data, {
                            labels: ['Time', name],
                            axes  : {
                                y: {
                                    valueFormatter    : val => val.format(),
                                    axisLabelFormatter: val => val.abbr(),
                                },
                                x: {
                                    valueFormatter: val => moment.tz(val, GAME_TIME_ZONE).format('Do MMM HH:mm:ss'),
                                },
                            },
                        });
                    }
                },
                showTrackerStatsSection(section) {
                    let list = VARIABLES.tracked.stuffLC.concat(VARIABLES.tracked.stuffDDLC);
                    if (null === section || list.indexOf(section) === -1) {
                        section = VARIABLES.hub.subtab;
                    }

                    VARIABLES.hub.subtab = section;

                    document.querySelector(`#RQ-hub-stats-${section} tbody`).innerHTML = '<tr><td colspan="3" class="text-center"><em>Loading data ...</em></td></tr>';

                    // graph data
                    let query = {};

                    let s1 = Date.now();
                    query  = {
                        from : TRACKER_TBL_NAME,
                        where: {
                            t: section
                        },
                        order: {
                            by: 'ts'
                        }
                    };
                    VARIABLES.jsstore.db.select(query).then(rows => {
                        console.log('s1', (Date.now() - s1) / 1000);
                        let graphData = [];
                        for (let row of rows) {
                            graphData.push([
                                moment.tz(row.ts, GAME_TIME_ZONE).toDate(),
                                row.v
                            ]);
                        }
                        fn.__.showChart('#RQ-hub-chart-' + section, section, graphData);
                        if (0 === rows.length) {
                            $('#RQ-hub-stats-' + section).DataTable().clear().draw();
                            return;
                        }

                        // min max
                        let s2 = Date.now();
                        query  = {
                            from     : TRACKER_TBL_NAME,
                            where    : {
                                t: section
                            },
                            aggregate: {
                                min: 'ts',
                                max: 'ts',
                                sum: 'g'
                            }
                        };
                        VARIABLES.jsstore.db.select(query).then(rows => {
                            console.log('s2', (Date.now() - s2) / 1000);
                            if (0 === rows.length) {
                                return;
                            }
                            let row = rows.shift();


                            let total = row['sum(g)'];

                            let since = moment.tz(row['min(ts)'], GAME_TIME_ZONE);
                            let until = moment.tz(row['max(ts)'], GAME_TIME_ZONE);

                            let average = (total / ((until.valueOf() - since.valueOf()) / (60 * 60 * 24 * 1000))).format(2);

                            let summary = [
                                since.format('Do MMM HH:mm:ss'),
                                until.format('Do MMM HH:mm:ss')
                            ];

                            document.querySelector(`#RQ-hub-chart-${section}-subtitle`).textContent = summary.join(' - ');

                            document.querySelector(`table#RQ-hub-stats-${section} > caption`).textContent = `~${average} / day`;
                        });

                        // totals/averages
                        let s3 = Date.now();
                        query  = {
                            from     : TRACKER_TBL_NAME,
                            where    : {
                                t: section
                            },
                            groupBy  : 'd',
                            aggregate: {
                                sum: 'g'
                            }
                        };
                        VARIABLES.jsstore.db.select(query).then(rows => {
                            console.log('s3', (Date.now() - s3) / 1000);
                            let dt = $('#RQ-hub-stats-' + section).DataTable();

                            dt.clear();
                            for (let row of rows) {
                                dt.row.add([
                                    moment.tz(row.ts, GAME_TIME_ZONE).format('Do MMM'),
                                    row['sum(g)'].format(2),
                                    '~' + (row['sum(g)'] / 24).format(2) + ' / h'
                                ]);
                            }
                            dt.draw();
                        });

                    });
                },

                processRandomDrops(type, drop) {
                    if (null === drop) {
                        return false;
                    }
                    let multidropCount      = 0;
                    let plunderingCount     = 0;
                    let inventoryItemsCount = 0;
                    let totalDrops          = 0;
                    let totals              = {};
                    drop.drop.split('<br/>')
                        .map(i => {
                            inventoryItemsCount += i.includes('itemWithTooltip') ? 1 : 0;
                            plunderingCount += i.includes('[P]') ? 1 : 0;
                            multidropCount += i.includes('[MD]') ? 1 : 0;
                            let strips = [
                                /<.*?>/g,
                                /\[P]/ig,
                                /\[MD]/ig,
                                /You found an?/,
                                / fame-based bonus/,
                                '!',
                                / as tax./,
                                /(pouch|box|chest) containing /,
                                /large pile of /,
                                /.+, but a Trash Compactor ate it and spit out /,
                                / instead./,
                                /\([0-9, +\-]+\)/,
                                /\([a-z ]+\)/i,
                                /,/g
                            ];

                            strips.forEach(r => {
                                i = i.replace(r, '').trim();
                            });
                            if (!i.match(/^(\+|-)?[0-9]+[a-z\s]+$/i)) { // theese are items (gear & gems)
                                // console.log('imma ignore ya, but show me what u are');
                                // console.log(i);
                                return null;
                            }
                            i = i.replace('Your clan took ', '-').trim();
                            return i;
                        })
                        .map(i => {
                            if (null === i) {
                                return false;
                            }
                            let value = parseInt(i);
                            if (isNaN(value)) {
                                value = -1e20;
                            }
                            let key = i.match(/[a-z\s]+$/i);
                            if (null === key) {
                                key = `unprocessed key ${i}`;
                            }
                            key = key[0].trim().toLowerCase();
                            if (!totals.hasOwnProperty(key)) {
                                totals[key] = 0;
                            }
                            totalDrops++;
                            if (value < 0) {
                                totalDrops--;
                            }
                            totals[key] += value;
                            return i;
                        });

                    for (let key in totals) {
                        if (!totals.hasOwnProperty(key)) {
                            continue;
                        }
                        if (!VARIABLES.drop_tracker.random_drops.hasOwnProperty(key)) {
                            VARIABLES.drop_tracker.random_drops[key] = {};
                        }
                        if (!VARIABLES.drop_tracker.random_drops[key].hasOwnProperty(type)) {
                            VARIABLES.drop_tracker.random_drops[key].battle = {t: 0, a: 0};
                            VARIABLES.drop_tracker.random_drops[key].TS     = {t: 0, a: 0};
                            VARIABLES.drop_tracker.random_drops[key].craft  = {t: 0, a: 0};
                            VARIABLES.drop_tracker.random_drops[key].carve  = {t: 0, a: 0};
                        }
                        VARIABLES.drop_tracker.random_drops[key][type].t += totals[key];
                        VARIABLES.drop_tracker.random_drops[key][type].a++;
                    }
                    VARIABLES.drop_tracker.random_drops.total[type].t += totalDrops;
                    VARIABLES.drop_tracker.random_drops.items[type].t += inventoryItemsCount;
                    VARIABLES.drop_tracker.random_drops.items[type].a += inventoryItemsCount > 0 ? 1 : 0;
                    VARIABLES.drop_tracker.random_drops.plundering[type].t += plunderingCount;
                    VARIABLES.drop_tracker.random_drops.plundering[type].a += plunderingCount > 0 ? 1 : 0;
                    VARIABLES.drop_tracker.random_drops.multi_drop[type].t += multidropCount;
                    VARIABLES.drop_tracker.random_drops.multi_drop[type].a += multidropCount > 0 ? 1 : 0;
                },

                processStatsDrop(type, stat) {
                    if (null === stat) {
                        return false;
                    }
                    let totalCount     = 0;
                    let normalCount    = 0;
                    let growthCount    = 0;
                    let multistatCount = 0;
                    for (let section in stat.stats) {
                        if (!stat.stats.hasOwnProperty(section)) {
                            continue;
                        }
                        let stats = stat.stats[section];
                        if (['stat_boost', 'normal', 'multistat_chance'].indexOf(section) === -1) {
                            continue;
                        }
                        normalCount += section === 'normal' ? Object.keys(stats).length : 0;
                        growthCount += section === 'stat_boost' ? Object.keys(stats).length : 0;
                        multistatCount += section === 'multistat_chance' ? Object.keys(stats).length : 0;
                        totalCount += normalCount + growthCount + multistatCount;
                        for (let stat in stats) {
                            if (!stats.hasOwnProperty(stat)) {
                                continue;
                            }
                            if (!VARIABLES.drop_tracker.stats_drops.hasOwnProperty(stat)) {
                                VARIABLES.drop_tracker.stats_drops[stat] = {};
                            }
                            if (!VARIABLES.drop_tracker.stats_drops[stat].hasOwnProperty(type)) {
                                VARIABLES.drop_tracker.stats_drops[stat].battle = {t: 0, a: 0};
                                VARIABLES.drop_tracker.stats_drops[stat].TS     = {t: 0, a: 0};
                                VARIABLES.drop_tracker.stats_drops[stat].craft  = {t: 0, a: 0};
                                VARIABLES.drop_tracker.stats_drops[stat].carve  = {t: 0, a: 0};
                            }
                            VARIABLES.drop_tracker.stats_drops[stat][type].t += stats[stat];
                            VARIABLES.drop_tracker.stats_drops[stat][type].a++;
                        }
                    }
                    VARIABLES.drop_tracker.stats_drops.total[type].t += totalCount;
                    VARIABLES.drop_tracker.stats_drops.growth[type].t += growthCount;
                    VARIABLES.drop_tracker.stats_drops.growth[type].a += growthCount > 0 ? 1 : 0;
                    VARIABLES.drop_tracker.stats_drops.multi_stat[type].t += multistatCount;
                    VARIABLES.drop_tracker.stats_drops.multi_stat[type].a += multistatCount > 0 ? 1 : 0;
                },

                getQuestMultiplier(quest) {
                    let multiplier = 1;
                    for (let item in VARIABLES.battleQuestsDropRates) {
                        if (!VARIABLES.battleQuestsDropRates.hasOwnProperty(item)) {
                            continue;
                        }
                        let rx = new RegExp(item, 'i');
                        if (quest.i.match(rx)) {
                            multiplier = VARIABLES.battleQuestsDropRates[item];
                        }
                    }
                    return multiplier;
                },
                questEstimate(quest, battle = false) {
                    if (!VARIABLES.settings.estimate_quest_completion) {
                        return;
                    }

                    if (!quest) {
                        return;
                    }

                    if (1 === quest.a) {
                        document.querySelectorAll('.RQ-quest-estimate').forEach(i => i.textContent = ``);
                        return;
                    }

                    if (quest.r <= quest.c) {
                        document.querySelectorAll('.RQ-quest-estimate').forEach(i => i.textContent = `Done :)`);
                        return;
                    }

                    let required        = quest.r;
                    let currentProgress = quest.c;
                    let actionsNeeded   = required - currentProgress;

                    if (document.location.host === 'beta.avabur.com') {
                        actionsNeeded /= 10;
                    }

                    let multiplier = 1;
                    if (true === battle) {
                        multiplier = fn.__.getQuestMultiplier(quest);
                    }

                    let msNeeded = VARIABLES.QoLStats.na * actionsNeeded * multiplier;

                    document.querySelectorAll('.RQ-quest-estimate').forEach(i => i.textContent = `Done in ${msNeeded.toTimeEstimate()}`);

                    // console.log(quest.c.format(), quest.r.format(), VARIABLES.QoLStats.na, actionsNeeded.format(), msNeeded.toTimeEstimate(), msNeeded.toTimeRemaining());
                },
                processDrops(type, record) {
                    if (!VARIABLES.settings.drop_tracker) {
                        return false;
                    }
                    VARIABLES.drop_tracker.actions[type]++;

                    fn.__.processRandomDrops(type, record.hasOwnProperty('dr') ? record.dr : null);
                    fn.__.processStatsDrop(type, record.hasOwnProperty('sr') ? record.sr : null);
                    if (record.ir) {
                        // console.log(JSON.stringify(record.ir, null, '\t')); // will take care of later
                    }
                },
                dyeUserMessages() {
                    document.querySelectorAll('#chatMessageList > li').forEach(li => {
                        fn.__.dyeUserMessage(li);
                    });
                    document.querySelectorAll('#chatMessageHistory > li').forEach(li => {
                        fn.__.dyeUserMessage(li);
                    });
                },
                dyeUserMessage(element) {
                    let usernameElement = element.querySelector('a.profileLink');
                    if (!usernameElement) {
                        return;
                    }
                    let username = usernameElement.textContent;
                    let color    = null;
                    if (true === VARIABLES.settings.user_color_messages) {
                        if (VARIABLES.settings.user_color_set.hasOwnProperty(username)) {
                            color = VARIABLES.settings.user_color_set[username];
                        } else if (VARIABLES.settings.use_username_based_color) {
                            color = fn.helpers.stringToColor(username);
                        }
                    }

                    let message = usernameElement.nextElementSibling;
                    if (!message || message.classList.value.length > 0 || message.style.color === '') {
                        message = usernameElement.parentElement;
                    }
                    if (!message.hasAttribute('data-original-color') && color !== null) {
                        message.setAttribute('data-original-color', message.style.color.ensureHEXColor());
                    }
                    let originalColor = message.getAttribute('data-original-color');
                    if (null !== color) {
                        message.style.color = color;
                    } else if (originalColor) {
                        message.style.color = `#${originalColor}`;
                    }
                },

                computeCryCountForGold(cryPurchasedToday) {
                    let result = {
                        can_buy: 0,
                        price  : 0
                    };
                    let price  = fn.helpers.getNextItemPrice(cryPurchasedToday, 1, 2E6, 1E6, 1);
                    if (price > VARIABLES.marketData.Crystal) {
                        return result;
                    }
                    let i = 1;
                    while (price <= VARIABLES.marketData.Crystal) {
                        result.price += price;
                        price = fn.helpers.getNextItemPrice(cryPurchasedToday + (i++), 1, 2E6, 1E6, 1);
                        result.can_buy++;
                    }

                    return result;
                },

                addMassGemSendAllByRowButton(table) {
                    const allButtonTemplate = document.createElement('a');
                    allButtonTemplate.classList.add('RoAQoL-massGemSendRowAll');
                    allButtonTemplate.textContent = '[All]';

                    [...table.querySelectorAll('tr td')]
                      .forEach(cell => {
                          if (false === cell.innerHTML.includes('mass_gem_send_amount')) {
                              return;
                          }

                          const allButton = allButtonTemplate.cloneNode(true);

                          cell.insertAdjacentText('beforeend', ' ');
                          cell.insertAdjacentElement('beforeend', allButton);
                      });
                },

                startup() {
                    return {
                        'Initiation IndexedDB ..': fn.__.setupIndexedDB,
                        'Setting up styles ..'   : fn.__.setupCSS,
                        'Setting up templates ..': fn.__.setupTemplates,
                        'Setting up HTML ..'     : fn.__.setupHTML,
                        'Setting up Vue ..'      : fn.__.setupVue,
                        'Setting up variables ..': fn.__.setupVariables,
                        'Setting up observers ..': fn.__.setupObservers,
                        'Loading settings ..'    : fn.__.loadSettings,
                        'Starting loops ..'      : fn.__.setupLoops,
                        'Loading house info ..'  : fn.__.loadHouseInfo,
                    };
                },

                init() {
                    log('Starting up ..');
                    let startup = fn.__.startup();
                    for (let message in startup) {
                        if (!startup.hasOwnProperty(message)) {
                            continue;
                        }
                        log(message);
                        startup[message]();
                    }
                }
            },
            /** public QoL object methods */
            API    : {
                addFameOwnGemsButton(gems) {
                    if (!VARIABLES.settings.fame_own_gems) {
                        return;
                    }
                    for (let gem of gems) {
                        VARIABLES.gems[gem.i] = gem;
                    }
                    fn.__.registerFameOwnGemTableObserver();
                },

                massGemSendHandler() {
                    if (!VARIABLES.settings.mass_gem_send_all_by_row) {
                        return;
                    }

                    // wait to make sure table is created, then add buttons
                    const checkForTable = setInterval(() => {
                        const table = document.getElementById('massGemSendTable');
                        if (table) {
                            clearInterval(checkForTable);
                            fn.__.addMassGemSendAllByRowButton(table);
                        }
                    }, 100);

                    setTimeout(() => clearInterval(checkForTable), 5000);
                },

                addCraftingTableQueueObserver() {
                    OBSERVERS.general.craftingTableQueue.observe(
                      document.querySelector('#houseRoomItemDescription'),
                      { subtree: true, childList: true, attributes: true }
                    );
                },

                addCarvingTableQueueObserver() {
                    OBSERVERS.general.carvingTableQueue.observe(
                      document.querySelector('#houseRoomItemDescription'),
                      { subtree: true, childList: true, attributes: true }
                    );
                },

                handleHouseData(type, data) {
                    if (!VARIABLES.settings.house_tooltips) {
                        return;
                    }
                    // when viewing other players' house there is no rooms property, triggers error
                    if (type === 'house' && data.hasOwnProperty('rooms')) {
                        fn.__.updateRooms(data.rooms);
                    } else if (type === 'room') {
                        fn.__.updateHouseRoom(data.room.room_type, data.room.items);
                    }
                    fn.__.saveHouseInfo();
                },

                setChatDirection(dir) {
                    VARIABLES.chatDirection = dir;
                },
                updateMessageLimit(msgBox) {
                    if (!VARIABLES.settings.char_count) {
                        return;
                    }
                    let lng = $(msgBox).text().replace(/\/(w [^\s]+ |r |re |me |m |h |c |t |a |wire.*)/i, '').length;
                    document.querySelector('#chatMessageWrapper').setAttribute('data-limiter', `${lng} / 400`);
                },

                processLoginInfo(data) {
                    if (data.hasOwnProperty('p')) {
                        fn.__.setupLevelRequirements(data.p);
                        if (data.p.hasOwnProperty('chatScroll')) {
                            fn.API.setChatDirection(data.p.chatScroll);
                        }
                    }
                },
                changeSetting(setting, element) {
                    fn.__.processSettingChange(element, ...setting.split('-'));
                },

                processBattle(message) {
                    if (!message.hasOwnProperty('results')) {
                        return;
                    }
                    let data = message.results;

                    fn.helpers.togglePerHourSection('battle');

                    VARIABLES.QoLStats.b++;
                    if (data.hasOwnProperty('b')) {
                        VARIABLES.QoLStats.d.BattleXPPerHour += data.b.xp;
                        VARIABLES.QoLStats.d.BattleGoldPerHour += data.b.g;
                        VARIABLES.QoLStats.d.BattleClanXPPerHour += data.b.hasOwnProperty('cxp') ? data.b.cxp : 0;
                        VARIABLES.QoLStats.d.BattleClanGoldPerHour += data.b.hasOwnProperty('cg') ? data.b.cg : 0;
                        VARIABLES.QoLStats.PlXPReq = data.p.currentXP / (data.p.levelPercent / 100);
                        if (VARIABLES.QoLStats.PlXPReq > 0 && data.b.r === 1) { // won
                            let eta;
                            if (data.b.xp === 0) {
                                eta = 'never';
                            } else {
                                eta = (VARIABLES.QoLStats.PlXPReq - data.p.currentXP) / data.b.xp * data.p.next_action;
                                eta = eta.toTimeEstimate();
                            }
                            VARIABLES.QoLStats.e.LevelETA.text(eta);

                            fn.__.processDrops('battle', data.b);
                            fn.__.questEstimate(data.p.bq_info2, true);

                            VARIABLES.QoLStats.na = data.p.next_action;
                        }
                        fn.__.logAvgDmg(data);
                    }

                    fn.helpers.updateStats('battle', data.b);
                    if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                    if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                },
                processTS(message) {
                    if (!message.hasOwnProperty('results')) {
                        return;
                    }
                    let data = message.results;
                    fn.helpers.togglePerHourSection('harvest');

                    VARIABLES.QoLStats.h++;
                    if (data.hasOwnProperty('a')) {
                        VARIABLES.QoLStats.d.TSXPPerHour += data.a.xp;
                        VARIABLES.QoLStats.d.TSResourcesPerHour += data.a.hasOwnProperty('a') ? data.a.a : 0;
                        VARIABLES.QoLStats.d.TSClanResourcesPerHour += data.a.hasOwnProperty('ca') ? data.a.ca : 0;
                        VARIABLES.QoLStats.e.TSResourcesPerHour.removeClass('food wood iron stone').addClass(data.a.r);
                        let token                 = data.a.r;
                        token                     = token.charAt(0).toUpperCase() + token.substr(1) + 'XPReq';
                        let skill                 = data.a.s;
                        VARIABLES.QoLStats[token] = data.p.currentXP / (data.p.levelPercent / 100);
                        let eta;
                        if (data.a.xp === 0) {
                            eta = 'never';
                        } else {
                            eta = (VARIABLES.QoLStats[token] - data.p.currentXP) / data.a.xp * data.p.next_action;
                            eta = eta.toTimeEstimate();
                        }
                        VARIABLES.QoLStats.e.LevelETA.text(eta);

                        VARIABLES.QoLStats.na = data.p.next_action;

                        fn.__.processDrops('TS', data.a);
                        fn.__.questEstimate(data.p.tq_info2);

                        fn.helpers.updateStats('TS', data.a);
                    }
                    if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                    if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                },
                processCraft(message) {
                    if (!message.hasOwnProperty('results')) {
                        return;
                    }
                    let data = message.results;
                    fn.helpers.togglePerHourSection('craft');

                    VARIABLES.QoLStats.ct++;
                    if (data.hasOwnProperty('a')) {
                        VARIABLES.QoLStats.d.CTXPPerHour += data.a.xp;
                        let token                 = 'CTXPReq';
                        VARIABLES.QoLStats[token] = data.p.currentXP / (data.p.levelPercent / 100);
                        let eta;
                        if (data.a.xp === 0) {
                            eta = 'never';
                        } else {
                            eta = (VARIABLES.QoLStats[token] - data.p.currentXP) / data.a.xp * data.p.next_action;
                            eta = eta.toTimeEstimate();
                        }
                        VARIABLES.QoLStats.e.LevelETA.text(eta);

                        eta = (data.a.ar - data.a.ac) / data.a.ad * data.p.next_action;
                        VARIABLES.QoLStats.e.CraftItemETA.text(eta.toTimeEstimate());

                        eta = VARIABLES.QoLStats.d.CraftCarveQueueETA / data.a.ad * data.p.next_action;
                        VARIABLES.QoLStats.e.CraftCarveQueueETA.text(eta.toTimeEstimate());

                        VARIABLES.QoLStats.na = data.p.next_action;

                        fn.__.processDrops('craft', data.a);
                        fn.__.questEstimate(data.p.pq_info2);

                        fn.helpers.updateStats('Crafting', data.a);
                    }
                    if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                    if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                },
                processCarve(message) {
                    if (!message.hasOwnProperty('results')) {
                        return;
                    }
                    let data = message.results;
                    fn.helpers.togglePerHourSection('carve');

                    VARIABLES.QoLStats.ca++;
                    if (data.hasOwnProperty('a')) {
                        VARIABLES.QoLStats.d.CAXPPerHour += data.a.xp;
                        let token                 = 'CAXPReq';
                        VARIABLES.QoLStats[token] = data.p.currentXP / (data.p.levelPercent / 100);
                        let eta;
                        if (data.a.xp === 0) {
                            eta = 'never';
                        } else {
                            eta = (VARIABLES.QoLStats[token] - data.p.currentXP) / data.a.xp * data.p.next_action;
                            eta = eta.toTimeEstimate();
                        }
                        VARIABLES.QoLStats.e.LevelETA.text(eta);

                        eta = (data.a.ar - data.a.ac) / data.a.ad * data.p.next_action;
                        VARIABLES.QoLStats.e.CarveGemETA.text(eta.toTimeEstimate());

                        eta = VARIABLES.QoLStats.d.CraftCarveQueueETA / data.a.ad * data.p.next_action;
                        VARIABLES.QoLStats.e.CraftCarveQueueETA.text(eta.toTimeEstimate());

                        VARIABLES.QoLStats.na = data.p.next_action;

                        fn.__.processDrops('carve', data.a);
                        fn.__.questEstimate(data.p.pq_info2);

                        fn.helpers.updateStats('Carving', data.a);
                    }
                    if (data.p.autos_remaining >= 0 && VARIABLES.settings.badge_stamina) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                    if (data.p.autos_remaining < 0 && VARIABLES.settings.badge_fatigue) {
                        fn.helpers.updateFavico(data.p.autos_remaining);
                    }
                },
                updateTimerEstimates(data) {
                    if (true !== VARIABLES.settings.timer_estimates) {
                        return;
                    }
                    if (false === data.hasOwnProperty('results')) {
                        return;
                    }
                    if (false === data.results.hasOwnProperty('p')) {
                        return;
                    }

                    const { next_action, autos_max, autos_remaining } = data.results.p;

                    const autosRemainingElement = $('#autosRemaining');
                    const autosMaximumElement = $('#autosMaximum');

                    if (!autosRemainingElement.attr('data-toggle')) {
                        autosRemainingElement.attr('data-toggle', 'tooltip').tooltip({placement: 'bottom center', container: 'body', html: true});
                    }
                    if (!autosMaximumElement.attr('data-toggle')) {
                        autosMaximumElement.attr('data-toggle', 'tooltip').tooltip({placement: 'bottom center', container: 'body', html: true});
                    }

                    const tmpl = '<h5>Based upon</h5>{next_action}s action timer <h5>Good for</h5>{estimate}';

                    autosRemainingElement.attr({'data-original-title': tmpl.formatQoL({next_action: (next_action / 1000).toFixed(3), estimate: (autos_remaining * next_action).toTimeRemaining()})});
                    autosMaximumElement.attr({'data-original-title': tmpl.formatQoL({next_action: (next_action / 1000).toFixed(3), estimate: (autos_max * next_action).toTimeRemaining()})});
                },
                processEventUpdate(message) {
                    fn.helpers.togglePerHourSection('event-update');

                    $('#EventTotalParticipants').text((message.attacker_count + message.harvester_count + message.crafter_count + message.carver_count).format());
                    $('#EventBattlingParticipants').text(message.attacker_count.format());
                    $('#EventHarvestingParticipants').text(message.harvester_count.format());
                    $('#EventCraftingParticipants').text(message.crafter_count.format());
                    $('#EventCarvingParticipants').text(message.carver_count.format());
                },
                processEventAction(message) {
                    if (VARIABLES.settings.badge_event) {
                        fn.helpers.updateFavico(
                            message.results.stamina,
                            (message.results.time_remaining * 1000).toTimeRemaining(true).replace(':', ''),
                            '#ff1493'
                        );
                    }
                },

                closeHub() {
                    $('#RQ-hub-wrapper').hide();
                    fn.helpers.hubToggleTo();
                },
                externalOpenTo(main, sub = null, force = true) {
                    $('#modalTitle').text('RoA-QoL - HUB');
                    $('#modalWrapper, #modalBackground, #RQ-hub-wrapper').show();
                    fn.API.hubShowSection(main, sub, force)
                },
                hubShowSection(main, sub = null, force = true) {
                    if (false === force && 0 !== VARIABLES.hub.tab.length) {
                        main = VARIABLES.hub.tab;
                    } else {
                        VARIABLES.hub.tab = main;
                    }
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

                resetHourlyStats(section) {
                    switch (section) {
                        case 'battle':
                            VARIABLES.QoLStats.bs                      = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.b                       = 0;
                            VARIABLES.QoLStats.d.BattleXPPerHour       = 0;
                            VARIABLES.QoLStats.d.BattleGoldPerHour     = 0;
                            VARIABLES.QoLStats.d.BattleClanXPPerHour   = 0;
                            VARIABLES.QoLStats.d.BattleClanGoldPerHour = 0;
                            break;

                        case 'ts':
                            VARIABLES.QoLStats.hs                       = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.h                        = 0;
                            VARIABLES.QoLStats.d.TSXPPerHour            = 0;
                            VARIABLES.QoLStats.d.TSResourcesPerHour     = 0;
                            VARIABLES.QoLStats.d.TSClanResourcesPerHour = 0;
                            VARIABLES.QoLStats.d.TSResourcesPerHour     = 0;
                            break;

                        case 'craft':
                            VARIABLES.QoLStats.cts           = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.ct            = 0;
                            VARIABLES.QoLStats.d.CTXPPerHour = 0;
                            break;

                        case 'carve':
                            VARIABLES.QoLStats.cas           = moment.tz(GAME_TIME_ZONE);
                            VARIABLES.QoLStats.ca            = 0;
                            VARIABLES.QoLStats.d.CAXPPerHour = 0;
                            break;

                        default:
                            // :)
                            break;
                    }
                },

                removeLocalStorageItem(item) {
                    if (null !== localStorage.getItem(item)) {
                        localStorage.removeItem(item);
                    }
                    if (item === SETTINGS_SAVE_KEY) {
                        fn.__.saveSettings();
                    }
                    fn.__.localStorageStats();
                },

                getEventRewardsRegex() {
                    return VARIABLES.eventRewardsRegex;
                },

                showEventRewardRatio(rewardMessage) {
                    if (!VARIABLES.settings.event_ratio_message) {
                        return;
                    }
                    let [_, ep, plat] = rewardMessage.match(VARIABLES.eventRewardsRegex);

                    ep   = parseInt(ep.replace(/,/g, ''));
                    plat = parseInt(plat.replace(/,/g, ''));

                    let ratio = plat / ep;

                    let message = `<li>[${moment.tz(GAME_TIME_ZONE).format('HH:mm:ss')}] <span class="chat_notification">Your Event Points to Platinum ratio was ~${ratio.toFixed(5)}. (${ep.format()}/${plat.format()}/${ratio.toFixed(5)})</span> </li>`;
                    fn.helpers.addMessageToChat(message);
                    if (true === VARIABLES.settings.event_ratio_chat_prepare && document.querySelector('#chatMessage').textContent === '') {
                        document.querySelector('#chatMessage').textContent = `${ep.format()}/${plat.format()}/${ratio.toFixed(5)}`;
                    }
                },

                populateMaxQuestReward() {
                    if (false === VARIABLES.settings.set_max_quest_reward) {
                        return false;
                    }

                    document.querySelectorAll('.quest_crystal_guess').forEach((e) => {
                        e.value = 25;
                    });
                },

                parseClanDonationsTable() {
                    if (false === VARIABLES.settings.clan_donations_modes) {
                        return false;
                    }
                    return _.debounce(function () {
                        let totals = {};

                        $('#RQ-clan-donation-mode-selector').val('abbr');
                        $('#RQ-donation-table-loaded').text(moment.tz(GAME_TIME_ZONE).format('HH:mm:ss'));

                        let cells = document.querySelectorAll('#myClanDonationTable tbody td[title][class*="donator_list"]');
                        cells.forEach(e => {
                            let category = e.classList.value.match(/donator_list_([a-z]+)/);
                            if (null === category) {
                                return false;
                            }
                            category = category[1];
                            if (!totals.hasOwnProperty(category)) {
                                totals[category] = 0;
                            }
                            let title = e.getAttribute('title').replace(/,/g, '');
                            title     = parseInt(title);
                            if (isNaN(title)) {
                                return false;
                            }
                            totals[category] += title;
                            e.setAttribute('data-abbr', e.textContent);
                            e.setAttribute('data-full', title);
                            e.setAttribute('data-category', category);
                        });

                        cells.forEach(e => {
                            if (!e.hasAttribute('data-full')) {
                                return false;
                            }
                            let category = e.getAttribute('data-category');

                            let full = e.getAttribute('data-full');
                            full     = parseInt(full);

                            let percent = (full / totals[category]) * 100;
                            e.setAttribute('data-percent', `~${percent.format(2)}%`);
                            e.setAttribute('data-full', full.format());
                        });
                    }, 1000)();
                },
                toggleClanDonationsTableMode(mode = 'abbr') {
                    if (false === VARIABLES.settings.clan_donations_modes) {
                        return false;
                    }
                    document.querySelectorAll(`#myClanDonationTable td[data-${mode}]`).forEach(e => {
                        e.textContent = e.getAttribute(`data-${mode}`);
                    });
                },

                improveGemSplicingMenu() {
                    OBSERVERS.general.splicingMenuGemsPicker.disconnect();
                    setTimeout(() => {
                        document.querySelectorAll('#carve_splice_primary option').forEach(fn.helpers.colorGemOption);
                        OBSERVERS.general.splicingMenuGemsPicker.observe(document.querySelector(
                            '#carve_splice_secondary'), {childList: true});
                    }, 1000);
                },
                showUserColorizePrompt() {
                    if (!VARIABLES.settings.user_color_messages) {
                        return;
                    }
                    let username = document.querySelector('#profileOptionUsername').textContent;
                    if (!username) {
                        return;
                    }
                    let color = VARIABLES.settings.user_color_set.hasOwnProperty(username) ? VARIABLES.settings.user_color_set[username] : fn.helpers.stringToColor(username);
                    let unset = !VARIABLES.settings.user_color_set.hasOwnProperty(username) ? ' hidden' : '';
                    $.confirm({
                        title  : `Set a custom color for ${username}`,
                        message: `<input type="text" value="${color}" id="RQ-user-color">`,
                        buttons: {
                            Confirm: {
                                'class': 'green',
                                action : function () {
                                    let color = $("#RQ-user-color").spectrum("get");
                                    if (null === color) {
                                        return;
                                    }
                                    VARIABLES.settings.user_color_set[username] = '#' + color.toHex();
                                    fn.__.saveSettings();
                                    fn.__.applySettings();
                                }
                            },
                            Unset  : {
                                'class': 'red' + unset,
                                action : function () {
                                    if (VARIABLES.settings.user_color_set.hasOwnProperty(username)) {
                                        delete VARIABLES.settings.user_color_set[username];
                                    }
                                    fn.__.saveSettings();
                                    fn.__.applySettings();
                                }
                            },
                            Cancel : {
                                'class': 'red',
                                action : function () {
                                }
                            }
                        }
                    });

                    $("#RQ-user-color").spectrum({
                        flat           : true,
                        showInput      : true,
                        // allowEmpty     : true,
                        showInitial    : true,
                        showButtons    : false,
                        preferredFormat: "hex"
                    });
                },

                prefillAllToSell(currency) {
                    if (!VARIABLES.settings.prefill_all_to_sell) {
                        return;
                    }
                    currency     = currency.toLowerCase().replace(/\s+/g, '_');
                    let sellable = document.querySelector(`.${currency}`).getAttribute('data-personal').replace(/,/g, '');

                    document.querySelector('#amountToSell').value = sellable;
                },
                undercutByOne(currentSales, pastSales) {
                    if (!VARIABLES.settings.undercut_by_one) {
                        return;
                    }
                    if (0 === currentSales.length && 0 === pastSales.length) {
                        return;
                    }
                    let price = currentSales.length === 0 ? pastSales.pop().price : currentSales.shift().price;

                    document.querySelector('#sellingPrice').value = price - 1;
                },

                prepareIngredientsExport(ingredients) {
                    if (!VARIABLES.settings.export_ingredients) {
                        return false;
                    }
                    let exportData = [];
                    for (const ingredient of ingredients) {
                        if (false === ingredient.m) {
                            continue;
                        }
                        exportData.push(`${ingredient.n}${ingredient.v}`);
                    }
                    VARIABLES.ingredientExportData                                     = exportData.join('? ') + ' Market';
                    document.querySelector('#massButtonHolder').style.display          = 'block';
                    document.querySelector('#inventoryItemCountWrapper').style.display = 'none';
                    document.querySelectorAll('#massButtonHolder a:not(#RQ-export-ingredients-for-bento)').forEach(a => a.style.display = 'none');
                    document.querySelector('#RQ-export-ingredients-for-bento').classList.remove('hidden');
                },
                hideIngredientExportLink() {
                    document.querySelector('#RQ-export-ingredients-for-bento').classList.add('hidden');
                },
                copyIngredientsExport() {
                    if (!VARIABLES.settings.export_ingredients) {
                        return false;
                    }

                    $.alert(`Copy the contents of this input and paste into <a href="https://docs.google.com/spreadsheets/d/1Uh1VZhFwErgaJBYpNjRgThSg3MUXi_eyYb64QQWkdDA/edit#gid=1857737512" target="_blank">Bento's Sheets</a>.<br><input value="${VARIABLES.ingredientExportData}" id="RQ-ingredient-export" type="text" class="form-control"><br><em id="RQ-auto-sopy-success" class="text-success small"></em>`, 'Ingredients export');

                    document.querySelector('#RQ-ingredient-export').select();

                    if ('off' === document.designMode) {
                        document.designMode = 'on';
                    }

                    let copy = document.execCommand('copy');

                    document.designMode = 'off';

                    if (true === copy) {
                        document.querySelector('#RQ-auto-sopy-success').textContent = 'Text has been copied automatically ..';
                    }
                },

                addCrystalsForGoldInfo(data) {
                    if (false === VARIABLES.marketData.hasOwnProperty('Crystal')) {
                        setTimeout(fn.API.addCrystalsForGoldInfo, 500, data);
                        return;
                    }
                    // data.ppt // premium purchased today
                    let message = document.querySelector('#rq-cry-for-gold-info-msg');

                    if (null === message) {
                        message = document.createElement('div');
                        message.classList.add('mt10');
                        message.setAttribute('id', 'rq-cry-for-gold-info-msg');
                        let parent = document.querySelector('#premium_purchased_today').parentElement;
                        parent.insertAdjacentElement('afterend', message);
                    }

                    let computed = fn.__.computeCryCountForGold(data.ppt);
                    if (true === VARIABLES.settings.crystal_shop_cry_info) {
                        message.innerHTML = `Current cry rate is <span class="gold">${VARIABLES.marketData.Crystal.format()}</span>/cry.<br>
You can buy ${computed.can_buy} more crystals for <span class="gold">${computed.price.abbr()}</span> gold`;
                    }
                    if (true === VARIABLES.settings.crystal_shop_prefill_to_buy) {
                        setTimeout((canBuy) => {
                            document.getElementById('premium_purchase_gold_count').value = canBuy;
                        }, 500, computed.can_buy);
                    }
                },

                houseBuildReadyTimestamp(message) {
                    let total = fn.helpers.computeTotalTimeInSeconds(message);
                    if (0 === total) {
                        return false;
                    }
                    let when = moment.tz(GAME_TIME_ZONE).add(total, 'seconds');
                    setTimeout((when) => {
                        let span = document.createElement('span');
                        span.classList.add('small');
                        span.textContent = ` (${when})`;
                        document.querySelector('#house_notification').appendChild(span);
                    }, 100, when.format('MMM DD HH:mm:ss'));
                },
                registerHouseCompleteRoomListObserver() {

                },
                addMobJumpButtons() {
                    const jumpPreviousQuestMobButtonId = 'roaJumpPreviousMob';
                    const jumpPreviousQuestMobButtonSelector = '#' + jumpPreviousQuestMobButtonId;
                    const jumpQuestMobIntervalId = 'roaMobInterval';
                    const jumpQuestMobIntervalSelector = '#' + jumpQuestMobIntervalId;
                    const jumpQuestMobSpeedId = 'roaMobSpeed';
                    const jumpQuestMobSpeedSelector = '#' + jumpQuestMobSpeedId;
                    const jumpNextQuestMobButtonId = 'roaJumpNextMob';
                    const jumpNextQuestMobButtonSelector = '#' + jumpNextQuestMobButtonId;

                    if($(jumpPreviousQuestMobButtonSelector).length === 0) {
                        $('.questRequest[data-questtype="kill"]').before(`<input type="button" id="${jumpPreviousQuestMobButtonId}" value="Jump Back" style="margin-right: 5px; padding: 6.5px;" data-toggle="tooltip" title="Press and hold to cycle throught mobs in rapid succession">`);

                        $(jumpPreviousQuestMobButtonSelector).tooltip({placement: 'auto left', container: 'body', html: true});

                        $(document).on('click', jumpPreviousQuestMobButtonSelector, () => {
                            fn.helpers.jumpQuestMob(-1);
                        });

                        let jumpInterval = null;
                        let shouldStop = false;
                        $(document).on('contextmenu', jumpPreviousQuestMobButtonSelector, (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                        });
                        $(document).on('mousedown', jumpPreviousQuestMobButtonSelector, () => {
                            shouldStop = false;
                            return _.debounce(() => {
                                if (true === shouldStop) {
                                    return;
                                }
                                jumpInterval = setInterval(() => fn.helpers.jumpQuestMob(-1), VARIABLES.settings.jump_mobs_speed)
                            }, 500)();
                        });

                        $(document).on('mouseup mouseleave', jumpPreviousQuestMobButtonSelector, () => {
                            shouldStop = true;
                            clearInterval(jumpInterval);
                        });
                    }

                    if($(jumpQuestMobIntervalSelector).length === 0) {
                        $('.questRequest[data-questtype="kill"]').after(`<div class="mt10"><div class="col-xs-6"><input type="number" value="${VARIABLES.settings.jump_mobs_increment}" id="${jumpQuestMobIntervalId}" class="col-xs-12 small" style="margin-top: 7px; padding: 2px 6px;" min="11" step="11" data-toggle="tooltip" title="Fucus and use up/down arrow keys to not have to do math"><label for="${jumpQuestMobIntervalId}"">Jump by this many mobs</label></div><div class="col-xs-6"><input type="number" value="${VARIABLES.settings.jump_mobs_speed}" id="${jumpQuestMobSpeedId}" class="col-xs-12 small" style="margin-top: 7px; padding: 2px 6px;" min="50" data-toggle="tooltip" title="Jump every (50 = 0.05s, 100 = 0.1s, 2000 = 2s, etc.) miliseconds (1000ms = 1s)"><label for="${jumpQuestMobSpeedId}"">How fast to jump (in ms)</label></div></div>`);

                        $(jumpQuestMobIntervalSelector).tooltip({placement: 'bottom auto', container: 'body', html: true});

                        $(document).on('change', jumpQuestMobIntervalSelector, (e) => {
                            fn.API.changeSetting('jump_mobs_increment', e.currentTarget);
                        });

                        $(jumpQuestMobSpeedSelector).tooltip({placement: 'bottom auto', container: 'body', html: true});

                        $(document).on('change', jumpQuestMobSpeedSelector, (e) => {
                            fn.API.changeSetting('jump_mobs_speed', e.currentTarget);
                        });
                    }

                    if($(jumpNextQuestMobButtonSelector).length === 0) {
                        $('.questRequest[data-questtype="kill"]').after(`<input type="button" id="${jumpNextQuestMobButtonId}" value="Jump Forward" style="margin-left: 5px; padding: 6.5px;" data-toggle="tooltip" title="Press and hold to cycle throught mobs in rapid succession">`);

                        $(jumpNextQuestMobButtonSelector).tooltip({placement: 'auto right', container: 'body', html: true});

                        $(document).on('click', jumpNextQuestMobButtonSelector, () => {
                            fn.helpers.jumpQuestMob(1);
                        });

                        let jumpInterval = null;
                        let shouldStop = false;
                        $(document).on('contextmenu', jumpNextQuestMobButtonSelector, (e) => {e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();});
                        $(document).on('mousedown', jumpNextQuestMobButtonSelector, () => {
                            shouldStop = false;
                            return _.debounce(() => {
                                if (true === shouldStop) {
                                    return;
                                }
                                jumpInterval = setInterval(() => fn.helpers.jumpQuestMob(1), VARIABLES.settings.jump_mobs_speed);
                            }, 500)();
                        });
                        $(document).on('mouseup mouseleave', jumpNextQuestMobButtonSelector, () => {
                            shouldStop = true;
                            clearInterval(jumpInterval);
                        });
                    }
                }
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

    $(document).on('roa-ws:battle roa-ws:harvest roa-ws:craft roa-ws:carve', function (e, data) {
        QoL.updateTimerEstimates(data);
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

    $(document).on('click', '#massGemSend', function (e) {
        QoL.massGemSendHandler();
    });

    $(document).on('click', '#RoA-QoL-open-hub', function () {
        $('#modalTitle').text('RoA-QoL - HUB');
        $('#modalWrapper, #modalBackground, #RQ-hub-wrapper').show();
        QoL.hubShowSection('dashboard', null, this.classList.contains('qol-update-ready'));
    });

    $(document).on('click', '#modalBackground, .closeModal', function () {
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

    $(document).on('click', '#RQ-hub-drop-tracker', function () {
        QoL.hubShowSection('drop-tracker');
    });

    $(document).on('click', '#RQ-open-to-drop-tracker', function () {
        QoL.externalOpenTo('drop-tracker');
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
            title  : 'localStorage item deletion',
            message: `Are you sure you want to remove ${lsKey} localStorage entry?<br>If this entry is from an userscript, you may need to refresh before it's reentered by said script.`,
            buttons: {
                Remove: {
                    class : 'green',
                    action: function () {
                        QoL.removeLocalStorageItem(lsKey);
                    },
                },
                Cancel: {
                    class : 'red',
                    action: function () {
                    },
                },
            },
        });
    });

    $(document).on('roa-ws:page:quests', function () {
        QoL.populateMaxQuestReward();
    });

    $(document).on('roa-ws:page:clan_donations', function () {
        QoL.parseClanDonationsTable();
    });

    $(document).on('change', '#RQ-clan-donation-mode-selector', function () {
        QoL.toggleClanDonationsTableMode(this.value);
    });

    $(document).on('roa-ws:page:house_room_item roa-ws:page:carve_gem', function (e, data) {
        if (data.item.room_type === 22 && data.item.item_type === 101) {
            QoL.improveGemSplicingMenu();
            QoL.addCarvingTableQueueObserver();
        }
        if (data.item.room_type === 22 && data.item.item_type === 100) {
            QoL.addCraftingTableQueueObserver();
        }
    });

    $(document).on('click', '#RQ-user-color-set', function () {
        QoL.showUserColorizePrompt();
    });

    $(document).on('roa-ws:page:market', function (e, data) {
        if (data.requested.market_type === 'currency') {
            QoL.prefillAllToSell(data.result.cn);
            QoL.undercutByOne(data.result.l, data.result.past_transactions);
        }
    });

    $(document).on('roa-ws:page:inventory_ingredients', function (e, data) {
        if (data.hasOwnProperty('result')) {
            QoL.prepareIngredientsExport(data.result);
        }
    });

    $(document).on('roa-ws:page:inventory_items roa-ws:page:inventory_tools roa-ws:page:inventory_gems', function () {
        QoL.hideIngredientExportLink();
    });

    $(document).on("keydown", function (e) {
        let keys = {
            Z: 90, // Colori[z]e
        };
        let key  = e.which;
        if ($("#profileOptionTooltip").css("display") === "block") {

            if (key === keys.Z) {
                QoL.showUserColorizePrompt();
            }
        }
    });

    $(document).on('click', '#RQ-export-ingredients-for-bento', function (e) {
        e.preventDefault();
        QoL.copyIngredientsExport();
    });

    $(document).on('roa-ws:page', function (e, data) {
        if (data.page.match(/^house/) && data.hasOwnProperty('m')) {
            QoL.houseBuildReadyTimestamp(data.m);
        }
    });

    $(document).on('roa-ws:page:purchase_crystals_gold roa-ws:page:boosts', function (e, data) {
        QoL.addCrystalsForGoldInfo(data);
    });

    $(document).on('click', '#allHouseUpgrades', function() {
        QoL.registerHouseCompleteRoomListObserver();
    });

    $(document).on('roa-ws:page:quests', function() {
        QoL.addMobJumpButtons();
    });

    $(document).on('click', '#inventoryEquipmentTable .scrapLink', function(e) {
        if (e.originalEvent.altKey) {
            setTimeout(() => document.querySelector('#confirmButtons .green').click(), 200);
        }
    });

    $(document).on('click', '.RoAQoL-massGemSendRowAll', function(e) {
        const input = e.target.closest('td').querySelector('.mass_gem_send_amount');
        // just in case
        if (!input) {
            return;
        }

        const max = parseInt(input.dataset.max);
        // just in case
        if (max) {
            input.value = input.dataset.max;
        }
    });

})(window, jQuery);
