"""Existing web regression plus real browser-origin API flows, without modifying web files.
Run after npm run build and isolated web build documented in ACCEPTANCE.md.
No credentials are inherited by the agent subprocess. No real payments are possible.
"""
import functools
import http.server
import json
import os
from pathlib import Path
import socket
import subprocess
import tempfile
import threading
import time
import urllib.request
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / 'shots'
SHOTS.mkdir(exist_ok=True)
CHROME = '/opt/hermes/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'
USDC = '0xcebA9300f2b948710d2653dD7B07f33A8B32118C'
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args): pass
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(ROOT/'evidence/web-dist')))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}'
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
API = f'http://127.0.0.1:{port}'
state = tempfile.mkdtemp(prefix='joan-browser-', dir=os.environ.get('TMPDIR', '/opt/hermes/.hermes/cache/scratch'))
env = {k: os.environ[k] for k in ('PATH','HOME','TMPDIR') if k in os.environ}
env.update(PORT=str(port), JOAN_DB_PATH=state+'/joan.sqlite', JOAN_CORS_ORIGINS=URL)
log = open(ROOT/'evidence/compiled-server.txt','w')
def start():
    process = subprocess.Popen(['node','dist/src/server.js'], cwd=ROOT, env=env, stdout=log, stderr=log)
    for _ in range(100):
        try:
            with urllib.request.urlopen(API+'/health', timeout=1) as res:
                assert json.load(res)['liveSigningEnabled'] is False
                return process
        except OSError: time.sleep(.05)
    process.terminate()
    raise AssertionError('Compiled API did not start')
