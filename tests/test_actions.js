// у каждого data-act в разметке должен быть свой case в обработчике щелчков
const fs = require('fs'); const src = fs.readFileSync(__dirname + '/../src/ui.js', 'utf8') + fs.readFileSync(__dirname + '/../src/body.html', 'utf8');
const used = new Set((src.match(/data-act="[a-z0-9]+/g) || []).map(x => x.slice(10))); (src.match(/dot\('([a-z0-9]+)/g) || []).forEach(x => used.add(x.slice(5)));
const have = new Set((src.match(/case '[a-z0-9]+'/g) || []).map(x => x.slice(6, -1)));
const miss = [...used].filter(x => !have.has(x));
console.log(miss.length ? 'НЕТ ОБРАБОТЧИКА: ' + miss.join(', ') : 'кнопки: у всех ' + used.size + ' действий есть обработчик'); process.exit(miss.length ? 1 : 0);
