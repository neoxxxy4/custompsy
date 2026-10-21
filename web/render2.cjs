const puppeteer = require('puppeteer');
(async () => {
  const b = await puppeteer.launch({ headless: 'new' });
  const p = await b.newPage();
  const A = '../android/app/src/main/res';
  const jobs = [
    ['/tmp/logo-gen/bg.svg', A + '/drawable-nodpi/ic_launcher_background.png', 432, false],
    ['/tmp/logo-gen/fg.svg', A + '/drawable-nodpi/ic_launcher_foreground.png', 432, true],
    ['/tmp/logo-gen/legacy.svg', A + '/mipmap-xxxhdpi/ic_launcher.png', 192, false],
  ];
  for (const [src, out, size, tr] of jobs) {
    await p.setViewport({ width: size, height: size });
    await p.goto('file://' + src);
    await p.screenshot({ path: out, omitBackground: tr });
  }
  // превью с симуляцией круглой маски лаунчера
  await p.setViewport({ width: 512, height: 512 });
  await p.setContent(`<body style="margin:0;background:#222;display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="width:400px;height:400px;border-radius:50%;overflow:hidden;position:relative">
      <img src="file:///tmp/logo-gen/bg.svg" style="width:400px;height:400px">
      <img src="file:///tmp/logo-gen/fg.svg" style="width:400px;height:400px;position:absolute;top:0;left:0">
    </div></body>`);
  await p.screenshot({ path: 'public/logo-preview.png' });
  await b.close();
})();
