// ==UserScript==
// @name         RoA-QoL
// @namespace    Reltorakii_is_awesome
// @version      0.5.4
// @description  Quality if Life Modifications to the game
// @author       Reltorakii
// @match        https://*.avabur.com/game.php
// @require      https://rawgit.com/ejci/favico.js/master/favico.js
// @downloadURL  https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @updateURL    https://github.com/edvordo/roa-qol/raw/master/RoA-QoL.user.js
// @grant        none
// ==/UserScript==

/*jshint multistr: true */

/*
var a = new Date("Jan 05, 2017 09:44:41 EST"); console.log(a);
var PMlog = {}; $.post("account_activity.php", {p:0,username:"Reltorakii",type:[false,false,false,false,false,false,false,false,true,false,false,false,false,false,false]},function(data){for (var i in data.al){ var name = $("<div>").append(data.al[i].m).find(".profileLink").text(); var id=data.al[i].aid; var messagedate = data.al[i].ds; var message = data.al[i].m.split(":"); message.shift(); message = message.join("."); if (!PMlog.hasOwnProperty(name)) {PMlog[name] = {};} PMlog[name][id] = {d:messagedate,m:message}; }});
 */

(function() {
    'use strict';
    var favico = new Favico({animation:"none"});
    function commatize(a){
        return a.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    $('<style>').append("#allThemTables table {width: 100%;}.houseLabel{display: block; text-decoration: none !important;}").appendTo("body");
    $('<td>').append('<table>\
  <tbody>\
    <tr>\
      <td class="left">XP / h:</td>\
      <td class="right" id="ExpPerHour" data-toggle="tooltip" title="0" style="color:#FF7;"></td>\
    </tr>\
    <tr class="hidden" id="ClanExpPerHourTR">\
      <td class="left">Clan XP / h:</td>\
      <td class="right" id="ClanExpPerHour" data-toggle="tooltip" title="0" style="color:#FF7;"></td>\
    </tr>\
    <tr class="hidden" id="GoldPerHourTR">\
      <td class="left">Gold / h:</td>\
      <td class="right" id="GoldPerHour" data-toggle="tooltip" title="0" style="color:#FFD700;"></td>\
    </tr>\
    <tr class="hidden" id="ClanGoldPerHourTR">\
      <td class="left">Clan Gold / h:</td>\
      <td class="right" id="ClanGoldPerHour" data-toggle="tooltip" title="0" style="color:#FFD700;"></td>\
    </tr>\
    <tr class="hidden" id="ResourcesPerHourTR">\
      <td class="left">Res / h:</td>\
      <td class="right" id="ResourcesPerHour" data-toggle="tooltip" title="0"></td>\
    </tr>\
    <tr class="hidden" id="ClanResourcesPerHourTR">\
      <td class="left">Clan Res / h:</td>\
      <td class="right" id="ClanResourcesPerHour" data-toggle="tooltip" title="0"></td>\
    </tr>\
    <tr>\
      <td class="left">Average lag:</td>\
      <td class="right" id="AverageLag" data-toggle="tooltip" title="0"></td>\
    </tr>\
    <tr>\
      <td colspan="2" align="center"><a id="QoLTracker" class="topLink">Trackers</a></td>\
    </tr>\
  </tbody>\
</table>')
        .addClass("col-xs-2 hidden-xs hidden-sm")
        .appendTo("#allThemTables > tbody > tr");

    var startTime       = new Date();
    var startXP         = 0;
    var startXPC        = 0;
    var startXPRes      = 0;
    var startGold       = 0;
    var startGoldC      = 0;
    var startRes        = 0;
    var startResC       = 0;
    var battles         = 0;
    var harvests        = 0;
    var ExpPerHour      = $("#ExpPerHour");
    var ExpPerHourC     = $("#ClanExpPerHour");
    var ExpPerHourCH    = $("#ClanExpPerHourTR");
    var GoldPerHour     = $("#GoldPerHour");
    var GoldPerHourH    = $("#GoldPerHourTR");
    var GoldPerHourC    = $("#ClanGoldPerHour");
    var GoldPerHourCH   = $("#ClanGoldPerHourTR");
    var ResPerHour      = $("#ResourcesPerHour");
    var ResPerHourH     = $("#ResourcesPerHourTR");
    var ResPerHourC     = $("#ClanResourcesPerHour");
    var ResPerHourCH    = $("#ClanResourcesPerHourTR");
    var AverageLag      = $("#AverageLag");
    var houseStructure  = {
        rooms   : {}
    };
    // var dungeon         = localStorage.getItem("dungeon");
    //     dungeon         = dungeon === null ? {r:{},cf:0,ct:null} : JSON.parse(dungeon);
     

    ExpPerHour.tooltip({placement:"left",container:"body",html:true});
    ExpPerHourC.tooltip({placement:"left",container:"body",html:true});
    GoldPerHour.tooltip({placement:"left",container:"body",html:true});
    GoldPerHourC.tooltip({placement:"left",container:"body",html:true});
    ResPerHour.tooltip({placement:"left",container:"body",html:true});
    ResPerHourC.tooltip({placement:"left",container:"body",html:true});
    function x(e, res, req, jsonres) {
        if (req.url === "house_room.php") {
            var roomName = jsonres.room.name.split(" ");
                roomName.shift();
                roomName.join(" ");
            houseStructure.rooms[roomName] = {
                roomtype    : jsonres.room.room_type,
                items       : {}
            };
            for (var i in jsonres.room.items) {
                var r = jsonres.room.items[i];
                var desc = $("<div>").html(r.desc);
                if (desc.children(":first").length > 0) {
                    desc = desc.children(":first").text();
                } else {
                    desc = desc.text();
                }
                var title  = "<h5>Level upgrade</h5><a class='houseLabel'>Cost</a>"+r.level_upgrade_cost+"<br><a class='houseLabel'>Time</a>"+r.level_upgrade_time;
                    if (r.tier_upgrade_time !== "Now") {
                        title += "<h5>Tier upgrade</h5><a class='houseLabel'>Cost</a>"+r.tier_upgrade_cost+"<br><a class='houseLabel'>Time</a>"+r.tier_upgrade_time;
                    }
                    title += "<h5>Description</h5>"+desc;
                $("#houseRoomItemsBuilt .houseViewRoomItem:eq('"+i+"')").tooltip({title:title,placement:"left",html:true,container:"body"});

                houseStructure.rooms[roomName].items[r.name] = {
                    itemtype: r.item_type,
                    name    : r.name,
                    desc    : title,
                    level   : r.level
                };
            }
            localStorage.setItem("houseInfo", JSON.stringify(houseStructure));
        } else if (req.url === "house_all_builds.php") {
            var houseData = JSON.parse(localStorage.getItem("houseInfo"));
            if (houseData !== null && houseData.hasOwnProperty("rooms")) {
                var items = jsonres.q_b;
                for (var x in items) {
                    if (houseData.rooms.hasOwnProperty(items[x].rn)) {
                        if (houseData.rooms[items[x].rn].items.hasOwnProperty(items[x].n)) {
                            $("#modal2Content ul > li:eq("+x+") a.houseViewRoomItem").append(" ("+houseData.rooms[items[x].rn].items[items[x].n].level+")").tooltip({title:houseData.rooms[items[x].rn].items[items[x].n].desc,placement:"left",html:true,container:"body"});
                        } else {
                            console.log("Don't have info about house room item '"+items[x].n+"'. Open room '"+items[x].rn+"' (just room, no need to open that item) to set up data.");
                        }
                    } else {
                        console.log("Don't have info about house room '"+items[x].rn+"'. Open that room (just room, no need to open it's items) to set up data about it.");
                    }
                }
            } else {
                console.log("Don't have info about house. Open each room (just room, no need to open items) to set up data.");
            }
        } else if (req.url === "autobattle.php") {
            favico.badge();
            battles++;
            ExpPerHourCH.removeClass("hidden");
            GoldPerHourH.removeClass("hidden");
            GoldPerHourCH.removeClass("hidden");
            ResPerHourH.addClass("hidden");
            ResPerHourCH.addClass("hidden");
            try {
                var now     = new Date();
                var xp      = !!jsonres.b.xp ? jsonres.b.xp : 0;
                var g       = !!jsonres.b.g ? jsonres.b.g : 0;
                var cxp     = !!jsonres.b.cxp ? jsonres.b.cxp : 0;
                var cg      = !!jsonres.b.cg ? jsonres.b.cg : 0;
                startXP     += xp;
                startGold   += g;
                startXPC    += cxp;
                startGoldC  += cg;
                if (xp > 0) {
                    ExpPerHour.html(commatize(Math.floor(startXP/(now - startTime)*60*60*1000)))
                        .attr("data-original-title", "<h5>Based upon</h5>" + commatize(Math.floor(startXP))+" XP over "+battles+" battles since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*xp))+" / h");
                    GoldPerHour.html(commatize(Math.floor(startGold/(now - startTime)*60*60*1000)))
                        .attr("data-original-title", "<h5>Based upon</h5>" + commatize(Math.floor(startGold))+" Gold over "+battles+" battles since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*g))+" / h");
                    ExpPerHourC.html(commatize(Math.floor(startXPC/(now - startTime)*60*60*1000)))
                        .attr("data-original-title", "<h5>Based upon</h5>" + commatize(Math.floor(startXPC))+" XP over "+battles+" battles since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*cxp))+" / h");
                    GoldPerHourC.html(commatize(Math.floor(startGoldC/(now - startTime)*60*60*1000)))
                        .attr("data-original-title", "<h5>Based upon</h5>" + commatize(Math.floor(startGoldC))+" Gold over "+battles+" battles since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*cg))+" / h");
                }
                logDrop(jsonres);
            } catch (exception) {
                // console.log(jsonres);
                // console.log(exception);
            }
        } else if (req.url === "autotrade.php") {
            //{"p":{"food":{"t":20050,"p":20050},"fishing":{"l":144,"xp":36961,"tnl":202209},"autosRemaining":108,"next_action":5966.4,"general_notification":null,"mods":{"0":{"type":0,"rm":"2","n":"Double","modifier":2,"end":"1466808674","ends":518,"mod":2,"modt":"Double"},"2":{"type":2,"rm":"2","n":null,"modifier":1,"end":"1466808674","ends":518,"mod":1,"modt":null}},"replenishKey":"82","clan_level_percent":null},"a":{"e":null,"so":false,"fb":false,"r":"food","xp":120,"mult":{"type":0,"rm":"2","n":"Double","modifier":2,"end":"1466808674","ends":518,"mod":2,"modt":"Double"},"a":10,"ca":1,"s":"fishing","txp":36961,"tc":202209,"t":"Opal Fishing Rod","sr":null,"dr":null,"qf":"<span style=\"color: red;\">You don't currently have a harvesting quest.<\/span>","ir":null,"l":0}}

            harvests++;
            ExpPerHourCH.addClass("hidden");
            GoldPerHourH.addClass("hidden");
            GoldPerHourCH.addClass("hidden");
            ResPerHourH.removeClass("hidden");
            ResPerHourCH.removeClass("hidden");
            try {
                var now    = new Date();
                var xp     = !!jsonres.a.xp ? jsonres.a.xp : 0;
                var res    = !!jsonres.a.a ? jsonres.a.a : 0;
                var cres   = !!jsonres.a.ca ? jsonres.a.ca : 0;
                var r      = !!jsonres.a.r ? jsonres.a.r : '';
                startXPRes+= xp;
                startRes  += res;
                startResC += cres;
                if (xp > 0) {
                    ExpPerHour.html(commatize(Math.floor(startXPRes/(now - startTime)*60*60*1000)))
                        .attr("data-original-title", "<h5>Based upon</h5>" + commatize(Math.floor(startXPRes))+" XP over "+harvests+" harvests since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*xp))+" / h");
                    ResPerHour.addClass(r).html(commatize(Math.floor(startRes/(now - startTime)*60*60*1000)))
                        .attr("data-original-title", "<h5>Based upon</h5>" + commatize(Math.floor(startRes))+" Resources over "+harvests+" harvests since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*res))+" / h");
                    ResPerHourC.addClass(r).html(commatize(Math.floor(startResC/(now - startTime)*60*60*1000)))
                        .attr("data-original-title", "<h5>Based upon</h5>" + commatize(Math.floor(startResC))+" Resources over "+harvests+" harvests since "+startTime.toLocaleString()+"<h5>Would be gain / h</h5>"+commatize(Math.floor((60*60*1000/jsonres.p.next_action)*cres))+" / h");
                }
                logDrop(jsonres);
            } catch (exception) {console.log(exception);}
        }
        // if (jsonres.hasOwnProperty("data") && jsonres.data.hasOwnProperty("map")) {
        //     if (dungeon.cf !== jsonres.data.floor) {
        //         dungeon.r = {};
        //         dungeon.cf = jsonres.data.floor;
        //     }
        //     var jrd = jsonres.data;
        //     var data = {};
        //     var token = $(jrd.map).text().replace("↓", "v"); // map
        //         token = btoa(JSON.stringify(token)); // token
        //     if (dungeon.r.hasOwnProperty(token)) {
        //         data = JSON.parse(JSON.stringify(dungeon.r[token]));
        //     } else {
        //         data.pe = "";
        //         data.ps = "";
        //         data.pn = "";
        //         data.pw = "";
        //         data.t  = token;
        //     }
        //     if (dungeon.ct === null) {
        //         dungeon.ct = token;
        //     }

        //     data.e = jrd.e?1:0; // east
        //     data.s = jrd.s?1:0; // south
        //     data.n = jrd.n?1:0; // north
        //     data.w = jrd.w?1:0; // west
        //     data.r = !!jrd.search; // raided
        //     data.b = jrd.enemies.length; // battles available

        //     dungeon.r[data.t] = data;
            
        //     var walk = jsonres.hasOwnProperty("m") && jsonres.m.match(/You walked (east|south|north|west)/);
        //         walk = walk ? jsonres.m.match(/You walked (east|south|north|west)/) : false;
        //     if (walk !== false) {
        //         walk = walk[1].match(/^./)[0];
        //         if (dungeon.ct !== data.t) {
        //             if (typeof dungeon.r[dungeon.ct] !== "undefined") {
        //                 dungeon.r[dungeon.ct]["p"+walk] = data.t;
        //                 var sm = {
        //                     "s": "n",
        //                     "n": "s",
        //                     "e": "w",
        //                     "w": "e"
        //                 };
        //                 dungeon.r[data.t]["p"+sm[walk]] = dungeon.ct;
        //             }
        //             dungeon.ct = data.t;
        //         }
        //     }
        //     localStorage.setItem("dungeon", JSON.stringify(dungeon));
        //     updateDungeonMap(false);
        // } else {
        //     updateDungeonMap(req.url.indexOf("dungeon_") === -1);
        // }

        if (jsonres.hasOwnProperty("p") && jsonres.p.hasOwnProperty("autosRemaining")) {
            var ar = jsonres.p.autosRemaining;
            var fatigued = ar < 0;
                ar = Math.abs(ar);
            if (fatigued){
                favico.badge(ar, {bgColor:"#a00"});
                if (ar > 50) ar = 50;
                if (ar > 35) { $("#iAmAFK").text("Approaching 50 FATIGUED actions!").show(); }
                var arc = Math.floor(255/50)*ar;
                $("#chatMessage").attr("style", "border-color:#"+arc.toString(16)+"0000!important");
            } else {
                var et = jsonres.p.event_time;
                var fiColor = (et === null ? "#050" : "#850");
                var minutes = Math.floor(et / 60);
                var seconds = et % 60;
                    seconds = (Math.abs(seconds) < 10 ? "0" : "") + seconds;
                var fiValue = (et !== null && et > 0 ? (minutes+":"+seconds) : ar );
                favico.badge(fiValue, {bgColor:fiColor});
                $("#iAmAFK").hide();
                $("#chatMessage").attr("style", "");
            }
        }
    }

    // var dmc, dmctx, dmv;
    // function updateDungeonMap(hide) {
    //     var d = JSON.parse(JSON.stringify(dungeon));
    //     if ($("#dungeonMapCanvas").length === 0) {
    //         var h = $("<div>")
    //             .attr("id", "dMCW")
    //             .css({position:"absolute",top:0,left:0,border:"1px red solid"})
    //             .appendTo("body");
    //         $("<canvas>").attr({
    //             id: "dungeonMapCanvas",
    //             width: "325",
    //             height: "325"
    //         }).appendTo("#dMCW");
    //         h.draggable({handle:"#dungeonMapCanvas"}).resizable({stop:function(e,d){$("#dungeonMapCanvas").attr({width:d.size.width,height:d.size.height});updateDungeonMap(false);}});
    //         dmc = document.getElementById("dungeonMapCanvas");
    //         dmctx = dmc.getContext("2d");
    //     }
    //     if (hide === false) {
    //         $("#dMCW").show();
    //         dmv = [];
    //         dmctx.clearRect(0,0,dmc.width,dmc.height);
    //         drawTile(d.ct, Math.floor(dmc.width/2), Math.floor(dmc.height/2), 1);
    //     } else {
    //         $("#dMCW").hide();
    //     }
    // }

    // function drawTile(id, x, y, player) {
    //     if (typeof player === "undefined") {
    //         player = 0;
    //     }

    //     if (dmv.indexOf(id) !== -1) {
    //         return;
    //     }
    //     var tile = dungeon.r[id];
    //     dmv.push(id);

    //     // console.log(id,x,y);
    //     // console.log(JSON.stringify(tile, null, "\t"));
        
    //     dmctx.fillStyle = "#333";
    //     dmctx.fillRect(x-4, y-4, 10, 10);

    //     drawTileWall(x,y,"top", !tile.n);
    //     drawTileWall(x,y,"left", !tile.w);
    //     drawTileWall(x,y,"right", !tile.e);
    //     drawTileWall(x,y,"bot", !tile.s);

    //     if (tile.r) {
    //         dmctx.fillStyle     = "#ffd700";
    //         dmctx.strokeStyle   = "#ffd700";
    //         dmctx.arc(x,y,2, 0, 2*Math.PI);
    //         dmctx.fill();
    //     }

    //     if (tile.b > 0) {
    //         dmctx.fillStyle     = "#ff0000";
    //         dmctx.strokeStyle   = "#ff0000";
    //         dmctx.arc(x,y,2, 0, 2*Math.PI);
    //         dmctx.fill();
    //     }

    //     if (player === 1) {
    //         dmctx.fillStyle     = "#ffffff";
    //         dmctx.strokeStyle   = "#ffffff";
    //         dmctx.arc(x,y,2, 0, 2*Math.PI);
    //         dmctx.fill();
    //     }
    //     if (tile.n === 1 && tile.pn !== "") {
    //         // console.log(tile.pn);
    //         drawTile(tile.pn, x, y-10);
    //     }
    //     if (tile.w === 1 && tile.pw !== "") {
    //         // console.log(tile.pw);
    //         drawTile(tile.pw, x-10, y);
    //     }
    //     if (tile.e === 1 && tile.pe !== "") {
    //         // console.log(tile.pe);
    //         drawTile(tile.pe, x+10, y);
    //     }
    //     if (tile.s === 1 && tile.ps !== "") {
    //         // console.log(tile.ps);
    //         drawTile(tile.ps, x, y+10);
    //     }
        
    // }

    // function drawTileWall(x,y,which, blocked) {
    //     if (blocked) {
    //         dmctx.strokeStyle = "#ff0000";
    //         dmctx.fillStyle   = "#ffffff";
    //     } else {
    //         dmctx.strokeStyle = "#333";
    //         return;
    //     }
    //     dmctx.beginPath();
    //     if (which === "top") {
    //         dmctx.moveTo(x-5, y-5);
    //         dmctx.lineTo(x+5, y-5);
    //     } else if (which === "left") {
    //         dmctx.moveTo(x-5, y-5);
    //         dmctx.lineTo(x-5, y+5);
    //     } else if (which === "right") {
    //         dmctx.moveTo(x+5, y+5);
    //         dmctx.lineTo(x+5, y-5);
    //     } else if (which === "bot") {
    //         dmctx.moveTo(x-5, y+5);
    //         dmctx.lineTo(x+5, y+5);
    //     }
    //     dmctx.stroke();
    //     dmctx.closePath();
    // }

    function logDrop(json) {
        var s = sessionStorage.getItem("QoLTracker");
        if (s === null) {
            s = {
                "t": {
                    "dr": {},
                    "ir": {},
                    "sr": {}
                }
            };
        } else {
            s = JSON.parse(s);
        }
        var x = {};
        if (json.hasOwnProperty("b")) {
            x = json.b;
        } else if (json.hasOwnProperty("a")) {
            x = json.a;
        }
        var d = new Date();
        if (x !== {}) {
            if (x.dr) {
                // console.log("["+(d).toLocaleTimeString()+"] [x.dr] ", x.dr);
                s.t.dr[d.getTime()] = x.dr;
            }
            if (x.ir) {
                // console.log("["+(d).toLocaleTimeString()+"] [x.ir] ", x.ir);
                s.t.ir[d.getTime()] = {
                    "i": x.ir,
                    "m": x.m.n
                };
            }
            if (x.sr) {
                // console.log("["+(d).toLocaleTimeString()+"] [x.sr] ", x.sr);
                s.t.sr[d.getTime()] = x.sr;
            }
        }
        sessionStorage.setItem("QoLTracker", JSON.stringify(s));
    }


    function _round(num, spaces) {
        var multiply = 1;
        if (spaces > 0) {
            while (spaces-- > 0) {
                multiply *= 10;
            }
        }

        return Math.round(num * multiply) / multiply;
    }

    var ajaxStart       = 0;
    var ajaxComplete    = 0;
    var requestCount    = 0;
    var ajaxLag         = 0;

    function as() {
        var d = new Date();
        ajaxStart = d.getTime() / 1000;
    }
    function ac() {
        if (ajaxStart > 0) {
            var d = new Date();
            ajaxComplete = d.getTime() / 1000;
            requestCount++;
            ajaxLag = ajaxLag + (ajaxComplete - ajaxStart);
            AverageLag.text(_round(ajaxLag / requestCount,4) + "s");
            
            ajaxStart = 0;
        }
    }
    $(document).on("ajaxStart", as);
    $(document).on("ajaxComplete", ac);
    $(document).on("ajaxSuccess", x);
    $(document).on("click", "#clearBattleStats", function(){
        startTime       = new Date();
        startXP         = 0;
        startXPC        = 0;
        startXPRes      = 0;
        startGold       = 0;
        startGoldC      = 0;
        startRes        = 0;
        startResC       = 0;
        battles         = 0;
        harvests        = 0;
    });

    $(document).on("click", "#modalBackground", function() {
        $("#QoLTrackerWrapper").hide();
    });

    $(document).on("click", "#QoLTracker", function(){
        var trackerWrapper = $("#QoLTrackerWindow");
        if (trackerWrapper.length == 0) {
            trackerWrapper = $("<table>").attr("id", "QoLTrackerWindow").css("width","100%");
            trackerWrapper.appendTo("body");
            trackerWrapper.html('<thead><tr><th width="200px">Time</th><th>Thing</th></tr></thead><tbody></tbody>');
        }

        var trackerListings = trackerWrapper.find("tbody");
            trackerListings.html("");

        var s = sessionStorage.getItem("QoLTracker");
        if (s === null) {
            s = {
                "t": {
                    "dr": {},
                    "ir": {},
                    "sr": {}
                }
            };
        } else {
            s = JSON.parse(s);
        }

        $("<tr>").html("<td colspan=2 align=middle><strong>Drops</strong></td>").appendTo(trackerListings);

        if (s.t.dr === null) {
            $("<tr>").html("<td colspan=2 align=middle><em>No drops were get yet...</em></td>").appendTo(trackerListings);
        } else {
            /*
            var dsummary = {};for (var ts in dstats) { var i = dstats[ts]; var a = i.match(/\+?([0-9]+)\)?\s+([a-z\s]+)/i); if (a===null){a=[0,1,"equipment"];}var c = a[1]; var p = a[2].toLowerCase().replace(" instead", "").trim();if (p==="b"){console.log(i,a); continue;} if (!dsummary.hasOwnProperty(p)) {dsummary[p]=0;}dsummary[p]+=parseInt(c); } console.log(dsummary);
            */
            for (var timestamp in s.t.dr) {
                var time = new Date();
                    time.setTime(timestamp);
                $("<tr>").html("<td>"+time.toLocaleString()+"</td><td>"+s.t.dr[timestamp]+"</td>").appendTo(trackerListings);
            }
        }

        $("<tr>").html("<td colspan=2 align=middle><strong>Ingredients</strong></td>").appendTo(trackerListings);

        if (s.t.ir === null) {
            $("<tr>").html("<td colspan=2 align=middle><em>No ingredients were get yet...</em></td>").appendTo(trackerListings);
        } else {
            for (var timestamp in s.t.ir) {
                
                var time = new Date();
                    time.setTime(timestamp);
                $("<tr>").html("<td>"+time.toLocaleString()+"</td><td>["+s.t.ir[timestamp].m+"] "+s.t.ir[timestamp].i+"</td>").appendTo(trackerListings);
            }
        }

        $("<tr>").html("<td colspan=2 align=middle><strong>Stats</strong></td>").appendTo(trackerListings);

        if (s.t.sr === null) {
            $("<tr>").html("<td colspan=2 align=middle><em>No stats were get yet...</em></td>").appendTo(trackerListings);
        } else {
            /*
            var summary = {};for (var ts in stats) { var i = stats[ts]; var s = i.match(/\>(.*)\</)[1]; var a = i.match(/\+?(0?\.?0?1)/); if (typeof summary[s] === "undefined") { summary[s] = 0.0; } summary[s] += parseFloat(a[1]);  } console.log(summary);
             */
            for (var timestamp in s.t.sr) {
                var time = new Date();
                    time.setTime(timestamp);
                $("<tr>").html("<td>"+time.toLocaleString()+"</td><td>"+s.t.sr[timestamp]+"</td>").appendTo(trackerListings);
            }
        }

        $("#modalTitle").text("QoL - Tracker");
        var mc = $("#QoLTrackerWrapper");
        if (mc.length == 0) {
            mc = $("<div>").attr("id", "QoLTrackerWrapper").css({"max-height":"600px",height:"600px"}).appendTo("#modalContent");
            mc.append(trackerWrapper);
        }

        $("#modalWrapper, #modalBackground").show();
        mc.show();
        mc.mCustomScrollbar({scrollInertia: 250,mouseWheel:{scrollAmount: 40}});
    });


    $(document).on("click", ".buyMarketListing", function(){
        setTimeout(function(){
            $("#marketBuyCount").focus();
        }, 500);
    });


    // map
    var minimizerMap = {
        "#gameInfoWrapper h5"       : "#helpSection",
        "#usernameWrapper h4"       : "#statsAndStuff",
        "h5:contains('Game Stats')" : "#gameStatList",
        "#navigationWrapper h5"     : ".navSection"
    };

    var tmpl = $("<span>").addClass("border2 ui-element minimizer").css({
        position : "absolute",
        top      : "3px",
        right    : "3px",
        padding  : "2px"
    }).html("&and;");
    for (var s in minimizerMap) {
        var sel = minimizerMap[s];
        var s2 = $(s);
        s2.css("position", "relative");
        var mnzr = tmpl.clone().attr("onclick", "$('"+sel+"').slideToggle();").appendTo(s2).click(function(){
            var t = $(this);
            t.html(t.text()==="∧"?"&or;":"&and;");
        });
    }

    $("#allThemTables > tbody > tr > td").each(function(i,e){
        $(this).addClass("col-xs-2");
        var c = $(this).children("table").attr("class");
        if (c !== undefined && c !== "") {
            $(this).addClass(c);
        }
    });
    $(document).on("keyup", "#chatMessage", function(){
        setTimeout(function(){
            $("#chatSendMessage").val("Send ("+$("#chatMessage").text().length+")");
        }, 250);
    });
})();