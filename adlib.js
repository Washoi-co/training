/* アドリブ → 🎤録音 → AI添削（Cloud Functions の review）→ 直した文を3回。
   本コースの「章の振り返り」STEP 2（先生の質問＋単語）・STEP 3（状況で言う・Business）が使う（画面の部品は _adlib.html）。2026-10-20 → 2026-11-16 kimi
   サイト側がやること：
     Adlib.setup({ send(it), done(), fixed(it) })
       send(it)  … 1問送ったあと（it に添削の結果が後から入る）。次の問題へ進むか、最後なら Adlib.fix(list) を呼ぶ
       done()    … 添削を全部見終わった
       fixed(it) … 添削した文を3回言えた（省略可）
     Adlib.show({tag, n, title, situation, sitJa, question, qja, how, frame, frameJa, words:[{en,ja,pic}], word, meaning, pattern, model}) … 1問を画面に出す
       question・model の [ ] は太字で見せて、添削には外して送る。model は添削を3回言った後に「モデル解答を見る」で出す（STEP 3 だけ）
   ページにある物を使う：speak(文)・view(画面名)・window.APushSync.call（sync.js。ログインしてから review を呼ぶ）
   添削の相手（口座）はサーバーがログインの印から決める。画面からは英文・質問・状況・型・単語・意味と声だけ送る */
var Adlib=(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const bold=s=>esc(s).replace(/\[(.+?)\]/g,"<b>$1</b>");   /* [単語] → 太字 */
const plain=s=>String(s||"").replace(/[[\]]/g,"");
const H={send(){},done(){},fixed(){}};
let cur=null,FIX=null,REDO=null;   /* REDO：添削に失敗して「言い直す」中の文（同じ場所に入れ替える） */

/* ---- 1問を出す ---- */
const sayOf=o=>o.question?plain(o.question):(o.words||[]).map(w=>w.en).join(", ");
function show(o){
  const ws=o.words&&o.words.length?o.words:o.word?[{en:o.word,ja:o.meaning||"",pic:o.pic||""}]:[];
  cur=Object.assign({},o,{word:o.word!=null?o.word:ws.map(w=>w.en).join(" / "),meaning:o.meaning||"",words:ws});
  $("a-tag").textContent=o.tag||"アドリブ";$("a-n").textContent=o.n||"";
  $("a-title").textContent=o.title||"";$("a-title").hidden=!o.title;
  $("a-sit").textContent=o.situation||"";$("a-sit").hidden=!o.situation;
  $("a-sitja").textContent=o.sitJa||"";$("a-sitja").hidden=!o.sitJa;
  $("a-q").innerHTML=o.question?bold(o.question):"";$("a-qrow").hidden=!o.question;
  $("a-qja").textContent=o.qja||"";$("a-qja").hidden=!o.qja;
  $("a-frame").innerHTML=o.frame?esc(o.frame).replace("＿＿",'<span class="blank">＿＿</span>'):"";$("a-frame").hidden=!o.frame;
  $("a-fja").textContent=o.frameJa||"";$("a-fja").hidden=!o.frameJa;
  const pic=ws.map(w=>w.pic).filter(Boolean).join(" ");
  $("a-pic").textContent=pic;$("a-pic").hidden=!pic;
  $("a-en").innerHTML=ws.map(w=>'<span class="chip">'+esc(w.en)+'</span>').join("");$("a-ja").textContent=cur.meaning;
  $("a-words").hidden=!ws.length;$("a-ja").hidden=!cur.meaning;
  $("a-how").textContent=o.how||"🎤を押して話し、言えたらもう一度押すと次へ進みます";
  micStop();$("a-in").value="";$("a-live").textContent="";
  if(!CAN_REC||micOff)adType(true,false);else{$("a-mic").hidden=false;$("a-type").hidden=true;}
  view("adlib");
  speak(sayOf(cur));
}
$("a-say").addEventListener("click",()=>speak(cur.words.map(w=>w.en).join(", ")));
$("a-qsay").addEventListener("click",()=>speak(plain(cur.question)));

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
  const chunks=[],r=rec=new MediaRecorder(recStream,{audioBitsPerSecond:32000});   /* 32kbps：サーバーの上限（base64 60万字）に60秒でも収まる */
  r.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  r.onstop=()=>{rec=null;adSend(new Blob(chunks,{type:r.mimeType||"audio/mp4"}),(Date.now()-recT)/1000);};
  r.start();recT=Date.now();
  $("a-mic").hidden=false;$("a-type").hidden=true;$("a-mic").classList.add("on");
  const max=cur.situation?60:30;   /* 状況で言う（STEP 3）は長くなるので60秒まで */
  const tick=()=>{const t=Math.floor((Date.now()-recT)/1000);$("a-mic").textContent="● 録音中 "+t+"秒（押すと送って次へ）";if(t>=max&&rec)rec.stop();};
  tick();recTick=setInterval(tick,500);
}
$("a-mic").addEventListener("click",()=>{if(rec){clearInterval(recTick);rec.stop();}else micStart();});
$("a-again").addEventListener("click",micStart);
$("a-in").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();$("a-next").click();}});
function adSend(blob,sec){   /* 声（blob）か、打った文で添削を頼んで、次へ */
  const you=blob?"":$("a-in").value.trim();
  if(!blob&&!you){$("a-in").focus();return;}   /* 空は送らない */
  micStop();
  if(REDO){const it=REDO;REDO=null;Object.assign(it,{you,audio:blob||null,sec:sec||0,marked:false});review(it);paintFix();view("fix");return;}   /* 言い直し：同じ場所に入れ替えて添削 */
  const it=Object.assign({},cur,{you,audio:blob||null,sec:sec||0});
  review(it);
  H.send(it);
}
$("a-next").addEventListener("click",()=>adSend(null));

