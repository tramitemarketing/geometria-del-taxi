import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const ConicMath = (() => {');
const end = html.indexOf('const MiniEngine = (() => {');
if (start < 0 || end < 0) { console.error('ConicMath block not found'); process.exit(2); }
const code = html.slice(start, end);

let failures = 0;
console.assert = (cond, ...msg) => { if (!cond) { failures++; console.log('  ✗ FAIL:', msg.join(' ')); } };

let ConicMath;
try { ConicMath = new Function(code + '\n;return ConicMath;')(); }
catch (e) { console.error('Eval error:', e.message); process.exit(2); }
try { ConicMath.runTests(); }
catch (e) { console.error('runTests threw:', e.message); process.exit(1); }
console.log(failures ? `\n${failures} assertion(s) FAILED` : '\nAll assertions passed');
process.exit(failures ? 1 : 0);
