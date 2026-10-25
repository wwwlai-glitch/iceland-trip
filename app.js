/* 冰島倫敦小冊：連線版
 * 資料存在 Google 試算表（透過 Apps Script 網址讀寫），手機上另存一份，沒網路時照樣能看、能改，有訊號再上傳。
 */
(function(){
"use strict";

var CFG=window.TRIP_CONFIG||{};
var API=String(CFG.api||"").trim();
var POLL_MS=15000, BATCH=200;

/* ---------- 工具 ---------- */
function h(tag, props){
  var e=document.createElement(tag);
  if(props){ Object.keys(props).forEach(function(k){
    var v=props[k];
    if(v==null||v===false) return;
    if(k==="class") e.className=v;
    else if(k==="text") e.textContent=v;
    else if(k.slice(0,2)==="on") e.addEventListener(k.slice(2),v);
    else if(v===true) e.setAttribute(k,"");
    else e.setAttribute(k,v);
  });}
  for(var i=2;i<arguments.length;i++){
    var kids=[].concat(arguments[i]);
    kids.forEach(function(c){ if(c==null||c===false) return; e.append(c.nodeType?c:document.createTextNode(c)); });
  }
  return e;
}
function $(id){ return document.getElementById(id); }
function lsGet(k){ try{ return JSON.parse(localStorage.getItem(k)||"null"); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
function linkBtn(l){ return h("a",{class:"btn",href:l[1],target:"_blank",rel:"noopener noreferrer",text:l[0]}); }
function J(v,d){ if(v&&typeof v==="object") return v; if(!v) return d; try{ var x=JSON.parse(v); return x==null?d:x; }catch(e){ return d; } }
function newId(p){ return (p||"n")+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function num(v){ var n=parseFloat(v); return isNaN(n)?0:n; }
function armBtn(btn,label,armedLabel,fn){
  var t=null;
  btn.addEventListener("click",function(){
    if(btn.getAttribute("data-arm")==="1"){ clearTimeout(t); fn(); return; }
    btn.setAttribute("data-arm","1"); btn.classList.add("armed"); btn.textContent=armedLabel;
    t=setTimeout(function(){ btn.removeAttribute("data-arm"); btn.classList.remove("armed"); btn.textContent=label; },4000);
  });
  return btn;
}

/* ---------- 固定內容 ---------- */
var NOTES={
  n1:["安全","少背背包：最近聽說歐洲扒手集團到冰島了，盡量少背背包。"],
  n2:["健康","長途飛機容易水腫，上機前先穿好壓力襪或壓力褲。"],
  n3:["穿著","冰島室內都有暖氣，要用洋蔥式穿搭：外層防風防水外套，中層羽絨或絨毛外套，內層室內穿得住的衣服（發熱衣、毛衣），下身外層穿防潑水甚至防水的褲子，可以備 2–3 件發熱褲。"],
  n4:["穿著","準備防水的鞋，盡量挑中筒的，避免雪滲進去太冰。"],
  n5:["穿著","墨鏡和能遮住耳朵的帽子非常重要。"],
  n6:["穿著","準備能遮住口鼻的圍巾或口罩，雪上摩托車和雪橇犬都很需要。"],
  n7:["穿著","因為不太會流汗，貼身衣物之外，發熱衣和外層可以 2–3 天換一次。"],
  n8:["溫泉","會去泡溫泉，記得帶泳衣。"],
  n9:["飲食","可以帶沖泡式飲品、薑茶驅寒。"],
  n10:["金錢","除非要留作紀念，不用換歐元和冰島幣，冰島和英國都可以刷卡。"],
  n11:["行李","每組家庭最多 1 個 29 吋行李箱加 1 個登機箱，避免後車廂放不下。"],
  n12:["健康","容易暈船的人，記得帶暈船藥。"],
  n13:["住宿","記得帶拖鞋，在住宿可以穿。"],
  nv:["簽證","倫敦行程「要申請簽證」，請在出發前辦好。"],
  nl:["日照","冰島 11 月日出約 10:00，16:00 就天黑，景點和開車都要把天色算進去。"]
};
var TODO=[
 {g:"採買與餐食",list:[
  [2,"第 3、4 天的食材靠第 2 天 Bónus 一次買齊。星期六晚上抵達，營業時間要先查。"],
  [4,"維克之後只查到 Höfn 有 Nettó（週一至五 09:00–19:00，週末 10:00–19:00，冬季是否照常沒寫）。Hof 一帶的商店沒查到可靠資料，所以第 5 到 7 天要用的食材，都建議在維克買。"]
 ]},
 {g:"時間與路線",list:[
  [7,"雪橇犬集合點 11/19 下午會告知，收到後長按那一項補上地圖。"],
  [8,"取車時（11/14）要問 11/20 能不能晚點還車；問到結果後，下午市區觀光的時間可以調整。"]
 ]},
 {g:"返台組與留倫敦組",list:[
  [9,"11/21 分成兩組：返台組（最晚 17:17 離開貝克街，18:00 到機場，21:15 起飛）和留倫敦組（豬豬、豬媽）。"],
  [9,"留倫敦組的倫敦住宿、寄放行李的地點、晚餐都沒寫；英國簽證要出發前辦好。"],
  [10,"留倫敦組的早餐、晚餐、住宿沒填；14:15 到 16:00 有空檔。"],
  [11,"整天只有 21:15 起飛：行李寄放、白天行程、去機場時間、三餐都要補。"],
  [2,"去程航班改為 23:15 起飛（CI0073），荷蘭抵達時間與轉機等候時間要對照新機票更新。"]
 ]},
 {g:"表上沒提到，但出發前建議確認",list:[
  [2,"冬季租車：國際駕照、保險、冬季輪胎、加油方式，租車公司規定都要看過。"],
  [2,"手機網路：eSIM、漫遊或當地 SIM，出發前裝好。"]
 ]}
];
var TODO_COUNT=0; TODO.forEach(function(g){ TODO_COUNT+=g.list.length; });
var GRP={"":"全體",back:"返台組",stay:"留倫敦組"};

/* ---------- 資料層：本機快取＋待上傳佇列＋與試算表同步 ---------- */
var store={
  data:null, rev:-1,
  queue:lsGet("trip-queue")||[],
  syncing:false, err:"", lastOk:lsGet("trip-lastok")||0,
  holdRender:false, pendingRender:false
};
var EMPTY={days:[],items:[],members:[],packT:[],packP:[],shared:[]};
function ser(row){
  var o={}; Object.keys(row).forEach(function(k){ var v=row[k]; o[k]=(v&&typeof v==="object")?JSON.stringify(v):(v==null?"":String(v)); }); return o;
}
function applyOp(data,op){
  var arr=data[op.t]; if(!arr) return;
  var i=-1; for(var k=0;k<arr.length;k++){ if(String(arr[k].id)===String(op.row.id)){ i=k; break; } }
  if(op.op==="del"){ if(i>=0) arr.splice(i,1); return; }
  if(i>=0) arr[i]=Object.assign({},arr[i],op.row); else arr.push(Object.assign({},op.row));
}
function fill(d){ var o={}; Object.keys(EMPTY).forEach(function(k){ o[k]=(d&&Array.isArray(d[k]))?d[k].slice():[]; }); return o; }
function persist(){ lsSet("trip-cache",{rev:store.rev,data:store.data}); lsSet("trip-queue",store.queue); }
function commit(ops){
  ops=ops.filter(Boolean).map(function(o){ return {t:o.t,op:o.op||"put",row:ser(o.row)}; });
  if(!ops.length) return;
  ops.forEach(function(o){ applyOp(store.data,o); });
  store.queue=store.queue.concat(ops);
  persist(); rebuild(); renderAll(); syncStatus();
  sync();
}
function setServer(r){
  store.rev=r.rev; store.data=fill(r.data);
  store.queue.forEach(function(o){ applyOp(store.data,o); });
  store.lastOk=Date.now(); lsSet("trip-lastok",store.lastOk);
  store.err=""; persist(); rebuild(); renderAll(); syncStatus();
}
function fetchT(url,opt,ms){
  var c=window.AbortController?new AbortController():null, t;
  opt=opt||{}; if(c) opt.signal=c.signal;
  var p=fetch(url,opt).then(function(r){ if(!r.ok) throw new Error("http "+r.status); return r.json(); });
  if(c) t=setTimeout(function(){ c.abort(); },ms||20000);
  return p.finally?p.finally(function(){ clearTimeout(t); }):p;
}
function code(){ return lsGet("trip-k")||""; }
function apiPost(body){
  body.k=code();
  return fetchT(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)},30000).then(function(r){
    if(r&&(r.error==="bad_code"||r.error==="no_code_set")){ store.needCode=r.error; askCode(); }
    return r;
  });
}
function apiGet(a){ return apiPost({a:a}); }

function sync(){
  if(!API||store.syncing||!store.queue.length||!code()) return;
  if(navigator.onLine===false){ syncStatus(); return; }
  store.syncing=true; syncStatus();
  var batch=store.queue.slice(0,BATCH);
  apiPost({by:meName(),ops:batch}).then(function(r){
    if(!r||!r.ok) throw new Error((r&&r.error)||"failed");
    store.queue=store.queue.slice(batch.length);
    setServer(r);
  }).catch(function(e){ store.err=String(e&&e.message||e); }).then(function(){
    store.syncing=false; syncStatus();
    if(store.queue.length&&!store.err) sync();
  });
}
var askWho=false;
function maybeAskWho(){ if(askWho&&!meId()&&MEMBERS.length&&!openDialog()){ askWho=false; whoDialog(true); } }
function load(){
  if(!API){ maybeAskWho(); return; }
  if(navigator.onLine===false){ syncStatus(); maybeAskWho(); return; }
  if(!code()){ syncStatus(); askCode(); return; }
  store.syncing=true; syncStatus();
  apiGet("load").then(function(r){
    if(!r||!r.ok) throw new Error((r&&r.error)||"failed");
    setServer(r);
  }).catch(function(e){ store.err=String(e&&e.message||e); }).then(function(){
    store.syncing=false; syncStatus();
    maybeAskWho();
    if(store.queue.length) sync();
  });
}
function poll(){
  if(!API||document.hidden||store.syncing||navigator.onLine===false||!code()) return;
  if(store.queue.length){ sync(); return; }
  apiGet("rev").then(function(r){
    if(r&&r.ok&&r.rev!==store.rev) load();
    else if(r&&r.ok){ store.err=""; store.lastOk=Date.now(); lsSet("trip-lastok",store.lastOk); syncStatus(); }
  }).catch(function(){});
}
function ago(ts){
  if(!ts) return "";
  var m=Math.round((Date.now()-ts)/60000);
  if(m<1) return "剛剛同步";
  if(m<60) return m+" 分鐘前同步";
  var hh=Math.round(m/60); if(hh<48) return hh+" 小時前同步";
  return Math.round(hh/24)+" 天前同步";
}
function syncStatus(){
  var p=$("syncpill"), t=$("synctime"), f=$("floatsync"), q=store.queue.length;
  var off=navigator.onLine===false;
  if(!API){ p.className="syncpill bad"; p.textContent="還沒連上試算表（只存在這支手機）"; t.textContent=""; f.hidden=true; return; }
  if(!code()||store.needCode){ p.className="syncpill bad"; p.textContent=store.needCode==="no_code_set"?"後台還沒設定通關密語":"需要輸入通關密語"; }
  else if(off){ p.className="syncpill bad"; p.textContent=q?"沒有網路，"+q+" 筆改動等上傳":"沒有網路，顯示手機裡的版本"; }
  else if(store.syncing){ p.className="syncpill wait"; p.textContent=q?"上傳中⋯":"同步中⋯"; }
  else if(store.err){ p.className="syncpill bad"; p.textContent=q?"上傳沒成功，"+q+" 筆改動稍後再試":"連不上試算表，顯示手機裡的版本"; }
  else if(q){ p.className="syncpill wait"; p.textContent=q+" 筆改動等上傳"; }
  else { p.className="syncpill"; p.textContent="已同步"; }
  t.textContent=ago(store.lastOk);
  if(q&&(off||store.err)){ f.hidden=false; f.textContent="改動已存在手機裡，有訊號時會自動上傳（"+q+" 筆）"; }
  else f.hidden=true;
}

/* ---------- 由資料組出畫面用的結構 ---------- */
var DAYS=[], MEMBERS=[];
function rebuild(){
  var d=store.data||EMPTY;
  var byDay={};
  d.items.forEach(function(r){
    if(!r||!r.id||!r.day||!r.x) return;
    (byDay[r.day]=byDay[r.day]||[]).push({id:String(r.id),day:String(r.day),ord:num(r.ord),t:r.t||"",x:r.x,note:r.note||"",links:J(r.links,[]),g:r.g||"",k:r.k||"plan"});
  });
  DAYS=d.days.filter(function(r){ return r&&r.id; }).map(function(r){
    var items=(byDay[String(r.id)]||[]).sort(function(a,b){ return a.ord-b.ord||(a.id<b.id?-1:1); });
    return {n:num(r.id),date:r.date||"",dow:r.dow||"",title:r.title||"",lodging:r.lodging||"",ll:J(r.ll,[]),meals:J(r.meals,[["早餐","—",""],["午餐","—",""],["晚餐","—",""]]),sun:r.sun==="1"||r.sun===true,grp:r.grp||"",rem:J(r.rem,[]),items:items};
  }).sort(function(a,b){ return a.n-b.n; });
  MEMBERS=d.members.filter(function(m){ return m&&m.id; }).map(function(m){ return {id:String(m.id),name:String(m.name||m.id)}; }).sort(function(a,b){ return num(a.id)-num(b.id); });
}
function dayByN(n){ for(var i=0;i<DAYS.length;i++) if(DAYS[i].n===n) return DAYS[i]; return null; }
function itemRow(it,day,ord){ return {id:it.id,day:String(day),ord:String(ord),t:it.t,x:it.x,note:it.note||"",links:it.links||[],g:it.g||"",k:it.k||"plan"}; }
function dayRow(d){ return {id:String(d.n),date:d.date,dow:d.dow,title:d.title,lodging:d.lodging,ll:d.ll,meals:d.meals,sun:d.sun?"1":"",grp:d.grp,rem:d.rem}; }
function findItem(id){
  for(var a=0;a<DAYS.length;a++) for(var b=0;b<DAYS[a].items.length;b++) if(DAYS[a].items[b].id===id) return {d:DAYS[a],i:b,it:DAYS[a].items[b]};
  return null;
}
function maxOrd(d){ var m=0; d.items.forEach(function(i){ if(i.ord>m) m=i.ord; }); return m; }

/* ---------- 通關密語 ---------- */
function askCode(){
  if($("codedlg")) return;
  var dlg=h("dialog",{id:"codedlg","aria-label":"通關密語"});
  var inp=h("input",{type:"text",autocomplete:"off",autocapitalize:"off",spellcheck:"false","aria-label":"通關密語"});
  var err=h("div",{class:"dlgerr",role:"alert",text:store.needCode==="bad_code"&&code()?"密語不對，請再確認一次。":store.needCode==="no_code_set"?"後台還沒設定通關密語，請先依設定步驟設定。":""});
  var go=h("button",{type:"submit",class:"btn solid",text:"確認"});
  var form=h("form",{method:"dialog",onsubmit:function(e){
    e.preventDefault(); var v=inp.value.trim(); if(!v){ err.textContent="請輸入密語。"; return; }
    if(navigator.onLine===false){ err.textContent="現在沒有網路，有訊號時再輸入。"; return; }
    go.disabled=true; err.textContent="確認中⋯";
    var prev=code(); lsSet("trip-k",v);
    fetchT(API,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({k:v,a:"rev"})},20000).then(function(r){
      if(r&&r.ok){ store.needCode=""; dlg.close(); load(); return; }
      lsSet("trip-k",prev);
      err.textContent=(r&&r.error==="no_code_set")?"後台還沒設定通關密語，請先依設定步驟設定。":"密語不對，請再確認一次。";
    }).catch(function(){ lsSet("trip-k",prev); err.textContent="連不上，請確認網路後再試。"; }).then(function(){ go.disabled=false; });
  }},
    h("h3",{text:"請輸入通關密語"}),
    h("p",{class:"sub",style:"margin-bottom:.7rem",text:"密語請向揪團的人要。輸入一次之後，這支手機會記住。"}),
    h("label",{class:"fld"},h("span",{text:"通關密語"}),inp),err,
    h("div",{class:"dlgbt"},h("button",{type:"button",class:"btn",text:"先不要",onclick:function(){ dlg.close(); }}),go));
  dlg.append(form);
  dlg.addEventListener("close",function(){ dlg.remove(); syncStatus(); maybeAskWho(); flushRender(); });
  document.body.append(dlg);
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
  inp.focus();
}

/* ---------- 我是誰 ---------- */
function meId(){ return lsGet("trip-me"); }
function memberName(id){ for(var i=0;i<MEMBERS.length;i++) if(MEMBERS[i].id===String(id)) return MEMBERS[i].name; return ""; }
function meName(){ var id=meId(); return id?(memberName(id)||String(id)):"未選擇"; }
function renderMe(){ var id=meId(); $("mebtn").textContent="我是："+(id?(memberName(id)||id):"還沒選"); }
function whoDialog(first){
  var dlg=h("dialog",{"aria-label":"我是誰"});
  var grid=h("div",{class:"who-grid"});
  MEMBERS.forEach(function(m){
    grid.append(h("button",{type:"button","aria-pressed":String(meId()===m.id),text:m.name,onclick:function(){ lsSet("trip-me",m.id); dlg.close(); renderMe(); if(state.tab==="packing"){ pk.person=m.id; renderPacking(); } else renderAll(); }}));
  });
  dlg.append(h("h3",{text:"你是哪一位？"}),
    h("p",{class:"sub",style:"margin-bottom:.7rem",text:"選了之後，準備清單會顯示你自己的，改行程時也會記下是誰改的。名字可以到「成員」分頁改。"}),
    grid,
    h("div",{class:"dlgbt"},h("button",{type:"button",class:"btn",text:first?"先看看，等一下再選":"取消",onclick:function(){ dlg.close(); }})));
  dlg.addEventListener("close",function(){ dlg.remove(); flushRender(); });
  document.body.append(dlg);
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
}

/* ---------- 文字大小 ---------- */
var FS=[18,21,24,28], FSN=["標準","大","特大","超大"], fsIdx=0;
function setFs(i){
  fsIdx=Math.max(0,Math.min(FS.length-1,i));
  document.documentElement.style.fontSize=FS[fsIdx]+"px";
  FS.forEach(function(_,k){ document.documentElement.classList.toggle("fs-"+k,k===fsIdx); });
  [].forEach.call(document.querySelectorAll("#fsbar button"),function(b){ b.setAttribute("aria-pressed",String(+b.getAttribute("data-fs")===fsIdx)); });
  var c=$("fs-cycle"); if(c) c.textContent="字 "+FSN[fsIdx];
  lsSet("ice-fs",fsIdx);
}
function initFs(){
  var bar=$("fsbar");
  FSN.forEach(function(n,k){ bar.append(h("button",{type:"button","data-fs":String(k),"aria-pressed":"false",text:n,onclick:function(){ setFs(k); }})); });
  $("fs-cycle").addEventListener("click",function(){ setFs((fsIdx+1)%FS.length); });
  var s=lsGet("ice-fs"); setFs(typeof s==="number"?s:0);
}

/* ---------- 狀態與分頁 ---------- */
var state={tab:"trip",day:0};
var edit={on:false};
var TRIP_START=new Date(2026,10,13), TRIP_END=new Date(2026,10,24);
function today(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
function dayIndexToday(){ var t=today(); if(t<TRIP_START||t>TRIP_END) return 0; return Math.round((t-TRIP_START)/86400000)+1; }
function renderStatus(){
  var t=today(), el=$("status");
  if(t<TRIP_START) el.textContent="距離出發還有 "+Math.round((TRIP_START-t)/86400000)+" 天";
  else if(t<=TRIP_END) el.textContent="旅途中，今天是第 "+dayIndexToday()+" 天";
  else el.textContent="旅程已結束，歡迎平安回家";
}
var TABS=["trip","packing","notes","help","todo","members"];
function showTab(name){
  state.tab=name;
  TABS.forEach(function(n){ $("panel-"+n).hidden=(n!==name); $("tab-"+n).setAttribute("aria-selected",String(n===name)); });
  renderTab();
}
function renderTab(){
  if(state.tab==="trip"){ if(edit.on) renderEdit(); else renderTrip(); }
  if(state.tab==="packing") renderPacking();
  if(state.tab==="notes") renderNotes();
  if(state.tab==="help") renderHelp();
  if(state.tab==="todo") renderTodo();
  if(state.tab==="members") renderMembers();
}
function renderAll(){
  if(store.holdRender||openDialog()){ store.pendingRender=true; return; }
  store.pendingRender=false;
  var y=window.scrollY;
  renderMe(); updateCounts(); renderTab();
  window.scrollTo(0,y);
}
function openDialog(){ return !!document.querySelector("dialog[open]"); }
function flushRender(){ if(store.pendingRender) renderAll(); }

/* ---------- 行程 ---------- */
function renderChips(){
  var box=$("chips"); box.textContent="";
  var td=dayIndexToday();
  box.append(h("button",{class:"chip",type:"button",role:"tab","aria-selected":String(state.day===0),onclick:function(){ state.day=0; renderTrip(); }},h("small",{text:"全部"}),h("b",{text:"總覽"})));
  DAYS.forEach(function(d){
    box.append(h("button",{class:"chip"+(td===d.n?" today":""),type:"button",role:"tab","aria-selected":String(state.day===d.n),onclick:function(){ state.day=d.n; renderTrip(); window.scrollTo(0,0); }},
      h("small",{text:"第 "+d.n+" 天"+(td===d.n?"（今天）":"")}),h("b",{text:d.date+"（"+d.dow+"）"})));
  });
}
function flagCount(d){ var n=0; d.items.forEach(function(i){ if(i.k==="gap") n++; }); d.meals.forEach(function(m){ if(m[2]&&/需要|未填|待補|可能趕不上/.test(m[2])) n++; }); return n; }
function renderTrip(){
  renderChips();
  var v=$("dayview"); v.textContent="";
  if(!DAYS.length){ v.append(h("div",{class:"card"},h("p",{class:"empty",text:"還沒有行程資料。第一次使用要連上網路，並輸入通關密語。"}),h("div",{class:"btns"},h("button",{type:"button",class:"btn solid",text:"輸入通關密語",onclick:askCode})))); return; }
  var d=state.day?dayByN(state.day):null;
  if(!d){ state.day=0; v.append(renderOverview()); return; }
  var r=renderDay(d); v.append(r.box);
  initDaySortable(r.tl,d);
}
function renderOverview(){
  var box=h("div",{class:"stack"});
  box.append(h("h2",{class:"sec-title",text:DAYS.length+" 天一覽"}),h("p",{class:"sub",text:"點任何一天，就會打開那天的完整安排。"}));
  var g=h("div",{class:"ov"});
  DAYS.forEach(function(d){
    var f=flagCount(d);
    g.append(h("button",{class:"ov-row",type:"button",onclick:function(){ state.day=d.n; renderTrip(); window.scrollTo(0,0); }},
      h("div",{class:"no"},String(d.n),h("small",{text:d.date+"（"+d.dow+"）"})),
      h("div",{},h("div",{class:"t",text:d.title}),h("div",{class:"m",text:"住："+d.lodging}),f?h("div",{class:"m"},h("span",{class:"flag",text:f+" 項待確認"})):null)));
  });
  box.append(g);
  return box;
}
function renderDay(d){
  var box=h("div",{class:"stack"});
  var head=h("div",{class:"dayhead"},
    h("div",{class:"when",text:"第 "+d.n+" 天・"+d.date+"（"+d.dow+"）"}),
    h("h2",{text:d.title}),
    h("div",{class:"row"},h("span",{class:"pill lodge",text:"今晚住："+d.lodging}),d.sun?h("span",{class:"pill sun",text:"日出約 10:00，天黑約 16:00"}):null));
  if(d.ll&&d.ll.length) head.append(h("div",{class:"btns"},d.ll.map(linkBtn)));
  box.append(head);
  if(d.grp) box.append(h("div",{class:"card"},h("p",{class:"sub",text:d.grp})));
  var meals=h("div",{class:"meals"});
  d.meals.forEach(function(m){ meals.append(h("div",{class:"meal"},h("div",{class:"k",text:m[0]}),h("div",{class:"v",text:m[1]}),m[2]?h("div",{class:"n",text:m[2]}):null)); });
  box.append(meals);
  var tl=h("ul",{class:"tl","data-day":String(d.n)});
  d.items.forEach(function(i){
    var tm=h("div",{class:"tm"},i.k==="gap"?h("span",{class:"tag gap",text:"待確認"}):i.t);
    var body=h("div",{},h("div",{class:"tx"},i.g?h("span",{class:"tag grp",text:GRP[i.g]||i.g}):null,i.x));
    if(i.k==="gap"&&i.t&&i.t!=="待確認") body.append(h("div",{class:"nt",text:"時間："+i.t}));
    if(i.note) body.append(h("div",{class:"nt",text:i.note}));
    if(i.links&&i.links.length) body.append(h("div",{class:"btns"},i.links.map(linkBtn)));
    tl.append(h("li",{class:"it "+(i.k==="gap"?"gap":""),"data-id":i.id},tm,body));
  });
  box.append(h("h3",{class:"sec-title",text:"今天的安排"}),h("p",{class:"hint",text:"想改行程：按住那一列約 1 秒再放開，就能編輯或刪除。一直按住約 2 秒，就能拖曳換順序。改完會自動存檔，大家都看得到。"}),tl);
  if(d.rem&&d.rem.length){
    var rl=h("ul",{class:"rem"});
    d.rem.forEach(function(id){ var n=NOTES[id]; if(n) rl.append(h("li",{},h("b",{text:n[0]+"："}),n[1])); });
    box.append(h("h3",{class:"sec-title",text:"今天要記得"}),rl);
  }
  if(d.items.some(function(i){ return i.k==="gap"; })) box.append(h("div",{class:"legend"},h("span",{},h("span",{class:"tag gap",text:"待確認"}),"前後對不起來或還沒填")));
  var nav=h("div",{class:"btns"});
  var idx=DAYS.indexOf(d);
  if(idx>0) nav.append(h("button",{class:"btn",type:"button",text:"前一天",onclick:function(){ state.day=DAYS[idx-1].n; renderTrip(); window.scrollTo(0,0); }}));
  if(idx<DAYS.length-1) nav.append(h("button",{class:"btn solid",type:"button",text:"下一天",onclick:function(){ state.day=DAYS[idx+1].n; renderTrip(); window.scrollTo(0,0); }}));
  box.append(nav);
  box.append(h("div",{class:"btns"},
    h("button",{class:"btn",type:"button",text:"新增一項行程",onclick:function(){ itemDialog(d,null); }}),
    h("button",{class:"btn",type:"button",text:"編輯這天的標題與三餐",onclick:function(){ dayDialog(d); }})));
  return {box:box,tl:tl};
}

/* ---------- 編輯視窗 ---------- */
function parseLinks(text){
  var out=[], err=null;
  String(text||"").split(/\r?\n/).forEach(function(line,k){
    line=line.trim(); if(!line||err) return;
    var m=/^(.*?)\s*(https:\/\/\S+)$/.exec(line);
    if(!m){ err="連結第 "+(k+1)+" 行要寫成「名稱 空一格 https://網址」，只接受 https 開頭的網址。"; return; }
    out.push([m[1].trim()||"連結",m[2]]);
  });
  return {links:out,err:err};
}
function linksText(ls){ return (ls||[]).map(function(l){ return l[0]+" "+l[1]; }).join("\n"); }
function openDlg(title,fields,onSave,onDelete){
  var dlg=h("dialog",{"aria-label":title});
  var form=h("form",{method:"dialog"});
  var inputs={};
  form.append(h("h3",{text:title}));
  fields.forEach(function(f){
    var el;
    if(f.type==="textarea") el=h("textarea",{rows:f.rows||3});
    else if(f.type==="select"){ el=h("select"); f.options.forEach(function(o){ el.append(h("option",{value:o[0],text:o[1]})); }); }
    else el=h("input",{type:"text"});
    el.value=f.value==null?"":f.value; inputs[f.key]=el;
    form.append(h("label",{class:"fld"},h("span",{text:f.label}),el,f.hint?h("span",{class:"hint",text:f.hint}):null));
  });
  var err=h("div",{class:"dlgerr",role:"alert"});
  var bt=h("div",{class:"dlgbt"});
  if(onDelete) bt.append(armBtn(h("button",{type:"button",class:"btn warn",text:"刪除這項"}),"刪除這項","再按一次才會刪除",function(){ dlg.close(); onDelete(); }));
  bt.append(h("button",{type:"button",class:"btn",text:"取消",onclick:function(){ dlg.close(); }}));
  bt.append(h("button",{type:"submit",class:"btn solid",text:"儲存"}));
  form.append(err,bt);
  var saved=null;
  form.addEventListener("submit",function(e){
    e.preventDefault();
    var v={}; Object.keys(inputs).forEach(function(k){ v[k]=inputs[k].value; });
    var r=onSave(v);
    if(typeof r==="string"){ err.textContent=r; return; }
    saved=r; dlg.close();
  });
  dlg.addEventListener("close",function(){ dlg.remove(); if(saved) commit(saved); else flushRender(); });
  dlg.append(form); document.body.append(dlg);
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open","");
}
function dayOptions(){ return DAYS.map(function(d){ return [String(d.n),"第 "+d.n+" 天 "+d.date+"（"+d.dow+"）"]; }); }
function itemDialog(d,it){
  var isNew=!it;
  var cur=it||{id:newId("i"),t:"",x:"",note:"",links:[],g:"",k:"plan"};
  openDlg(isNew?"新增行程（第 "+d.n+" 天）":"編輯行程",[
    {key:"t",label:"時間（例如 09:00、中午、晚上）",value:cur.t},
    {key:"x",label:"要做什麼",type:"textarea",rows:3,value:cur.x},
    {key:"note",label:"備註（可不填）",type:"textarea",rows:3,value:cur.note||""},
    {key:"k",label:"這一項的狀態",type:"select",options:[["plan","一般行程"],["gap","待確認（橘色框）"]],value:cur.k==="gap"?"gap":"plan"},
    {key:"g",label:"適用對象",type:"select",options:[["","全體"],["back","返台組"],["stay","留倫敦組"]],value:cur.g||""},
    {key:"day",label:"放在哪一天",type:"select",options:dayOptions(),value:String(d.n)},
    {key:"links",label:"連結（可不填）",type:"textarea",rows:3,value:linksText(cur.links),hint:"一行一個，寫法：名稱 空一格 https://網址"}
  ],function(v){
    if(!v.x.trim()) return "「要做什麼」不能空白。";
    var pl=parseLinks(v.links); if(pl.err) return pl.err;
    var to=dayByN(+v.day)||d;
    var ord=(!isNew&&to===d)?cur.ord:maxOrd(to)+10;
    var o={id:cur.id,t:v.t.trim()||"—",x:v.x.trim(),note:v.note.trim(),links:pl.links,g:v.g,k:v.k};
    return [{t:"items",row:itemRow(o,to.n,ord)}];
  },isNew?null:function(){ commit([{t:"items",op:"del",row:{id:cur.id}}]); });
}
function dayDialog(d){
  var fields=[
    {key:"title",label:"這天的標題",value:d.title},
    {key:"lodging",label:"今晚住哪裡",value:d.lodging},
    {key:"ll",label:"住宿連結（可不填）",type:"textarea",rows:2,value:linksText(d.ll),hint:"一行一個，寫法：名稱 空一格 https://網址"}
  ];
  d.meals.forEach(function(m,k){
    fields.push({key:"m"+k,label:m[0]+"吃什麼",value:m[1]});
    fields.push({key:"n"+k,label:m[0]+"備註（可不填）",value:m[2]||""});
  });
  openDlg("編輯第 "+d.n+" 天（"+d.date+"）",fields,function(v){
    if(!v.title.trim()) return "標題不能空白。";
    var pl=parseLinks(v.ll); if(pl.err) return pl.err;
    var nd=Object.assign({},d,{title:v.title.trim(),lodging:v.lodging.trim()||"—",ll:pl.links,
      meals:d.meals.map(function(m,k){ return [m[0],v["m"+k].trim()||"—",v["n"+k].trim()]; })});
    return [{t:"days",row:dayRow(nd)}];
  });
}

/* ---------- 長按編輯、長按更久拖曳（單日畫面） ---------- */
var HOLD_EDIT=700, HOLD_DRAG=1800;
var LP={t1:null,t2:null,li:null,x:0,y:0,ready:false,dragging:false,kind:null};
function showTip(t){ var e=$("holdtip"); if(!e){ e=h("div",{id:"holdtip",role:"status"}); document.body.append(e); } e.textContent=t; }
function hideTip(){ var e=$("holdtip"); if(e) e.remove(); }
function lpClear(){
  clearTimeout(LP.t1); clearTimeout(LP.t2);
  if(LP.li) LP.li.classList.remove("hold");
  hideTip(); LP.li=null; LP.ready=false; LP.kind=null;
}
function initHold(){
  var dv=$("dayview");
  dv.addEventListener("pointerdown",function(e){
    if(edit.on||LP.dragging) return;
    if(e.pointerType==="mouse"&&e.button!==0) return;
    if(e.target.closest("a,button,input,select,textarea")) return;
    var li=e.target.closest(".tl > .it[data-id]"), kind=null, el=null;
    if(li){ kind="item"; el=li; } else { el=e.target.closest(".dayhead,.meals"); if(el) kind="day"; }
    if(!el) return;
    lpClear();
    LP.li=el; LP.kind=kind; LP.x=e.clientX; LP.y=e.clientY;
    LP.t1=setTimeout(function(){
      LP.ready=true; el.classList.add("hold");
      showTip(kind==="item"?"現在放開＝編輯　繼續按住＝拖曳":"現在放開＝編輯這天");
      try{ if(navigator.vibrate) navigator.vibrate(20); }catch(x){}
    },HOLD_EDIT);
    if(kind==="item") LP.t2=setTimeout(function(){
      LP.ready=false; el.classList.remove("hold"); showTip("可以拖曳了，移動手指換位置");
      try{ if(navigator.vibrate) navigator.vibrate(40); }catch(x){}
    },HOLD_DRAG);
  });
  dv.addEventListener("pointermove",function(e){
    if(!LP.li||LP.dragging) return;
    if(Math.abs(e.clientX-LP.x)>10||Math.abs(e.clientY-LP.y)>10) lpClear();
  });
  dv.addEventListener("pointerup",function(){
    if(!LP.li) return;
    var ok=LP.ready, kind=LP.kind, id=LP.li.getAttribute("data-id");
    lpClear();
    if(!ok||LP.dragging) return;
    if(kind==="item"){ var f=findItem(id); if(f) itemDialog(f.d,f.it); }
    else if(kind==="day"&&state.day>0){ var d=dayByN(state.day); if(d) dayDialog(d); }
  });
  dv.addEventListener("pointercancel",function(){ if(!LP.dragging) lpClear(); });
  dv.addEventListener("contextmenu",function(e){ if(!edit.on&&e.target.closest(".tl > .it[data-id]")) e.preventDefault(); });
}
function orderOps(ul,dayN){
  var ops=[], d=dayByN(dayN);
  [].forEach.call(ul.children,function(li,k){
    var f=findItem(li.getAttribute("data-id")); if(!f) return;
    var ord=(k+1)*10;
    if(f.d.n!==dayN||f.it.ord!==ord) ops.push({t:"items",row:itemRow(f.it,dayN,ord)});
  });
  return ops;
}
function initDaySortable(ul,d){
  if(!window.Sortable||!ul) return;
  window.Sortable.create(ul,{
    animation:150,ghostClass:"ghost",delay:HOLD_DRAG,delayOnTouchOnly:false,touchStartThreshold:10,
    scroll:true,scrollSensitivity:90,scrollSpeed:14,
    onStart:function(){ LP.dragging=true; store.holdRender=true; clearTimeout(LP.t1); clearTimeout(LP.t2); if(LP.li) LP.li.classList.remove("hold"); LP.ready=false; showTip("拖到想要的位置再放開"); },
    onEnd:function(){
      hideTip(); LP.li=null; LP.kind=null;
      var ops=orderOps(ul,d.n);
      setTimeout(function(){ LP.dragging=false; store.holdRender=false; if(ops.length) commit(ops); else flushRender(); },0);
    }
  });
}

/* ---------- 跨天整理 ---------- */
function editItemLi(d,i){
  var tm=h("div",{class:"tm"},i.k==="gap"?h("span",{class:"tag gap",text:"待確認"}):i.t);
  var body=h("div",{},h("div",{class:"tx"},i.g?h("span",{class:"tag grp",text:GRP[i.g]||i.g}):null,i.x));
  if(i.note) body.append(h("div",{class:"nt",text:i.note}));
  var acts=h("div",{class:"acts"},
    h("button",{type:"button",class:"btn",text:"編輯",onclick:function(){ itemDialog(d,i); }}),
    armBtn(h("button",{type:"button",class:"btn warn",text:"刪除"}),"刪除","再按一次才會刪除",function(){ commit([{t:"items",op:"del",row:{id:i.id}}]); }));
  return h("li",{class:"it ed "+(i.k==="gap"?"gap":""),"data-id":i.id},
    h("button",{type:"button",class:"grab","aria-label":"按住拖曳，調整順序或移到別天",text:"⠿"}),h("div",{},tm,body),acts);
}
function renderEdit(){
  var box=$("chips"); box.textContent="";
  DAYS.forEach(function(d){
    box.append(h("button",{class:"chip",type:"button",onclick:function(){ var e=$("ed-d"+d.n); if(e) e.scrollIntoView(); }},h("small",{text:"第 "+d.n+" 天"}),h("b",{text:d.date+"（"+d.dow+"）"})));
  });
  var v=$("dayview"); v.textContent="";
  var s=h("div",{class:"stack"});
  s.append(h("div",{class:"card editnote"},h("p",{text:"跨天整理：按住每一列左邊的「⠿」可以拖曳，調整順序，也可以拖到別天。放開就會自動存檔。"})));
  DAYS.forEach(function(d){
    var ul=h("ul",{class:"tl sortable","data-day":String(d.n)});
    d.items.forEach(function(i){ ul.append(editItemLi(d,i)); });
    s.append(h("section",{class:"card edday",id:"ed-d"+d.n},
      h("div",{class:"eh"},h("h3",{text:"第 "+d.n+" 天・"+d.date+"（"+d.dow+"）"}),h("div",{class:"tx",text:d.title})),
      h("div",{class:"editbar"},h("button",{type:"button",class:"btn solid",text:"新增行程",onclick:function(){ itemDialog(d,null); }})),
      h("div",{style:"height:.6rem"}),ul));
  });
  v.append(s);
  if(!window.Sortable) return;
  [].forEach.call(v.querySelectorAll("ul.sortable"),function(ul){
    window.Sortable.create(ul,{group:"items",handle:".grab",animation:150,ghostClass:"ghost",delay:120,delayOnTouchOnly:true,touchStartThreshold:4,emptyInsertThreshold:30,scroll:true,scrollSensitivity:90,scrollSpeed:14,
      onStart:function(){ store.holdRender=true; },
      onEnd:function(){
        var ops=[];
        [].forEach.call(v.querySelectorAll("ul.sortable"),function(u){ ops=ops.concat(orderOps(u,+u.getAttribute("data-day"))); });
        setTimeout(function(){ store.holdRender=false; if(ops.length) commit(ops); else renderEdit(); },0);
      }});
  });
}
function enterEdit(){ edit.on=true; document.documentElement.classList.add("editing"); $("pubbar").hidden=false; $("editbtn").hidden=true; showTab("trip"); window.scrollTo(0,0); }
function leaveEdit(){ edit.on=false; document.documentElement.classList.remove("editing"); $("pubbar").hidden=true; $("editbtn").hidden=false; renderTrip(); window.scrollTo(0,0); }

/* ---------- 準備清單 ---------- */
var pk={person:null,manage:false};
function packRec(person,item){ var d=store.data||EMPTY; var id=person+"|"+item; for(var i=0;i<d.packP.length;i++) if(d.packP[i].id===id) return d.packP[i]; return null; }
function templ(){ var d=store.data||EMPTY; return d.packT.filter(function(t){ return t&&t.id&&t.text; }).sort(function(a,b){ return num(a.ord)-num(b.ord); }); }
function customs(person){ var d=store.data||EMPTY; return d.packP.filter(function(r){ return r&&r.person===String(person)&&!r.item&&r.text; }); }
function progress(person){
  var need=0, done=0;
  templ().forEach(function(t){ var r=packRec(person,t.id); if(r&&r.skip==="1") return; need++; if(r&&r.done==="1") done++; });
  customs(person).forEach(function(r){ need++; if(r.done==="1") done++; });
  return {need:need,done:done};
}
function setPack(person,t,patch){
  var r=packRec(person,t.id)||{};
  commit([{t:"packP",row:{id:person+"|"+t.id,person:String(person),item:t.id,text:"",done:patch.done!=null?patch.done:(r.done||""),skip:patch.skip!=null?patch.skip:(r.skip||"")}}]);
}
function updateCounts(){
  var me=meId();
  if(me){ var p=progress(me); $("pk-cnt").textContent=" "+p.done+"/"+p.need; } else $("pk-cnt").textContent="";
  $("td-cnt").textContent=" "+TODO_COUNT;
}
function renderPacking(){
  var p=$("panel-packing"); p.textContent="";
  if(!pk.person) pk.person=meId()||(MEMBERS[0]&&MEMBERS[0].id);
  var person=pk.person, pname=memberName(person)||person, isMe=person===meId();
  var box=h("div",{class:"stack"});
  box.append(h("h2",{class:"sec-title",text:"準備清單"}),
    h("p",{class:"sub",text:"大家共用同一份範本，每個人勾自己的。用不到的按「我不用帶」，要多帶的加在下面「自己加帶」。"}));
  var ps=h("div",{class:"persons",role:"group","aria-label":"看誰的清單"});
  MEMBERS.forEach(function(m){ ps.append(h("button",{type:"button","aria-pressed":String(m.id===person),text:m.name+(m.id===meId()?"（我）":""),onclick:function(){ pk.person=m.id; renderPacking(); }})); });
  box.append(ps);
  var pr=progress(person);
  box.append(h("p",{class:"progress",text:(isMe?"我":pname)+"已準備 "+pr.done+" / "+pr.need+" 項"}));
  if(!meId()) box.append(h("div",{class:"card"},h("p",{},"還沒選「我是誰」。",h("button",{type:"button",class:"btn",style:"margin-left:.4rem",text:"選擇",onclick:function(){ whoDialog(false); }}))));

  var groups={}, order=[];
  templ().forEach(function(t){ if(!groups[t.grp]){ groups[t.grp]=[]; order.push(t.grp); } groups[t.grp].push(t); });
  order.forEach(function(g){
    var card=h("div",{class:"card group"},h("h3",{text:g||"其他"}));
    groups[g].forEach(function(t){
      var r=packRec(person,t.id)||{}, skip=r.skip==="1", cid="c_"+person+"_"+t.id;
      var inp=h("input",{type:"checkbox",id:cid,disabled:skip,onchange:function(e){ setPack(person,t,{done:e.target.checked?"1":""}); }});
      inp.checked=r.done==="1";
      var acts=h("div",{class:"acts2"},
        h("button",{type:"button",class:"mini"+(skip?" on":""),text:skip?"改回要帶":"我不用帶",onclick:function(){ setPack(person,t,{skip:skip?"":"1"}); }}));
      if(pk.manage) acts.append(armBtn(h("button",{type:"button",class:"mini",text:"從範本刪除"}),"從範本刪除","再按一次：大家都會少這一項",function(){ commit([{t:"packT",op:"del",row:{id:t.id}}]); }));
      card.append(h("div",{class:"chk"+(skip?" skip":"")},inp,h("div",{},h("label",{for:cid,text:t.text}),acts)));
    });
    box.append(card);
  });

  var mine=h("div",{class:"card group"},h("h3",{text:(isMe?"我":pname)+"自己加帶"}));
  var cs=customs(person);
  if(!cs.length) mine.append(h("p",{class:"empty",text:"還沒有。例如暖暖包、遊戲機、常備藥，都可以加在這裡，只會出現在這個人的清單。"}));
  cs.forEach(function(r){
    var cid="cc_"+r.id;
    var inp=h("input",{type:"checkbox",id:cid,onchange:function(e){ commit([{t:"packP",row:{id:r.id,person:r.person,item:"",text:r.text,done:e.target.checked?"1":"",skip:""}}]); }});
    inp.checked=r.done==="1";
    mine.append(h("div",{class:"chk"},inp,h("div",{},h("label",{for:cid,text:r.text}),
      h("div",{class:"acts2"},armBtn(h("button",{type:"button",class:"mini",text:"刪除"}),"刪除","再按一次才會刪除",function(){ commit([{t:"packP",op:"del",row:{id:r.id}}]); })))));
  });
  var add=h("input",{type:"text",placeholder:"要加帶的東西",autocomplete:"off","aria-label":"要加帶的東西"});
  mine.append(h("form",{class:"addrow",onsubmit:function(e){ e.preventDefault(); var v=add.value.trim(); if(!v) return;
    commit([{t:"packP",row:{id:newId("c"),person:String(person),item:"",text:v,done:"",skip:""}}]); }},add,h("button",{type:"submit",class:"btn solid",text:"加入"})));
  box.append(mine);

  box.append(renderShared());

  var all=h("div",{class:"card"},h("h3",{class:"sec-title",text:"大家的進度"}));
  MEMBERS.forEach(function(m){
    var q=progress(m.id), pct=q.need?Math.round(q.done*100/q.need):0;
    all.append(h("div",{class:"prog-row"},h("div",{text:m.name+(m.id===meId()?"（我）":"")}),h("div",{class:"sub",text:q.done+" / "+q.need}),h("div",{class:"bar"},h("i",{style:"width:"+pct+"%"}))));
  });
  box.append(all);

  var tm=h("div",{class:"card"},h("h3",{class:"sec-title",text:"範本（大家共用）"}),
    h("p",{class:"sub",text:"範本加了東西，每個人的清單都會多一項。"}));
  var grpSel=h("select",{"aria-label":"放在哪一類"}); order.forEach(function(g){ grpSel.append(h("option",{value:g,text:g})); });
  var tIn=h("input",{type:"text",placeholder:"大家都要帶的東西",autocomplete:"off","aria-label":"大家都要帶的東西"});
  tm.append(h("form",{class:"stack",style:"gap:.5rem;margin-top:.6rem",onsubmit:function(e){ e.preventDefault(); var v=tIn.value.trim(); if(!v) return;
      var mo=0; templ().forEach(function(t){ if(num(t.ord)>mo) mo=num(t.ord); });
      commit([{t:"packT",row:{id:newId("t"),grp:grpSel.value||"其他",text:v,ord:String(mo+10)}}]); }},
    grpSel,h("div",{class:"addrow",style:"margin-top:0"},tIn,h("button",{type:"submit",class:"btn",text:"加到範本"}))));
  tm.append(h("div",{class:"btns"},h("button",{type:"button",class:"btn",text:pk.manage?"完成管理":"管理範本（刪除項目）",onclick:function(){ pk.manage=!pk.manage; renderPacking(); }})));
  box.append(tm);
  p.append(box);
  updateCounts();
}
function renderShared(){
  var d=store.data||EMPTY;
  var card=h("div",{class:"card group"},h("h3",{text:"全團共用（一家帶一個就好）"}),h("p",{class:"sub",text:"選好誰負責帶，避免重複或漏帶。"}));
  d.shared.filter(function(r){ return r&&r.id&&r.text; }).forEach(function(r){
    var cid="s_"+r.id;
    var inp=h("input",{type:"checkbox",id:cid,onchange:function(e){ commit([{t:"shared",row:{id:r.id,text:r.text,owner:r.owner||"",done:e.target.checked?"1":""}}]); }});
    inp.checked=r.done==="1";
    var sel=h("select",{"aria-label":"誰負責帶",onchange:function(e){ commit([{t:"shared",row:{id:r.id,text:r.text,owner:e.target.value,done:r.done||""}}]); }},h("option",{value:"",text:"還沒人認領"}));
    MEMBERS.forEach(function(m){ sel.append(h("option",{value:m.id,text:m.name+" 負責"})); });
    sel.value=r.owner||"";
    card.append(h("div",{class:"shr"},inp,h("label",{for:cid,text:r.text}),sel,
      h("div",{style:"grid-column:2"},armBtn(h("button",{type:"button",class:"mini",text:"刪除"}),"刪除","再按一次才會刪除",function(){ commit([{t:"shared",op:"del",row:{id:r.id}}]); }))));
  });
  var add=h("input",{type:"text",placeholder:"例如：延長線、指甲剪",autocomplete:"off","aria-label":"新增共用物品"});
  card.append(h("form",{class:"addrow",onsubmit:function(e){ e.preventDefault(); var v=add.value.trim(); if(!v) return;
    commit([{t:"shared",row:{id:newId("s"),text:v,owner:"",done:""}}]); }},add,h("button",{type:"submit",class:"btn",text:"加入"})));
  return card;
}

/* ---------- 成員 ---------- */
function renderMembers(){
  var p=$("panel-members"); p.textContent="";
  var box=h("div",{class:"stack"});
  box.append(h("h2",{class:"sec-title",text:"成員"}),h("p",{class:"sub",text:"每個人可以把自己的編號改成名字。改好按「儲存」，大家的畫面都會更新。"}));
  var card=h("div",{class:"card"});
  MEMBERS.forEach(function(m){
    var inp=h("input",{type:"text",value:m.name,autocomplete:"off","aria-label":"第 "+m.id+" 位的名字"});
    card.append(h("form",{class:"mem",onsubmit:function(e){ e.preventDefault(); var v=inp.value.trim().slice(0,20); if(!v){ inp.value=m.name; return; }
        if(v===m.name) return; commit([{t:"members",row:{id:m.id,name:v}}]); }},
      h("div",{class:"no",text:m.id}),inp,h("button",{type:"submit",class:"btn",text:"儲存"})));
  });
  box.append(card);
  box.append(h("div",{class:"card"},h("p",{},"這支手機目前是：",h("b",{text:meName()})),h("div",{class:"btns"},h("button",{type:"button",class:"btn solid",text:"換成別人",onclick:function(){ whoDialog(false); }}))));
  p.append(box);
}

/* ---------- 提醒、有問題時、待確認 ---------- */
function renderNotes(){
  var p=$("panel-notes"); p.textContent="";
  var box=h("div",{class:"stack"});
  box.append(h("h2",{class:"sec-title",text:"提醒事項"}),h("p",{class:"sub",text:"以下是出發前整理的注意事項。"}));
  var base=h("div",{class:"card"});
  Object.keys(NOTES).forEach(function(k){ base.append(h("div",{class:"note-item"},h("div",{},h("b",{text:NOTES[k][0]+"　"}),NOTES[k][1]))); });
  box.append(base); p.append(box);
}
function renderHelp(){
  var p=$("panel-help"); p.textContent="";
  var box=h("div",{class:"stack"});
  box.append(h("h2",{class:"sec-title",text:"有問題時"}),h("p",{class:"sub",text:"先深呼吸。行程、住宿和地圖，都在「行程」分頁。"}));
  var sos=h("div",{class:"card"},h("h3",{class:"sec-title",text:"緊急電話"}));
  [["冰島：警察、救護、消防","112"],["英國：警察、救護、消防","999"],["台灣外交部：旅外國人急難救助（全球免付費）","800-0885-0885"],["台灣外交部：國內專線（人在台灣時撥）","0800-085-095"]].forEach(function(r){
    sos.append(h("div",{class:"sos"},h("div",{text:r[0]}),h("div",{class:"num",text:r[1]})));
  });
  sos.append(h("p",{class:"sub",text:"外交部全球免付費專線的適用國家請見外交部網站，冰島能否使用，出發前請再確認一次。"}));
  box.append(sos);
  [["走散了","回到最後一次大家集合的地方等，不要各自去找。再用電話聯絡。"],
   ["路況或天氣不好","出發前先看冰島的路況網站 road.is、天氣網站 vedur.is、旅遊安全網站 safetravel.is，再決定要不要照原計畫走。"],
   ["手機沒訊號","這本小冊沒網路也能打開，顯示的是最後一次同步的內容。也記得先下載離線地圖。"],
   ["車子出問題","打租車合約上的緊急電話。取車時請把合約和電話拍照存好。"],
   ["身體不舒服","先停下來休息、保暖。嚴重時直接打 112。"],
   ["護照或錢包不見","先通知同行的人。信用卡馬上掛失；護照遺失請聯絡外交部專線。"]
  ].forEach(function(q){ box.append(h("div",{class:"card qa"},h("h3",{text:q[0]}),h("p",{text:q[1]}))); });
  p.append(box);
}
function renderTodo(){
  var p=$("panel-todo"); p.textContent="";
  var box=h("div",{class:"stack"});
  box.append(h("h2",{class:"sec-title",text:"出發前待確認"}),h("p",{class:"sub",text:"整理時發現的缺漏與前後對不起來的地方。點日期可以直接跳到那一天。"}));
  TODO.forEach(function(g){
    var card=h("div",{class:"card todo-g"},h("h3",{text:g.g}));
    g.list.forEach(function(it){
      card.append(h("div",{class:"todo"},
        h("button",{class:"btn",type:"button",style:"min-height:40px;padding:0 .5rem",text:"第 "+it[0]+" 天",onclick:function(){ state.day=it[0]; showTab("trip"); window.scrollTo(0,0); }}),
        h("div",{text:it[1]})));
    });
    box.append(card);
  });
  p.append(box);
}

/* ---------- 新版本提示（離線快取） ---------- */
var wantReload=false;
function initSW(){
  if(!("serviceWorker" in navigator)||location.protocol==="file:") return;
  navigator.serviceWorker.register("sw.js").then(function(reg){
    function offer(w){
      if(!w||$("newver")) return;
      var b=h("button",{class:"newver",id:"newver",type:"button",text:"小冊有新版本，按這裡更新",onclick:function(){ wantReload=true; w.postMessage("skip"); }});
      document.body.append(b);
    }
    if(reg.waiting&&navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound",function(){
      var w=reg.installing; if(!w) return;
      w.addEventListener("statechange",function(){ if(w.state==="installed"&&navigator.serviceWorker.controller) offer(w); });
    });
    setInterval(function(){ reg.update().catch(function(){}); },30*60000);
  }).catch(function(){});
  /* 只有使用者按了「更新」才重新載入；第一次安裝離線快取時不要打斷畫面 */
  navigator.serviceWorker.addEventListener("controllerchange",function(){ if(!wantReload) return; wantReload=false; location.reload(); });
}

/* ---------- 啟動 ---------- */
function start(){
  initFs(); renderStatus();
  $("tabs").addEventListener("click",function(e){ var b=e.target.closest(".tab"); if(b) showTab(b.getAttribute("data-tab")); });
  $("mebtn").addEventListener("click",function(){ whoDialog(false); });
  $("editbtn").addEventListener("click",enterEdit);
  $("pub-done").addEventListener("click",leaveEdit);
  initHold();
  var cache=lsGet("trip-cache");
  var boot=function(data,rev){
    store.data=fill(data); store.rev=rev;
    store.queue.forEach(function(o){ applyOp(store.data,o); });
    rebuild();
    state.day=dayIndexToday();
    var hash=(location.hash||"").replace("#","");
    var m=/^d(\d{1,2})$/.exec(hash); if(m&&dayByN(+m[1])) state.day=+m[1];
    renderAll(); syncStatus();
    if(TABS.indexOf(hash)>=0) showTab(hash);
    askWho=!meId();
    load();
    setInterval(poll,POLL_MS);
    document.addEventListener("visibilitychange",function(){ if(!document.hidden) poll(); });
    window.addEventListener("online",function(){ syncStatus(); if(store.queue.length) sync(); else load(); });
    window.addEventListener("offline",syncStatus);
    setInterval(function(){ $("synctime").textContent=ago(store.lastOk); },60000);
  };
  if(cache&&cache.data) boot(cache.data,cache.rev); else boot(EMPTY,-1);
  initSW();
}
start();
})();