/* ---- 添削（sync.js の call → ログインしてから Cloud Functions の review）。送るのは英文・質問・状況・モデル解答・型・単語・意味と声だけ ---- */
const jaErr=e=>(e&&/^functions\//.test(e.code||"")&&e.code!=="functions/internal"&&e.message)||"添削できませんでした。電波の良い所で「もう一度」を押してください。";
function review(it){
  it.r=null;it.err=null;
  const b64=it.audio?new Promise(ok=>{const f=new FileReader();f.onload=()=>ok(String(f.result).split(",")[1]||"");f.readAsDataURL(it.audio);}):Promise.resolve("");
  const q={sentence:it.you,word:it.word||"",meaning:it.meaning||"",pattern:it.pattern||"",question:plain(it.question)};
  if(it.situation)q.situation=it.situation;
  if(it.model)q.model=plain(it.model);
  it.p=b64.then(audio=>window.APushSync.call("review",Object.assign(q,audio?{audio,mime:it.audio.type,sec:it.sec}:{})))
    .then(res=>{
      const r=res&&res.data;
      if(!r||!String(r.corrected||"").trim())throw new Error("empty");
      it.r={ok:!!r.ok,corrected:String(r.corrected).trim(),note:String(r.note||"")};
      if(r.heard!=null)it.you=String(r.heard);
    })
    .catch(e=>{it.err=jaErr(e);})
    .then(()=>{if(FIX&&FIX.list[FIX.i]===it)paintFix();});
  return it.p;
}

/* ---- 添削を1文ずつ見て3回。モデル解答があれば（STEP 3）、3回言った後に見られる ---- */
function fix(list){micRelease();REDO=null;FIX={list,i:0};paintFix();view("fix");}
const fixEn=it=>it.r&&it.r.corrected;
function paintFix(){
  const it=FIX.list[FIX.i],en=fixEn(it);
  $("f-n").textContent=(FIX.i+1)+" / "+FIX.list.length;
  $("f-q").innerHTML=it.question?bold(it.question):"";$("f-q").hidden=!it.question;
  $("f-you").textContent=it.you||(it.audio&&!it.r&&!it.err?"（聞き取っています…）":"（何も言っていません）");
  $("f-wait").hidden=!!(en||it.err);
  $("f-err").hidden=!!en||!it.err;$("f-msg").textContent=it.err||"";
  $("f-ok").hidden=!en;
  $("f-en").textContent=en||"";
  $("f-badge").hidden=!(it.r&&it.r.ok);
  $("f-note").textContent=it.r&&it.r.note||"";$("f-note").hidden=!$("f-note").textContent;
  $("f-model").innerHTML=it.model?bold(it.model):"";$("f-model").hidden=true;$("f-mbtn").hidden=true;
  FIX.taps=0;$("f-dots").querySelectorAll(".dot").forEach(d=>d.classList.remove("on"));
  fixLabel();
  if(en)speak(en);
}
$("f-say").addEventListener("click",()=>speak($("f-en").textContent));
$("f-mbtn").addEventListener("click",()=>{$("f-model").hidden=false;$("f-mbtn").hidden=true;speak(plain(FIX.list[FIX.i].model));});
function fixLabel(){
  const last=FIX.i===FIX.list.length-1;
  $("f-next").disabled=!fixEn(FIX.list[FIX.i]);
  $("f-next").textContent=FIX.taps>=3?(last?"おわり":"次へ"):"言えた（"+FIX.taps+"/3）";
}
function fixTap(){   /* 3回言う：点でも「言えた」ボタンでも数える。3回で「次へ」になる */
  if(!FIX||FIX.taps>=3||!fixEn(FIX.list[FIX.i]))return;
  $("f-dots").querySelectorAll(".dot")[FIX.taps].classList.add("on");FIX.taps++;
  if(FIX.taps<3)speak($("f-en").textContent);
  fixLabel();
  if(FIX.taps>=3){const it=FIX.list[FIX.i];$("f-mbtn").hidden=!it.model;if(!it.marked){it.marked=true;H.fixed(it);}}
}
$("f-dots").addEventListener("click",e=>{if(e.target.closest("[data-f]"))fixTap();});
$("f-retry").addEventListener("click",()=>{if(!FIX)return;review(FIX.list[FIX.i]);paintFix();});
$("f-redo").addEventListener("click",()=>{   /* 言い直す：問題の画面に戻って、🎤でも打ち込みでも */
  if(!FIX)return;
  const it=REDO=FIX.list[FIX.i];
  show(Object.assign({},it,{n:$("f-n").textContent}));
  $("a-type").hidden=false;$("a-nomic").hidden=true;$("a-again").hidden=!CAN_REC||micOff;$("a-in").value=it.you||"";
});
function fixNext(){
  if(++FIX.i<FIX.list.length){paintFix();return;}
  FIX=null;H.done();
}
$("f-skip").addEventListener("click",()=>{if(FIX)fixNext();});
$("f-next").addEventListener("click",()=>{if(!FIX)return;if(FIX.taps<3)fixTap();else fixNext();});

return {setup(h){Object.assign(H,h);},show,fix,reset(){FIX=null;REDO=null;micStop();},micStop,micRelease,review};
})();
