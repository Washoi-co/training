/* アドリブ → 🎤録音 → AI添削（Cloud Functions の review）→ 直した文を3回 → 1・4・11日後に復習。
   無料版・本コースの「話す」が共通で使う（画面の部品は _adlib.html）。2026-10-20
   サイト側がやること：
     Adlib.setup({ send(it), done(), fixed(it), reviewStart(), reviewDone(list) })
       send(it)        … 1問送ったあと（it に添削の結果が後から入る）。次の問題へ進むか、最後なら Adlib.fix(list) を呼ぶ
       done()          … 添削を全部見終わった（結果の画面へ）
       fixed(it)       … 添削した文を3回言えた（今日＆計画に数えるなど。省略可）
       reviewStart()   … 「今日の復習」を始める前（タイマーを止めるなど。省略可）
       reviewDone(list)… 今日の復習がおわった（結果の画面へ）
     Adlib.show({tag, n, frame, frameJa, pic, word, meaning, pattern}) … アドリブ1問を画面に出す
   ページにある物を使う：speak(文)・view(画面名)・window.APushSync.call（sync.js。ログインしてから review を呼ぶ）
   添削の相手（口座）はサーバーがログインの印から決める。画面からは英文・型・単語・意味・声だけ送る */
function toast(html,cls){document.getElementById("toast").innerHTML=html;document.getElementById("toast").className="toast "+(cls||"");document.getElementById("toast").hidden=false;}
var Adlib=(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const H={send(){},done(){},fixed(){},reviewStart(){},reviewDone(){}};
const ymd=d=>d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
const dayAgo=n=>{const d=new Date();d.setDate(d.getDate()-n);return ymd(d);};
const addDays=(s,n)=>{const [y,m,d]=s.split("-").map(Number);const t=new Date(y,m-1,d);t.setDate(t.getDate()+n);return ymd(t);};
let cur=null,FIX=null;

/* ---- アドリブ1問を出す ---- */
function show(o){
  cur={word:o.word,meaning:o.meaning||"",pattern:o.pattern};
  $("a-tag").textContent=o.tag||"アドリブ";$("a-n").textContent=o.n||"";
  $("a-frame").innerHTML=o.frame?esc(o.frame).replace("＿＿",'<span class="blank">＿＿</span>'):"";$("a-frame").hidden=!o.frame;
  $("a-fja").textContent=o.frameJa||"";$("a-fja").hidden=!o.frameJa;
  $("a-pic").textContent=o.pic||"";$("a-pic").hidden=!o.pic;
  $("a-en").textContent=o.word;$("a-ja").textContent=o.meaning||"";
  micStop();$("a-in").value="";$("a-live").textContent="";
  if(!CAN_REC||micOff)adType(true,false);else{$("a-mic").hidden=false;$("a-type").hidden=true;}
  view("adlib");
  speak(o.word);
}
$("a-say").addEventListener("click",()=>speak($("a-en").textContent));

/* ---- 声：録音 → 添削のときにサーバーで文字にする。押す→話す→もう一度押すと、送って次へ（待たない）。録音できない端末は打って入力 ---- */
const CAN_REC=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder);
let rec=null,recStream=null,micOff=false,recT=0,recTick=0;
function micStop(){   /* 録音を捨てて止める */
  if(rec){rec.ondataavailable=rec.onstop=null;try{rec.stop();}catch(e){}rec=null;}
  clearInterval(recTick);$("a-mic").classList.remove("on");$("a-mic").textContent="🎤 話す";$("a-live").textContent="";
}
function micRelease(){micStop();if(recStream){recStream.getTracks().forEach(t=>t.stop());recStream=null;}}
function adType(note,again){
  $("a-mic").hidden=true;$("a-type").hidden=false;
  $("a-nomic").hidden=!note;$("a-again").hidden=!again;
}
async function micStart(){
  micStop();
  try{speechSynthesis.cancel();}catch(e){}
  try{recStream=recStream||await navigator.mediaDevices.getUserMedia({audio:true});}
  catch(e){micOff=true;adType(true,false);return;}
  const chunks=[],r=rec=new MediaRecorder(recStream);
  r.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  r.onstop=()=>{rec=null;adSend(new Blob(chunks,{type:r.mimeType||"audio/mp4"}),(Date.now()-recT)/1000);};
  r.start();recT=Date.now();
  $("a-mic").hidden=false;$("a-type").hidden=true;$("a-mic").classList.add("on");
  const tick=()=>{const t=Math.floor((Date.now()-recT)/1000);$("a-mic").textContent="● 録音中 "+t+"秒（押すと送って次へ）";if(t>=30&&rec)rec.stop();};
  tick();recTick=setInterval(tick,500);
}
$("a-mic").addEventListener("click",()=>{if(rec){clearInterval(recTick);rec.stop();}else micStart();});
$("a-again").addEventListener("click",micStart);
$("a-in").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();$("a-next").click();}});
function adSend(blob,sec){   /* 声（blob）か、打った文で添削を頼んで、次へ */
  const you=blob?"":$("a-in").value.trim();
  if(!blob&&!you){$("a-in").focus();return;}   /* 空は送らない */
  micStop();
  const it=Object.assign({},cur,{you,audio:blob||null,sec:sec||0});
  review(it);
  H.send(it);
}
$("a-next").addEventListener("click",()=>adSend(null));

