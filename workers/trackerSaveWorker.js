importScripts('https://cdn.rawgit.com/nodeca/pako/1.0.6/dist/pako.min.js');
onmessage = event => {
    let d = event.data;

    if (typeof d !== 'object') {
        return false;
    }

    switch (d.a) {
        case 'trackerSave':
            for (let section in d.t) {
                if (!d.t.hasOwnProperty(section)) {
                    // end of the world
                    continue;
                }
                let sectionData = JSON.stringify(d.t[section]);
                sectionData = pako.deflate(sectionData, {to: 'string'});
                sectionData = btoa(sectionData);
                postMessage({a:'ts',s:section,d:sectionData});
            }
            break;

        case 'trackerLoadSection':
            let sectionData = atob(d.d);
            sectionData = pako.inflate(sectionData, {to: 'string'});
            sectionData = JSON.parse(sectionData);
            postMessage({a:'tls',s:d.s,d:sectionData});
            break;

        default:
            break;
    }

};