import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const external = process.env.FORGE_BROWSER_URL;
const url = external || 'http://127.0.0.1:4179/BloonsTDC/';
const expectedParts=Number(process.env.FORGE_PARTS??208);
const scope=new URL(url).origin+new URL(url).pathname;
const server = external ? undefined : spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4179', '--strictPort'], {stdio:'ignore'});
let browser;
try {
  if (server) {
    let ready = false;
    for (let i = 0; i < 40 && !ready; i++) {
      try { ready = (await fetch(url)).ok; } catch {}
      if (!ready) await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'production preview started');
  }
  const executablePath = process.env.FORGE_CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  const proxy = process.env.FORGE_BROWSER_PROXY ? {server:process.env.FORGE_BROWSER_PROXY} : undefined;
  browser = await chromium.launch({executablePath, proxy, args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport:{width:1366,height:768},ignoreHTTPSErrors:!!proxy&&process.env.FORGE_BROWSER_PROXY_CERT_TEST==='1'});
  await page.addInitScript(()=>{
    window.forgeOscillators=0;
    const original=AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator=function(){window.forgeOscillators++;return original.call(this);};
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', req => {if (req.url().startsWith(scope) && req.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(req.url()+' '+req.failure()?.errorText);});
  page.on('response', res => {if (res.url().startsWith(scope) && res.status()>=400) errors.push(res.status()+' '+res.url());});
  page.on('dialog', async dialog => { if (dialog.type()==='prompt') await dialog.accept('Smoke world'); else await dialog.accept(); });
  await page.goto(url, {waitUntil:'networkidle'});
  await page.locator('#field canvas').waitFor();
  await page.waitForFunction(()=>document.querySelector('#metrics')?.textContent?.includes('objects'));
  assert.equal(await page.title(),'Sandbox Forge');
  assert.equal(await page.locator('#part-count').innerText(),expectedParts+' parts');
  if (process.env.FORGE_SCREENSHOT) await page.screenshot({path:process.env.FORGE_SCREENSHOT});

  await page.locator('[data-spawn="wood-beam"]').click();
  await page.mouse.move(676,396);
  await page.keyboard.press('KeyE');
  await page.waitForFunction(()=>Number(document.querySelector("#ghost-angle")?.value)===15);
  const angle = await page.locator('#ghost-angle').inputValue();
  assert.equal(Number(angle),15);
  await page.locator('#ghost-x').fill('2.22');
  await page.locator('#ghost-y').fill('1.25');
  await page.locator('#ghost-y').press('Enter');
  await page.locator('[data-field="frozen"]:checked').waitFor();
  assert.equal(Number(await page.locator('[data-field="x"]').inputValue()),2.22);
  assert.equal(Number(await page.locator('[data-field="angle"]').inputValue()),15);
  assert.match(await page.locator('#run-label').innerText(),/LIVE/);
  await page.keyboard.press('Delete');
  await page.locator('.inspector-empty').waitFor();
  await page.locator('#undo').click();
  const canvas = await page.locator('#field canvas').boundingBox();
  assert.ok(canvas);
  const zoom=Math.min(54,Math.max(27,canvas.width/20));
  await page.mouse.click(canvas.x+canvas.width/2+2.22*zoom,canvas.y+canvas.height/2+(1.25-3.7)*zoom,{button:'right'});
  await page.locator('#context').waitFor();
  await page.locator('[data-context="freeze"]').click();
  assert.equal(await page.locator('[data-field="frozen"]').isChecked(),false);
  await page.locator('[data-mode="physics"]').click();
  const part = page.locator('[data-item="wood-cube"]');
  await part.dragTo(page.locator('#field'),{targetPosition:{x:canvas.width*.68,y:canvas.height*.25}});
  await page.locator('.selection-title strong', {hasText:'Wood cube'}).waitFor();
  assert.equal(await page.locator('[data-field="frozen"]').isChecked(),false);

  await page.locator('#maps').click();
  for(const map of ['industrial','water','moon','classic']) {
    await page.locator('[data-map="'+map+'"]').click();
    await page.locator('#dialog').waitFor({state:'hidden'});
    if(map!=='classic')await page.locator('#maps').click();
  }
  await page.locator('[data-family="Devices"]').click();
  await page.locator('#search').fill('logic controller');
  await page.locator('[data-mode="build"]').click();
  await page.locator('[data-spawn="logic-controller"]').click();
  await page.keyboard.press('Enter');
  await page.locator('[data-action="program"]').click();
  await page.locator('.blocklySvg').first().waitFor();
  await page.locator('[data-thermostat]').click();
  await page.locator('[data-apply]').click();
  await page.locator('#block-dialog').waitFor({state:'hidden'});

  if(expectedParts>=208){
    await page.locator('#brand').click();
    await page.locator('[data-command="custom"]').click();
    await page.locator('[data-custom="name"]').fill('Chrome test custom');
    await page.locator('[data-pixel="48"]').click();
    await page.locator('[data-pixel="49"]').click();
    await page.locator('[data-drawing-undo]').click();
    await page.locator('[data-drawing-redo]').click();
    await page.locator('[data-custom-save]').click();
    await page.locator('#ghost-x').fill('5');
    await page.locator('#ghost-x').press('Enter');
    await page.locator('.selection-title', {hasText:'Chrome test custom'}).waitFor();
  }
  await page.waitForFunction(()=>window.forgeOscillators>0);
  await page.locator('#save').click();
  await page.locator('#notice', {hasText:'World saved'}).waitFor();
  await page.reload({waitUntil:'networkidle'});
  await page.locator('#load').click();
  await page.locator('[data-load-name="Smoke world"]').click();
  await page.locator('#notice', {hasText:'World loaded'}).waitFor();
  await page.locator('#sound').click();
  assert.equal(await page.locator('#sound').innerText(),'◖×');
  await page.locator('#sound').click();
  await page.locator('#settings').click();
  await page.locator('[data-mix="master"]').fill('0.33');
  const pref=await page.evaluate(()=>JSON.parse(localStorage.getItem('forge-audio')??'{}'));
  assert.equal(pref.master,.33);
  if(expectedParts>=208) {
    await page.locator('#dialog [data-close]').click();
    await page.locator('[data-list="blueprints"]').click();
    await page.locator('[data-spawn^="custom-"]',{hasText:'Chrome test custom'}).waitFor();
  }
  assert.deepEqual(errors,[]);
  console.log('Chromium passed: Pages path, live placement, undo, context, drag/drop, four maps, Blockly, IndexedDB reload, custom part (when present) and Web Audio/mixer.');
} finally {
  await browser?.close();
  server?.kill();
}
