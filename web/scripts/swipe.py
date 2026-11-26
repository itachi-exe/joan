"""CDP touch gestures against real persisted API dispatches; never signs or spends."""
import json, os, socket, subprocess, time, urllib.request, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'shots/wednesday';OUT.mkdir(parents=True,exist_ok=True)
E=ROOT/'evidence';E.mkdir(exist_ok=True)
API='http://127.0.0.1:4310'
EXE='/opt/hermes/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome'
def api(path,data=None):
    req=urllib.request.Request(API+path,data=json.dumps(data).encode() if data is not None else None,headers={'Content-Type':'application/json','Idempotency-Key':str(uuid.uuid4())})
    return json.load(urllib.request.urlopen(req))
def swipe(cdp,x0,x1,y=420,steps=12):
    cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x0,'y':y}]})
    for i in range(1,steps+1):
        cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x0+(x1-x0)*i/steps,'y':y}]});time.sleep(.016)
    cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
scratch=Path(os.environ['TMPDIR'])/('joan-swipe-'+str(uuid.uuid4()));scratch.mkdir()
env={k:os.environ[k] for k in ['PATH','HOME','TMPDIR'] if k in os.environ};env.update(PORT='4310',JOAN_DB_PATH=str(scratch/'swipe.sqlite'))
with socket.socket() as sock:
    if sock.connect_ex(('127.0.0.1',4310)) == 0: raise RuntimeError('Port 4310 is occupied; refusing to mutate an existing API.')
with open(E/'swipe-server.txt','w') as log:
    proc=subprocess.Popen(['node','dist/src/server.js'],cwd=ROOT.parent/'agent',env=env,stdout=log,stderr=subprocess.STDOUT)
    try:
        for _ in range(80):
            try:api('/health');break
            except Exception:time.sleep(.1)
        for i in range(3):api('/commissions',{'text':f'Trace the provenance of public transit fare claim number {i}','budget':.05})
        first=api('/reports')[0]['id'];res={}
        with sync_playwright() as p:
            b=p.chromium.launch(executable_path=EXE,args=['--no-sandbox']);ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
            page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
            page.goto('http://127.0.0.1:4174/#/story/'+first);page.wait_for_selector('.panel');page.evaluate("localStorage.setItem('joan-swiped','1')");page.reload();page.wait_for_selector('.panel');page.wait_for_timeout(700)
            cdp=ctx.new_cdp_session(page)
            def state():return page.evaluate("({left:document.getElementById('track').scrollLeft,hash:location.hash,dot:[...document.querySelectorAll('.dots i')].findIndex(d=>d.classList.contains('on'))})")
            res['start']=state()
            for name,x0,x1 in [('left1',320,60),('left2',320,60),('right',60,320)]:
                swipe(cdp,x0,x1);page.wait_for_timeout(900);res[name]=state()
            cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':200,'y':700}]})
            for i in range(1,11):cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':200,'y':700-40*i}]});time.sleep(.016)
            cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]});page.wait_for_timeout(700)
            res['verticalScroll']=page.evaluate('document.querySelectorAll(".panel")[1].scrollTop');res['documentWidth']=page.evaluate('document.documentElement.scrollWidth');res['consoleErrors']=errors
            page.screenshot(path=str(OUT/'mobile-swiped.png'));b.close()
        assert [res[x]['dot'] for x in ['start','left1','left2','right']]==[0,1,2,1],res
        assert res['verticalScroll']>0 and res['documentWidth']==390 and not errors,res
        (E/'swipe-results.json').write_text(json.dumps(res,indent=2));print(json.dumps(res,indent=2));print('PASS: CDP left, left, right, vertical swipe; zero console errors; zero overflow')
    finally:proc.terminate();proc.wait()
