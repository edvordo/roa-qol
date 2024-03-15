if (typeof String.prototype.formatQoL !== 'function') {
    // courtesy of http://stackoverflow.com/a/18234317
    String.prototype.formatQoL = String.prototype.formatQoL || function () {
        'use strict';
        let str = this.toString();
        if (arguments.length) {
            let t = typeof arguments[0];
            let key;
            let args = ('string' === t || 'number' === t) ? Array.prototype.slice.call(arguments) : arguments[0];

            for (key in args) {
                str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), args[key]);
            }
        }

        return str;
    };
}

if (typeof String.prototype.ucWords !== 'function') {
    String.prototype.ucWords = function() {
        'use strict';
        let split = this.toString().split(' ');

        let upCased = split.map(i => i.charAt(0).toUpperCase() + i.substring(1));

        return upCased.join(' ');
    };
}

if (typeof String.prototype.ensureHEXColor !== 'function') {
    String.prototype.ensureHEXColor = function() {
        'use strict';
        let val = this.toString();
        if (val.match(/^#[0-9a-f]+$/i)) {
            return val;
        }
        let isRGB = val.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\);?$/);
        if (isRGB) {
            return isRGB.slice(1).map(i => parseInt(i).toString(16)).map(i => i.length === 1 ? `0${i}` : i).join('');
        }
        // hsl?
        return val;
    };
}

if (typeof Number.prototype.format !== 'function') {
    Number.prototype.format = function (deciamalPaces, numbersInGroup) {
        'use strict';
        let a = '\\d(?=(\\d{' + (numbersInGroup || 3) + '})+' + (deciamalPaces > 0 ? '\\.' : '$') + ')';
        return (Math.floor(1000 * this) / 1000).toFixed(Math.max(0, ~~deciamalPaces)).replace(new RegExp(a, 'g'), '$&,');
    };
}

if (typeof Number.prototype.toTimeEstimate !== 'function') {
    Number.prototype.toTimeEstimate = function () {
        'use strict';
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
}

if (typeof Number.prototype.toTimeRemaining !== 'function') {
    Number.prototype.toTimeRemaining = function (colonDelimited) {
        'use strict';
        if (typeof colonDelimited === 'undefined') {
            colonDelimited = false;
        }
        // time in miliseconds, a.k.a. Date.now()
        let value = this.valueOf() / 1000;

        let seconds = Math.floor(value) % 60;
        let minutes = Math.floor(value / 60) % 60;
        let hours = Math.floor(value / 60 / 60) % 24;
        let days = Math.floor(value / 60 / 60 / 24);

        let result = [];
        if (days > 0) result.push(`${days}d`);
        if (hours > 0) result.push(`${hours}h`);
        if (minutes > 0) result.push(`${minutes < 10 ? '0' : ''}${minutes}m`);
        result.push(`${seconds < 10 ? '0' : ''}${seconds}s`);

        return result.map(item => {
            if (colonDelimited === true) {
                return item.replace(/[^0-9]+/g, '');
            }
            return item;
        }).join(colonDelimited === true ? ':' : ' ');
    };
}

if (typeof Number.prototype.abbr !== 'function') {
    Number.prototype.abbr = function () {
        'use strict';
        let value = this.valueOf();

        let abbrMap = [
            {t: 1e96, a: ':kuop:'},
            {t: 1e93, a: 'Tg'},
            {t: 1e90, a: 'NoV'},
            {t: 1e87, a: 'OcV'},
            {t: 1e84, a: 'SpV'},
            {t: 1e81, a: 'SeV'},
            {t: 1e78, a: 'QiV'},
            {t: 1e75, a: 'QaV'},
            {t: 1e72, a: 'TrV'},
            {t: 1e69, a: 'DuV'},
            {t: 1e66, a: 'UnV'},
            {t: 1e63, a: 'Vi'},
            {t: 1e60, a: 'NoD'},
            {t: 1e57, a: 'OcD'},
            {t: 1e54, a: 'SpD'},
            {t: 1e51, a: 'SeD'},
            {t: 1e48, a: 'QiD'},
            {t: 1e45, a: 'QaD'},
            {t: 1e42, a: 'TrD'},
            {t: 1e39, a: 'DuD'},
            {t: 1e36, a: 'UnD'},
            {t: 1e33, a: 'De'},
            {t: 1e30, a: 'No'},
            {t: 1e27, a: 'Oc'},
            {t: 1e24, a: 'Sp'},
            {t: 1e21, a: 'Sx'},
            {t: 1e18, a: 'Qi'},
            {t: 1e15, a: 'Qa'},
            {t: 1e12, a: 'T'},
            {t: 1e9, a: 'B'},
            {t: 1e6, a: 'M'},
            {t: 1e3, a: 'K'}
        ];
        if (value > abbrMap[0].t) {
            return abbrMap[0].a;
        }

        for (let threshold of abbrMap) {
            if (value > threshold.t) {
                return (value / threshold.t).format(2) + threshold.a;
            }
        }
        return value.format();
    };
}

function log(message) {
    'use strict';
    console.log(`[${moment().format('Do MMM Y HH:mm:ss')}] [RoA-QoL (v${GM_info.script.version})] ${message}`);
}
