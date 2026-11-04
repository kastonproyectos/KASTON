/* Instalación de la teja Cola de Castor, capa por capa, y la casa terminada frente al clima.
   Versión para el inicio: el dibujo cuenta el proceso y cada paso lleva solo un título y una frase.
   Los textos viven en el HTML (#instalacion, claves inst.*) para que el cambio de idioma los traduzca. */
(function(){
const raiz=document.getElementById('instalacion');
const cv=document.getElementById('instCanvas');
if(!raiz||!cv||!cv.getContext) return;
let ctx=cv.getContext('2d');
const C={cobre:'#C18A68',blanco:'#FFFFFF',claro:'#F4F4F4',gris:'#BCBCBC',sup:'#111111',alta:'#1A1A1A',grafito:'#2A2A2A',basalto:'#6B6B6B'};

/* ---------- Guion: duración en segundos; fin = escenas de la casa terminada ---------- */
const PASOS=[{d:3.5},{d:3},{d:5},{d:4.5},{d:5},{d:11},{d:4.5},
  {d:7,fin:true},{d:6,fin:true},{d:6,fin:true},{d:6,fin:true},{d:8,fin:true}];
let acc=0; PASOS.forEach(p=>{p.s=acc; acc+=p.d;}); const TOTAL=acc;

/* ---------- Geometría (metros) ----------
   Agua frontal: x a lo ancho, y sube desde el alero (0) hasta la cumbrera (L).
   Otra agua: x igual, y negativo baja desde la cumbrera (0) alejándose del espectador. */
const W=2.55, L=2.1;
const ALFARDAS=[0.12,0.72,1.32,1.92,2.48], AW=0.07;
const TAB=0.12;
const MANTO=[[0,0.95],[0.85,1.8],[1.7,L]];
const TW=0.17, TL=0.28, R=TW/2, TS=0.15, PASO_H=0.15; // una teja por hueco de malla de 15 × 15 cm
const ALERO=0.10;
function armarTejas(yIni,yFin){
  const out=[];
  for(let r=0;;r++){
    const yb=yIni+r*PASO_H, yt=yb+TL;
    if(yb>yFin-0.02) break;
    const off2=(r%2)*TS/2;
    for(let x=0.075+off2-TS*2; x<W; x+=TS){ if(x+TW>0) out.push({r,x:x-0.01,yt,yb}); }
  }
  return out;
}
const tejas=armarTejas(-ALERO,L);
const FILAS=tejas.reduce((m,t)=>Math.max(m,t.r),0)+1;
const mid=a=>a+AW/2;
// tramos de malla, a tope, sobre la misma cuadrícula de 15 cm
const TRAMOS=[[0.02,0.77],[0.77,1.52],[1.52,2.07]];
// unas 8 grapas por tramo, sobre alfardas: esquinas, centro de los bordes largos y centro del tramo
const grapas=[];
TRAMOS.forEach(([y0,y1])=>{
  const e=0.06, ym=(y0+y1)/2;
  [[0,y0+e],[4,y0+e],[0,y1-e],[4,y1-e],[2,y0+e],[2,y1-e],[1,ym],[3,ym]].forEach(([a,y])=>grapas.push({x:mid(ALFARDAS[a]),y}));
});

/* ---------- Lienzo y proyección ---------- */
const off=document.createElement('canvas'), octx=off.getContext('2d');
const off2=document.createElement('canvas');
let dpr=1, cw=0, ch=0, M=null, Mb=null, superpuesto=false;
// Proyección 3D sencilla: X a lo largo de la cumbrera, Y hacia el fondo, Z hacia arriba.
const COS=0.82, SEN=0.57; // inclinación del agua (unos 35°)
// Cámara alta, de frente y un poco desde la derecha: se ven las dos aguas y la culata derecha.
const TH=32*Math.PI/180, PH=50*Math.PI/180;
const UX=[Math.cos(TH), Math.sin(TH)*Math.sin(PH)], EY=[Math.sin(TH), -Math.cos(TH)*Math.sin(PH)], EZ=[0,-Math.cos(PH)];
const VY=[COS*EY[0]+SEN*EZ[0], COS*EY[1]+SEN*EZ[1]];    // sube por el agua frontal
const VYb=[-COS*EY[0]+SEN*EZ[0], -COS*EY[1]+SEN*EZ[1]]; // sube por la otra agua, desde su alero
const DD=2*L*COS;                                         // distancia horizontal entre los dos aleros
const leyendas=raiz.querySelector('.inst-captions');
function ajustar(){
  const r=cv.getBoundingClientRect(); dpr=Math.min(window.devicePixelRatio||1,2);
  cw=r.width; ch=r.height;
  cv.width=off.width=off2.width=Math.round(cw*dpr); cv.height=off.height=off2.height=Math.round(ch*dpr);
  const pts=[];
  for(const x of [-0.2,W+0.1]){ // sin rótulos a la izquierda, el dibujo usa todo el ancho
    for(const y of [-0.42,L+0.15]) pts.push([x*UX[0]+y*VY[0],x*UX[1]+y*VY[1]]);
    for(const y of [-0.15,L]) pts.push([x*UX[0]+DD*EY[0]+y*VYb[0], x*UX[1]+DD*EY[1]+y*VYb[1]]);
  }
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]);
  const bw=Math.max(...xs)-Math.min(...xs), bh=Math.max(...ys)-Math.min(...ys);
  // en escritorio el texto va sobre el dibujo, abajo a la izquierda: se le deja ese espacio libre
  superpuesto=!!leyendas&&getComputedStyle(leyendas).position==='absolute';
  const pad=Math.max(18,Math.min(cw,ch)*0.07);
  const X0v=superpuesto?cw*0.22:0, Y1v=superpuesto?ch*0.9:ch;
  const s=Math.min((cw-X0v-2*pad)/bw,(Y1v-2*pad)/bh);
  const ox=X0v+(cw-X0v-bw*s)/2-Math.min(...xs)*s, oy=(Y1v-bh*s)/2-Math.min(...ys)*s;
  M={a:UX[0]*s,b:UX[1]*s,c:VY[0]*s,d:VY[1]*s,e:ox,f:oy,s};
  Mb={a:UX[0]*s,b:UX[1]*s,c:VYb[0]*s,d:VYb[1]*s,e:ox+DD*EY[0]*s,f:oy+DD*EY[1]*s,s};
}
let MT=null; // transformación activa (agua frontal u otra agua)
function usar(m){MT=m;}
function plano(dy=0){const m=MT||M;ctx.setTransform(dpr*m.a,dpr*m.b,dpr*m.c,dpr*m.d,dpr*m.e,dpr*(m.f+dy));}
function pantalla(){ctx.setTransform(dpr,0,0,dpr,0,0);}
function P(x,y,m){m=m||MT||M;return [m.e+x*m.a+y*m.c, m.f+x*m.b+y*m.d];}
const cl=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const ease=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
const prog=(i,t)=>cl((t-PASOS[i].s)/PASOS[i].d);
function trazo(color,w,alpha=1,dash){pantalla();ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.setLineDash(dash||[]);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;}
function relleno(color,alpha=1){pantalla();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.fill();ctx.globalAlpha=1;}
function rect(x,y,w,h,dy=0){plano(dy);ctx.beginPath();ctx.rect(x,y,w,h);}
function pasoActual(t){for(let i=PASOS.length-1;i>=0;i--) if(t>=PASOS[i].s) return i; return 0;}

/* ---------- Capas (se dibujan en las dos aguas) ---------- */
function capaAlfardas(k,p1,y0,y1,esp){
  const act=k===0, col=act?C.cobre:C.blanco;
  ALFARDAS.forEach((x,i)=>{
    const q=ease(cl(p1*1.6-i*0.12)); if(q<=0) return;
    const h=(y1-y0)*q;
    const yy=y1>0?y0:y1-(y1-y0)*q;
    rect(x,yy,AW,h,esp); relleno('#050505'); trazo(col,1,act?1:.55);
    rect(x,yy,AW,h); relleno('#0a0a0a'); trazo(col,1.3,act?1:.8);
  });
}
function capaTablilla(k,p,y0,y1,esp){
  const act=k===1, n=Math.ceil((y1-y0)/TAB);
  for(let i=0;i<n;i++){
    const ya=y1>0? y0+i*TAB : y1-(i+1)*TAB;
    const q=ease(cl(p*n*1.05-i)); if(q<=0) continue;
    const hh=Math.min(TAB, y1-ya);
    rect(0,ya,W*q,hh,esp*0.5); relleno('#070707');
    rect(0,ya,W*q,hh); relleno('#120f0c'); trazo(act?C.cobre:C.basalto,1,act?.8:.55);
  }
}

