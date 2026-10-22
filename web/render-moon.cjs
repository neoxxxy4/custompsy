const puppeteer = require('puppeteer');
const path = require('path');
(async () => {
  const b = await puppeteer.launch({ headless: 'new' });
  const p = await b.newPage();
  const A = '../android/app/src/main/res';
  const jobs = [
    ['/tmp/logo-gen/moon.svg', 'public/logo-moon.png', 512, true, 256],
    ['/tmp/logo-gen/moon.svg', 'public/icon-moon-512.png', 512, true, 256],
    ['/tmp/logo-gen/moon.svg', 'public/icon-moon-192.png', 192, true, 96],
    ['/tmp/logo-gen/moon.svg', 'public/icon-moon-180.png', 180, true, 90],
    ['/tmp/logo-gen/moon.svg', 'public/favicon-moon-32.png', 32, true, 16],
    ['/tmp/logo-gen/moon.svg', A + '/drawable-nodpi/ic_launcher_moon_foreground.png', 432, true, 130],
    ['/tmp/logo-gen/moon.svg', A + '/mipmap-xxxhdpi/ic_launcher_moon.png', 192, false, 96],
    ['/tmp/logo-gen/moon.svg', 'public/moon-preview.png', 432, false, 132],
  ];
  for (const [src, out, size, transparent, r] of jobs) {
    await p.setViewport({ width: size, height: size });
    await p.goto('file://' + (src.startsWith('/') ? src : path.resolve(src)));
    if (transparent) {
      // диск вписан в круг радиуса r (в px выходного размера)
      await p.evaluate((radius) => {
        const s = document.querySelector('svg');
        const w = window.innerWidth;
        const scale = radius / 256;
        s.setAttribute('width', String(w));
        s.setAttribute('height', String(w));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', `translate(${w / 2},${w / 2}) scale(${scale}) translate(-256,-256)`);
        while (s.firstChild) g.appendChild(s.firstChild);
        s.appendChild(g);
      }, r);
    } else {
      await p.evaluate(() => {
        const s = document.querySelector('svg');
        s.setAttribute('width', String(window.innerWidth));
        s.setAttribute('height', String(window.innerHeight));
        document.body.style.background = '#000';
      });
    }
    await p.screenshot({ path: out, omitBackground: transparent });
    console.log('wrote', out);
  }
  await b.close();
})();