/* ---- 添削（sync.js の call → ログインしてから Cloud Functions の review）。送るのは英文・型・単語・意味と声だけ ---- */
const jaErr=e=>(e&&/^functions\//.test(e.code||"")&&e.code!=="functions/internal"&&e.message)||"添削できませんでした。電波の良い所で「もう一度」を押してください。";
function review(it){
  it.r=null;it.err=null;
  const b64=it.audio?new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(String(f.result).split(",")[1]||"");f.readAsDataURL(it.audio);}):Promise.resolve("");
  it.p=b64.then(audio=>window.APushSync.call("review",Object.assign({sentence:it.you,pattern:it.pattern,word:it.word,meaning:it.meaning},audio?{audio,mime:it.audio.type,sec:it.sec}:{})))
    .then(res=>{
      const r=res&&res.data;
      if(!r||!String(r.corrected||"").trim())throw new Error("empty");
      it.r={ok:!!r.ok,corrected:String(r.corrected).trim(),note:String(r.note||"")};
      if(r.heard!=null)it.you=String(r.heard);
      saveRev(it);
    })
    .catch(e=>{it.err=jaErr(e);})
    .then(()=>{if(FIX&&!FIX.review&&FIX.list[FIX.i]===it)paintFix();});
  return it.p;
}

/* ---- 添削を1文ずつ見て3回（review:true の時は、今日の復習） ---- */
function fix(list){micRelease();FIX={list,i:0,review:false};paintFix();view("fix");}
const fixEn=it=>FIX.review?it.en:(it.r&&it.r.corrected);
function paintFix(){
  const it=FIX.list[FIX.i],rv=FIX.review,en=fixEn(it);
  $("f-tag").textContent=rv?"🔁 今日の復習":"添削";
  $("f-n").textContent=(FIX.i+1)+" / "+FIX.list.length;
  $("f-you-h").hidden=$("f-you").hidden=$("f-fix-h").hidden=rv;
  $("f-you").textContent=it.you||(it.audio&&!it.r&&!it.err?"（聞き取っています…）":"（何も言っていません）");
  $("f-wait").hidden=!!(en||it.err);
  $("f-err").hidden=!!en||!it.err;$("f-msg").textContent=it.err||"";
  $("f-ok").hidden=!en;
  $("f-en").textContent=en||"";
  $("f-badge").hidden=rv||!(it.r&&it.r.ok);
  $("f-note").textContent=(rv?it.note:it.r&&it.r.note)||"";$("f-note").hidden=!$("f-note").textContent;
  FIX.taps=0;$("f-dots").querySelectorAll(".dot").forEach(d=>d.classList.remove("on"));
  fixLabel();
  if(en)speak(en);
}
$("f-say").addEventListener("click",()=>speak($("f-en").textContent));
function fixLabel(){
  const last=FIX.i===FIX.list.length-1;
  $("f-next").disabled=!fixEn(FIX.list[FIX.i]);
  $("f-next").textContent=FIX.taps>=3?(last?(FIX.review?"おわり":"結果を見る"):"次へ"):"言えた（"+FIX.taps+"/3）";
}
function fixTap(){   /* 3回言う：点でも「言えた」ボタンでも数える。3回で「次へ」になる */
  if(!FIX||FIX.taps>=3||!fixEn(FIX.list[FIX.i]))return;
  $("f-dots").querySelectorAll(".dot")[FIX.taps].classList.add("on");FIX.taps++;
  if(FIX.taps<3)speak($("f-en").textContent);
  fixLabel();
  if(FIX.taps>=3){const it=FIX.list[FIX.i];if(!FIX.review&&!it.marked){it.marked=true;H.fixed(it);}}
}
$("f-dots").addEventListener("click",e=>{if(e.target.closest("[data-f]"))fixTap();});
$("f-retry").addEventListener("click",()=>{review(FIX.list[FIX.i]);paintFix();});
function fixNext(){
  if(FIX.review)revDone(FIX.list[FIX.i].id);
  if(++FIX.i<FIX.list.length){paintFix();return;}
  if(FIX.review){const L=FIX.list;FIX=null;paintRev();H.reviewDone(L);}else{FIX=null;H.done();}
}
$("f-skip").addEventListener("click",()=>{if(FIX)fixNext();});
$("f-next").addEventListener("click",()=>{if(!FIX)return;if(FIX.taps<3)fixTap();else fixNext();});

