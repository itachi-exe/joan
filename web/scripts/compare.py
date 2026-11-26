"""Side-by-side evidence for every supplied inspiration image, plus OCR sources."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps
import json, subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'shots/comparisons';OUT.mkdir(parents=True,exist_ok=True)
records=[]
for ref in sorted((ROOT.parent/'inspo').iterdir()):
    if ref.suffix.lower() not in ['.png','.jpg','.jpeg','.webp']:continue
    original=Image.open(ref).convert('RGB')
    rows=[]
    for label,screen in [('Front page','mobile-front.png'),('Dispatch','mobile-dispatch-body.png'),('Archives','mobile-archives.png')]:
        page=Image.open(ROOT/'shots/wednesday'/screen).convert('RGB');page.thumbnail((300,650))
        row=Image.new('RGB',(1200,720),'#e8e0d4');d=ImageDraw.Draw(row);d.text((24,16),ref.name+' | supplied composition',fill='#3a281c');d.text((850,16),'Joan | '+label+' | 390px',fill='#3a281c')
        left=ImageOps.contain(original,(780,650));row.paste(left,((800-left.width)//2,44+(650-left.height)//2));row.paste(page,(850,44));rows.append(row)
    sheet=Image.new('RGB',(1200,720*len(rows)),'#e8e0d4')
    for i,row in enumerate(rows):sheet.paste(row,(0,i*720))
    dest=OUT/(ref.stem+'-all-compositions.jpg');sheet.save(dest,quality=90)
    ocr=subprocess.run(['tesseract',str(ref),'stdout'],capture_output=True,text=True)
    (OUT/(ref.stem+'-reference-ocr.txt')).write_text(ocr.stdout)
    records.append({'reference':str(ref),'dimensions':original.size,'comparison':str(dest),'views':['front','dispatch-body','archives']})
(OUT/'manifest.json').write_text(json.dumps(records,indent=2));print(json.dumps(records,indent=2));print(f'PASS: all {len(records)} supplied inspiration images paired with three implemented compositions')
