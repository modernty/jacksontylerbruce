import os
import re

INK="#2E3A87";NOW=2026.83;FD="/workspace/portfolio/fonts/"
roles=[("JOBA STUDIO","2019–21",2019.35,2021.55,0),("SOUL MACHINES","2021–22",2021.6,2022.55,1),
("URVIN FINANCE","2022",2022.1,2022.7,2),("JET PROTOCOL","2022–23",2022.78,2023.8,0),
("NAX GROUP","2023",2023.1,2023.65,1),("CHATTER SOCIAL","2023–25",2023.78,2025.7,2),
("LAZARUS AI","2024–26",2024.13,2026.56,0),("LOBLAW / PC HEALTH","2026–",2026.04,None,1),
("OVERMATCH AI","2026–",2026.35,None,2)]
# name, start, end, company, timeline-lane, focus
projects=[("USM Hue+Man",2020.0,2020.5,"Joba Studio",0,"Spatial"),("CoreLogic",2021.65,2022.1,"Soul Machines",1,"AI"),
("Nestlé",2022.1,2022.5,"Soul Machines",1,"AI"),("FinTech Terminal",2022.15,2022.7,"Urvin Finance",2,"Systems"),
("DeFi redesign",2022.8,2023.6,"Jet Protocol",0,"Systems"),("Jet brand",2023.0,2023.4,"Jet Protocol",0,"Brand"),("Novart",2023.15,2023.6,"Nax Group",1,"Systems"),
("Chatter app",2023.8,2025.0,"Chatter Social",2,"Systems"),("Chatter brand",2023.8,2024.3,"Chatter Social",2,"Brand"),("Lazarus brand",2024.2,2024.8,"Lazarus AI",0,"Brand"),
("Model Playground",2024.5,2025.6,"Lazarus AI",0,"AI"),("USM Milan",2024.9,2025.35,"Joba × USM",1,"Spatial"),
("ATLS",2025.4,2026.4,"Lazarus AI",0,"AI"),("Remedy",2026.1,2026.6,"Loblaw / PC Health",1,"AI"),
("Intuit",2026.45,NOW,"Loblaw / PC Health",1,"AI"),("Overmatch patterns",2026.4,NOW,"Overmatch AI",2,"AI"),("Traveller",2026.5,NOW,"Side project",2,"Systems")]
TPX=1
FOCUS=[("AI","AI"),("Trust","TRUST IN AI"),("Systems","SYSTEMS"),("Arch","ARCHITECTURE"),("Spatial","SPATIAL"),("Material","MATERIAL"),("Identity","IDENTITY"),("Finance","FINANCE")]
FN={"AI":"AI","Trust":"Trust in AI","Systems":"Systems","Arch":"Architecture","Spatial":"Spatial","Material":"Material","Identity":"Identity","Finance":"Finance"}
TH={"USM Hue+Man":["Spatial","Material","Identity"],"CoreLogic":["AI","Spatial"],"Nestlé":["AI"],"FinTech Terminal":["Finance","Systems"],
"DeFi redesign":["Finance","Trust"],"Jet brand":["Identity"],"Novart":["Finance","Arch"],"Chatter app":["Systems"],"Chatter brand":["Identity"],
"Lazarus brand":["Identity","Material","Systems"],"Model Playground":["AI","Trust","Arch","Systems"],"USM Milan":["Spatial","Material","Identity"],
"ATLS":["AI","Trust"],"Remedy":["AI","Trust","Systems"],"Intuit":["Finance"],"Overmatch patterns":["AI","Trust","Systems"],"Traveller":["Arch","Systems"]}
FT=lambda n:" · ".join(FN[k] for k in TH[n])
TP=sorted([p for p in projects if p[0] not in("Jet brand","Chatter brand","Overmatch patterns")],key=lambda p:p[1])
def ff(b64=True):
  # Aeonik Pro is licensed: never embed or commit it. Load from a private host via FONT_BASE_URL.
  base=os.environ.get("FONT_BASE_URL")
  if not base: return ""
  return "".join(f"@font-face{{font-family:'Aeonik Pro';font-weight:{w};src:url('{base}/aeonikpro-{n}.otf') format('opentype')}}" for w,n in [(600,"semibold"),(400,"regular")])