/* ---- 添削した文の復習（ap_adrev）。アドリブの日から +1・+4・+11日。遅れてやった日の当日には、もう出さない ---- */
const RV=[1,4,11];
const revDue=x=>{const a=addDays(x.made,RV[x.step]),b=x.last?addDays(x.last,1):"";return a>b?a:b;};
const adrev=()=>{try{return JSON.parse(localStorage.getItem("ap_adrev"))||[];}catch(e){return [];}};
const setAdrev=L=>{try{localStorage.setItem("ap_adrev",JSON.stringify(L));}catch(e){}};
const revList=()=>adrev().filter(x=>x&&x.en&&RV[x.step]!==undefined&&revDue(x)<=dayAgo(0));
function saveRev(it){
  const L=adrev();
  L.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),en:it.r.corrected,you:it.you,note:it.r.note,word:it.word,made:dayAgo(0),step:0});
  setAdrev(L);
}
function revDone(id){
  const L=adrev(),x=L.find(y=>y.id===id);if(!x)return;
  x.step++;x.last=dayAgo(0);
  setAdrev(x.step>=RV.length?L.filter(y=>y!==x):L);
}
function paintRev(){const n=revList().length;$("rev-card").hidden=!n;$("rev-n").textContent=n;return n;}
function openReview(){
  const L=revList();
  if(!L.length){paintRev();toast("今日の復習（添削した文）は、ありません");setTimeout(()=>$("toast").hidden=true,4000);return false;}
  micStop();H.reviewStart();
  FIX={list:L,i:0,review:true};paintFix();view("fix");
  $("v-fix").closest(".card").scrollIntoView({behavior:"smooth",block:"start"});
  return true;
}
$("rev-go").addEventListener("click",openReview);

return {setup(h){Object.assign(H,h);},show,fix,reset(){FIX=null;micStop();},micStop,micRelease,review,openReview,paintRev,revList};
})();
