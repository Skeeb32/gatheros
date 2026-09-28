import { chromium } from '@playwright/test';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';
import { writeFile, mkdir } from 'node:fs/promises';
const {GIFEncoder,quantize,applyPalette}=gifenc;
const origin=process.env.DEMO_URL||'http://127.0.0.1:3000';
const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROME_PATH?{executablePath:process.env.PLAYWRIGHT_CHROME_PATH}:{});
const dir=new URL('../docs/assets/',import.meta.url);await mkdir(dir,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},deviceScaleFactor:1});
 await page.goto(origin+'/operations');await page.getByRole('heading',{name:'Your event, in focus.'}).waitFor();
 await page.screenshot({path:new URL('dashboard.png',dir).pathname,fullPage:true});
 const gif=GIFEncoder();
 await page.setViewportSize({width:1100,height:850});
 async function frame(){const png=PNG.sync.read(await page.screenshot());const palette=quantize(png.data,128);gif.writeFrame(applyPalette(png.data,palette),png.width,png.height,{palette,delay:2500});}
 await frame();
 await page.getByRole('button',{name:'Ticket inventory',exact:true}).click();await frame();
 await page.getByRole('button',{name:'Knowledge',exact:true}).click();await frame();
 await page.getByRole('button',{name:'Where should VIP attendees enter?'}).click();
 await page.locator('.ops-answer').filter({hasText:'north entrance'}).waitFor();await page.locator('.ops-copilot').scrollIntoViewIfNeeded();await frame();
 gif.finish();await writeFile(new URL('walkthrough.gif',dir),gif.bytes());
 await page.screenshot({path:new URL('copilot.png',dir).pathname,fullPage:true});
 const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await mobile.goto(origin+'/operations');await mobile.getByRole('heading',{name:'Your event, in focus.'}).waitFor();
 await mobile.screenshot({path:new URL('mobile.png',dir).pathname,fullPage:true});
 console.log('Captured dashboard, mobile, copilot, and walkthrough GIF from running app.');
}finally{await browser.close();}