def pill(x1,y1,x2,y2,cur,h=12,sw=1.5,op=1):
  r=h/2
  s=(f'<rect x="{x1-r}" y="{y1-r}" width="{x2-x1+h}" height="{h}" rx="{r}"' if y1==y2 else f'<rect x="{x1-r}" y="{y1-r}" width="{h}" height="{y2-y1+h}" rx="{r}"')+f' class="pr" fill="#FBFBF8" stroke="{INK}" stroke-width="{sw}" stroke-opacity="{op}"/>'
  d=2.6 if h>=12 else 2
  s+=f'<circle class="d0" cx="{x1}" cy="{y1}" r="{d}" fill="{INK}" fill-opacity="{op}"/>'+('' if cur else f'<circle class="d1" cx="{x2}" cy="{y2}" r="{d}" fill="{INK}" fill-opacity="{op}"/>')
  return s
tw=lambda t,sz:len(t)*sz*0.55
def greedy(items,X,sz):
  ends=[];out=[]
  for it in sorted(items,key=lambda p:p[1]):
    a=X(it[1])-6;b=max(X(it[2]),a+tw(it[0],sz))+14
    for i,e in enumerate(ends):
      if e<a: ends[i]=b;out.append((it,i));break
    else: ends.append(b);out.append((it,len(ends)-1))
  return out,len(ends)
