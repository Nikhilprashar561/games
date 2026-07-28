const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\nikhi\\.gemini\\antigravity\\brain\\b10ebbcc-a55d-4a66-afc8-36de6562a7b5\\.user_uploaded\\media__1785250302459.png';
const dest1 = 'C:\\Users\\nikhi\\.gemini\\antigravity\\scratch\\game-platform\\frontend\\public\\images\\hero_section.png';
const dest2 = 'C:\\Users\\nikhi\\.gemini\\antigravity\\scratch\\game-platform\\frontend\\public\\images\\hero_user_duo.png';

fs.copyFileSync(src, dest1);
fs.copyFileSync(src, dest2);
console.log('Successfully copied user uploaded hero image!');
