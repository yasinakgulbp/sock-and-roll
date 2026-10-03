'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d');
const designs=[
 {name:'Lavanta çizgili',base:'#b49ada',light:'#d9c8ef',dark:'#8664b7',pattern:'stripe'},
 {name:'Mercan puantiyeli',base:'#ee907e',light:'#ffe3bc',dark:'#d27169',pattern:'dot'},
 {name:'Yeşil çiçekli',base:'#a6bba1',light:'#f6f3d6',dark:'#7c9578',pattern:'flower'},
 {name:'Mavi dalgalı',base:'#8ebada',light:'#d5edf8',dark:'#5d96bd',pattern:'wave'},
 {name:'Sarı yıldızlı',base:'#edc46b',light:'#fff2ce',dark:'#cc9947',pattern:'star'},
 {name:'Pembe kalpli',base:'#e6afc3',light:'#fce8ec',dark:'#c67e9e',pattern:'heart'},
 {name:'Lavanta puantiyeli',base:'#b49ada',light:'#f5eafa',dark:'#8664b7',pattern:'dot'},
 {name:'Yeşil çizgili',base:'#a6bba1',light:'#dfebd6',dark:'#7c9578',pattern:'stripe'},
 {name:'Mavi yıldızlı',base:'#8ebada',light:'#e5f5fa',dark:'#5d96bd',pattern:'star'},
 {name:'Mercan çiçekli',base:'#ee907e',light:'#fff2c7',dark:'#d27169',pattern:'flower'},
 {name:'Sarı dalgalı',base:'#edc46b',light:'#fff2ce',dark:'#cc9947',pattern:'wave'},
 {name:'Pembe çizgili',base:'#e6afc3',light:'#fce8ec',dark:'#c67e9e',pattern:'stripe'},
 {name:'Gece yıldızlı',base:'#6b719f',light:'#f3e5b9',dark:'#4d537f',pattern:'star'},
 {name:'Turkuaz puantiyeli',base:'#6ebfbb',light:'#e4f7e8',dark:'#479c99',pattern:'dot'}];
let saved={unlocked:1,scores:{},sound:true};try{let v=JSON.parse(localStorage.getItem('sock-roll-v1'));if(v&&Number.isInteger(v.unlocked)&&v.unlocked>0)saved={...saved,...v,unlocked:Math.min(30,v.unlocked)};}catch{}
let level=1,pairCount=3,matched=0,misses=0,hints=3,hintsUsed=0,socks=[],rollAnimations=[],particles=[],drag=null,selected=null,elapsed=0,started=false,finished=false,W=700,H=460,scale=1,last=performance.now(),accumulator=0,highlightUntil=0,highlightIds=[],toastTimer,winTimer,paused=false;
let audio;
const stillCanvas=document.createElement('canvas'),stillCtx=stillCanvas.getContext('2d');
let pixelRatio=1,layerDirty=true,sceneDirty=true,lastPaint=0,lastTimer=-1,highlightKey='';
function wake(s){if(s.asleep)layerDirty=true;s.asleep=false;s.quiet=0;sceneDirty=true}

