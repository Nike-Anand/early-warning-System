const fs = require('fs');

const cssPath = 'c:/D/SIH/Landslide-Nexus-Upgraded (1)/frontend/public/zoom_earth/assets/css/app.7bbc8c67.css';
const jsPath = 'c:/D/SIH/Landslide-Nexus-Upgraded (1)/frontend/public/zoom_earth/assets/js/app.0a6769cb.js';

let css = fs.readFileSync(cssPath, 'utf8');
css = css.replace(/url\(\/assets\//g, 'url(/zoom_earth/assets/');
fs.writeFileSync(cssPath, css);
console.log('Fixed CSS paths');

let js = fs.readFileSync(jsPath, 'utf8');
// Fix string literals like "/assets/images"
js = js.replace(/"\/assets\//g, '"/zoom_earth/assets/');
js = js.replace(/'\/assets\//g, "'/zoom_earth/assets/");
js = js.replace(/`\/assets\//g, "`/zoom_earth/assets/");
fs.writeFileSync(jsPath, js);
console.log('Fixed JS paths');