def H(W=1120,H0=340,embed=False):
  x0,x1=150,W-110;X=lambda t:x0+(t-2019)/(NOW-2019)*(x1-x0)
  lanesN=lambda n:[70+i*(220/(max(n,2)-1)) for i in range(n)] if n>1 else [150]
  s=[f'<svg viewBox="0 0 {W} {H0}" width="{W}" height="{H0}" xmlns="http://www.w3.org/2000/svg" font-family="Aeonik Pro" fill="{INK}">']
  if embed: s.append(f'<style>{ff()}.mode:not([data-m=timeline]){{display:none}}</style><rect width="{W}" height="{H0}" fill="#FBFBF8"/>')
  s.append(f'<line class="nowl" x1="{x1}" y1="30" x2="{x1}" y2="{H0-16}" stroke="{INK}" stroke-opacity=".35" stroke-dasharray="2 3"/><text x="{x1}" y="{H0-4}" text-anchor="middle" font-size="10" font-weight="600" letter-spacing=".08em" class="nowt">NOW</text>')
  for y in range(2019,2027): s.append(f'<text class="yr" x="{X(y)}" y="{H0-4}" text-anchor="middle" font-size="10" opacity=".4">{y}</text>')
  # timeline
  L=[78,170,262];g=['<g class="mode on" data-m="timeline">']
  for ly in L: g.append(f'<line class="bl" x1="{x0-40}" y1="{ly}" x2="{x1}" y2="{ly}" stroke="{INK}" stroke-opacity=".1"/>')
  rows={}
  FL=dict(FOCUS)
  for i,(n,a,b,c,l,f) in enumerate(TP):
    xx=X(a)+4;r=0;fl=FN[TH[n][0]];fa_=FT(n)
    wdt=tw(n,11.5)*1.22+8+tw(fl,11)*1.15
    while rows.get((l,r),-1e9)>xx-6: r+=1
    rows[(l,r)]=xx+wdt;ly=L[l]+24+r*15;fx=xx+4+tw(n,11.5)*1.22+8;fy=ly
    fa='start'
    if fx+tw(fa_,11)*1.15>W-4: fx=xx-6;fa='end'
    g.append(f'<line class="tk" data-t="{a}" x1="{xx}" y1="{L[l]+8}" x2="{xx}" y2="{ly-10}" stroke="{INK}" stroke-opacity=".3"/><g class="pj" tabindex="0" role="button" aria-label="{n}" data-i="{i}" data-t="{a}"><rect x="{xx}" y="{ly-11}" width="{tw(n,11.5)*1.1+8}" height="15" fill="transparent"/><text class="w4" x="{xx+4}" y="{ly}" font-size="11.5">{n}</text><text class="w6" x="{xx+4}" y="{ly}" font-size="11.5" font-weight="600">{n}</text><text class="fo" x="{fx}" y="{fy}" text-anchor="{fa}" font-size="11">{fl}</text><text class="fa" x="{fx}" y="{fy}" text-anchor="{fa}" font-size="11">{fa_}</text></g>')
  for n,yr,a,b,l in roles:
    y=L[l];xa=X(a);cur=b is None;xb=x1 if cur else X(b)
    t=lambda w,c:f'<text class="{c}" font-size="12.5" font-weight="{w}"><tspan x="{xa-6}" y="{y-26}">{n}</tspan><tspan x="{xa-6}" y="{y-12}">{yr}</tspan></text>'
    g.append(f'<g class="rp" data-t="{a}" data-cur="{int(cur)}">'+pill(xa,y,xb,y,cur)+'<g class="co">'+t(600,"w6")+t(400,"w4")+'</g></g>')
  s+=g+['</g>']
  # projects
  pl,n=greedy([(p[0],p[1],p[2],p[3]) for p in projects],X,12.5);L=lanesN(n);g=['<g class="mode" data-m="projects">']
  for ly in L: g.append(f'<line x1="{x0-40}" y1="{ly}" x2="{x1}" y2="{ly}" stroke="{INK}" stroke-opacity=".08"/>')
  for (nm,a,b,c),i in pl:
    y=L[i];xa,xb=X(a),X(b);cur=b>=NOW
    g.append(pill(xa,y,xb,y,cur,h=9,sw=1.2)+f'<text x="{xa-4}" y="{y-10}" font-size="12.5" font-weight="600">{nm}</text><text x="{xa-4}" y="{y+19}" font-size="10" opacity=".45">{c}</text>')
  s+=g+['</g>']
  # focus
  g=['<g class="mode" data-m="focus">'];pos={};B=[]
  for k,lab in FOCUS:
    ends=[];it=[]
    for nm,a,b,c,l,f in sorted([p for p in projects if k in TH[p[0]]],key=lambda p:p[1]):
      xa,xb=X(a),X(b);lo=xa-14-tw(nm,10.5)
      for r,e in enumerate(ends):
        if e<lo: ends[r]=xb+8;break
      else: ends.append(xb+8);r=len(ends)-1
      it.append((nm,xa,xb,b>=NOW,r))
    B.append((lab,it,len(ends)))
  tot=sum(n for _,_,n in B);gap=9;rh=min(13,(H0-56-gap*len(B))/tot);y=34
  for lab,it,n in B:
    g.append(f'<line x1="{x0-40}" y1="{y-7}" x2="{x1}" y2="{y-7}" stroke="{INK}" stroke-opacity=".1"/><text x="{x0-140}" y="{y+3.5}" font-size="11" font-weight="600" letter-spacing=".06em">{lab}</text>')
    for nm,xa,xb,cur,r in it:
      yy=y+r*rh;pos.setdefault(nm,[]).append((xa,yy))
      g.append(pill(xa,yy,xb,yy,cur,h=7,sw=1.1)+f'<text x="{xa-9}" y="{yy+3.5}" text-anchor="end" font-size="10">{nm}</text>')
    y+=n*rh+gap
  lk=[]
  for nm,ps in pos.items():
    for (xa,ya),(xb,yb) in zip(ps,ps[1:]): lk.append(f'<line x1="{xa}" y1="{ya+4}" x2="{xb}" y2="{yb-4}" stroke="{INK}" stroke-opacity=".14" stroke-dasharray="1 3"/>')
  g[1:1]=lk
  s+=g+['</g>'];s.append('</svg>');return "".join(s)
