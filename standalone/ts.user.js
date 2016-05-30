// ==UserScript==
// @name         RoA - TitleSwitcher
// @namespace    Reltorakii_is_awesome
// @version      0.1.2
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
        Y: 89,        Z: 90,        Z: 90
    };
    var tsAvailable = [];
    var tsActive    = 0;
    var tsSwitchOnKey = KEYS.F;

    function ts(e, pd){
        if (pd === undefined) {
            pd = false;
        }
        var tsTarget = $(e.target);
        if (e.which == 13 || (e.which >= 112 && e.which <= 123)) {// && ["INPUT", "TEXTAREA"].indexOf(tsTarget.prop("tagName").toUpperCase()) === -1 && !tsTarget.hasClass("editable")) {
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
            if (e.which >= 112 && e.which <= 123) {
                e.preventDefault();
                return false;
            }
        }
    }
    $(document).on("keydown", ts);

})();