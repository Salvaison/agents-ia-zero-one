#!/usr/bin/env python3
"""BOONO-TV V2 reframing — 1200x1080 camera-space asset builder.
Only crops/scales/pads and alpha-composites user-approved images.
Does not redraw, alter trading, or modify original images.
PYTHONPATH=/home/ubuntu/boono-tv-studio/tmp/image-vendor python3 build_reframed_scene.py
"""
from PIL import Image, ImageEnhance, ImageChops
from pathlib import Path
import json, hashlib
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'boonotv-v2-20261101'
DST = ROOT / 'reframed-20261101'
DST.mkdir(parents=True, exist_ok=True)
CANVAS=(1200,1080)
DESK_POS=(140,465)
DESK_SIZE=(920,613)  # retain exact size and plane; rounded to pixel
BOONO_POS=(483,342)
BOONO_SIZE=(288,374)
CAT_POS=(190,460)
CAT_SIZE=(230,184)
SRC_LOFT=(1536,1024)
W,H=CANVAS
FILES={}

def save(im, name):
    target=DST/name
    im.save(target, 'PNG', optimize=True, compress_level=6)
    raw=target.read_bytes()
    FILES[name]={'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'size':list(im.size),'mode':im.mode}
    print('SAVE',name,len(raw),im.size,im.mode)

def open_rgba(name):
    return Image.open(ROOT/name).convert('RGBA')

def canvas():
    return Image.new('RGBA', CANVAS, (0,0,0,0))

def place(sprite, position):
    out=canvas()
    out.alpha_composite(sprite, position)
    return out

def finish_loft(name):
    """Outward floor continuation into the 1200x1080 panel, no extra art.
    Upper 700px preserve the exact approved room and masked north windows.
    The lower 380px extend only concrete/carpet samples; NO duplicate plant,
    studio case or other tall object. Bottom parchment frame is excluded.
    """
    import numpy as np
    original=open_rgba(name)
    img=original.resize((1200,800),Image.Resampling.LANCZOS)
    arr=np.array(img)
    out=np.zeros((H,W,4),dtype=np.uint8)
    out[:760]=arr[:760]
    x=np.arange(W)
    # Reuse floor rather than obstacles at both sides.
    xx=x.astype(float)
    left=x<235; right=x>995
    xx[left]=np.clip(x[left]+225,0,1199)
    xx[right]=np.clip(x[right]-450,0,1199)
    xx=np.clip(xx.round().astype('int32'),0,W-1)
    # Soft lateral transition back into the original perspective.
    f=np.zeros(W,dtype='float32')
    f[x<175]=1
    mask=(x>=175)&(x<245);f[mask]=(245-x[mask])/70
    f[x>1105]=1
    mask=(x>995)&(x<=1105);f[mask]=(x[mask]-995)/110
    for y in range(700,H):
        # A source near the last approved rows continuously slides backward;
        # scaling slow in y gives depth instead of vertically repeating furniture.
        sy=min(759,max(610,int(751-(y-760)/3.1)))
        normal=arr[sy].astype('float32')
        adapted=arr[sy,xx].astype('float32')
        fl=(normal*(1-f[:,None])+adapted*f[:,None])
        if y<760:
            w=(y-700)/60
            fl=arr[y].astype('float32')*(1-w)+fl*w
        else:
            dim=1-0.18*(y-760)/(H-760)
            fl[:,:3]*=dim
        out[y]=np.clip(fl,0,255).astype('uint8')
    # Narrow newsprint side trim, unchanged, extended to the bottom.
    for y in range(760,H):
        sy=710+(y-760)%45
        out[y,:12]=arr[sy,:12]
        out[y,-12:]=arr[sy,-12:]
    return Image.fromarray(out,'RGBA')

save(finish_loft('loft_north_rgba.png'),'loft_north_1200x1080.png')
save(finish_loft('loft_reference.png'),'landscape_city_1200x1080.png')

mountain=Image.open(ROOT/'landscape_mountain_demo.jpg').convert('RGBA').resize((1200,800),Image.Resampling.LANCZOS)
mountain_bg=Image.new('RGBA',CANVAS,(20,33,38,255))
mountain_bg.alpha_composite(mountain,(0,0))
save(mountain_bg,'landscape_mountain_1200x1080.png')

# Remove the printed decorative edge on the DESK cutout only: otherwise it
# becomes a second beige vertical border inside the full-height loft. This
# does not change any wood, brass, rack or screen inside the mechanical desk.
desk_src=open_rgba('desk_canonical_compact_v1.png')
edge=Image.new('L',desk_src.size,255)
edge_px=edge.load()
for y in range(desk_src.height):
    for x in list(range(0,35))+list(range(1500,desk_src.width)):
        edge_px[x,y]=int(255*min(1,max(0,(x-22)/13),max(0,(1513-x)/13)))
for y in range(1000,desk_src.height):
    val=int(255*max(0,min(1,(1014-y)/14)))
    for x in range(desk_src.width):
        edge_px[x,y]=min(edge_px[x,y],val)
desk_src.putalpha(ImageChops.multiply(desk_src.getchannel('A'),edge))
desk=desk_src.resize(DESK_SIZE,Image.Resampling.LANCZOS)
save(place(desk,DESK_POS),'desk_1200x1080.png')

poses=['01_concentrated','02_thinking_left','03_right_finger_left_screen','04_left_open_hand',
       '05_observe_right','06_pause_right','07_idea','08_verify_left','09_window','10_relaxed']
for name in poses:
    im=open_rgba('boono_'+name+'.png').resize(BOONO_SIZE,Image.Resampling.LANCZOS)
    save(place(im,BOONO_POS),'boono_'+name+'_1200x1080.png')

cats=['01_observe','02_joue','03_ruse','04_toilette','05_surveille']
for name in cats:
    im=open_rgba('cat_'+name+'.png').resize(CAT_SIZE,Image.Resampling.LANCZOS)
    save(place(im,CAT_POS),'cat_'+name+'_1200x1080.png')

manifest={'schema':2,'release':'BOONOTV-V2-REFRAMED-20261101',
          'created_at':datetime.now(timezone.utc).isoformat(),
          'canvas':list(CANVAS),
          'loft':{'mode':'extend floor using mirrored comic-floor only','native':list(SRC_LOFT),
                  'resized': [1200,800], 'preserved_content_y':'0..744'},
          'desk':{'pixel_pos':list(DESK_POS),'size':list(DESK_SIZE),'unchanged_canonical_scale':True},
          'boono':{'pixel_pos':list(BOONO_POS),'size':list(BOONO_SIZE),
                   'previous_size':[374,486],'scale_ratio':BOONO_SIZE[0]/374,
                   'notes':'same poses, uniformly resized and bottom anchored on screens'},
          'cat':{'pixel_pos':list(CAT_POS),'size':list(CAT_SIZE)},
          'artwork_sources':'Only supplied approved images; no new objects/props created',
          'limitations':['Floor extension is a mirrored continuation, not painted outpainting',
                         'BOONO head pose/orbit expression unchanged; only resize and anchor',
                         'Projection quads remain matched to existing unchanged compact desk',
                         'No automatic image proof of perfect hands/screen contact'],
          'files':FILES}
(DST/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('DONE',len(FILES),'images',sum(x['bytes'] for x in FILES.values()),'bytes')
