// ==UserScript==
// @name         RoA - TitleSwitcher
// @namespace    Reltorakii_is_awesome
// @version      0.1
// @description  Switches between your custom titles on a press of a key
// @author       Reltorakii
// @match        https://*.avabur.com/game.php
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var tsAvailable = [];
    var tsActive    = 0;
    function ts(e){
        var tsTarget = $(e.target);
        if (e.which == 70 && ["INPUT", "TEXTAREA"].indexOf(tsTarget.prop("tagName").toUpperCase()) === -1 && !tsTarget.hasClass("editable")) {
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
                tsActive++;
                if (tsActive == tsAvailable.length) {
                    tsActive = 0;
                }
                var tsActiveID = tsAvailable[tsActive].id;
                $.post("titles_set.php", {id:tsActiveID}, function(data){
                    console.log(data.m);
                    $("#my_title").html(data.p.my_title);
                });
            }
        }
    }
    $(document).on("keydown", ts);

})();