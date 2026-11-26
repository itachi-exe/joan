"""Capture Joan's public HTTPS UI. No mocks or intercepted assets.
Default is read-only. --commission makes ONE real DeepSeek-backed commission.
Desktop tour is 1440 wide; the separate 390 check is QA, not README imagery.
"""
import argparse, json, os, time, urllib.request, html
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/screenshots';OUT.mkdir(parents=True,exist_ok=True)
EV=ROOT/'deploy/evidence';EV.mkdir(parents=True,exist_ok=True)
args=argparse.ArgumentParser();args.add_argument('--commission',action='store_true');a=args.parse_args()
URL=os.getenv('JOAN_PUBLIC_URL','https://joan-dispatch.vercel.app')
API=os.getenv('JOAN_PUBLIC_API','https://joan-api.94-72-105-176.sslip.io')
TEXT='Check what RFC 9110 actually specifies for HTTP 402 Payment Required. Read https://www.rfc-editor.org/rfc/rfc9110.txt and distinguish the standard from claims about modern payment protocols. Do not infer vendor support.'
results=[]
def get(path):
 with urllib.request.urlopen(API+path,timeout=100) as r:return json.load(r)
with sync_playwright() as p:
 launch={'executable_path':'/opt/hermes/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome','args':['--no-sandbox','--disable-blink-features=AutomationControlled']}
 if os.getenv('JOAN_QA_PROXY'):launch['proxy']={'server':os.environ['JOAN_QA_PROXY']}
 b=p.chromium.launch(**launch)
 ctx=b.new_context(viewport={'width':1440,'height':1100},device_scale_factor=1)
 for width in [1440,390]:
  ctx.clear_cookies()
  page=ctx.new_page();page.set_viewport_size({'width':width,'height':1100 if width==1440 else 900});errors=[];failures=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
  page.on('requestfailed',lambda r:failures.append(r.url+' '+str(r.failure)))
  page.goto(URL+'/',wait_until='networkidle');page.wait_for_timeout(3000)
  page.screenshot(path=str(OUT/('entrance.png' if width==1440 else 'qa-390-entrance.png')))
  page.click('[data-action=open]');page.wait_for_url('**/#/front',timeout=15000);page.wait_for_timeout(1000)
  if a.commission and width==1440:
   page.goto(URL+'/#/archives');page.wait_for_timeout(700);page.click('[data-action=commission]')
   page.fill('#assignment',TEXT);page.fill('#budget','0')
   page.screenshot(path=str(OUT/'commission.png'))
   with page.expect_response(lambda r:r.request.method=='POST' and r.url==API+'/commissions',timeout=100000) as response:
    page.click('#commissionForm button[type=submit]')
   r=response.value;data=r.json();assert r.status==201,data
   assert data['origin']=='live' and data['demoData'] is False and data['researchSpending']['amountMicros']==0 and not data['spending']
   assert all(s['mode']=='live' for s in data['sources'])
   assert get('/reports/'+data['id'])==data
   (EV/'public-report.json').write_text(json.dumps(data,indent=2)+'\n')
   page.wait_for_timeout(1200)
  reports=get('/reports');assert reports,'Run once with --commission first'
  rid=reports[0]['id']
  routes=[('front','front'),('archives','archives'),('dashboard','desk'),('about','about')]
  for route,name in routes:
   page.goto(URL+'/#/'+route);page.wait_for_timeout(1100)
   assert not page.evaluate('document.documentElement.scrollWidth > innerWidth+1'),name
   if width==1440 or route=='front':page.screenshot(path=str(OUT/(name+'.png' if width==1440 else 'qa-390-front.png')))
  page.goto(URL+'/#/dispatch/'+rid);page.wait_for_timeout(1300)
  # The live app's own report URL is authoritative if the route changes.
  if not page.locator('.panel.active-desk').count():
   page.goto(URL+'/#/front');page.wait_for_timeout(700);page.click('.lead a');page.wait_for_timeout(1300)
  assert 'AI-generated report.' in page.inner_text('body')
  page.screenshot(path=str(OUT/('dispatch.png' if width==1440 else 'qa-390-dispatch.png')))
  if width==1440:
   page.locator('.panel.active-desk .stamp-box').evaluate('(e)=>e.scrollIntoView({block:"start"})');page.wait_for_timeout(600)
   page.screenshot(path=str(OUT/'sources.png'))
   page.goto(URL+'/#/archives');page.wait_for_timeout(700);page.click('[data-action=commission]');page.fill('#assignment',TEXT)
   page.screenshot(path=str(OUT/'commission.png'))
  results.append({'width':width,'consoleErrors':errors,'requestFailures':failures,'overflow':page.evaluate('document.documentElement.scrollWidth > innerWidth+1')})
  page.close()
 ctx.close()
 # Real API read output, rendered as a terminal card for the README.
 payload={'health':get('/health'),'wallet':get('/wallet'),'ledger':get('/ledger'),'report':{'id':reports[0]['id'],'origin':reports[0]['origin'],'demoData':reports[0]['demoData'],'sources':[s['url'] for s in reports[0]['sources']],'researchSpending':reports[0]['researchSpending']}}
 (EV/'public-readback.json').write_text(json.dumps(payload,indent=2)+'\n')
 page=b.new_page(viewport={'width':1440,'height':1100})
 compact={'health':payload['health'],'wallet':{k:payload['wallet'][k] for k in ['mode','demoData','liveSigningEnabled','x402CapEnforcement']},'ledger':payload['ledger'],'report':payload['report']}
 page.set_content('<html><body style="margin:0;background:#0d0c0b;color:#eee8df;padding:50px;font:20px monospace"><h1 style="color:#75e5b0">Joan | public HTTPS readback</h1><p>GET /health, /wallet, /ledger, /reports (wallet fields selected)</p><pre style="white-space:pre-wrap">'+html.escape(json.dumps(compact,indent=2))+'</pre></body></html>')
 page.screenshot(path=str(OUT/'api.png'));b.close()
(EV/'browser.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps(results,indent=2))
assert all(not r['consoleErrors'] and not r['requestFailures'] and not r['overflow'] for r in results)
