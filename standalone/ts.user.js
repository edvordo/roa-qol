// ==UserScript==
// @name         RoA - TitleSwitcher
// @namespace    Reltorakii_is_awesome
// @version      0.2
// @description  Switches between your custom titles on a press of a key
// @author       Reltorakii
// @match        https://*.avabur.com/game.php
// @downloadURL  https://github.com/edvordo/roa-qol/raw/master/standalone/ts.user.js
// @updateURL    https://github.com/edvordo/roa-qol/raw/master/standalone/ts.user.js
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var KEYS        = {
        A: 65,        B: 66,        C: 67,        D: 68,
        E: 69,        F: 70,        G: 71,        H: 72,
        I: 73,        J: 74,        K: 75,        L: 76,
        M: 77,        N: 78,        O: 79,        P: 80,
        Q: 81,        R: 82,        S: 83,        T: 84,
        U: 85,        V: 86,        W: 87,        X: 88,
        Y: 89,        Z: 90,        F1: 112,      F2: 113,
        F3: 114,      F4: 115,      F5: 116,      F6: 117,
        F7: 118,      F8: 119,      F9: 120,      F10: 121,
        F11: 122,     F12: 123,     ENTER: 13,    ESC: 27
    };
    var tsAvailable = [];
    var tsActive    = 0;

    function ts(e){
        if (e.which >= KEYS.F1 && e.which <= KEYS.F12) {
            if (tsAvailable.length == 0) {
                $.post("titles_view.php", {type:"CUSTOM"}, function(data){
                    tsAvailable = data.titles;
                    for (var i = 0; i < tsAvailable.length; i++) {
                        var x = tsAvailable[i];
                        if (x.in_use) {
                            tsActive = i;
                        }
                    }
                    ts(e);
                });
            } else {
                tsActive = e.which == 13 ? (tsActive+1) : (e.which - 112);
                if (tsActive >= tsAvailable.length) {
                    tsActive = 0;
                }
                var tsActiveID = tsAvailable[tsActive].id;
                $.post("titles_set.php", {id:tsActiveID}, function(data){
                    console.log(data.m);
                    $("#my_title").html(data.p.my_title);
                });
            }
            if (e.which >= KEYS.F1 && e.which <= KEYS.F12) {
                e.preventDefault();
                return false;
            }
        }
    }
    $(document).on("keydown", ts);

})();