function save(){try{localStorage.setItem('sock-roll-v1',JSON.stringify(saved))}catch{}}
function tone(kind){if(!saved.sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const notes=kind==='win'?[523,659,784,1047]:kind==='match'?[587,740,880]:kind==='miss'?[220,180]:[440];notes.forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(audio.destination);const t=audio.currentTime+i*.09;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+.26);o.start(t);o.stop(t+.28)})}catch{}}
function vibrate(n){navigator.vibrate?.(n)}
function showToast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),1400)}
function center(s){let x=0,y=0;for(const p of s.p){x+=p.x;y+=p.y}return{x:x/s.p.length,y:y/s.p.length}}
function shuffleArray(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function dimensions(){const r=canvas.getBoundingClientRect();if(r.width<1||r.height<1)return;const oldW=W,oldH=H;W=r.width;H=r.height;pixelRatio=Math.min(devicePixelRatio||1,W<600?1.25:1.5);for(const cv of [canvas,stillCanvas]){cv.width=Math.round(W*pixelRatio);cv.height=Math.round(H*pixelRatio)}ctx.setTransform(pixelRatio,0,0,pixelRatio,0,0);stillCtx.setTransform(pixelRatio,0,0,pixelRatio,0,0);layerDirty=sceneDirty=true;scale=Math.max(.55,Math.min(1.04,W/700+0.18));for(const s of socks){const c=center(s),dx=c.x/oldW*W-c.x,dy=c.y/oldH*H-c.y;for(const p of s.p){p.x+=dx;p.ox+=dx;p.y+=dy;p.oy+=dy}wake(s)}}
new ResizeObserver(dimensions).observe(canvas);
// A spring-constrained fabric spine: local stretch, bending, soft long-range shape retention.
function createSock(id,type,x,y,angle,size){const base=[[0,-54],[0,-38],[0,-22],[0,-6],[0,10],[2,25],[12,36],[27,39],[42,38]];const p=base.map(([u,v])=>{u*=size;v*=size;const px=x+u*Math.cos(angle)-v*Math.sin(angle),py=y+u*Math.sin(angle)+v*Math.cos(angle);return{x:px,y:py,ox:px,oy:py}}),links=[];for(let i=0;i<p.length;i++)for(let j=i+1;j<Math.min(p.length,i+4);j++){let strength=j-i===1?.85:j-i===2?.28:.09;links.push({a:i,b:j,d:Math.hypot(p[i].x-p[j].x,p[i].y-p[j].y),k:strength})}return{id,type,p,links,size,r:17*size,highlight:false,flash:0,asleep:false,quiet:0}}
function layout(){layerDirty=sceneDirty=true;const n=socks.length,cols=Math.ceil(Math.sqrt(n*W/(H-100))),rows=Math.ceil(n/cols),cw=(W-70)/cols,ch=(H-115)/rows;const points=shuffleArray(Array.from({length:n},(_,i)=>({x:35+cw*(i%cols+.5),y:65+ch*(Math.floor(i/cols)+.5)})));const sz=Math.min(scale,Math.max(.47,Math.min(cw/103,ch/125)));socks=socks.map((s,i)=>createSock(s.id,s.type,points[i].x,points[i].y,(Math.random()-.5)*2.4,sz));}
function startLevel(n){if(!Number.isInteger(n)||n<1||n>saved.unlocked||n>30)return false;clearTimeout(winTimer);level=n;pairCount=Math.min(14,3+Math.floor((n-1)*.65));matched=misses=elapsed=hintsUsed=0;hints=3;finished=started=false;lastTimer=-1;drag=null;selected=null;rollAnimations=[];particles=[];highlightIds=[];$('rolls').innerHTML='';$('modal').close();const types=shuffleArray(designs.map((_,i)=>i).slice(0,n<4?6:n<8?10:14)).slice(0,pairCount);socks=shuffleArray(types.flatMap((t,i)=>[{id:i*2,type:t},{id:i*2+1,type:t}]));layout();$('levelTag').textContent='BÖLÜM '+String(level).padStart(2,'0');$('levelName').textContent=level===1?'İlk buluşma':level<5?'Tatlı bir karışıklık':level<10?'Çamaşır günü':level<20?'Desen dedektifi':'Kocaman bir çamaşır dağı';$('instruction').textContent='Bir çorabı tut, eşinin üstüne bırak.';updateUI();updateLevels();return true}
function updateUI(){$('matched').textContent=matched;$('target').textContent=' / '+pairCount;$('timer').textContent=formatTime(elapsed);$('trayCount').textContent=matched+' çift';$('hintCount').textContent=hints;$('hint').disabled=hints===0||finished;updateButtons()}
function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0')}
function levelButton(n){const b=document.createElement('button');b.className='level '+(n===level?'current ':saved.scores[n]?'done':'');b.disabled=n>saved.unlocked;b.innerHTML=n>saved.unlocked?'·':n+(saved.scores[n]?'<span class="stars">'+'★'.repeat(saved.scores[n])+'</span>':'');b.setAttribute('aria-label','Bölüm '+n+(n>saved.unlocked?', kilitli':''));b.onclick=()=>startLevel(n);return b}
function updateLevels(){$('levels').replaceChildren(...Array.from({length:12},(_,i)=>levelButton(i+1)));$('totalStars').textContent='★ '+Object.values(saved.scores).reduce((a,b)=>a+b,0)}
function updateButtons(){$('sockButtons').replaceChildren(...socks.map((s,i)=>{let b=document.createElement('button');b.textContent=(i+1)+'. '+designs[s.type].name;b.className=s.id===selected?'selected':'';b.onclick=()=>{started=true;if(selected===null){selected=s.id;highlightIds=[s.id];highlightUntil=performance.now()+15000;updateButtons()}else{const a=socks.find(s=>s.id===selected);selected=null;if(a&&a!==s)attempt(a,s);updateButtons()}};return b}))}
function position(e){let r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}}
function hit(p){for(let i=socks.length-1;i>=0;i--){let s=socks[i];for(let j=0;j<s.p.length-1;j++){const a=s.p[j],b=s.p[j+1],vx=b.x-a.x,vy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*vx+(p.y-a.y)*vy)/(vx*vx+vy*vy||1)));if(Math.hypot(p.x-a.x-vx*t,p.y-a.y-vy*t)<s.r+7){let nearest=0,dd=1e9;s.p.forEach((q,k)=>{let d=Math.hypot(q.x-p.x,q.y-p.y);if(d<dd){dd=d;nearest=k}});return{s,node:nearest}}}}return null}
canvas.addEventListener('pointerdown',e=>{if(finished){win();return}if($('modal').open)return;const p=position(e),h=hit(p);if(!h)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);wake(h.s);started=true;drag={...h,x:p.x,y:p.y,offsetX:h.s.p[h.node].x-p.x,offsetY:h.s.p[h.node].y-p.y};socks=socks.filter(s=>s!==h.s);socks.push(h.s);canvas.classList.add('dragging');tone('pick')});
canvas.addEventListener('pointermove',e=>{if(!drag)return;let p=position(e);drag.x=Math.max(16,Math.min(W-16,p.x));drag.y=Math.max(35,Math.min(H-30,p.y));e.preventDefault()});
function release(cancel){if(!drag)return;const s=drag.s;let best=null,bestDist=Infinity;for(const other of socks){if(other===s)continue;let dist=Infinity;for(const a of s.p)for(const b of other.p)dist=Math.min(dist,Math.hypot(a.x-b.x,a.y-b.y));if(dist<bestDist){bestDist=dist;best=other}}drag=null;canvas.classList.remove('dragging');if(!cancel&&best&&bestDist<(s.r+best.r)*1.12)attempt(s,best)}
canvas.addEventListener('pointerup',()=>release(false));canvas.addEventListener('pointercancel',()=>release(true));canvas.addEventListener('lostpointercapture',()=>release(true));
function attempt(a,b){layerDirty=sceneDirty=true;if(a.type===b.type){const ca=center(a),cb=center(b),c={x:(ca.x+cb.x)/2,y:(ca.y+cb.y)/2};socks=socks.filter(s=>s!==a&&s!==b);matched++;rollAnimations.push({a,b,c,t:0});burst(c.x,c.y,24);tone('match');vibrate(20);showToast(['Tam birbirlerine göre!','İşte şimdi bir çift ♡','Yumuşacık bir eşleşme!','Birlikte daha güzel!'][matched%4]);if(matched===pairCount){finished=true;winTimer=setTimeout(win,1050)}}else{misses++;wake(a);wake(b);a.flash=b.flash=.6;const ca=center(a),cb=center(b),dx=ca.x-cb.x||1,dy=ca.y-cb.y||1,d=Math.hypot(dx,dy);for(const p of a.p){p.ox=p.x-dx/d*3;p.oy=p.y-dy/d*3}tone('miss');vibrate([12,40,12]);showToast('Bunlar farklı desenler. Bir daha bak ♡')}updateUI()}
function starCount(){let accuracy=pairCount/(pairCount+misses+hintsUsed*.5);return accuracy>=.9?3:accuracy>=.65?2:1}
function win(){let stars=starCount();saved.scores[level]=Math.max(saved.scores[level]||0,stars);saved.unlocked=Math.min(30,Math.max(saved.unlocked,level+1));save();updateLevels();tone('win');burst(W*.5,H*.35,85);showModal('<div class="bigicon">✿</div><span class="badge">BÖLÜM '+level+' TAMAMLANDI</span><div class="winStars">'+'★'.repeat(stars)+'<span style="color:#e8e1ef">'+'★'.repeat(3-stars)+'</span></div><div class="modalTitle">Bütün tekler çift oldu!</div><p class="modalText">Küçük bir düzen. Kocaman bir mutluluk.</p><div class="resultstats"><div><strong>'+formatTime(elapsed)+'</strong><small>SÜRE</small></div><div><strong>%'+Math.round(pairCount/(pairCount+misses)*100)+'</strong><small>DOĞRULUK</small></div><div><strong>'+pairCount+'</strong><small>MUTLU ÇİFT</small></div></div><button class="primary" id="next">'+(level===30?'Baştan oyna':'Sıradaki bölüm')+'</button><button class="secondary" id="retry">Bir daha oyna</button>');$('next').onclick=()=>startLevel(level===30?1:level+1);$('retry').onclick=()=>startLevel(level)}
function showModal(html){release(true);$('modalContent').innerHTML=html;if(!$('modal').open)$('modal').showModal()}
$('closeModal').onclick=()=>$('modal').close();$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close()}});
$('help').onclick=()=>showModal('<div class="bigicon">♡</div><div class="modalTitle">Eşini bul, yuvarla!</div><div class="helpsteps"><p><b>01 · Tut ve sürükle</b><br>Çorabı herhangi bir yerinden tut. Kumaş elinin peşinden gelsin.</p><p><b>02 · Desenleri eşleştir</b><br>Aynı renk ve desendeki eşinin üzerine bırak. Çiftin yuvarlanıp sepete gider.</p><p><b>03 · Yıldızları topla</b><br>Hatalar ve ipuçları yıldız puanını etkiler. %90 puan 3, %65 puan 2 yıldız getirir. Süre yalnızca bilgi amaçlıdır.</p></div><p class="modalText">İlerlemen bu cihazda saklanır.</p><button class="primary" onclick="document.getElementById(\'modal\').close()">Hadi eşleştirelim</button>');
$('restart').onclick=()=>startLevel(level);
$('sound').setAttribute('aria-pressed',saved.sound);$('sound').textContent=saved.sound?'♫':'♩';$('sound').onclick=()=>{saved.sound=!saved.sound;$('sound').setAttribute('aria-pressed',saved.sound);$('sound').textContent=saved.sound?'♫':'♩';save();tone('pick')};
$('shuffle').onclick=()=>{if(finished)return;release(true);layout();tone('pick');showToast('Taptaze bir karışıklık')};
$('hint').onclick=()=>{if(!hints||finished||!socks.length)return;hints--;hintsUsed++;let a=socks[0],b=socks.find(s=>s!==a&&s.type===a.type);highlightIds=[a.id,b.id];highlightUntil=performance.now()+2800;tone('pick');updateUI()};
$('levelTag').onclick=()=> $('map').click();
$('map').onclick=()=>{showModal('<div class="bigicon">✧</div><div class="modalTitle">Çamaşır yolculuğu</div><p class="modalText">30 bölüm, gittikçe büyüyen bir çamaşır yığını.</p><div class="mapgrid" id="mapgrid"></div>');$('mapgrid').append(...Array.from({length:30},(_,i)=>levelButton(i+1)))};
// Local stretch/bend constraints let the cloth fold; resting socks go to sleep.
function step(){
 let anyActive=false;
 for(const s of socks){
  if(s.asleep)continue;
  anyActive=true;const held=drag?.s===s;
  for(const p of s.p){const damping=held?.96:.79,vx=(p.x-p.ox)*damping,vy=(p.y-p.oy)*damping;p.ox=p.x;p.oy=p.y;p.x+=vx;p.y+=vy+(held?.43*s.size:0)}
  for(let k=0;k<4;k++){
   for(const l of s.links){const a=s.p[l.a],b=s.p[l.b],dx=b.x-a.x,dy=b.y-a.y,d=Math.sqrt(dx*dx+dy*dy)||.001,span=l.b-l.a;
    let target=l.d,stiff=l.k;
    if(held){if(span===1){target*=1.055;stiff=.68}else stiff*=l.a>=5?.8:.24}
    const f=(d-target)/d*stiff*.5;a.x+=dx*f;a.y+=dy*f;b.x-=dx*f;b.y-=dy*f;
   }
   if(held){const p=s.p[drag.node];p.x+=(drag.x+drag.offsetX-p.x)*.9;p.y+=(drag.y+drag.offsetY-p.y)*.9}
  }
  let motion=0;
  for(const p of s.p){p.x=Math.max(s.r+8,Math.min(W-s.r-8,p.x));p.y=Math.max(s.r+39,Math.min(H-s.r-40,p.y));motion=Math.max(motion,Math.abs(p.x-p.ox),Math.abs(p.y-p.oy))}
  s.flash=Math.max(0,s.flash-1/60);
  if(!held&&s.flash===0&&motion<.055){if(++s.quiet>16){s.asleep=true;for(const p of s.p){p.ox=p.x;p.oy=p.y}layerDirty=true}}else s.quiet=0;
 }
 if(!anyActive)return;
 sceneDirty=true;
 // Cache centers once; only moving fabric can wake a resting neighbour.
 const centers=socks.map(center);
 for(let i=0;i<socks.length;i++)for(let j=i+1;j<socks.length;j++){
  const a=socks[i],b=socks[j];if((a.asleep&&b.asleep)||drag&&(drag.s===a||drag.s===b))continue;
  const dx=centers[i].x-centers[j].x,dy=centers[i].y-centers[j].y,min=(a.r+b.r)*1.65,d2=dx*dx+dy*dy;
  if(d2>=min*min||d2<.0001)continue;const d=Math.sqrt(d2),push=(min-d)*.035;if(push<.04)continue;
  wake(a);wake(b);const x=dx/d*push,y=dy/d*push;for(const p of a.p){p.x+=x;p.y+=y}for(const p of b.p){p.x-=x;p.y-=y}
 }
}
function paintPile(now){
 const key=now<highlightUntil?highlightIds.join(','):'';
 if(key!==highlightKey){highlightKey=key;layerDirty=sceneDirty=true}
 if(layerDirty){stillCtx.clearRect(0,0,W,H);for(const s of socks)if(s.asleep)drawSock(stillCtx,s);layerDirty=false;sceneDirty=true}
 ctx.clearRect(0,0,W,H);ctx.drawImage(stillCanvas,0,0,stillCanvas.width,stillCanvas.height,0,0,W,H);
 for(const s of socks)if(!s.asleep)drawSock(ctx,s);
 sceneDirty=false;
}
function ribbonPath(c,s){c.beginPath();c.moveTo(s.p[0].x,s.p[0].y);for(let i=1;i<s.p.length-1;i++){const p=s.p[i],q=s.p[i+1];c.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2)}c.lineTo(s.p[8].x,s.p[8].y)}
function at(s,i){const p=s.p[i],a=s.p[Math.max(0,i-1)],b=s.p[Math.min(8,i+1)];return{x:p.x,y:p.y,ang:Math.atan2(b.y-a.y,b.x-a.x)-Math.PI/2}}
function mark(c,pattern,x,y,r,color){c.fillStyle=color;c.strokeStyle=color;c.lineWidth=1.7;c.beginPath();if(pattern==='flower'){for(let i=0;i<5;i++){let a=i*Math.PI*2/5;c.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r);c.arc(x+Math.cos(a)*r*.65,y+Math.sin(a)*r*.65,r*.53,0,Math.PI*2)}c.fill();c.fillStyle='#d4ac66';c.beginPath();c.arc(x,y,r*.33,0,Math.PI*2);c.fill()}else if(pattern==='star'){for(let i=0;i<10;i++){let a=i*Math.PI/5-Math.PI/2,rr=i%2?r*.42:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}c.closePath();c.fill()}else if(pattern==='heart'){c.moveTo(x,y+r*.7);c.bezierCurveTo(x-r*1.6,y-r*.3,x-r*.7,y-r*1.4,x,y-r*.55);c.bezierCurveTo(x+r*.7,y-r*1.4,x+r*1.6,y-r*.3,x,y+r*.7);c.fill()}else{c.arc(x,y,r*.6,0,Math.PI*2);c.fill()}}
function drawSock(c,s,alpha=1){const d=designs[s.type],r=s.r,held=drag?.s===s; c.save();c.globalAlpha=alpha;c.lineCap='round';c.lineJoin='round';const hi=highlightUntil>performance.now()&&highlightIds.includes(s.id);if(hi){ribbonPath(c,s);c.strokeStyle='#fff9d1';c.lineWidth=r*2+14;c.stroke()}
c.save();c.translate(0,held?7:3);ribbonPath(c,s);c.lineWidth=r*2+3;c.strokeStyle=held?'#49355418':'#63594a12';c.stroke();c.restore();ribbonPath(c,s);c.lineWidth=r*2+1.3;c.strokeStyle=s.flash?'#dd887f':d.dark;c.stroke();c.shadowColor='transparent';c.shadowOffsetY=0;ribbonPath(c,s);c.strokeStyle=d.base;c.lineWidth=r*2;c.stroke();
// Each printed detail follows its local fabric tangent instead of rotating as a rigid sprite.
for(let i=1;i<8;i++){const q=at(s,i);c.save();c.translate(q.x,q.y);c.rotate(q.ang);if(d.pattern==='stripe'){c.fillStyle=d.light;c.fillRect(-r+.7,-3*s.size,r*2-1.4,5*s.size)}else if(d.pattern==='wave'){c.strokeStyle=d.light;c.lineWidth=2.8*s.size;c.beginPath();c.moveTo(-r+1,0);c.bezierCurveTo(-r*.35,-6*s.size,r*.35,6*s.size,r-1,0);c.stroke()}else if(i%2){mark(c,d.pattern,-r*.35,0,5.2*s.size,d.light);mark(c,d.pattern,r*.45,6*s.size,3.7*s.size,d.light)}c.restore()}
// Fine stitch highlights and a softly ribbed cuff.
if(!held)for(let i=0;i<8;i++){let q=at(s,i);c.save();c.translate(q.x,q.y);c.rotate(q.ang);c.strokeStyle='#ffffff14';c.lineWidth=.65;for(let x=-r+3;x<r-2;x+=4*s.size){c.beginPath();c.moveTo(x,-5*s.size);c.lineTo(x+1,4*s.size);c.stroke()}c.restore()}
let cuff=at(s,0);c.save();c.translate(cuff.x,cuff.y);c.rotate(cuff.ang);c.fillStyle=d.dark;c.beginPath();c.roundRect(-r-1,-7*s.size,r*2+2,17*s.size,4*s.size);c.fill();c.fillStyle=d.light;c.beginPath();c.roundRect(-r,-8*s.size,r*2,14*s.size,3*s.size);c.fill();c.strokeStyle=d.base;c.lineWidth=1.1*s.size;for(let x=-r+3;x<r-1;x+=4*s.size){c.beginPath();c.moveTo(x,-6*s.size);c.lineTo(x,4*s.size);c.stroke()}c.restore();
let toe=at(s,8);c.save();c.translate(toe.x,toe.y);c.rotate(toe.ang);c.beginPath();c.ellipse(0,-1,r*.92,9*s.size,0,0,Math.PI);c.fillStyle=d.dark+'55';c.fill();c.restore();c.restore()}
function drawRoll(c,x,y,r,type,rotation=0){const d=designs[type];c.save();c.translate(x,y);c.rotate(rotation);c.fillStyle=d.dark;c.beginPath();c.ellipse(0,0,r,r*.9,-.2,0,Math.PI*2);c.fill();c.shadowColor='transparent';c.fillStyle=d.base;c.beginPath();c.ellipse(-r*.08,-r*.13,r*.88,r*.73,-.2,0,Math.PI*2);c.fill();c.strokeStyle=d.light;c.lineWidth=r*.19;c.beginPath();c.ellipse(-r*.03,-r*.1,r*.59,r*.47,-.2,.3,Math.PI*2);c.stroke();c.strokeStyle=d.dark;c.lineWidth=r*.12;c.beginPath();c.ellipse(r*.06,-r*.1,r*.28,r*.22,0,0,Math.PI*1.5);c.stroke();c.restore()}
function addRoll(type){let cv=document.createElement('canvas');cv.width=cv.height=84;cv.setAttribute('aria-label',designs[type].name+' eşleşti');drawRoll(cv.getContext('2d'),42,43,29,type,.2);$('rolls').append(cv)}
function burst(x,y,n){sceneDirty=true;n=Math.min(n,W<600?36:65);for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*7,vy:-2-Math.random()*5,life:.7+Math.random()*.7,color:['#b397db','#e6b749','#e6a897','#8eada2'][i%4],rot:Math.random()*6})}
function frame(now){
 requestAnimationFrame(frame);
 // Avoid drawing at 120 Hz on phones with high refresh-rate displays.
 if(now-lastPaint<15)return;
 const dt=Math.min((now-last)/1000,.05);last=now;lastPaint=now;
 if(paused)return;
 if(!$('modal').open){if(started&&!finished)elapsed+=dt;accumulator=Math.min(accumulator+dt,.05);while(accumulator>=1/60){step();accumulator-=1/60}}
 const seconds=Math.floor(elapsed);if(seconds!==lastTimer){$('timer').textContent=formatTime(elapsed);lastTimer=seconds}
 const key=now<highlightUntil?highlightIds.join(','):'';if(key!==highlightKey)sceneDirty=true;
 if(!sceneDirty&&!layerDirty&&!drag&&!rollAnimations.length&&!particles.length)return;
 const hadEffects=rollAnimations.length||particles.length;paintPile(now);
 for(let i=rollAnimations.length-1;i>=0;i--){const a=rollAnimations[i];a.t+=dt;let t=a.t;if(t<.32){let p=t/.32;ctx.save();ctx.translate(a.c.x,a.c.y);ctx.rotate(p*2.8);ctx.scale(1-p*.8,1-p*.8);ctx.translate(-a.c.x,-a.c.y);drawSock(ctx,a.a,1-p*.5);drawSock(ctx,a.b,1-p*.5);ctx.restore()}else{let q=Math.min(1,(t-.32)/.55),ease=q*q;drawRoll(ctx,a.c.x+(W*.65-a.c.x)*ease,a.c.y+(H+30-a.c.y)*ease,23*(1-q*.35),a.a.type,q*5)}if(t>.9){addRoll(a.a.type);rollAnimations.splice(i,1)}}for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.life-=dt;p.x+=p.vx*dt*60;p.y+=p.vy*dt*60;p.vy+=dt*8;p.rot+=dt*3;ctx.save();ctx.globalAlpha=Math.min(1,p.life*2);ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.color;ctx.fillRect(-2,-3,4,7);ctx.restore();if(p.life<=0)particles.splice(i,1)}
 // One final repaint removes the last confetti/roll frame cleanly.
 if(hadEffects)sceneDirty=true;
}
document.addEventListener('visibilitychange',()=>{paused=document.hidden;release(true);last=performance.now();accumulator=0;sceneDirty=true});
dimensions();startLevel(saved.unlocked);requestAnimationFrame(frame);
const webContext=document.modelContext;if(webContext?.registerTool){try{Promise.resolve(webContext.registerTool({name:'read_sock_game',description:'Read the current sock matching level, score and remaining socks.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({level,matched,pairs:pairCount,misses,finished,socks:socks.map(s=>({id:s.id,design:designs[s.type].name}))})})).catch(()=>{});}catch{}}
