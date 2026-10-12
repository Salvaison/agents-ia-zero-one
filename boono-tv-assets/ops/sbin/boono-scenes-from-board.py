#!/usr/bin/env python3
"""
Build one BOONO-TV 7-scene release from the accepted BOONOTV01 board.
The raw source is NEVER published to GitHub; only derived runtime assets + manifest.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageFilter, ImageDraw
import datetime, fcntl, hashlib, json, os, shutil, subprocess, sys, tempfile

BRANCH="boono-tv-assets"
REPO=Path("/srv/boono-tv-assets-repo")
BUILD_ROOT=Path("/srv/boono-tv-scenes/build")
SYNC="/usr/local/sbin/boono-scenes-sync"
STATES=["working","thinking","worried","concentrated","confident","observe","execute"]

def run(argv, *, cwd=None, capture=False):
    return subprocess.run(argv, cwd=cwd, check=True, text=True,
                          stdout=subprocess.PIPE if capture else None,
                          stderr=subprocess.STDOUT if capture else None)

def sha256(p: Path) -> str:
    h=hashlib.sha256()
    with p.open("rb") as f:
        for b in iter(lambda:f.read(4*1024*1024),b""): h.update(b)
    return h.hexdigest()

def assert_repo_clean():
    out=run(["git","status","--porcelain"],cwd=REPO,capture=True).stdout.strip()
    if out:
        raise RuntimeError(f"asset worktree not clean before transaction:\n{out}")

def reset_repo():
    subprocess.run(["git","reset","--hard",f"origin/{BRANCH}"],cwd=REPO,
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    subprocess.run(["git","clean","-fd"],cwd=REPO,
                   stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)

def main():
    if len(sys.argv)!=2:
        raise SystemExit("Usage: boono-scenes-from-board.py BOONOTV01.png")
    src=Path(sys.argv[1]).resolve()
    if not src.is_file() or src.is_symlink():
        raise SystemExit(f"invalid source: {src}")

    lock_path=Path("/run/lock/boono-scenes-import.lock")
    lock_path.parent.mkdir(parents=True,exist_ok=True)
    lock=open(lock_path,"w")
    fcntl.flock(lock,fcntl.LOCK_EX)

    source_sha=sha256(src)
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    release=f"boono-scenes-{stamp}-{source_sha[:8]}"
    BUILD_ROOT.mkdir(parents=True,exist_ok=True)
    stage=Path(tempfile.mkdtemp(prefix=f".{release}.",dir=BUILD_ROOT))
    pushed=False

    try:
        im=Image.open(src).convert("RGB")
        if im.size!=(1672,941):
            raise RuntimeError(f"BOONOTV01 expected 1672x941, got {im.size}")

        col=[0,418,836,1254,1672]
        row=[0,279,558]
        scene_h=240
        spec=[
            ("working",0,0,0),
            ("thinking",1,0,0),
            ("worried",2,0,0),
            ("concentrated",3,0,0),
            ("confident",0,1,-15),
            ("observe",1,1,20),
            ("execute",2,1,0),
        ]
        files={}
        hashes=[]
        for name,c,r,offset in spec:
            tile=im.crop((col[c],row[r],col[c+1],row[r]+scene_h))
            crop_w=round(tile.height*(1200/1080))
            cx=tile.width/2+offset
            left=max(0,min(tile.width-crop_w,round(cx-crop_w/2)))
            crop=tile.crop((left,0,left+crop_w,tile.height))
            frame=crop.resize((1200,1080),Image.Resampling.LANCZOS)
            frame=frame.filter(ImageFilter.UnsharpMask(radius=1.15,percent=120,threshold=3))
            p=stage/f"{name}.webp"
            frame.save(p,"WEBP",quality=88,method=6)
            # Re-open what will actually be deployed.
            check=Image.open(p); check.load()
            if check.size!=(1200,1080) or check.format!="WEBP":
                raise RuntimeError(f"generated scene invalid: {name}")
            digest=sha256(p); hashes.append(digest)
            files[p.name]={
                "sha256":digest,"bytes":p.stat().st_size,
                "width":1200,"height":1080,"format":"WEBP",
            }

        if len(set(hashes)) != len(STATES):
            raise RuntimeError("scene release rejected: two or more state images are byte-identical")

        thumbs=[]
        for name in STATES:
            t=Image.open(stage/f"{name}.webp").convert("RGB").resize((300,270),Image.Resampling.LANCZOS)
            d=ImageDraw.Draw(t)
            d.rectangle((0,242,300,270),fill=(0,0,0))
            d.text((8,248),name.upper(),fill="white")
            thumbs.append(t)
        sheet=Image.new("RGB",(1200,540),"black")
        for i,t in enumerate(thumbs): sheet.paste(t,((i%4)*300,(i//4)*270))
        sheet.save(stage/"preview.webp","WEBP",quality=82,method=6)

        manifest={
            "schema":3,
            "kind":"boono-tv-interactive-scenes",
            "release":release,
            "created_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "source":{"name":src.name,"sha256":source_sha,"published":False},
            "reference_composition":"BOONOTV03.png",
            "canvas":{"width":1200,"height":1080},
            "states":STATES,
            "switching":"deterministic V4 context + manual keys 1-7 / ?pose=",
            "files":files,
        }
        (stage/"manifest.json").write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+"\n")

        # Git transaction starts only after every generated file passed local validation.
        run(["git","fetch","--quiet","origin",BRANCH],cwd=REPO)
        run(["git","checkout","-q",BRANCH],cwd=REPO)
        run(["git","reset","--hard",f"origin/{BRANCH}"],cwd=REPO)
        assert_repo_clean()

        repo_rel=REPO/"boono-tv-assets"/"scene-releases"/release
        if repo_rel.exists():
            raise RuntimeError(f"release already exists: {release}")
        shutil.copytree(stage,repo_rel)

        control=REPO/"boono-tv-assets"/"control"/"scenes-current.json"
        control.parent.mkdir(parents=True,exist_ok=True)
        control.write_text(json.dumps({
            "schema":3,"kind":"boono-tv-interactive-scenes",
            "release":release,"status":"active",
            "updated_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        },indent=2)+"\n")

        relpath=repo_rel.relative_to(REPO).as_posix()
        ctlpath=control.relative_to(REPO).as_posix()
        run(["git","add",relpath,ctlpath],cwd=REPO)
        staged=set(run(["git","diff","--cached","--name-only"],cwd=REPO,capture=True).stdout.splitlines())
        expected={ctlpath,*[(repo_rel/p).relative_to(REPO).as_posix()
                            for p in [f"{s}.webp" for s in STATES]+["preview.webp","manifest.json"]]}
        if staged != expected:
            raise RuntimeError(f"unexpected staged scope: {sorted(staged ^ expected)}")

        run(["git","commit","-m",f"Publish BOONO-TV 7-scene pack {release}"],cwd=REPO)
        run(["git","lfs","fsck"],cwd=REPO)
        run(["git","push","origin",BRANCH],cwd=REPO)
        pushed=True

        # Runtime activation re-fetches from Git/LFS and validates again.
        run([SYNC])
        print(f"Interactive BOONO scenes imported and activated: {release}")
        print(f"source_sha256={source_sha}")
    except Exception:
        if not pushed:
            try:
                run(["git","fetch","--quiet","origin",BRANCH],cwd=REPO)
                reset_repo()
            except Exception:
                pass
        raise
    finally:
        shutil.rmtree(stage,ignore_errors=True)

if __name__=="__main__":
    main()
