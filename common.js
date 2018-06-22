if (typeof String.prototype.formatQoL !== 'function') {
    // courtesy of http://stackoverflow.com/a/18234317
    String.prototype.formatQoL = String.prototype.formatQoL || function () {
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

if (typeof Number.prototype.format !== 'function') {
    Number.prototype.format = function(deciamalPaces, numbersInGroup) {
        let a = '\\d(?=(\\d{' + (numbersInGroup || 3) + '})+' + (deciamalPaces > 0 ? '\\.' : '$') + ')';
        return (Math.floor(1000 * this) / 1000).toFixed(Math.max(0, ~~deciamalPaces)).replace(new RegExp(a, 'g'), '$&,');
    }
}

if (typeof Number.prototype.toTimeEstimate !== 'function') {
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
}

if (typeof Number.prototype.toTimeRemaining !== 'function') {
    Number.prototype.toTimeRemaining = function (colonDelimited = false) {
        // time in miliseconds, a.k.a. Date.now()
        let value = this.valueOf() / 1000;

        let seconds = Math.floor(value) % 60;
        let minutes = Math.floor(value / 60) % 60;
        let hours = Math.floor(value / 60 / 60) % 60;

        let result = [];
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
        let value = this.valueOf();

        let markers = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qi', 'S', 'O', 'N', 'Dd'];

        let index = 0;
        while (value >= 1000) {
            index++;
            value /= 1000;
        }

        return `${Math.floor(value * 10) / 10}${markers[index]}`;
    };
}

function log (message) {
    console.log(`[${moment().format('Do MMM Y HH:mm:ss')}] [RoA-QoL (v${GM_info.script.version})] ${message}`);
}