/* ---------- Dibujo ---------- */
function dibujar(t){
  if(!M) return;
  pantalla(); ctx.clearRect(0,0,cw,ch); ctx.fillStyle='#000'; ctx.fillRect(0,0,cw,ch);
  const k=pasoActual(t);
  // la otra agua: mismo proceso, más tenue
  const principal=ctx; ctx=octx; pantalla(); ctx.clearRect(0,0,cw,ch);
  usar(Mb); capas(t,k,false);
  ctx=principal; ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha=0.5; ctx.drawImage(off,0,0); ctx.globalAlpha=1;
  usar(M); capas(t,k,true);
  culata(k,t);
  caballete(k,t);
  const p3=prog(2,t),p5=prog(4,t),p6=prog(5,t);
  const d5=k===4?cl(Math.min(p5*5,(1-p5)*5)):0;
  const d6=k===5?cl(Math.min((p6-0.15)*6,(0.8-p6)*6)):0;
  const d3=k===2?cl(Math.min((p3-0.45)*6,(1-p3)*8)):0;
  if(cw>=520){ if(d3>0) detalle(d3,'cumbrera'); if(d5>0) detalle(d5,'grapa'); if(d6>0) detalle(d6,'amarre'); }
  // escenas finales: la casa completa da una vuelta de 360° por escena
  if(k>=7){
    const esc=k-7, d=PASOS[k].d, e=t-PASOS[k].s;
    // transición: el esquema se oscurece y la casa aparece desde negro, sin mezclarse
    if(esc===0&&e<0.35){ ctx.setTransform(1,0,0,1,0,0); ctx.fillStyle=`rgba(0,0,0,${e/0.35})`; ctx.fillRect(0,0,cv.width,cv.height); return; }
    let g=e/d; if(esc===0) g=g*g*(2-g); if(k===PASOS.length-1) g=(e/d)*0.4+ease(e/d)*0.6;
    const ang=32*Math.PI/180+(esc+g)*Math.PI*2, elev=(30-3*Math.sin(g*Math.PI*2))*Math.PI/180;
    const c2=off2.getContext('2d'); c2.setTransform(1,0,0,1,0,0); c2.clearRect(0,0,off2.width,off2.height);
    c2.setTransform(dpr,0,0,dpr,0,0); c2.fillStyle='#000'; c2.fillRect(0,0,cw,ch);
    dibujarCasa(c2,ang,elev,esc,t);
    ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(off2,0,0);
    if(esc===0&&e<0.85){ ctx.fillStyle=`rgba(0,0,0,${1-(e-0.35)/0.5})`; ctx.fillRect(0,0,cv.width,cv.height); }
  }
}

function capas(t,k,frente){
  const esp=Math.max(4,M.s*0.035)*(frente?1:0.5);
  const p1=prog(0,t),p2=prog(1,t),p3=prog(2,t),p4=prog(3,t),p5=prog(4,t),p6=prog(5,t);

  // 1. Estructura
  if(p1>0){
    capaAlfardas(k,p1,0,L,esp);
    const q=ease(cl(p1*1.4)), col=k===0?C.cobre:C.blanco;
    rect(0,-0.05,W*q,0.05,esp); relleno('#050505'); trazo(C.blanco,1,.5);
    rect(0,-0.05,W*q,0.05); relleno('#0a0a0a'); trazo(col,1.3,k===0?1:.8);
    const q2=ease(cl(p1*1.4-0.4));
    if(q2>0){rect(0,L-0.03,W*q2,0.06); relleno('#0a0a0a'); trazo(col,1.3,k===0?1:.8);}
  }
  // 2. Tablilla
  if(p2>0){ capaTablilla(k,cl(p2*1.6),0,L,esp*0.5); }

  // 3. Manto asfáltico: rollos con traslapo; el último pasa la cumbrera en una sola pieza
  if(p3>0){
    const act=k===2;
    MANTO.forEach(([y0,y1],i)=>{
      const q=ease(cl(p3*5-1-i)); if(q<=0) return;
      rect(0,y0,W*q,y1-y0); relleno('#141414'); trazo(act?C.cobre:C.basalto,1,act?.9:.6);
      if(q<1&&act){ rect(W*q-0.035,y0-0.02,0.07,y1-y0+0.04,-3); relleno(C.cobre,.9); }
    });
    const qc=ease(cl(p3*5-4));
    if(qc>0){ rect(0,L-0.28,W*qc,0.28); relleno('#1a1a1a'); trazo(act?C.cobre:C.basalto,act?1.6:1,act?1:.6); }
  }
  // alfardas ocultas, en punteado
  if(p2>0){ ALFARDAS.forEach(x=>{plano();ctx.beginPath();ctx.moveTo(x+AW/2,0);ctx.lineTo(x+AW/2,L);trazo(C.blanco,1,k===4?.55:.18,[4,5]);}); }

  // 4. Malla electrosoldada
  if(p4>0 && p6<1){
    const act=k===3, col=act?C.cobre:C.blanco, al=act?.95:.45;
    TRAMOS.forEach(([y0,y1],i)=>{
      const q=ease(cl(p4*TRAMOS.length*1.08-i)); if(q<=0) return;
      const xe=W*q; // el tramo se desenrolla a lo largo de la cubierta
      plano(); ctx.beginPath();
      for(let x=0.075;x<xe;x+=0.15){ctx.moveTo(x,y0);ctx.lineTo(x,y1);}
      for(let y=y0;y<=y1+0.001;y+=0.15){ctx.moveTo(0,y);ctx.lineTo(xe,y);}
      ctx.moveTo(0,y1);ctx.lineTo(xe,y1);
      trazo(col,1,al);
      plano(); ctx.beginPath(); ctx.rect(0,y0,xe,y1-y0); trazo(col,act?1.8:1.2,act?1:.6);
      if(act&&q<1){ plano(); ctx.beginPath(); ctx.moveTo(xe,y0-0.03); ctx.lineTo(xe,y1+0.03); trazo(C.cobre,3,1); }
    });
  }

  // 5. Grapas y silicona: esquinas y centro
  if(p5>0){
    const n=grapas.length;
    grapas.forEach((g,i)=>{
      const ti=cl(p5*1.25*n-i); if(ti<=0) return;
      if(p6>0){ const fila=Math.floor((g.y+ALERO)/PASO_H); if(tejaVisibleHasta(t)>fila+1) return; }
      const [sx,sy]=P(g.x,g.y); const u=Math.max(3.5,M.s*0.026);
      const pop=1+(1-ease(cl(ti*2)))*0.8;
      pantalla(); ctx.beginPath();
      ctx.moveTo(sx-u*pop,sy+u*0.6);ctx.lineTo(sx-u*pop,sy-u*0.6*pop);ctx.lineTo(sx+u*pop,sy-u*0.6*pop);ctx.lineTo(sx+u*pop,sy+u*0.6);
      ctx.strokeStyle=k===4?C.cobre:C.gris; ctx.lineWidth=1.8; ctx.globalAlpha=k===4?1:.7; ctx.stroke();
      const si=cl(ti-0.5);
      if(si>0){ctx.globalAlpha=(k===4?.95:.55)*si;ctx.fillStyle=C.claro;
        ctx.beginPath();ctx.arc(sx-u,sy+u*0.6,u*0.55,0,Math.PI*2);ctx.arc(sx+u,sy+u*0.6,u*0.55,0,Math.PI*2);ctx.fill();}
      if(k===4){ctx.globalAlpha=.9;ctx.strokeStyle=C.cobre;ctx.lineWidth=1;ctx.beginPath();ctx.arc(sx,sy,u*2.6,0,Math.PI*2);ctx.stroke();}
      ctx.globalAlpha=1;
    });
  }

  // 6. Canaleta (solo se marca adelante)
  if(p6>0&&frente){
    const a=cl(p6*6);
    const g0=P(0,-0.15), g1=P(W,-0.15), gd=esp*2.4;
    pantalla(); ctx.globalAlpha=a; ctx.beginPath();
    ctx.moveTo(g0[0],g0[1]+gd); ctx.lineTo(g1[0],g1[1]+gd);
    ctx.moveTo(g0[0],g0[1]+gd*1.9); ctx.lineTo(g1[0],g1[1]+gd*1.9);
    ctx.strokeStyle=k===5?C.cobre:C.gris; ctx.lineWidth=1.2; ctx.setLineDash([6,4]); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha=1;
  }

  // 6. Tejas, hilera por hilera, de abajo hacia arriba
  if(p6>0){
    const n=tejas.length, ventana=0.8;
    plano(); ctx.save(); ctx.beginPath(); ctx.rect(0,-0.5,W,L+0.5); pantalla(); ctx.clip();
    for(let r=0;r<FILAS;r++){
      const fila=tejas.filter(q=>q.r===r);
      fila.forEach(q=>{
        const idx=tejas.indexOf(q);
        const tp=cl((p6*n/ventana-idx)/(n*0.012+3)); if(tp<=0) return;
        const e=ease(tp), dy=(1-e)*0.10;
        dibujarTeja(q.x,q.yt+dy,q.yb+dy,e,k===5&&r>=filaActual(t));
      });
      fila.forEach(q=>{
        const idx=tejas.indexOf(q);
        const tp=cl((p6*n/ventana-idx)/(n*0.012+3)); if(tp<1) return;
        const reciente=k===5&&r===filaActual(t);
        const yh=q.yt-0.035, ym=Math.ceil((yh-0.02)/0.15)*0.15+0.02;
        [q.x+0.045,q.x+TW-0.045].forEach(hx=>{
          plano();ctx.beginPath();ctx.moveTo(hx,yh);ctx.quadraticCurveTo(hx-0.02,(yh+ym)/2,hx,ym);ctx.quadraticCurveTo(hx+0.02,(yh+ym)/2,hx,yh);
          trazo(reciente?C.cobre:C.gris,1.2,reciente?1:.6);
        });
      });
    }
    ctx.restore();
  }
}