process = start()
checks = []
def check(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS '+name, flush=True)
def overflow(page):
    return page.evaluate('document.documentElement.scrollWidth > innerWidth')
def sheet(tag, paths):
    thumbs = []
    for path in paths:
        image = Image.open(path).convert('RGB')
        image.thumbnail((360, 540))
        card = Image.new('RGB', (380,580), '#f6efdf')
        card.paste(image, ((380-image.width)//2,25))
        ImageDraw.Draw(card).text((12,560),path.stem, fill='#332920')
        thumbs.append(card)
    out = Image.new('RGB', (380*3,580*((len(thumbs)+2)//3)), '#e6dcc7')
    for i,im in enumerate(thumbs): out.paste(im,((i%3)*380,(i//3)*580))
    out.save(SHOTS/f'{tag}-sheet.jpg', quality=85)
try:
  with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
    for tag,width,height in [('mobile',390,844),('desktop',1440,900)]:
      context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce',is_mobile=width==390,has_touch=width==390)
      page=context.new_page(); errors=[]; bad=[]; paths=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
      page.on('response',lambda r:bad.append(f'{r.status} {r.url}') if r.status>=400 else None)
      def shot(name):
        check(f'{tag} {name}: zero horizontal overflow', not overflow(page))
        path=SHOTS/f'{tag}-{name}.png';page.screenshot(path=str(path));paths.append(path)
      page.goto(URL);page.wait_for_selector('#entrance');shot('entrance')
      page.click("text=Open today's edition");page.wait_for_function("location.hash === '#/front'")
      check(f'{tag} entrance opens real front page',page.locator('.lead-title').count()==1);shot('front')
      page.click(".tab:has-text('Civic')")
      check(f'{tag} section filter',page.locator('.lead-title').inner_text().startswith('Did the Water'))
      page.goto(URL+'/#/story/water-tariff');page.wait_for_selector('.panel');shot('dispatch')
      receipt=page.locator('.panel .r-tx').first;receipt.scroll_into_view_if_needed();receipt.click()
      check(f'{tag} receipt opens',page.locator('#receiptDlg').evaluate('(e)=>e.open'))
      shot('receipt');page.click('[data-action=close-receipt]')
      page.goto(URL+'/#/archives');page.wait_for_selector('.clip.add');shot('archives')
      page.click('.clip.add');page.fill('#assignment','Check whether a public transit fare claim has original records')
      page.fill('#budget','0.05');page.click('button[type=submit]');page.wait_for_selector('.clip-status.ok',timeout=8000)
      check(f'{tag} existing web mock commission publishes',page.locator('a.clip.pending').count()==1)
      page.click('a.clip.pending');page.wait_for_selector('.d-title')
      check(f'{tag} existing web mock report has demo label','demo data' in page.inner_text('main').lower())
      check(f'{tag} report has required attribution','AI-generated report.' in page.inner_text('main') and 'Prepared by Joan.' in page.inner_text('main'))
      shot('commission')
      page.reload();page.wait_for_selector('.d-title');check(f'{tag} existing web commission survives reload','Checking the Claim' in page.inner_text('main'))
      page.goto(URL+'/#/about');page.wait_for_selector('main');shot('about')
      page.goto(URL+'/#/90s');page.wait_for_selector('.n90-photo img');shot('feature')
      # Cross-origin browser fetch exercises the real compiled API and CORS, not UI wallet controls.
      async_js = '''async ({base,path,method,data,key}) => {
        const headers = method==='POST' ? {'content-type':'application/json'} : {};
        if(key) headers['idempotency-key']=key;
        const r=await fetch(base+path,{method,headers,...(method==='POST'?{body:JSON.stringify(data)}:{})});
        return {status:r.status,data:await r.json()};
      }'''
      def call(path,method='GET',data=None,key=None):
        return page.evaluate(async_js,{'base':API,'path':path,'method':method,'data':data,'key':key})
      grant=call('/permissions','POST',{'capMicros':100000,'allowlist':[USDC],'expiresAt':int(time.time()*1000)+3600000})
      check(f'{tag} browser API grants bounded mock permissions',grant['status']==200)
      payload={'text':'Check this public transit fare claim using original sources','budget':0.05}
      created=call('/assignments','POST',payload,'browser-'+tag)
      check(f'{tag} browser API creates report',created['status']==201)
      report=created['data'];check(f'{tag} API report marks demo provenance and spending',report['demoData'] and report['origin']=='mock' and report['researchSpending']['amountMicros']==5000)
      check(f'{tag} browser API idempotency',call('/commissions','POST',payload,'browser-'+tag)['data']['id']==report['id'])
      check(f'{tag} browser API reads report',call('/reports/'+report['id'])['data']==report)
      check(f'{tag} browser API assignment published',call('/assignments/'+report['id'])['data']['status']=='published')
      check(f'{tag} browser API lists archive',any(r['id']==report['id'] for r in call('/reports')['data']))
      check(f'{tag} browser API wallet readback',call('/wallet')['data']['balanceMicros']<=9995000)
      check(f'{tag} browser API settled ledger',all(r['state']=='settled' for r in call('/ledger')['data']['entries']))
      check(f'{tag} browser API revoke',call('/revoke','POST',{})['data']['session']['revoked'])
      check(f'{tag} browser API revoke readback',call('/permissions')['data']['revoked'])
      check(f'{tag} browser API reconcile',call('/ledger/reconcile','POST',{})['data']=={'settled':0,'unresolved':0})
      # Expected refusal via APIRequestContext avoids treating an intentional 409 as a UI console error.
      denied=context.request.post(API+'/assignments',data={'text':'This assignment cannot pay after the session was revoked','budget':0.05})
      check(f'{tag} revoke blocks payment',denied.status==409 and denied.json()['error']=='session_revoked')
      check(f'{tag} zero browser console/page errors',errors==[])
      check(f'{tag} zero unexpected HTTP errors',bad==[])
      sheet(tag,paths);context.close()
    browser.close()
  process.terminate();process.wait(timeout=5)
  process=start()
  with urllib.request.urlopen(API+'/reports') as response: reports=json.load(response)
  with urllib.request.urlopen(API+'/permissions') as response: permissions=json.load(response)
  with urllib.request.urlopen(API+'/ledger') as response: ledger=json.load(response)
  check('compiled process restart preserves two reports',len(reports)==2)
  check('compiled process restart preserves revocation',permissions['revoked'])
  check('compiled process restart preserves two settlements without duplicate pay',len(ledger['entries'])==2 and all(r['state']=='settled' for r in ledger['entries']))
  for name,value in [('reports-after-restart',reports),('permissions-after-restart',permissions),('ledger-after-restart',ledger)]:
    (ROOT/'evidence'/f'{name}.json').write_text(json.dumps(value,indent=2)+'\n')
  (ROOT/'evidence/browser-results.json').write_text(json.dumps({'checks':checks,'screenshots':str(SHOTS),'database':state+'/joan.sqlite','scope':'existing web mock UI regression + real browser-origin API calls; no integrated wallet UI claim'},indent=2)+'\n')
  print(f'PASS: {len(checks)} browser/restart assertions. Sheets: {SHOTS}/mobile-sheet.jpg and {SHOTS}/desktop-sheet.jpg')
finally:
  process.terminate();process.wait(timeout=5);srv.shutdown();log.close()