def V():
  W,Hh=342,860;y0,y1=20,Hh-30;Y=lambda t:y0+(t-2019)/(NOW-2019)*(y1-y0)
  s=[f'<svg viewBox="0 0 {W} {Hh}" width="100%" xmlns="http://www.w3.org/2000/svg" font-family="Aeonik Pro" fill="{INK}">']
  for y in range(2019,2027): s.append(f'<text class="yr" x="4" y="{Y(y)+3}" font-size="9" opacity=".4">\'{str(y)[2:]}</text>')
  s.append(f'<line class="nowl" x1="4" y1="{y1}" x2="{W-4}" y2="{y1}" stroke="{INK}" stroke-opacity=".35" stroke-dasharray="2 3"/><text x="4" y="{y1+14}" font-size="9" font-weight="600">NOW</text>')
  g=['<g class="mode on" data-m="timeline">'];lanes=[36,56,76];lx=104
  for n,yr,a,b,l in roles:
    x=lanes[l];ya=Y(a);cur=b is None;yb=y1 if cur else Y(b)
    g.append(f'<g class="rp" data-t="{a}" data-cur="{int(cur)}">'+pill(x,ya,x,yb,cur)+f'<g class="co"><line x1="{x+8}" y1="{ya}" x2="{lx-4}" y2="{ya}" stroke="{INK}" stroke-opacity=".2"/><text font-size="11.5" font-weight="600"><tspan x="{lx}" y="{ya+4}">{n}</tspan><tspan dx="6" font-weight="400" opacity=".75">{yr}</tspan></text></g></g>')
  last=-99
  for p in sorted(projects,key=lambda p:p[1]):
    if p[0] in("Jet brand","Chatter brand","Overmatch patterns"):continue
    yy=max(Y(p[1])+16,last+13);last=yy;g.append(f'<text class="mpj" data-t="{p[1]}" x="{W-4}" y="{yy}" text-anchor="end" font-size="10.5" opacity=".6">{p[0]}</text>')
  s+=g+['</g>']
  g=['<g class="mode" data-m="projects">'];last=-99
  for i,(nm,a,b,c,l,f) in enumerate(sorted(projects,key=lambda p:p[1])):
    x=36+(i%3)*18;ya,yb=Y(a),Y(b);g.append(pill(x,ya,x,yb,b>=NOW,h=9,sw=1.2))
    yy=max(ya+4,last+26);last=yy
    g.append(f'<line x1="{x+6}" y1="{ya}" x2="{lx-4}" y2="{yy-4}" stroke="{INK}" stroke-opacity=".2"/><text x="{lx}" y="{yy}" font-size="11.5" font-weight="600">{nm}</text><text x="{lx}" y="{yy+12}" font-size="9.5" opacity=".45">{c}</text>')
  s+=g+['</g>']
  g=['<g class="mode" data-m="focus">'];X=lambda q:150+(q-2019)/(NOW-2019)*(W-160);yy=y0+4
  for k,lab in FOCUS:
    g.append(f'<text x="4" y="{yy+8}" font-size="10" font-weight="600" letter-spacing=".06em">{lab}</text><line x1="4" y1="{yy+13}" x2="{W-4}" y2="{yy+13}" stroke="{INK}" stroke-opacity=".1"/>');yy+=28
    for nm,a,b,c,l,f in sorted([p for p in projects if k in TH[p[0]]],key=lambda p:p[1]):
      g.append(f'<text x="4" y="{yy+3.5}" font-size="10.5">{nm}</text>'+pill(X(a),yy,X(b),yy,b>=NOW,h=8,sw=1.1));yy+=15
    yy+=8
  s+=g+['</g>']
  s+=g+['</g>','</svg>'];return "".join(s)
open("resume-timeline.svg","w").write(H(embed=True))
t=open("tpl.html").read().replace("<style>","<style>"+ff(False)).replace("%D%",H()).replace("%M%",V())
import json
def yrs(a,b): A=int(a);B=None if b>=NOW else int(b);return f"{A}–" if B is None else (str(A) if A==B else f"{A}–{str(B)[2:]}")
data=[dict(t=n,c=c,d=yrs(a,b),f=FT(n),s="[Placeholder] One-line summary to come.",u="/projects/"+re.sub(r"[^a-z0-9]+","-",n.lower()).strip("-")) for n,a,b,c,l,f in TP]
t=t.replace("%DATA%",json.dumps(data,ensure_ascii=False))
open("home.html","w").write(t)