/* Culata: el extremo derecho de la cubierta visto de lado. Deja intuir la otra agua. */
function G(Y,Z){return [M.e+(W*UX[0]+Y*EY[0]+Z*EZ[0])*M.s, M.f+(W*UX[1]+Y*EY[1]+Z*EZ[1])*M.s];}
function culata(k,t){
  const D=L*COS, H=L*SEN;
  const fr=(u,dz)=>G(u*COS,u*SEN+dz), bk=(v,dz)=>G(D+v*COS,H-v*SEN+dz);
  const p1=prog(0,t),p2=prog(1,t),p3=prog(2,t),p6=prog(5,t),pf=prog(7,t);
  pantalla();
  const poly=(pts)=>{ctx.beginPath();ctx.moveTo(...pts[0]);for(const q of pts.slice(1))ctx.lineTo(...q);ctx.closePath();};
  const banda=(v0,v1,z0,z1)=>poly([bk(v0,z0),bk(v1,z0),bk(v1,z1),bk(v0,z1)]);
  // muro de la culata: baja desde la cumbrera al final
  if(pf>0){
    const A=fr(0,0), Bp=G(D,H), Cp=bk(L,0);
    const top=Bp[1], bot=Math.max(A[1],Cp[1]);
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,cw,top+(bot-top)*ease(pf)); ctx.clip();
    poly([A,Bp,Cp]); ctx.fillStyle='#0d0d0d'; ctx.fill();
    ctx.restore();
    poly([A,Bp,Cp]); ctx.globalAlpha=.5*ease(pf); ctx.strokeStyle=C.blanco; ctx.lineWidth=1; ctx.stroke(); ctx.globalAlpha=1;
  }
  // línea de apoyo entre los dos aleros
  if(p1>0.3){
    const A=fr(0,-0.10), Cp=bk(L,-0.10);
    ctx.beginPath(); ctx.moveTo(...A); ctx.lineTo(...Cp);
    ctx.globalAlpha=cl((p1-0.3)*3)*.35; ctx.strokeStyle=C.blanco; ctx.lineWidth=1; ctx.setLineDash([4,5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha=1;
  }
  // alfardas de la culata: frontal y de la otra agua
  if(p1>0){
    const q=ease(cl(p1*1.4)), col=k===0?C.cobre:C.blanco, al=k===0?1:.8;
    poly([fr(0,0),fr(L*q,0),fr(L*q,-0.10),fr(0,-0.10)]); ctx.fillStyle='#0a0a0a'; ctx.fill(); ctx.globalAlpha=al; ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.stroke(); ctx.globalAlpha=1;
    const q2=ease(cl(p1*1.4-0.35));
    if(q2>0){ poly([bk(0,0),bk(L*q2,0),bk(L*q2,-0.10),bk(0,-0.10)]); ctx.fillStyle='#0a0a0a'; ctx.fill(); ctx.globalAlpha=al; ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.stroke(); ctx.globalAlpha=1; }
  }
  // capas sobre la otra agua, vistas de canto
  const capa=(prog,z0,z1,fill,activo,desdeAbajo,extra=0)=>{
    if(prog<=0) return; const q=ease(prog), largo=L+extra;
    const v0=desdeAbajo? largo*(1-q):0, v1=desdeAbajo? largo: largo*q;
    banda(v0,v1,z0,z1); ctx.fillStyle=fill; ctx.fill();
    ctx.strokeStyle=activo?C.cobre:C.basalto; ctx.globalAlpha=activo?1:.7; ctx.lineWidth=1; ctx.stroke(); ctx.globalAlpha=1;
  };
  capa(cl(p2*1.2),0,0.03,'#120f0c',k===1,true);
  capa(cl(p3*1.2),0.03,0.045,'#141414',k===2,true);
  capa(cl((p6-0.55)/0.4),0.045,0.085,'#303030',k===5,true,ALERO);
}

/* Caballete redondo: piezas de media caña sobre la cumbrera, cada una montada sobre la siguiente */
function caballete(k,t){
  const p7=prog(6,t); if(p7<=0) return;
  const D=L*COS, H=L*SEN, rc=0.10, zc=H+0.075, LP=0.30, PASO=0.26;
  const S=(x,f,dz=0)=>{const Y=D+rc*Math.cos(f), Z=zc+rc*Math.sin(f)+dz;
    return [M.e+(x*UX[0]+Y*EY[0]+Z*EZ[0])*M.s, M.f+(x*UX[1]+Y*EY[1]+Z*EZ[1])*M.s];};
  const N=24, col=k===6?C.cobre:'#8a8a8a';
  pantalla();
  const piezas=[]; for(let x=W-LP+0.02; x>-LP+0.06; x-=PASO) piezas.push(x);
  piezas.forEach((x0,i)=>{
    const q=ease(cl(p7*1.35*piezas.length-i)); if(q<=0) return;
    const dz=(1-q)*0.25, x1=Math.min(x0+LP,W+0.02), xa=Math.max(x0,-0.02);
    // cuerpo
    ctx.beginPath();
    for(let j=0;j<=N;j++){const f=Math.PI*j/N; const pt=S(xa,f,dz); j?ctx.lineTo(...pt):ctx.moveTo(...pt);}
    for(let j=N;j>=0;j--){const f=Math.PI*j/N; ctx.lineTo(...S(x1,f,dz));}
    ctx.closePath(); ctx.globalAlpha=q; ctx.fillStyle='#333'; ctx.fill(); ctx.strokeStyle=col; ctx.lineWidth=1.1; ctx.stroke();
    // brillo a lo largo de la corona
    ctx.beginPath(); ctx.moveTo(...S(xa,Math.PI*0.62,dz)); ctx.lineTo(...S(x1,Math.PI*0.62,dz));
    ctx.strokeStyle='#555'; ctx.lineWidth=2; ctx.stroke();
    // borde de traslapo y tornillo en la corona
    ctx.beginPath(); for(let j=0;j<=N;j++){const pt=S(xa,Math.PI*j/N,dz); j?ctx.lineTo(...pt):ctx.moveTo(...pt);}
    ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.stroke();
    const tp=S(xa+0.06,Math.PI/2,dz); ctx.beginPath(); ctx.arc(tp[0],tp[1],Math.max(1.5,M.s*0.008),0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill();
    ctx.globalAlpha=1;
  });
  // cara del extremo, sobre la culata
  const q=ease(cl(p7*1.35*piezas.length));
  ctx.beginPath(); for(let j=0;j<=N;j++){const pt=S(W+0.02,Math.PI*j/N,(1-q)*0.25); j?ctx.lineTo(...pt):ctx.moveTo(...pt);} ctx.closePath();
  ctx.globalAlpha=q; ctx.fillStyle='#262626'; ctx.fill(); ctx.strokeStyle=col; ctx.lineWidth=1.3; ctx.stroke(); ctx.globalAlpha=1;
}

function filaActual(t){
  const p=prog(5,t), n=tejas.length;
  const idx=Math.min(n-1,Math.floor(p*n/0.8));
  return tejas[Math.max(0,idx)].r;
}
function tejaVisibleHasta(t){ return prog(5,t)>0 ? filaActual(t)+1 : 0; }

function caminoTeja(x,yt,yb){
  ctx.beginPath(); ctx.moveTo(x,yt); ctx.lineTo(x+TW,yt); ctx.lineTo(x+TW,yb+R);
  ctx.arc(x+R,yb+R,R,0,Math.PI,true); ctx.lineTo(x,yt); ctx.closePath();
}
function dibujarTeja(x,yt,yb,a,activa){
  const esp=Math.max(2,M.s*0.018);
  plano(esp); caminoTeja(x,yt,yb); relleno('#000',a*.9);
  plano(); caminoTeja(x,yt,yb); relleno('#303030',a);
  plano(); ctx.beginPath(); ctx.arc(x+R,yb+R,R*0.72,Math.PI*1.15,Math.PI*1.85,false); trazo('#4a4a4a',1,a*.8);
  plano(); caminoTeja(x,yt,yb); trazo(activa?C.cobre:'#8a8a8a',1.1,a*(activa?1:.85));
  plano(); ctx.beginPath(); ctx.arc(x+0.045,yt-0.035,0.008,0,Math.PI*2); ctx.moveTo(x+TW-0.045+0.008,yt-0.035); ctx.arc(x+TW-0.045,yt-0.035,0.008,0,Math.PI*2); relleno('#000',a);
}

/* Lupa de detalle, arriba a la izquierda: solo el dibujo, sin rótulos */
function detalle(a,tipo){
  const r=Math.min(cw,ch)*0.17, cx=r+22, cy=r+30;
  pantalla(); ctx.save(); ctx.globalAlpha=a;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle='#000'; ctx.fill();
  ctx.strokeStyle=C.cobre; ctx.lineWidth=1.5; ctx.stroke(); ctx.clip();
  const u=r/100;
  if(tipo==='grapa'){
    ctx.fillStyle='#0d0d0d'; ctx.fillRect(cx-22*u,cy-r,44*u,2*r); ctx.strokeStyle=C.blanco; ctx.globalAlpha=a*.6; ctx.lineWidth=1;
    ctx.strokeRect(cx-22*u,cy-r-2,44*u,2*r+4); ctx.globalAlpha=a;
    ctx.strokeStyle=C.gris; ctx.lineWidth=2.4*u;
    ctx.beginPath(); for(const y of [-60,0,60]){ctx.moveTo(cx-r,cy+y*u);ctx.lineTo(cx+r,cy+y*u);} for(const x of [-60,60]){ctx.moveTo(cx+x*u,cy-r);ctx.lineTo(cx+x*u,cy+r);} ctx.stroke();
    ctx.strokeStyle=C.cobre; ctx.lineWidth=4*u; ctx.beginPath();
    ctx.moveTo(cx-12*u,cy+16*u);ctx.lineTo(cx-12*u,cy-10*u);ctx.lineTo(cx+12*u,cy-10*u);ctx.lineTo(cx+12*u,cy+16*u);ctx.stroke();
    ctx.fillStyle=C.claro; ctx.globalAlpha=a*.95;
    ctx.beginPath();ctx.arc(cx-12*u,cy+18*u,7*u,0,Math.PI*2);ctx.arc(cx+12*u,cy+18*u,7*u,0,Math.PI*2);ctx.fill();
  }else if(tipo==='cumbrera'){
    // corte de la cumbrera: el manto pasa en una sola pieza y el agua baja a las dos aguas
    const pk=[cx,cy-26*u], izq=[cx-78*u,cy+26*u], der=[cx+78*u,cy+26*u];
    ctx.strokeStyle=C.basalto; ctx.lineWidth=7*u; ctx.lineJoin='miter';
    ctx.beginPath(); ctx.moveTo(...izq); ctx.lineTo(...pk); ctx.lineTo(...der); ctx.stroke();
    const up=-9*u, f=0.42;
    const pi=[pk[0]+(izq[0]-pk[0])*f, pk[1]+(izq[1]-pk[1])*f+up], pd=[pk[0]+(der[0]-pk[0])*f, pk[1]+(der[1]-pk[1])*f+up];
    ctx.strokeStyle=C.claro; ctx.lineWidth=3*u; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(izq[0],izq[1]+up); ctx.lineTo(pk[0],pk[1]+up); ctx.lineTo(der[0],der[1]+up); ctx.stroke();
    ctx.strokeStyle=C.cobre; ctx.lineWidth=4*u;
    ctx.beginPath(); ctx.moveTo(...pi); ctx.lineTo(pk[0],pk[1]+up); ctx.lineTo(...pd); ctx.stroke();
    ctx.strokeStyle=C.blanco; ctx.lineWidth=1.4*u; ctx.globalAlpha=a*.7;
    for(const [x0,y0,x1,y1] of [[cx-24*u,cy-24*u,cx-58*u,cy-2*u],[cx+24*u,cy-24*u,cx+58*u,cy-2*u]]){
      ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
      const ang=Math.atan2(y1-y0,x1-x0); ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-8*u*Math.cos(ang-0.5),y1-8*u*Math.sin(ang-0.5));ctx.moveTo(x1,y1);ctx.lineTo(x1-8*u*Math.cos(ang+0.5),y1-8*u*Math.sin(ang+0.5));ctx.stroke();}
  }else{
    // la teja apoyada sobre la varilla de la malla, amarrada por sus dos orificios
    ctx.fillStyle=C.grafito; ctx.strokeStyle=C.basalto; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.rect(cx-70*u,cy-26*u,140*u,r*2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle=C.gris; ctx.lineWidth=2.6*u; ctx.beginPath(); ctx.moveTo(cx-r,cy-19*u); ctx.lineTo(cx+r,cy-19*u); ctx.stroke();
    ctx.fillStyle='#000';
    for(const hx of [-38,38]){ctx.beginPath();ctx.arc(cx+hx*u,cy-5*u,5*u,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle=C.cobre; ctx.lineCap='round'; ctx.lineJoin='round';
    for(const hx of [-38,38]){
      const X=cx+hx*u, yb=cy-19*u, yh=cy-4*u, ym=cy-12*u;
      ctx.lineWidth=2.6*u; ctx.beginPath();
      ctx.moveTo(X+4*u,ym); ctx.lineTo(X+4*u,yb+3*u);
      ctx.arc(X,yb-1*u,4*u,0,Math.PI,true);
      ctx.lineTo(X-4*u,yh-3*u);
      ctx.arc(X,yh-3*u,4*u,Math.PI,0,true);
      ctx.lineTo(X+4*u,ym); ctx.stroke();
      for(const f of [0,Math.PI]){ ctx.beginPath(); ctx.moveTo(X+4*u,ym);
        for(let i=1;i<=24;i++){const t2=i/24; ctx.lineTo(X+4*u+t2*20*u, ym+Math.sin(t2*Math.PI*4+f)*2.8*u-t2*3*u);} ctx.lineWidth=2*u; ctx.stroke(); }
    }
  }
  ctx.restore();
}

/* ---------- Casa completa en 3D (escenas finales, giro de 360°) ---------- */
const CASA=(()=>{
  const Lx=10, Wy=7, Hw=3.0, ov=0.55, rk=0.35, TANP=SEN/COS;
  const zr=Hw+(Wy/2)*TANP, ye=Wy/2+ov, ze=Hw-ov*TANP, Ls=ye/COS, X0=Lx/2+rk;
  const sp=(side,s,x)=>[x, side*(ye-s*COS), ze+s*SEN];
  // hileras de tejas: cada una es una franja con borde inferior en escamas
  const filas=[];
  for(let r=0;;r++){
    const sb=-ALERO+r*PASO_H; if(sb>Ls-0.05) break;
    const st=Math.min(sb+TL,Ls);
    const borde=[], juntas=[];
    for(let x0=-X0-(r%2)*TS/2; x0<X0; x0+=TS){
      for(let j=0;j<=6;j++){const f=Math.PI*j/6; const x=x0+R-R*Math.cos(f); borde.push([Math.max(-X0,Math.min(X0,x)), sb+R-R*Math.sin(f)]);}
      if(x0>-X0&&x0<X0) juntas.push(x0);
    }
    filas.push({sb,st,borde,juntas});
  }
  // fachada moderna: aberturas como [tipo, desplazamiento desde el centro del muro, z inicial, ancho, alto]
  const muros=[
    {n:[0,-1,0],p:[[-Lx/2,-Wy/2,0],[Lx/2,-Wy/2,0],[Lx/2,-Wy/2,Hw],[-Lx/2,-Wy/2,Hw]],
     v:[['vidrio',-4.6,0.18,4.0,2.62,4],['puerta',0.1,0.18,1.15,2.45],['listones',1.75,0.18,2.85,2.72]]},
    {n:[0,1,0],p:[[Lx/2,Wy/2,0],[-Lx/2,Wy/2,0],[-Lx/2,Wy/2,Hw],[Lx/2,Wy/2,Hw]],
     v:[['vidrio',-4.0,1.1,3.4,1.3,3],['vidrio',0.8,1.1,3.4,1.3,3]]},
    {n:[1,0,0],p:[[Lx/2,-Wy/2,0],[Lx/2,Wy/2,0],[Lx/2,Wy/2,Hw],[Lx/2,0,zr],[Lx/2,-Wy/2,Hw]],
     v:[['vidrio',-0.9,0.18,1.8,4.0,2],['listones',-3.2,0.18,1.6,2.72],['listones',1.6,0.18,1.6,2.72]]},
    {n:[-1,0,0],p:[[-Lx/2,Wy/2,0],[-Lx/2,-Wy/2,0],[-Lx/2,-Wy/2,Hw],[-Lx/2,0,zr],[-Lx/2,Wy/2,Hw]],
     v:[['vidrio',-2.4,0.9,0.7,2.4,1],['vidrio',1.7,0.9,0.7,2.4,1]]}
  ];
  return {Lx,Wy,Hw,zr,ye,ze,Ls,X0,sp,filas,muros};
})();
function dibujarCasa(c2,ang,elev,esc=0,tt=0){
  const VIENTO=esc===3?1:0;
  const {Wy,zr,Ls,X0,sp,filas,muros,Lx}=CASA;
  const Dc=24, zt=2.4;
  const TG=[0,-1.8,zt]; const cam=[TG[0]+Dc*Math.cos(elev)*Math.sin(ang), TG[1]-Dc*Math.cos(elev)*Math.cos(ang), zt+Dc*Math.sin(elev)];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const nrm=a=>{const l=Math.hypot(...a);return [a[0]/l,a[1]/l,a[2]/l];};
  const f=nrm(sub(TG,cam)), r=nrm(cross(f,[0,0,1])), u=cross(r,f);
  const F=Math.min(cw,ch)*0.5/0.31, cx=superpuesto?cw*0.56:cw/2, cy=ch*0.53;
  const pr=p=>{const d=sub(p,cam); const z=dot(d,f); return [cx+F*dot(d,r)/z, cy-F*dot(d,u)/z, z];};
  const vis=(n,p)=>dot(n,sub(cam,p))>0;
  const luz=nrm([-0.35,-0.55,0.75]);
  const tono=(n,base)=>{const k=0.6+0.4*Math.max(0,dot(n,luz)); const v=Math.round(base*k); return `rgb(${v},${v},${v})`;};
  const poly=(pts)=>{c2.beginPath(); pts.forEach((q,i)=>{const s=pr(q); i?c2.lineTo(s[0],s[1]):c2.moveTo(s[0],s[1]);}); c2.closePath();};
  c2.setTransform(dpr,0,0,dpr,0,0); c2.lineJoin='round';
  const tonoC=(n,[R0,G0,B0])=>{const k=0.62+0.38*Math.max(0,dot(n,luz)); return `rgb(${Math.round(R0*k)},${Math.round(G0*k)},${Math.round(B0*k)})`;};
  // cielo de cada escena: normal, lluvia, granizo, viento y atardecer
  const CIELOS=[['#16263a','#3b4b5c','#c99a6b'],['#1a222d','#323b46','#4f5862'],['#20262e','#444a52','#666a70'],['#18202c','#36404e','#6e6252'],['#2b2452','#b9587a','#ffb067']];
  const cc=CIELOS[esc]; const cielo=c2.createLinearGradient(0,0,0,ch); cielo.addColorStop(0,cc[0]); cielo.addColorStop(0.55,cc[1]); cielo.addColorStop(1,cc[2]);
  c2.fillStyle=cielo; c2.fillRect(0,0,cw,ch);
  // montañas del valle en el horizonte
  [[70,'#2f3b52',7,1.3],[52,'#2a3b3d',4.5,2.1]].forEach(([rad,col,hm,fase])=>{
    c2.fillStyle=col;
    for(let i=0;i<120;i++){
      const a0=i/120*Math.PI*2, a1=(i+1)/120*Math.PI*2;
      const h=a=>hm*(0.55+0.3*Math.sin(3*a+fase)+0.2*Math.sin(7*a+fase*2)+0.12*Math.sin(17*a));
      const pts=[[rad*Math.cos(a0),rad*Math.sin(a0),-2],[rad*Math.cos(a1),rad*Math.sin(a1),-2],[rad*Math.cos(a1),rad*Math.sin(a1),h(a1)],[rad*Math.cos(a0),rad*Math.sin(a0),h(a0)]];
      if(pts.some(q=>pr(q)[2]<2)) continue;
      poly(pts); c2.fill();
    }
  });
  // jardín: césped en un círculo amplio
  const disco=(rad,z)=>{const pts=[]; for(let i=0;i<64;i++){const a=i/64*Math.PI*2; pts.push([rad*Math.cos(a),rad*Math.sin(a)-0.5,z]);} return pts;};
  poly(disco(20,0)); c2.fillStyle='#2f4f2c'; c2.fill();
  poly(disco(16,0)); c2.fillStyle='#3a5f33'; c2.fill();
  // sombra de la casa
  poly([[-Lx/2-0.2,-Wy/2-0.3,0],[Lx/2+1.4,-Wy/2-0.3,0],[Lx/2+1.4,Wy/2+0.9,0],[-Lx/2-0.2,Wy/2+0.9,0]]); c2.fillStyle='rgba(10,20,10,.45)'; c2.fill();
  // sendero de piedras desde la puerta
  for(let y=-Wy/2-0.6, i=0; y>-11; y-=0.62, i++){
    const x=0.68+Math.sin(i*0.7)*0.25;
    poly([[x-0.38,y-0.22,0.01],[x+0.38,y-0.22,0.01],[x+0.38,y+0.22,0.01],[x-0.38,y+0.22,0.01]]); c2.fillStyle='#a9a39a'; c2.fill(); c2.strokeStyle='rgba(0,0,0,.25)'; c2.lineWidth=0.8; c2.stroke();
  }
  // piscina con borde en piedra
  const PX0=-5.2, PX1=-1.2, PY0=-8.4, PY1=-6.0, PH=1.2;
  poly([[PX0-0.4,PY0-0.4,0.03],[PX1+0.4,PY0-0.4,0.03],[PX1+0.4,PY1+0.4,0.03],[PX0-0.4,PY1+0.4,0.03]]); c2.fillStyle='#ddd6c8'; c2.fill();
  c2.save(); poly([[PX0,PY0,0.03],[PX1,PY0,0.03],[PX1,PY1,0.03],[PX0,PY1,0.03]]); c2.clip(); // solo se ve el interior por la abertura
  poly([[PX0,PY0,-PH],[PX1,PY0,-PH],[PX1,PY1,-PH],[PX0,PY1,-PH]]); c2.fillStyle='#0d5566'; c2.fill();
  [[[0,1,0],[[PX0,PY0,0.03],[PX1,PY0,0.03],[PX1,PY0,-PH],[PX0,PY0,-PH]]],
   [[0,-1,0],[[PX1,PY1,0.03],[PX0,PY1,0.03],[PX0,PY1,-PH],[PX1,PY1,-PH]]],
   [[1,0,0],[[PX0,PY1,0.03],[PX0,PY0,0.03],[PX0,PY0,-PH],[PX0,PY1,-PH]]],
   [[-1,0,0],[[PX1,PY0,0.03],[PX1,PY1,0.03],[PX1,PY1,-PH],[PX1,PY0,-PH]]]].forEach(([n,pts])=>{
    if(!vis(n,pts[0])) return; poly(pts); c2.fillStyle=tonoC(n,[40,150,175]); c2.fill();
    // luz bajo el agua
    const m=[(pts[0][0]+pts[1][0])/2,(pts[0][1]+pts[1][1])/2,-0.6]; const L0=pr(m), rg=F*1.2/L0[2];
    const g=c2.createRadialGradient(L0[0],L0[1],0,L0[0],L0[1],rg); g.addColorStop(0,'rgba(170,255,255,.55)'); g.addColorStop(1,'rgba(170,255,255,0)');
    c2.fillStyle=g; poly(pts); c2.fill();
  });
  poly([[PX0,PY0,-0.06],[PX1,PY0,-0.06],[PX1,PY1,-0.06],[PX0,PY1,-0.06]]); c2.fillStyle='rgba(70,205,225,.5)'; c2.fill();
  c2.beginPath();
  for(let k2=0;k2<7;k2++){ const yy=PY0+0.3+k2*0.42; for(let x=PX0+0.2;x<PX1-0.2;x+=0.08){const q=pr([x,yy+Math.sin(x*3+k2+tt*(esc===3?9:2))*(esc===3?0.14:0.07),-0.06]); x<=PX0+0.2?c2.moveTo(q[0],q[1]):c2.lineTo(q[0],q[1]);} }
  c2.strokeStyle='rgba(255,255,255,.28)'; c2.lineWidth=1; c2.stroke();
  c2.restore();
  // flores en los bordes
  const flores=['#e8a0b4','#f2d16b','#ffffff','#d77a5b'];
  for(let i=0;i<46;i++){
    const x=-5+((i*37)%100)/100*10.2, y=-Wy/2-0.85-((i*53)%10)/10*0.35;
    if(x>-0.2&&x<1.5) continue;
    const q=pr([x,y,0.06]); c2.beginPath(); c2.arc(q[0],q[1],Math.max(1.2,F*0.05/q[2]),0,Math.PI*2); c2.fillStyle=flores[i%4]; c2.fill();
  }
  // vegetación y objetos del jardín
  const objs=[
    {t:'arbol',x:-17.5,y:1,h:5.6,r:1.6},{t:'arbol',x:17.5,y:3.5,h:6,r:1.8},{t:'arbol',x:-12.5,y:12.5,h:5,r:1.5},
    {t:'arbol',x:13,y:-13,h:4.2,r:1.2},{t:'arbol',x:3,y:17.5,h:5.6,r:1.7},{t:'arbol',x:-13.5,y:-11.5,h:4.4,r:1.3},
    // arbustos solo en el jardín, lejos de los muros, para que nunca se crucen con la casa
    {t:'arbusto',x:3.6,y:-7.2,r:0.5},{t:'arbusto',x:4.5,y:-7.8,r:0.42},{t:'arbusto',x:-6.3,y:-7.0,r:0.48},
    {t:'matera',x:-0.25,y:-Wy/2-0.9},{t:'matera',x:1.6,y:-Wy/2-0.9},
    {t:'farol',x:-0.1,y:-6.2},{t:'farol',x:1.5,y:-8.4},
    {t:'tumbona',x:-4.8,y:-9.9},{t:'tumbona',x:-3.7,y:-9.9},{t:'sombrilla',x:-2.4,y:-9.7}
  ];
  // un objeto queda detrás de la casa solo si la línea entre la cámara y el objeto cruza la planta de la casa
  const tapado=o=>{
    const x0=-Lx/2-0.15, x1=Lx/2+0.15, y0=-Wy/2-0.15, y1=Wy/2+0.15;
    const dx=o.x-cam[0], dy=o.y-cam[1]; let t0=0, t1=1;
    for(const [d,p0,a,b] of [[dx,cam[0],x0,x1],[dy,cam[1],y0,y1]]){
      if(Math.abs(d)<1e-9){ if(p0<a||p0>b) return false; continue; }
      let ta=(a-p0)/d, tb=(b-p0)/d; if(ta>tb){const k=ta;ta=tb;tb=k;}
      t0=Math.max(t0,ta); t1=Math.min(t1,tb); if(t0>t1) return false;
    }
    return t0<1-1e-6;
  };
  objs.forEach(o=>{o.d=pr([o.x,o.y,0.8])[2]; o.del=!tapado(o);});
  efectosSuelo();
  const dibObj=o=>{
    const base=pr([o.x,o.y,0]);
    if(o.t==='arbol'){
      c2.beginPath(); const sr=F*o.r/base[2]; c2.ellipse(base[0]+sr*0.5,base[1]+sr*0.05,sr*1.1,sr*0.45,0,0,Math.PI*2); c2.fillStyle='rgba(10,25,10,.35)'; c2.fill();
      const sw=VIENTO*(0.35+0.25*Math.sin(tt*7+o.x))*o.r;
      const top=pr([o.x+sw*0.4,o.y,o.h*0.6]); c2.beginPath(); c2.moveTo(base[0],base[1]); c2.lineTo(top[0],top[1]);
      c2.strokeStyle='#4a3424'; c2.lineWidth=Math.max(2,F*0.16/base[2]); c2.lineCap='round'; c2.stroke(); c2.lineCap='butt';
      [[0,0,0.72,1,'#24452a'],[0.5,0.2,0.66,0.8,'#2e5a33'],[-0.45,-0.1,0.8,0.78,'#336338'],[0.1,-0.2,0.9,0.7,'#3f7442'],[-0.15,-0.25,0.95,0.42,'#5b9256']].forEach(([dx,dy,hz,rr,col])=>{
        const cpt=pr([o.x+dx*o.r+sw*hz*(1+0.15*Math.sin(tt*11+dx*5)),o.y+dy*o.r,o.h*hz]); c2.beginPath(); c2.arc(cpt[0],cpt[1],F*o.r*rr/cpt[2],0,Math.PI*2); c2.fillStyle=col; c2.fill();
      });
    }else if(o.t==='arbusto'){
      const cpt=pr([o.x+VIENTO*0.12*Math.sin(tt*9+o.x*3),o.y,o.r*0.8]), rr=F*o.r/cpt[2];
      c2.beginPath(); c2.ellipse(base[0]+rr*0.4,base[1],rr*1.1,rr*0.4,0,0,Math.PI*2); c2.fillStyle='rgba(10,25,10,.35)'; c2.fill();
      c2.beginPath(); c2.arc(cpt[0],cpt[1],rr,0,Math.PI*2); c2.fillStyle='#2f5e32'; c2.fill();
      c2.beginPath(); c2.arc(cpt[0]-rr*0.3,cpt[1]-rr*0.3,rr*0.5,0,Math.PI*2); c2.fillStyle='#4f8a4a'; c2.fill();
    }else if(o.t==='matera'){
      const w=0.22; poly([[o.x-w,o.y-w,0],[o.x+w,o.y-w,0],[o.x+w,o.y-w,0.55],[o.x-w,o.y-w,0.55]]); c2.fillStyle='#8b5e3c'; c2.fill();
      const cpt=pr([o.x,o.y,0.9]), rr=F*0.33/cpt[2]; c2.beginPath(); c2.arc(cpt[0],cpt[1],rr,0,Math.PI*2); c2.fillStyle='#3d7a3f'; c2.fill();
      c2.beginPath(); c2.arc(cpt[0]-rr*0.3,cpt[1]-rr*0.3,rr*0.45,0,Math.PI*2); c2.fillStyle='#6aa45f'; c2.fill();
    }else if(o.t==='tumbona'){
      const x0=o.x, x1=o.x+0.65, y0=o.y-0.9, y1=o.y+0.9;
      poly([[x0,y0,0],[x1,y0,0],[x1,y0,0.32],[x0,y0,0.32]]); c2.fillStyle='#8a8378'; c2.fill();
      poly([[x0,y0,0.32],[x1,y0,0.32],[x1,y1-0.6,0.32],[x0,y1-0.6,0.32]]); c2.fillStyle='#f3efe6'; c2.fill(); c2.strokeStyle='rgba(0,0,0,.25)'; c2.lineWidth=0.8; c2.stroke();
      poly([[x0,y1-0.6,0.32],[x1,y1-0.6,0.32],[x1,y1,0.85],[x0,y1,0.85]]); c2.fillStyle='#e6e0d4'; c2.fill(); c2.stroke();
    }else if(o.t==='sombrilla'){
      const top=pr([o.x,o.y,2.3]); c2.beginPath(); c2.moveTo(base[0],base[1]); c2.lineTo(top[0],top[1]); c2.strokeStyle='#d9d4cc'; c2.lineWidth=Math.max(1.2,F*0.05/base[2]); c2.stroke();
      const pts=[]; for(let i=0;i<8;i++){const a=i/8*Math.PI*2; pts.push([o.x+1.2*Math.cos(a),o.y+1.2*Math.sin(a),2.0]);}
      pts.forEach((pt,i)=>{const nx=pts[(i+1)%8]; poly([[o.x,o.y,2.45],pt,nx]); c2.fillStyle=i%2?'#C18A68':'#b07a59'; c2.fill();});
    }else if(o.t==='farol'){
      const top=pr([o.x,o.y,0.7]); c2.beginPath(); c2.moveTo(base[0],base[1]); c2.lineTo(top[0],top[1]); c2.strokeStyle='#222'; c2.lineWidth=Math.max(1.5,F*0.06/base[2]); c2.stroke();
      const rs=F*0.8/base[2]; const gs=c2.createRadialGradient(base[0],base[1],0,base[0],base[1],rs); gs.addColorStop(0,'rgba(255,214,150,.35)'); gs.addColorStop(1,'rgba(255,214,150,0)');
      c2.fillStyle=gs; c2.beginPath(); c2.ellipse(base[0],base[1],rs,rs*0.45,0,0,Math.PI*2); c2.fill();
      const rh=F*0.22/top[2]; const g=c2.createRadialGradient(top[0],top[1],0,top[0],top[1],rh); g.addColorStop(0,'rgba(255,214,150,.7)'); g.addColorStop(1,'rgba(255,214,150,0)');
      c2.fillStyle=g; c2.beginPath(); c2.arc(top[0],top[1],rh,0,Math.PI*2); c2.fill();
      c2.beginPath(); c2.arc(top[0],top[1],Math.max(1.5,F*0.06/top[2]),0,Math.PI*2); c2.fillStyle='#ffe2b0'; c2.fill();
    }
  };
  objs.filter(o=>!o.del).sort((a,b)=>b.d-a.d).forEach(dibObj);
  // terraza de madera frente a la fachada
  const dk0=-Lx/2, dk1=0.0, dy0=-Wy/2-2.0, dy1=-Wy/2;
  poly([[dk0,dy0,0.18],[dk1,dy0,0.18],[dk1,dy1,0.18],[dk0,dy1,0.18]]); c2.fillStyle='#9a6a43'; c2.fill();
  c2.beginPath(); for(let y=dy0+0.16;y<dy1;y+=0.16){const a=pr([dk0,y,0.18]),b=pr([dk1,y,0.18]); c2.moveTo(a[0],a[1]); c2.lineTo(b[0],b[1]);}
  c2.strokeStyle='rgba(60,30,10,.5)'; c2.lineWidth=0.8; c2.stroke();
  poly([[dk0,dy0,0.18],[dk1,dy0,0.18],[dk1,dy1,0.18],[dk0,dy1,0.18]]); c2.strokeStyle='rgba(255,255,255,.3)'; c2.lineWidth=1; c2.stroke();
  // muros con puertas y ventanas
  muros.forEach(m=>{
    if(!vis(m.n,m.p[0])) return;
    poly(m.p); c2.fillStyle=tonoC(m.n,[238,233,224]); c2.fill(); c2.strokeStyle='rgba(0,0,0,.3)'; c2.lineWidth=1; c2.stroke();
    const a=m.p[0], b=m.p[1], dir=nrm(sub(b,a)), mid=[(a[0]+b[0])/2,(a[1]+b[1])/2,0];
    const q=(s,z)=>[mid[0]+dir[0]*s+m.n[0]*0.01, mid[1]+dir[1]*s+m.n[1]*0.01, z];
    const linea=(a,b,col,w)=>{const A=pr(a),B=pr(b); c2.beginPath(); c2.moveTo(A[0],A[1]); c2.lineTo(B[0],B[1]); c2.strokeStyle=col; c2.lineWidth=w; c2.stroke();};
    // zócalo
    const lm=Math.hypot(b[0]-a[0],b[1]-a[1])/2; poly([q(-lm,0),q(lm,0),q(lm,0.18),q(-lm,0.18)]); c2.fillStyle=tonoC(m.n,[70,68,66]); c2.fill();
    m.v.forEach(([tipo,o,z0,w,h,n])=>{
      if(tipo==='vidrio'){
        poly([q(o,z0),q(o+w,z0),q(o+w,z0+h),q(o,z0+h)]); {const A=pr(q(o,z0)),B=pr(q(o,z0+h)); const g=c2.createLinearGradient(A[0],A[1],B[0],B[1]); g.addColorStop(0,'#5a4128'); g.addColorStop(0.5,'#2b2620'); g.addColorStop(1,'#1d2a36'); c2.fillStyle=g;} c2.fill();
        poly([q(o+w*0.15,z0),q(o+w*0.42,z0),q(o+w*0.75,z0+h),q(o+w*0.48,z0+h)]); c2.fillStyle='rgba(200,225,255,.10)'; c2.fill();
        for(let i=1;i<n;i++) linea(q(o+w*i/n,z0),q(o+w*i/n,z0+h),'rgba(40,40,40,.95)',1.6);
        if(h>3) linea(q(o,z0+2.62),q(o+w,z0+2.62),'rgba(40,40,40,.95)',1.6);
        poly([q(o,z0),q(o+w,z0),q(o+w,z0+h),q(o,z0+h)]); c2.strokeStyle='#2a2a2a'; c2.lineWidth=2; c2.stroke();
      }else if(tipo==='listones'){
        poly([q(o,z0),q(o+w,z0),q(o+w,z0+h),q(o,z0+h)]); {const k=0.6+0.4*Math.max(0,dot(m.n,luz)); c2.fillStyle=`rgb(${Math.round(168*k)},${Math.round(112*k)},${Math.round(66*k)})`;} c2.fill();
        for(let x=o+0.12;x<o+w;x+=0.12) linea(q(x,z0),q(x,z0+h),'rgba(60,30,10,.55)',1);
        poly([q(o,z0),q(o+w,z0),q(o+w,z0+h),q(o,z0+h)]); c2.strokeStyle='rgba(255,255,255,.3)'; c2.lineWidth=1; c2.stroke();
      }else{
        poly([q(o,z0),q(o+w,z0),q(o+w,z0+h),q(o,z0+h)]); c2.fillStyle='#2b2b2b'; c2.fill(); c2.strokeStyle='#151515'; c2.lineWidth=1.6; c2.stroke();
        // apliques de luz a los lados de la puerta
        [o-0.3,o+w+0.3].forEach(xx=>{const L0=pr(q(xx,2.25)); const rg=F*0.9/L0[2]; const g=c2.createRadialGradient(L0[0],L0[1],0,L0[0],L0[1],rg); g.addColorStop(0,'rgba(255,205,140,.8)'); g.addColorStop(1,'rgba(255,205,140,0)'); c2.fillStyle=g; c2.beginPath(); c2.arc(L0[0],L0[1],rg,0,Math.PI*2); c2.fill(); c2.beginPath(); c2.arc(L0[0],L0[1],Math.max(1.5,F*0.05/L0[2]),0,Math.PI*2); c2.fillStyle='#fff0d0'; c2.fill();});
        linea(q(o+w-0.18,z0+0.9),q(o+w-0.18,z0+1.5),'rgba(220,220,220,.9)',2);
      }
    });
  });
  // aguas: tabla de borde, superficie y tejas
  const aguas=[-1,1].map(side=>({side,n:[0,side*SEN,COS]})).filter(g=>vis(g.n,sp(g.side,Ls/2,0)));
  aguas.sort((A,B)=>pr(sp(B.side,Ls/2,0))[2]-pr(sp(A.side,Ls/2,0))[2]);
  // tablas de borde en aleros y culatas
  [-1,1].forEach(side=>{
    const n=[0,side,0];
    const e0=sp(side,0,-X0), e1=sp(side,0,X0);
    if(vis(n,e0)){ poly([e0,e1,[e1[0],e1[1],e1[2]-0.16],[e0[0],e0[1],e0[2]-0.16]]); c2.fillStyle=tono(n,24); c2.fill(); c2.strokeStyle='rgba(70,70,74,.7)'; c2.stroke(); }
    [-1,1].forEach(sx=>{ const nn=[sx,0,0]; const a=sp(side,0,sx*X0), b=sp(side,Ls,sx*X0);
      if(vis(nn,a)){ poly([a,b,[b[0],b[1],b[2]-0.16],[a[0],a[1],a[2]-0.16]]); c2.fillStyle=tono(nn,24); c2.fill(); c2.strokeStyle='rgba(70,70,74,.7)'; c2.stroke(); }});
  });
  // canaletas en los dos aleros y bajantes en las esquinas
  const BAJ=[];
  [-1,1].forEach(side=>{
    if(!vis([0,side,0],[0,side*Wy/2,1])) return;
    const yg=side*(CASA.ye+0.08), z0=CASA.ze-0.14, z1=CASA.ze-0.34;
    const gpt=(x,z,dy=0)=>[x,yg+side*dy,z];
    poly([gpt(-X0,z0,0.12),gpt(X0,z0,0.12),gpt(X0,z1,0.06),gpt(-X0,z1,0.06)]); c2.fillStyle='#1d1d1f'; c2.fill();
    c2.strokeStyle='rgba(0,0,0,.8)'; c2.lineWidth=1; c2.stroke();
    {const a=pr(gpt(-X0,z0,0.12)), b=pr(gpt(X0,z0,0.12)); c2.beginPath(); c2.moveTo(a[0],a[1]); c2.lineTo(b[0],b[1]); c2.strokeStyle='#3c3c40'; c2.lineWidth=Math.max(1.5,F*0.025/a[2]); c2.stroke();}
    [-1,1].forEach(sx=>{
      const x=sx*(Lx/2-0.25);
      const pts=[gpt(x,z1+0.02,0.08),[x,side*(Wy/2+0.1),CASA.ze-0.75],[x,side*(Wy/2+0.1),0.35],[x,side*(Wy/2+0.42),0.12]];
      c2.beginPath(); pts.forEach((q,i)=>{const s2=pr(q); i?c2.lineTo(s2[0],s2[1]):c2.moveTo(s2[0],s2[1]);});
      const w=Math.max(2.5,F*0.11/pr(pts[2])[2]);
      c2.strokeStyle='#0c0c0d'; c2.lineWidth=w+2; c2.lineJoin='round'; c2.stroke();
      c2.strokeStyle='#2a2a2d'; c2.lineWidth=w; c2.stroke();
      BAJ.push({sal:pts[3],x,side});
    });
  });

  aguas.forEach(({side,n})=>{
    poly([sp(side,0,-X0),sp(side,0,X0),sp(side,Ls,X0),sp(side,Ls,-X0)]); c2.fillStyle='#111'; c2.fill();
    const kL=0.55+0.45*Math.max(0,dot(n,luz)), gr=v=>Math.round(v*kL);
    const spz=(sd,ss,x,dz)=>{const q=sp(sd,ss,x); q[2]+=dz; return q;};
    // franja de una hilera (borde en escamas), desplazada a lo largo del agua y en altura
    const franja=(fl,ds,dz)=>{
      c2.beginPath();
      const ini=pr(spz(side,fl.st+ds,-X0,dz)); c2.moveTo(ini[0],ini[1]);
      let s=pr(spz(side,fl.st+ds,X0,dz)); c2.lineTo(s[0],s[1]);
      for(let i=fl.borde.length-1;i>=0;i--){const [x,ss]=fl.borde[i]; s=pr(spz(side,Math.max(ss+ds,-ALERO),x,dz)); c2.lineTo(s[0],s[1]);}
      c2.closePath();
    };
    const borde=(fl,ds,dz)=>{c2.beginPath(); fl.borde.forEach(([x,ss],i)=>{const q=pr(spz(side,ss+ds,x,dz)); i?c2.lineTo(q[0],q[1]):c2.moveTo(q[0],q[1]);});};
    filas.forEach(fl=>{
      franja(fl,-0.045,0); c2.fillStyle='rgba(0,0,0,.55)'; c2.fill();
      franja(fl,0,-0.022); c2.fillStyle=`rgb(${gr(14)},${gr(14)},${gr(15)})`; c2.fill();
      franja(fl,0,0); c2.fillStyle=`rgb(${gr(34)},${gr(34)},${gr(36)})`; c2.fill();
      for(const [d,v] of [[0.075,46],[0.04,56]]){
        c2.beginPath();
        fl.borde.forEach(([x,ss],i)=>{const q=pr(sp(side,Math.max(ss,-ALERO),x)); i?c2.lineTo(q[0],q[1]):c2.moveTo(q[0],q[1]);});
        for(let i=fl.borde.length-1;i>=0;i--){const [x,ss]=fl.borde[i]; const q=pr(sp(side,Math.min(Math.max(ss,-ALERO)+d,fl.st),x)); c2.lineTo(q[0],q[1]);}
        c2.closePath(); c2.fillStyle=`rgb(${gr(v)},${gr(v)},${gr(v+3)})`; c2.fill();
      }
      borde(fl,0.012,0); c2.strokeStyle='rgba(175,175,182,.45)'; c2.lineWidth=0.9; c2.stroke();
      borde(fl,0,0);
      fl.juntas.forEach(x=>{const a=pr(sp(side,fl.sb+R,x)), b=pr(sp(side,Math.min(fl.sb+PASO_H+R*0.4,Ls),x)); c2.moveTo(a[0],a[1]); c2.lineTo(b[0],b[1]);});
      c2.strokeStyle='rgba(8,8,9,.9)'; c2.lineWidth=1; c2.stroke();
    });
    poly([sp(side,-ALERO,-X0),sp(side,-ALERO,X0),sp(side,Ls,X0),sp(side,Ls,-X0)]); c2.strokeStyle='rgba(255,255,255,.35)'; c2.lineWidth=1; c2.stroke();
  });
  // caballete redondo
  const rc=0.13, zc=zr+0.07, N=14, piezas=[];
  for(let x=X0-0.30; x>-X0-0.2; x-=0.26) piezas.push(Math.max(x,-X0));
  const arco=(x)=>{const a=[]; for(let j=0;j<=N;j++){const fi=Math.PI*j/N; a.push([x,rc*Math.cos(fi),zc+rc*Math.sin(fi)]);} return a;};
  piezas.map(x0=>({x0,x1:Math.min(x0+0.30,X0),d:pr([x0+0.15,0,zc])[2]})).sort((A,B)=>B.d-A.d).forEach(({x0,x1})=>{
    const a0=arco(x0), a1=arco(x1).reverse();
    poly([...a0,...a1]); c2.fillStyle='#3a3a3a'; c2.fill(); c2.strokeStyle='rgba(170,170,170,.8)'; c2.lineWidth=0.9; c2.stroke();
    c2.beginPath(); a0.forEach((q,i)=>{const s=pr(q); i?c2.lineTo(s[0],s[1]):c2.moveTo(s[0],s[1]);}); c2.stroke();
  });
  [-X0,X0].forEach(x=>{ if(vis([Math.sign(x),0,0],[x,0,zc])){ poly(arco(x)); c2.fillStyle='#2c2c2c'; c2.fill(); c2.stroke(); }});
  objs.filter(o=>o.del).sort((a,b)=>b.d-a.d).forEach(dibObj);
  efectos();

  function rnd(i,k3){const v=Math.sin(i*127.1+k3*311.7)*43758.5453; return v-Math.floor(v);}
  function persona(){
    // una persona sentada sobre el caballete, rodillas arriba y abrazándolas, mirando hacia el sol
    const x=1.6, z0=zr+0.2, T=SEN/COS, sc=1.45;
    const L=(dx,dy,dz)=>pr([x+dx*sc, dy*sc, z0+dz*sc]);
    const pie=(d)=>{const y=-0.62; return L(d,y,(-0.62*sc*T)/sc+0.04);};
    const P2={cad:L(0,0.02,0.02), hom:L(0,-0.06,0.56), cab:L(0,-0.08,0.74),
      rodA:L(-0.1,-0.4,0.3), rodB:L(0.1,-0.4,0.3), pieA:pie(-0.1), pieB:pie(0.1),
      homA:L(-0.17,-0.06,0.52), homB:L(0.17,-0.06,0.52)};
    const w=F*0.075*sc/P2.cad[2];
    c2.save();
    if(!vis([0,-SEN,COS],sp(-1,Ls/2,0))){ // de espaldas: la cumbrera tapa las piernas
      const A=pr([-X0*3,0,zr+0.2]), B=pr([X0*3,0,zr+0.2]);
      c2.beginPath(); c2.moveTo(A[0],A[1]); c2.lineTo(B[0],B[1]); c2.lineTo(B[0],-9999); c2.lineTo(A[0],-9999); c2.closePath(); c2.clip();
    }
    c2.lineCap='round'; c2.lineJoin='round';
    const tr=(pts,col,ww)=>{ // contorno oscuro y luego el color, para que se lea sobre el techo y el cielo
      for(const [c,k] of [['#0b0b0d',ww+w*0.55],[col,ww]]){ c2.beginPath(); pts.forEach((q,i)=>i?c2.lineTo(q[0],q[1]):c2.moveTo(q[0],q[1])); c2.strokeStyle=c; c2.lineWidth=k; c2.stroke(); }
    };
    const jean='#3a4d6e', camisa='#f2ede4', piel='#b07a55';
    {const sh=pr([x,-0.5*sc,z0-0.32*sc]); c2.beginPath(); c2.ellipse(sh[0],sh[1],w*3.2,w*1.1,0,0,Math.PI*2); c2.fillStyle='rgba(0,0,0,.35)'; c2.fill();}
    tr([P2.cad,P2.rodB,P2.pieB],jean,w*1.15);
    tr([P2.homB,P2.rodB],camisa,w*0.6);
    tr([P2.cad,P2.hom],camisa,w*1.9);
    tr([P2.cad,P2.rodA,P2.pieA],jean,w*1.15);
    tr([P2.homA,P2.rodA],camisa,w*0.6);
    const rh=w*1.25;
    c2.beginPath(); c2.arc(P2.cab[0],P2.cab[1],rh+w*0.28,0,Math.PI*2); c2.fillStyle='#0b0b0d'; c2.fill();
    c2.beginPath(); c2.arc(P2.cab[0],P2.cab[1],rh,0,Math.PI*2); c2.fillStyle=piel; c2.fill();
    c2.beginPath(); c2.arc(P2.cab[0],P2.cab[1],rh,Math.PI*0.95,Math.PI*2.05); c2.fillStyle='#2a1c14'; c2.fill();
    c2.restore();
  }
  function efectosSuelo(){
    if(esc===4){
      // atardecer: sol y luz cálida detrás de la casa, para que el techo siga oscuro
      const sd=nrm([-0.15,-1,0.05]), sp2=pr([sd[0]*120,sd[1]*120,sd[2]*120+2]);
      if(sp2[2]>1){
        const g=c2.createRadialGradient(sp2[0],sp2[1],0,sp2[0],sp2[1],Math.min(cw,ch)*0.6); g.addColorStop(0,'rgba(255,200,120,.55)'); g.addColorStop(1,'rgba(255,160,90,0)');
        c2.save(); c2.globalCompositeOperation='lighter'; c2.fillStyle=g; c2.fillRect(0,0,cw,ch); c2.restore();
        c2.beginPath(); c2.arc(sp2[0],sp2[1],Math.min(cw,ch)*0.05,0,Math.PI*2); c2.fillStyle='#ffe2a8'; c2.fill();
      }
      c2.fillStyle='rgba(255,140,70,.10)'; c2.fillRect(0,0,cw,ch);
    }
    if(esc===1){
      for(let i=0;i<10;i++){const f2=(tt*0.9+rnd(i,4))%1; const q=pr([-5.0+rnd(i,5)*3.6,-8.2+rnd(i,6)*2.0,-0.06]);
        c2.beginPath(); c2.ellipse(q[0],q[1],F*0.35*f2/q[2],F*0.14*f2/q[2],0,0,Math.PI*2); c2.strokeStyle=`rgba(255,255,255,${0.5*(1-f2)})`; c2.stroke();}
    }
    if(esc===2){
      const n=Math.floor(380*cl((tt-PASOS[9].s)/5));
      for(let i=0;i<n;i++){const a=rnd(i,17)*Math.PI*2, rr=5.5+rnd(i,18)*6; const q=pr([rr*Math.cos(a),rr*Math.sin(a)-0.5,0.02]);
        if(q[2]<1) continue; c2.beginPath(); c2.arc(q[0],q[1],Math.max(0.8,F*0.035/q[2]),0,Math.PI*2); c2.fillStyle='rgba(235,240,245,.85)'; c2.fill();}
    }
  }
  function efectos(){
    if(esc===1||esc===2){ c2.fillStyle=esc===1?'rgba(15,25,40,.32)':'rgba(40,45,55,.3)'; c2.fillRect(0,0,cw,ch); }
    if(esc===1){
      // lluvia: gotas, agua que cae de los bajantes y ondas en la piscina
      c2.strokeStyle='rgba(200,220,255,.4)'; c2.lineWidth=1; c2.beginPath();
      for(let i=0;i<420;i++){const x=rnd(i,1)*cw*1.2, y=((rnd(i,2)*(ch+60)+tt*950*(0.8+rnd(i,3)*0.4))%(ch+60))-30; c2.moveTo(x,y); c2.lineTo(x-5,y+16);}
      c2.stroke();
      BAJ.forEach(b=>{
        const o=pr(b.sal), tip=pr([b.sal[0],b.sal[1]+b.side*0.35,0.0]);
        c2.beginPath(); c2.moveTo(o[0],o[1]); c2.quadraticCurveTo((o[0]+tip[0])/2,o[1],tip[0],tip[1]);
        c2.strokeStyle='rgba(185,215,255,.85)'; c2.lineWidth=Math.max(2,F*0.06/o[2]); c2.stroke();
        for(let j=0;j<6;j++){const f2=(tt*2.4+j/6)%1; const xx=o[0]+(tip[0]-o[0])*f2, yy=o[1]+(tip[1]-o[1])*f2*f2;
          c2.beginPath(); c2.arc(xx,yy,Math.max(1.2,F*0.025/o[2]),0,Math.PI*2); c2.fillStyle='rgba(225,240,255,.9)'; c2.fill();}
        for(let j=0;j<3;j++){const f2=(tt*1.8+j/3)%1; const r2=F*(0.12+0.4*f2)/tip[2];
          c2.beginPath(); c2.ellipse(tip[0],tip[1],r2,r2*0.4,0,0,Math.PI*2); c2.strokeStyle=`rgba(210,230,255,${0.7*(1-f2)})`; c2.lineWidth=1.2; c2.stroke();}
      });
    }else if(esc===2){
      // granizo: bolitas que caen, rebotan en el techo y se acumulan en el pasto
      c2.fillStyle='rgba(240,245,250,.9)';
      for(let i=0;i<260;i++){const x=rnd(i,7)*cw*1.1, y=((rnd(i,8)*(ch+40)+tt*1300*(0.8+rnd(i,9)*0.4))%(ch+40))-20, rr=1.2+rnd(i,10)*2;
        c2.beginPath(); c2.arc(x,y,rr,0,Math.PI*2); c2.fill();}
      for(let i=0;i<90;i++){const side=rnd(i,11)<0.5?-1:1; if(!vis([0,side*SEN,COS],sp(side,Ls/2,0))) continue;
        const q=pr(sp(side,rnd(i,12)*Ls,-X0+rnd(i,13)*2*X0)); const f2=(tt*1.6+rnd(i,14))%1;
        c2.beginPath(); c2.arc(q[0]+f2*10*(rnd(i,15)-0.5),q[1]-Math.sin(f2*Math.PI)*18,1.6+rnd(i,16)*1.2,0,Math.PI*2); c2.fillStyle=`rgba(245,248,255,${1-f2})`; c2.fill();}
    }else if(esc===3){
      // vendaval: ráfagas y hojas
      c2.strokeStyle='rgba(230,235,240,.22)'; c2.lineWidth=1.2; c2.beginPath();
      for(let i=0;i<70;i++){const L2=50+rnd(i,19)*120, x=((rnd(i,20)*cw*1.5+tt*1500*(0.7+rnd(i,21)*0.6))%(cw*1.5))-cw*0.25, y=rnd(i,22)*ch;
        c2.moveTo(x,y); c2.quadraticCurveTo(x-L2*0.5,y-6,x-L2,y);}
      c2.stroke();
      for(let i=0;i<60;i++){const x=((rnd(i,23)*cw*1.3+tt*900*(0.6+rnd(i,24)))%(cw*1.3))-cw*0.15, y=rnd(i,25)*ch+Math.sin(tt*6+i)*16;
        c2.save(); c2.translate(x,y); c2.rotate(tt*8+i); c2.beginPath(); c2.ellipse(0,0,4,2,0,0,Math.PI*2); c2.fillStyle=i%3?'#4f7d3e':'#9a6b3a'; c2.fill(); c2.restore();}
    }else if(esc===4){
      persona();
    }
  }
}

/* ---------- Texto y barra de pasos ---------- */
const textos=[...raiz.querySelectorAll('.inst-cap')];
const barra=document.getElementById('instBarra');
const btn=document.getElementById('instPlay');
const segs=PASOS.map((p,i)=>{
  const b=document.createElement('button');
  b.type='button'; b.className='inst-seg'+(i===7?' inst-seg--grupo':'');
  b.style.flexGrow=p.d;
  const h=textos[i]&&textos[i].querySelector('h3'); if(h) b.setAttribute('aria-labelledby',h.id);
  b.innerHTML='<span class="inst-seg-pista"><span class="inst-seg-lleno"></span></span>';
  // con la animación quieta se muestra el paso ya terminado; corriendo, desde su inicio
  b.addEventListener('click',()=>{ t=corriendo?p.s+0.001:p.s+p.d*0.92; pintar(); });
  barra.appendChild(b);
  return b.querySelector('.inst-seg-lleno');
});

/* ---------- Reproducción: solo corre mientras la sección está a la vista ---------- */
const reducido=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let t=reducido?PASOS[8].s-2.2:0, pausaUsuario=reducido, visible=false, corriendo=false, ultimo=0, mostrado=-1;
function pintar(){
  dibujar(t);
  const k=pasoActual(t);
  if(k!==mostrado){ textos.forEach((el,i)=>el.classList.toggle('on',i===k)); mostrado=k; }
  segs.forEach((s,i)=>{ s.style.transform='scaleX('+(i<k?1:i>k?0:prog(i,t))+')'; });
}
function cuadro(now){
  if(!corriendo) return;
  const dt=Math.min(0.1,(now-ultimo)/1000); ultimo=now;
  t+=dt; if(t>=TOTAL) t=0;
  pintar();
  requestAnimationFrame(cuadro);
}
function actualizar(){
  const debe=visible&&!pausaUsuario;
  raiz.classList.toggle('inst--pausa',pausaUsuario);
  btn.setAttribute('aria-labelledby',pausaUsuario?'instLblPlay':'instLblPausa');
  if(debe&&!corriendo){ corriendo=true; ultimo=performance.now(); requestAnimationFrame(cuadro); }
  if(!debe) corriendo=false;
}
btn.addEventListener('click',()=>{ pausaUsuario=!pausaUsuario; actualizar(); });
if('IntersectionObserver' in window){
  new IntersectionObserver(es=>{ visible=es[0].isIntersecting; actualizar(); },{threshold:0.35}).observe(cv);
}else{ visible=true; }
new ResizeObserver(()=>{ ajustar(); pintar(); }).observe(cv);
ajustar(); pintar(); actualizar();
})();
