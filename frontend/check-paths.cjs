const fs = require('fs');
const jsPath = 'c:/D/SIH/Landslide-Nexus-Upgraded (1)/frontend/public/zoom_earth/assets/js/app.0a6769cb.js';
const cssPath = 'c:/D/SIH/Landslide-Nexus-Upgraded (1)/frontend/public/zoom_earth/assets/css/app.7bbc8c67.css';

let js = fs.readFileSync(jsPath, 'utf8');
let m = js.match(/.{0,20}assets\/images.{0,30}/g);
if (m) console.log('JS MATCHES:', Array.from(new Set(m)).slice(0, 20));
else console.log('No matches in JS');

let css = fs.readFileSync(cssPath, 'utf8');
let m2 = css.match(/.{0,20}assets\/images.{0,30}/g);
if (m2) console.log('CSS MATCHES:', Array.from(new Set(m2)).slice(0, 20));
else console.log('No matches in CSS');
