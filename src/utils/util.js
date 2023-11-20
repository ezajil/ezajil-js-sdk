export function generateUUID() {
    var d = new Date().getTime();//Timestamp
    var d2 = (performance && performance.now && (performance.now() * 1000)) || 0;//Time in microseconds since page-load or 0 if unsupported
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16;//random number between 0 and 16
        if (d > 0) {//Use timestamp until depleted
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {//Use microseconds since page-load if supported
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function generateUID() {
    const timestamp = new Date().getTime();
    let hexStr = timestamp.toString(16);
    if (hexStr.length % 2) {
        hexStr = '0' + hexStr;
    }
    const max = 16;
    const r1 = randombetween(1, max - 3);
    const r2 = randombetween(1, max - 2 - r1);
    const r3 = randombetween(1, max - 1 - r1 - r2);
    const r4 = max - r1 - r2 - r3;
    hexStr = '4' + r1.toString(16) + r2.toString(16) + r3.toString(16) + r4.toString(16) + hexStr.split('').reverse().join('');
    let cpt = hexStr.length - 1;
    let uuid = 'xxxxxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxx';
    while (cpt >= 0) {
        uuid = uuid.replace('x', hexStr[cpt]);
        cpt--;
    }
    uuid = uuid.replace(/[x]/g, function (c) {
        return randombetween(0, 15).toString(16);
    }.bind(this));
    return uuid.split('').reverse().join('');
}

function randombetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}
