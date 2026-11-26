"""Real compiled API + production web integration. No keys, signatures or payments."""
import json, os, socket, subprocess, time, urllib.request, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image, ImageOps, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'shots/wednesday'; OUT.mkdir(parents=True, exist_ok=True)
E = ROOT/'evidence'; E.mkdir(exist_ok=True)
FIX = E/'fix-20261126'; FIX.mkdir(exist_ok=True)
SCRATCH = Path(os.environ['TMPDIR'])/('joan-web-e2e-'+str(uuid.uuid4())); SCRATCH.mkdir()
EXE='/opt/hermes/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'
API='http://127.0.0.1:4310'; URL='http://127.0.0.1:4174/'
checks=[]
suite_errors=[]; suite_http_failures=[]
def monitor(page):
    page.on('pageerror',lambda e:suite_errors.append(str(e)))
    page.on('console',lambda m:suite_errors.append(m.text) if m.type=='error' else None)
    page.on('requestfailed',lambda r:suite_errors.append('Request failed: '+r.url+' '+str(r.failure)))
    page.on('response',lambda r:suite_http_failures.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
def check(name, cond):
    checks.append({'name':name,'passed':bool(cond)}); print(('PASS ' if cond else 'FAIL ')+name, flush=True)
    assert cond, name

def api(path, data=None, key=None):
    req=urllib.request.Request(API+path, data=json.dumps(data).encode() if data is not None else None, headers={'Content-Type':'application/json', **({'Idempotency-Key':key} if key else {})})
    return json.load(urllib.request.urlopen(req))
serverlog=open(E/'integration-server.txt','w')
env={k:os.environ[k] for k in ['PATH','HOME','TMPDIR'] if k in os.environ}
env.update(PORT='4310',JOAN_DB_PATH=str(SCRATCH/'desk.sqlite'))
def start():
    with socket.socket() as sock:
        if sock.connect_ex(('127.0.0.1',4310)) == 0: raise RuntimeError('Port 4310 is occupied. Refusing to mutate an existing API; stop your local API before this isolated test.')
    proc=subprocess.Popen(['node','dist/src/server.js'],cwd=ROOT.parent/'agent',env=env,stdout=serverlog,stderr=subprocess.STDOUT)
    for _ in range(80):
        try: api('/health'); return proc
        except Exception: time.sleep(.1)
    raise RuntimeError('API failed to start')
proc=start()
try:
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=EXE,args=['--no-sandbox'])
        for width in [390,1440]:
            page=b.new_page(viewport={'width':width,'height':900});monitor(page);page.goto(URL+'#/front');page.wait_for_timeout(750)
            check(f'{width} actual empty API has commissioning CTA',page.locator('.col-center .empty .btn').count()==1 and page.locator('.lead').count()==0)
            check(f'{width} online empty edition never uses sample stories',page.locator('.sample-tag:text-is("Sample")').count()==0)
            page.screenshot(path=str(OUT/f'{"mobile" if width==390 else "desktop"}-empty.png'))
            page.goto(URL+'#/archives');page.wait_for_timeout(750)
            check(f'{width} empty Archives explains next step',page.locator('.archive-empty').count()==1 and 'No clippings yet' in page.inner_text('.archive-empty'))
            check(f'{width} empty Archives keeps add-clipping card',page.locator('.clip.add').count()==1)
            page.screenshot(path=str(FIX/f'{width}-archives-empty.png'));page.close()
        b.close()
    seeds=[]
    for text in ['Trace the provenance of a public transit fare claim','Investigate the original public water tariff schedule','Check the original battery recall notice and its date','Trace the source of a public library funding claim','Verify a public housing planning notice']:
        seeds.append(api('/commissions',{'text':text,'budget':.05},str(uuid.uuid4())))
    with sync_playwright() as p:
        b=p.chromium.launch(executable_path=EXE,args=['--no-sandbox'])
        for width in [390,1440]:
            tag='mobile' if width==390 else 'desktop'
            # A bounded mock grant, not a new wallet. Historical spending is retained.
            session=api('/permissions'); api('/permissions',{'capMicros':50000,'allowlist':session['allowlist'],'expiresAt':int(time.time()*1000)+3600000})
            ctx=b.new_context(viewport={'width':width,'height':844 if width==390 else 900},is_mobile=width==390,has_touch=width==390)
            ctx.add_init_script("window.__audioStarts=0; const original=AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start=function(...args){window.__audioStarts++; return original.apply(this,args)}")
            page=ctx.new_page();monitor(page);errors=[]; policy_responses=[]; requests=[]; attempts=[]
            page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.on('response',lambda r:policy_responses.append({'url':r.url,'status':r.status}) if r.status>=400 else None)
            page.on('requestfailed',lambda r:errors.append('Request failed: '+r.url+' '+str(r.failure)))
            page.on('request',lambda r:requests.append({'url':r.url,'key':r.headers.get('idempotency-key'),'body':r.post_data}) if r.method=='POST' and '/commissions' in r.url else None)
            page.on('response',lambda r:attempts.append({'status':r.status,'result':r.json()}) if r.url==API+'/commissions/attempt' and r.request.method=='POST' else None)
            def shot(name):
                page.wait_for_timeout(750)
                overflow=page.evaluate("document.documentElement.scrollWidth > innerWidth || [...document.querySelectorAll('main *')].some(e=>{let r=e.getBoundingClientRect();return r.width>0 && r.right>innerWidth+2 && !e.closest('.track,.tabs')})")
                check(f'{tag} {name} zero overflow',not overflow)
                if name == 'dispatch':
                    check(f'{tag} dispatch stays aligned after hint timer',abs(page.locator('.panel.active-desk').bounding_box()['x'])<2)
                check(f'{tag} {name} readable type floor',page.evaluate("[...document.querySelectorAll('body *')].filter(e=>e.getClientRects().length && [...e.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())).every(e=>parseFloat(getComputedStyle(e).fontSize)>=11)"))
                page.screenshot(path=str(OUT/f'{tag}-{name}.png'))
                if name in ['front','dispatch','archives','dashboard']:
                    page.screenshot(path=str(FIX/(f'{width}-'+str({'archives':'archives-seeded','dashboard':'desk'}.get(name,name))+'.png')))
            page.goto(URL);page.wait_for_timeout(2200);shot('entrance')
            page.click('[data-action=mute]'); page.click('[data-action=mute]')
            check(f'{tag} sound control stays labelled', page.locator('.snd-btn svg').count()==1 and 'paper' in page.locator('.snd-btn').inner_text())
            page.click('[data-action=open]');page.wait_for_timeout(500)
            check(f'{tag} typed entrance moment',len(page.inner_text('#typed'))>3)
            check(f'{tag} typewriter and paper audio sources scheduled',page.evaluate('window.__audioStarts')>10)
            page.wait_for_url('**/#/front');shot('front')
            check(f'{tag} server reports replace samples',page.locator('.lead-title').inner_text()==api('/reports')[0]['headline'] and page.locator('.sample-tag:text-is("Sample")').count()==0)
            images=page.locator('.front-grid .figure img').evaluate_all('(images)=>images.map(i=>i.getAttribute("src"))')
            check(f'{tag} front page pictures are distinct',len(images)==len(set(images)))
            check(f'{tag} server mock provenance retained','demo data' in page.inner_text('.lead').lower())
            check(f'{tag} real wire reports',page.locator('#wireList li').count()==min(5,len(api('/reports'))))
            check(f'{tag} right column furniture',page.locator('.col-right > aside').count()==4)
            page.click('.tab:has-text("Commissioned")');check(f'{tag} section filter',page.locator('.lead-title').count()==1)
            page.click('.lead a');page.wait_for_timeout(500);shot('dispatch')
            active='.panel.active-desk'
            check(f'{tag} dispatch has labelled dates', 'filed' in page.inner_text(active+' .d-date').lower() and 'commissioned' in page.inner_text(active+' .d-date').lower())
            check(f'{tag} report attribution', 'AI-generated report.' in page.inner_text(active))
            check(f'{tag} dispatch furniture',all(page.locator(active+' '+x).count() for x in ['.caption','.pull','.orn','.endmark']))
            page.locator(active+' .pull').scroll_into_view_if_needed();shot('dispatch-body')
            page.locator(active+' .r-tx').first.click();shot('receipt')
            check(f'{tag} mock receipt not explorer',page.locator('#receiptDlg a').count()==0 and 'mock_' in page.inner_text('#receiptDlg'))
            page.click('[data-action=close-receipt]')
            page.keyboard.press('ArrowRight');page.wait_for_timeout(150)
            check(f'{tag} page turn', 'turn-next' in page.locator('#screen').get_attribute('class'))
            page.goto(URL+'#/archives');page.wait_for_timeout(500);shot('archives')
            page.click('[data-action=commission]');page.fill('#assignment','bad');page.click('button[type=submit]')
            check(f'{tag} validation',page.locator('#formErr').is_visible())
            page.fill('#assignment',f'Check public transit fare provenance for the {tag} edition');page.fill('#budget','.05');shot('commission')
            page.click('button[type=submit]');page.wait_for_selector('.clip-status.ok');shot('published')
            check(f'{tag} stable idempotency header',bool(requests[-1]['key']))
            commissioned=json.loads(page.evaluate("localStorage.getItem('joan.dispatches')"))[0]
            check(f'{tag} report is API persisted',any(r['id']==commissioned['id'] for r in api('/reports')))
            # Lose all browser caches; archived report must come back from SQLite.
            page.evaluate('localStorage.clear()');page.reload();page.wait_for_timeout(750)
            check(f'{tag} archives survive cleared browser storage',page.locator('a.clip[href="#/story/'+commissioned['id']+'"]').count()==1)
            page.goto(URL+'#/dashboard');page.wait_for_timeout(600);shot('dashboard')
            page.locator('.permission-card').scroll_into_view_if_needed();shot('permissions')
            page.click('[data-action=desk-allowed]');page.wait_for_function("document.querySelector('.desk-status').textContent.includes('Allowed:')")
            check(f'{tag} allowed buy adds receipt',page.locator('.ledger-slips .slip').count()==len(api('/ledger')['entries']))
            page.locator('.desk-ledger').scroll_into_view_if_needed();shot('ledger')
            before_denial={'balance':api('/wallet')['balanceMicros'],'ledger':api('/ledger'),'reports':api('/reports')}
            page.click('[data-action=desk-blocked]');page.wait_for_function("document.querySelector('.desk-status').textContent.includes('Refused:')")
            check(f'{tag} blocked buy truthful layer','sdk_spend_limit_exceeded' in page.inner_text('.desk-status'))
            check(f'{tag} blocked buy cannot debit or publish',before_denial=={'balance':api('/wallet')['balanceMicros'],'ledger':api('/ledger'),'reports':api('/reports')})
            page.locator('summary').click();check(f'{tag} SDK vs chain explanation','not chain-enforced' in page.inner_text('details'))
            shot('blocked')
            page.click('[data-action=desk-revoke]');page.wait_for_function("document.querySelector('.permission-card .stamp').textContent==='Revoked'")
            check(f'{tag} revoke persisted',api('/wallet')['session']['revoked'])
            page.click('[data-action=desk-after-revoke]');page.wait_for_function("document.querySelector('.desk-status').textContent.includes('Refused:')")
            check(f'{tag} revoked buy refused','revok' in page.inner_text('.desk-status').lower());shot('revoked')
            check(f'{tag} revoked buy cannot debit or publish',before_denial=={'balance':api('/wallet')['balanceMicros'],'ledger':api('/ledger'),'reports':api('/reports')})
            page.goto(URL+'#/archives');page.wait_for_timeout(500)
            page.click('[data-action=commission]');page.fill('#assignment',f'Check the revoked commission for the {tag} edition')
            request_count=len(requests); error_count=len(errors)
            page.click('button[type=submit]');page.wait_for_timeout(700)
            check(f'{tag} commission while revoked gives reason and fix',page.locator('#formErr').inner_text()=='Session revoked. Grant a new one on the Desk.')
            page.screenshot(path=str(FIX/f'{width}-commission-revoked.png'))
            check(f'{tag} revoked commission links to Desk',page.locator('#formErr a').get_attribute('href')=='#/dashboard')
            check(f'{tag} revoked commission sends no request',len(requests)==request_count)
            check(f'{tag} revoked commission zero console errors',len(errors)==error_count==0)
            page.click('#formErr a');page.wait_for_timeout(500)
            page.reload();page.wait_for_function("document.querySelector('.permission-card .stamp')?.textContent==='Revoked'", timeout=10000);check(f'{tag} revoked reload',page.locator('.permission-card .stamp').inner_text().lower()=='revoked')
            page.click('[data-action=desk-grant]');page.wait_for_function("document.querySelector('.permission-card .stamp').textContent==='Bounded'")
            check(f'{tag} bounded regrant',api('/permissions')['capMicros']==50000)
            for route in ['about','90s']:
                page.goto(URL+'#/'+route);shot(route)
            check(f'{tag} no failed images',page.evaluate('[...document.images].every(i=>i.complete && i.naturalWidth>0)'))
            (E/f'{tag}-console.json').write_text(json.dumps({'errors':errors,'failedHttpStatuses':policy_responses},indent=2))
            check(f'{tag} zero console errors (no exemptions)',not errors)
            check(f'{tag} zero failed HTTP responses',not policy_responses)
            (E/f'{tag}-attempts.json').write_text(json.dumps(attempts,indent=2))
            check(f'{tag} actual API attempt outcomes', [a['result']['outcome'] for a in attempts]==['accepted','denied','denied'] and all(a['status']==200 for a in attempts))
            ctx.close()
        ctx=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce'); page=ctx.new_page();monitor(page);page.goto(URL);page.click('[data-action=open]');page.wait_for_url('**/#/front',timeout=1000);check('reduced motion immediate handoff',True);page.wait_for_timeout(750);ctx.close()
        # Offline fallback uses a transport fixture only here; primary browser flows above use actual API.
        ctx=b.new_context(viewport={'width':390,'height':844});ctx.route(API+'/**',lambda r:r.fulfill(status=200,content_type='application/json',body='{}'))
        page=ctx.new_page();monitor(page);page.goto(URL+'#/front');page.wait_for_timeout(800)
        check('offline/malformed API labelled sample fallback','API unavailable' in page.inner_text('.sample-banner'));page.screenshot(path=str(OUT/'mobile-fallback.png'));ctx.close();b.close()
    (E/'suite-console.json').write_text(json.dumps({'errors':suite_errors,'failedHttpResponses':suite_http_failures},indent=2))
    check('entire browser suite zero console errors (including empty, reduced motion, fallback)',not suite_errors)
    check('entire browser suite zero failed HTTP responses',not suite_http_failures)
    before=api('/reports'); balance=api('/wallet')['balanceMicros']; ledger=api('/ledger')
    proc.terminate();proc.wait();proc=start()
    check('compiled API restart preserves reports',api('/reports')==before)
    check('compiled API restart preserves balance and ledger',api('/wallet')['balanceMicros']==balance and api('/ledger')==ledger)
    for name,path in [('reports','/reports'),('wallet','/wallet'),('permissions','/permissions'),('ledger','/ledger')]: (E/f'{name}-readback.json').write_text(json.dumps(api(path),indent=2))
    for tag in ['mobile','desktop']:
        files=sorted(OUT.glob(tag+'-*.png')); thumbs=[]
        for f in files:
            im=Image.open(f).convert('RGB');im.thumbnail((288,600));tile=Image.new('RGB',(308,640),'#f3eee5');tile.paste(im,((308-im.width)//2,30));ImageDraw.Draw(tile).text((10,8),f.stem,fill='#3a281c');thumbs.append(tile)
        sheet=Image.new('RGB',(308*4,640*((len(thumbs)+3)//4)),'#ded6c8')
        for i,im in enumerate(thumbs):sheet.paste(im,((i%4)*308,(i//4)*640))
        sheet.save(OUT/f'{tag}-sheet.jpg',quality=85)
    (E/'integration-results.json').write_text(json.dumps(checks,indent=2))
    print(f'PASS: {len(checks)} real API/browser/restart assertions. Evidence: {E}. Sheets: {OUT}',flush=True)
finally:
    proc.terminate();proc.wait();serverlog.close()
