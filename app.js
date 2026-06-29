// ===== BATE-PAPO AVANÇADO - FIREBASE WEB V8 - v517 =====
const firebaseConfig = {
  apiKey: "AIzaSyCdI11L3Y2GFCy4XzbpSwYGchEtFBzj6Sw",
  authDomain: "ferramentas-projeto.firebaseapp.com",
  databaseURL: "https://ferramentas-projeto.firebaseio.com",
  projectId: "ferramentas-projeto",
  storageBucket: "ferramentas-projeto.appspot.com",
  messagingSenderId: "877191590019",
  appId: "1:877191590019:web:5288a02e29c7718753abb6",
  measurementId: "G-78H1JXYJXQ"
};

window.FCM_VAPID_KEY_V512 = "BNVYSbKeSP3WM_puSG15NIO1bVIlh3pFs-dfGQsecuSjRQuoT_SuM8s8zmaqNgD1bQ5JrZle7WAYZeVigQ-6Xrg";

firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(), db=firebase.database(), storage=firebase.storage();

// Service Worker principal com Firebase Messaging + limpeza de cache antigo
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("firebase-messaging-sw.js?v=517")
    .then(reg => { try { reg.update(); } catch(e) {} console.log("SW/FCM registrado v517"); })
    .catch(console.warn);
}
const $=id=>document.getElementById(id);
let currentUser=null,currentChatUser=null,currentChatId=null,currentGroup=null,messagesListenerRef=null,mediaRecorder=null,audioChunks=[],recording=false,replyTo=null,deferredPrompt=null;

function show(id){["authScreen","homeScreen","chatScreen","profileScreen"].forEach(s=>{const el=$(s); if(el){el.classList.add("hidden"); el.style.display="none";}}); const target=$(id); if(target){target.classList.remove("hidden"); target.style.display="block";} const panel=$("infoPanel"); if(panel && id!=="chatScreen") panel.classList.add("hidden");}
function toast(m){alert(String(m||"Erro"))}
function safe(t){return String(t||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function time(ms){return new Date(ms||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
function chatId(a,b){return a<b?`${a}_${b}`:`${b}_${a}`}
function phoneDigits(v){ return String(v||"").replace(/\D/g, ""); }
function formatPhone(v){ const d=phoneDigits(v); return d ? d : ""; }
function err(e){console.error(e);let m=e&&e.message?e.message:String(e);if(m.includes("API key"))m="API KEY inválida. Confira a chave Browser no Firebase/Google Cloud.";if(m.includes("operation-not-allowed"))m="Ative Email/Senha em Authentication > Sign-in method.";if(m.includes("permission_denied"))m="Permissão negada. Confira as regras do Realtime Database/Storage.";toast(m)}
function debug(){if($("debugText"))$("debugText").textContent="Projeto: "+firebaseConfig.projectId+" | v517"}debug();

if(localStorage.theme==="light")document.body.classList.add("light");
$("btnTheme").onclick=()=>{document.body.classList.toggle("light");localStorage.theme=document.body.classList.contains("light")?"light":"dark"};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("btnInstall").classList.remove("hidden")});
$("btnInstall").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$("btnInstall").classList.add("hidden")}};
$("btnNotify").onclick=async()=>{if(!("Notification" in window))return toast("Este navegador não suporta notificação.");const p=await Notification.requestPermission();toast(p==="granted"?"Notificações ativadas.":"Notificação não permitida.")};
if("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js?v=515").catch(console.warn);

$("btnRegister").onclick=async()=>{const name=$("authName").value.trim(),phone=$("authPhone").value.trim(),email=$("authEmail").value.trim().toLowerCase(),pass=$("authPassword").value.trim();if(!name||!phone||!email||!pass)return toast("Preencha nome, telefone, email e senha.");try{const r=await auth.createUserWithEmailAndPassword(email,pass);currentUser=r.user;await db.ref("usuarios/"+currentUser.uid).set({uid:currentUser.uid,nome:name,telefone:phone,telefoneDigits:phoneDigits(phone),email,foto:"",recado:"Olá! Estou usando o Bate-papo.",online:true,ultimo_visto:Date.now()});show("homeScreen");startApp()}catch(e){err(e)}};
$("btnLogin").onclick=async()=>{const email=$("authEmail").value.trim().toLowerCase(),pass=$("authPassword").value.trim();if(!email||!pass)return toast("Preencha email e senha.");try{const r=await auth.signInWithEmailAndPassword(email,pass);currentUser=r.user;await setOnline(true);show("homeScreen");startApp()}catch(e){err(e)}};
if($("btnLogout"))$("btnLogout").onclick=async()=>{try{await setOnline(false);await auth.signOut()}catch(e){err(e)}};
auth.onAuthStateChanged(async u=>{try{if(!u){currentUser=null;show("authScreen");return}currentUser=u;await db.ref("usuarios/"+u.uid).update({uid:u.uid,email:u.email||"",online:true,ultimo_visto:Date.now()});db.ref("usuarios/"+u.uid).onDisconnect().update({online:false,ultimo_visto:firebase.database.ServerValue.TIMESTAMP});show("homeScreen");startApp()}catch(e){err(e)}});
async function setOnline(v){if(currentUser)await db.ref("usuarios/"+currentUser.uid).update({online:v,ultimo_visto:Date.now()})}
function startApp(){loadChats();loadStatuses();loadGroups()}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");["tabChats","tabStatus","tabUsers","tabGroups","tabCalls"].forEach(id=>$(id).classList.add("hidden"));$("tab"+b.dataset.tab[0].toUpperCase()+b.dataset.tab.slice(1)).classList.remove("hidden")});
function openHiddenTab(name){document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));["tabChats","tabStatus","tabUsers","tabGroups","tabCalls"].forEach(id=>$(id)?.classList.add("hidden"));const page=$("tab"+name[0].toUpperCase()+name.slice(1)); if(page) page.classList.remove("hidden");}
$("chatSearch").oninput=()=>loadChats($("chatSearch").value.trim().toLowerCase());

function avatarHtml(u){return u&&u.foto?`<img src="${u.foto}">`:"👤"}
function userItem(u,container,extra=""){const div=document.createElement("div");div.className="item";const sub=u.telefone?`📞 ${u.telefone}`:(u.recado||u.email||"");div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||u.email)}</strong><small>${safe(sub)}</small></div>${extra}`;div.onclick=()=>openChat(u);container.appendChild(div)}
$("btnSearchUser").onclick=async()=>{const email=$("searchEmail").value.trim().toLowerCase();if(!email)return toast("Digite o email do contato.");try{const snap=await db.ref("usuarios").orderByChild("email").equalTo(email).once("value");$("userList").innerHTML="";if(!snap.exists())return $("userList").innerHTML='<div class="item"><div class="item-content"><strong>Nenhum contato encontrado</strong></div></div>';snap.forEach(c=>{const u=c.val();if(u.uid!==currentUser.uid)userItem(u,$("userList"))})}catch(e){err(e)}};
function loadChats(filter=""){if(!currentUser)return;db.ref("conversas/"+currentUser.uid).orderByChild("horario").on("value",async snap=>{const list=$("chatList");list.innerHTML="";let total=0;if(!snap.exists()){list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhuma conversa ainda</strong><small>Busque um contato pelo email.</small></div></div>';$("badgeChats").textContent=0;return}const items=[];snap.forEach(c=>items.push(c.val()));items.reverse();for(const c of items){const us=await db.ref("usuarios/"+c.uidDestino).once("value"),u=us.val();if(!u)continue;const nome=(u.nome||u.email||"").toLowerCase();if(filter&&!nome.includes(filter))continue;total+=c.visto?0:1;const unread=c.visto?"":'<span class="unread">1</span>';const div=document.createElement("div");div.className="item";div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||u.email)}</strong><small>${c.tipo==="imagem"?"📷 Imagem":c.tipo==="audio"?"🎙️ Áudio":c.tipo==="documento"?"📄 Documento":c.tipo==="localizacao"?"📍 Localização":safe(c.ultima_msg)}</small></div><small>${time(c.horario)}</small>${unread}`;div.onclick=()=>openChat(u);list.appendChild(div)}$("badgeChats").textContent=total},err)}
function openChat(u){currentGroup=null;currentChatUser=u;currentChatId=chatId(currentUser.uid,u.uid);$("chatName").textContent=u.nome||u.email||"Contato";$("chatAvatar").innerHTML=avatarHtml(u);$("chatOnline").textContent=u.online?"online":"offline";db.ref("usuarios/"+u.uid).on("value",s=>{const x=s.val();if(x){$("chatOnline").textContent=x.online?"online":"visto por último "+time(x.ultimo_visto)}});show("chatScreen");listenMessages("mensagens/"+currentChatId)}
$("btnBack").onclick=()=>{if(messagesListenerRef)messagesListenerRef.off();show("homeScreen")};

function listenMessages(path){$("messagesList").innerHTML="";if(messagesListenerRef)messagesListenerRef.off();messagesListenerRef=db.ref(path);messagesListenerRef.on("child_added",s=>{const m=s.val();m.key=s.key;renderMessage(m,s.ref);if(m.para===currentUser.uid&&!m.visto)s.ref.update({visto:true});notifyIncoming(m)},err)}
function contentHtml(m){if(m.apagada)return "<i>Mensagem apagada</i>";if(m.tipo==="imagem")return `<img src="${m.url}" onclick="window.open('${m.url}','_blank')">`;if(m.tipo==="audio")return `<audio controls src="${m.url}"></audio>`;if(m.tipo==="documento")return `<a class="doc-link" href="${m.url}" target="_blank">📄 <span>${safe(m.nome||"Documento")}</span></a>`;if(m.tipo==="localizacao")return `<a class="doc-link" href="${m.url}" target="_blank">📍 Abrir localização no mapa</a>`;return safe(m.texto)}
function renderMessage(m,ref){const wrap=document.createElement("div");wrap.className="msg-wrap "+(m.de===currentUser.uid?"me":"other");wrap.innerHTML=`<div class="bubble" title="Clique para opções">${m.replyText?`<div class="reply-preview">${safe(m.replyText)}</div>`:""}${contentHtml(m)}${m.reaction?`<div class="reactions">${safe(m.reaction)}</div>`:""}<span class="time">${time(m.horario)} ${m.de===currentUser.uid?(m.visto?"✓✓":"✓"):""}</span></div>`;wrap.onclick=()=>messageMenu(m,ref);$("messagesList").appendChild(wrap);$("messagesList").scrollTop=$("messagesList").scrollHeight;updateMedia(m)}
async function messageMenu(m,ref){if(m.apagada)return;const op=prompt("Opções da mensagem:\n1 Responder\n2 Reagir\n3 Editar texto\n4 Apagar para todos\n5 Favoritar","");if(op==="1"){replyTo={key:m.key,text:m.texto||m.nome||m.tipo};$("replyText").textContent="Respondendo: "+replyTo.text;$("replyBox").classList.remove("hidden");$("messageText").focus()}else if(op==="2"){const r=prompt("Digite a reação: ❤️ 👍 😂 😮 😢 🙏",m.reaction||"❤️");if(r)await ref.update({reaction:r})}else if(op==="3"&&m.de===currentUser.uid&&m.tipo==="texto"){const t=prompt("Editar mensagem",m.texto||"");if(t!==null)await ref.update({texto:t,editada:true})}else if(op==="4"&&m.de===currentUser.uid){if(confirm("Apagar para todos?"))await ref.update({apagada:true,texto:"",url:"",tipo:"texto"})}else if(op==="5"){await db.ref("favoritos/"+currentUser.uid+"/"+m.key).set({...m,favoritado:Date.now()});toast("Mensagem favoritada.")}}
$("btnCancelReply").onclick=()=>{replyTo=null;$("replyBox").classList.add("hidden")};
async function sendMessage(data){const uid=currentUser.uid,dest=currentChatUser?currentChatUser.uid:"",horario=Date.now();const msg={de:uid,para:dest,texto:data.texto||"",tipo:data.tipo,url:data.url||"",nome:data.nome||"",horario,visto:false,replyKey:replyTo?replyTo.key:"",replyText:replyTo?replyTo.text:""};const path=currentGroup?"grupos/"+currentGroup.id+"/mensagens":"mensagens/"+currentChatId;await db.ref(path).push(msg);replyTo=null;$("replyBox").classList.add("hidden");if(!currentGroup){const last=data.tipo==="texto"?data.texto:data.tipo;await db.ref("conversas/"+uid+"/"+dest).set({uidDestino:dest,ultima_msg:last,tipo:data.tipo,horario,visto:true});await db.ref("conversas/"+dest+"/"+uid).set({uidDestino:uid,ultima_msg:last,tipo:data.tipo,horario,visto:false})}}
$("btnSend").onclick=async()=>{const t=$("messageText").value.trim();if(!t||(!currentChatUser&&!currentGroup))return;try{await sendMessage({texto:t,tipo:"texto"});$("messageText").value=""}catch(e){err(e)}};
$("btnMore").onclick=()=>$("attachMenu").classList.toggle("hidden");$("btnPickImage").onclick=()=>$("imageInput").click();$("btnPickDoc").onclick=()=>$("docInput").click();
$("imageInput").onchange=e=>uploadFile(e.target.files[0],"imagem","chat_images");$("docInput").onchange=e=>uploadFile(e.target.files[0],"documento","docs");
async function uploadFile(file,tipo,folder){if(!file)return;if(!currentChatUser&&!currentGroup)return toast("Abra uma conversa primeiro.");try{const path=`${folder}/${currentUser.uid}_${Date.now()}_${file.name}`;const r=storage.ref(path);await r.put(file);const url=await r.getDownloadURL();await sendMessage({tipo,url,nome:file.name});$("imageInput").value="";$("docInput").value="";$("attachMenu").classList.add("hidden")}catch(e){err(e)}}
$("btnLocation").onclick=()=>{if(!navigator.geolocation)return toast("GPS não disponível.");navigator.geolocation.getCurrentPosition(async p=>{const url=`https://www.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`;await sendMessage({tipo:"localizacao",url,texto:"Minha localização"});$("attachMenu").classList.add("hidden")},()=>toast("Permita a localização."))};
$("btnRecord").onclick=async()=>{if(!currentChatUser&&!currentGroup)return toast("Abra uma conversa primeiro.");if(!recording){try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});mediaRecorder=new MediaRecorder(stream);audioChunks=[];mediaRecorder.ondataavailable=e=>audioChunks.push(e.data);mediaRecorder.onstop=async()=>{const blob=new Blob(audioChunks,{type:"audio/webm"});const file=new File([blob],"audio.webm",{type:"audio/webm"});await uploadFile(file,"audio","audios")};mediaRecorder.start();recording=true;$("btnRecord").classList.add("recording");$("btnRecord").textContent="⏹️"}catch(e){toast("Permita o microfone.")}}else{mediaRecorder.stop();recording=false;$("btnRecord").classList.remove("recording");$("btnRecord").textContent="🎙️"}};
function notifyIncoming(m){if(!m||m.de===currentUser.uid||document.visibilityState==="visible")return;if("Notification" in window&&Notification.permission==="granted")new Notification("Nova mensagem",{body:m.texto||m.tipo,icon:"icon-192.png"})}
function updateMedia(m){if(!m.url||m.tipo!=="imagem"||$("infoPanel").classList.contains("hidden"))return;const img=document.createElement("img");img.src=m.url;$("mediaGrid").prepend(img)}

$("btnPostStatus").onclick=async()=>{const text=$("statusText").value.trim(),file=$("statusImage").files[0];if(!text&&!file)return toast("Digite texto ou escolha imagem.");try{let url="",tipo=text?"texto":"imagem";if(file){tipo="imagem";const r=storage.ref(`status/${currentUser.uid}_${Date.now()}_${file.name}`);await r.put(file);url=await r.getDownloadURL()}await db.ref("status/"+currentUser.uid).push({uid:currentUser.uid,tipo,texto:text,url,horario:Date.now(),expira:Date.now()+86400000});$("statusText").value="";$("statusImage").value=""}catch(e){err(e)}};
function loadStatuses(){db.ref("status").on("value",snap=>{const list=$("statusList");list.innerHTML="";const now=Date.now();if(!snap.exists())return list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhum status</strong></div></div>';snap.forEach(userNode=>userNode.forEach(stNode=>{const s=stNode.val();if(!s||s.expira<now){stNode.ref.remove();return}db.ref("usuarios/"+s.uid).once("value").then(us=>{const u=us.val()||{};const div=document.createElement("div");div.className="item";div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||"Usuário")}</strong><small>${s.tipo==="imagem"?"📷 Foto no status":safe(s.texto)}</small></div><small>${time(s.horario)}</small>`;div.onclick=()=>{if(s.tipo==="imagem")window.open(s.url,"_blank");else toast(s.texto)};list.prepend(div)})}))},err)}

$("btnCreateGroup").onclick=async()=>{const nome=$("groupName").value.trim();if(!nome)return toast("Digite o nome do grupo.");const id=db.ref("grupos").push().key;await db.ref("grupos/"+id).set({id,nome,criadoPor:currentUser.uid,membros:{[currentUser.uid]:true},horario:Date.now()});$("groupName").value="";toast("Grupo criado.")};
function loadGroups(){db.ref("grupos").on("value",snap=>{const list=$("groupList");list.innerHTML="";if(!snap.exists())return list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhum grupo</strong></div></div>';snap.forEach(c=>{const g=c.val();if(!g.membros||!g.membros[currentUser.uid])return;const div=document.createElement("div");div.className="item";div.innerHTML=`<div class="avatar">👥</div><div class="item-content"><strong>${safe(g.nome)}</strong><small>Grupo</small></div>`;div.onclick=()=>openGroup(g);list.appendChild(div)})},err)}
function openGroup(g){currentChatUser=null;currentGroup=g;$("chatName").textContent=g.nome;$("chatAvatar").innerHTML="👥";$("chatOnline").textContent="grupo";show("chatScreen");listenMessages("grupos/"+g.id+"/mensagens")}

$("btnProfile").onclick=async()=>{try{const s=await db.ref("usuarios/"+currentUser.uid).once("value"),u=s.val()||{};$("profileName").value=u.nome||"";if($("profilePhone"))$("profilePhone").value=u.telefone||"";$("profileBio").value=u.recado||"";$("profilePhotoPreview").innerHTML=avatarHtml(u);show("profileScreen")}catch(e){err(e)}};$("btnBackProfile").onclick=()=>show("homeScreen");$("btnSaveProfile").onclick=async()=>{try{const phone=$("profilePhone")?$("profilePhone").value.trim():"";const data={nome:$("profileName").value.trim(),telefone:phone,telefoneDigits:phoneDigits(phone),recado:$("profileBio").value.trim()};const f=$("profilePhoto").files[0];if(f){const r=storage.ref(`profile/${currentUser.uid}_${Date.now()}_${f.name}`);await r.put(f);data.foto=await r.getDownloadURL()}await db.ref("usuarios/"+currentUser.uid).update(data);toast("Perfil salvo.");show("homeScreen")}catch(e){err(e)}};if($("btnProfileContacts"))$("btnProfileContacts").onclick=()=>{show("homeScreen");openHiddenTab("users");loadAllContacts()};if($("btnProfileGroups"))$("btnProfileGroups").onclick=()=>{show("homeScreen");openHiddenTab("groups");loadGroups()};if($("btnProfileLogout"))$("btnProfileLogout").onclick=async()=>{try{await setOnline(false);await auth.signOut()}catch(e){err(e)}};
$("btnInfo").onclick=()=>{const u=currentChatUser;if(!u)return toast("Informações do grupo ainda simples.");$("infoAvatar").innerHTML=avatarHtml(u);$("infoName").textContent=u.nome||u.email;$("infoStatus").textContent=u.online?"online":"offline";$("infoBio").textContent=u.recado||"";$("mediaGrid").innerHTML="";$("infoPanel").classList.remove("hidden")};$("btnCloseInfo").onclick=()=>$("infoPanel").classList.add("hidden");$("infoMsg").onclick=()=>$("infoPanel").classList.add("hidden");$("infoCall").onclick=()=>toast("Chamada de áudio: precisa integrar WebRTC/servidor de chamada.");$("infoVideo").onclick=()=>toast("Chamada de vídeo: precisa integrar WebRTC/servidor de chamada.");$("btnAudioCall").onclick=$("infoCall").onclick;$("btnVideoCall").onclick=$("infoVideo").onclick;
window.addEventListener("beforeunload",()=>{if(currentUser)db.ref("usuarios/"+currentUser.uid).update({online:false,ultimo_visto:Date.now()})});

// ===== v506 - STATUS DENTRO DO APP + GRUPOS VISÍVEIS COM LIMITE DE 100 =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v506'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('firebase-messaging-sw.js?v=517').catch(console.warn); } catch(e) {}

let statusItemsV506 = [];
let statusIndexV506 = 0;
const GROUP_LIMIT = 100;

function countMembers(g){ return g && g.membros ? Object.keys(g.membros).filter(k => g.membros[k]).length : 0; }
function isMember(g){ return !!(g && g.membros && currentUser && g.membros[currentUser.uid]); }
function isOwner(g){ return !!(g && currentUser && g.criadoPor === currentUser.uid); }

// Status agora abre em uma tela dentro do app, sem abrir nova aba.
function openStatusViewer(index){
  if (!statusItemsV506.length) return;
  statusIndexV506 = Math.max(0, Math.min(index, statusItemsV506.length - 1));
  const item = statusItemsV506[statusIndexV506];
  const s = item.status, u = item.user || {};
  $('viewerAvatar').innerHTML = avatarHtml(u);
  $('viewerName').textContent = u.nome || u.email || 'Status';
  $('viewerTime').textContent = time(s.horario);
  $('viewerContent').innerHTML = s.tipo === 'imagem'
    ? `<img src="${s.url}" alt="Status">`
    : `<div class="viewer-text">${safe(s.texto || '')}</div>`;
  $('btnPrevStatus').disabled = statusIndexV506 <= 0;
  $('btnNextStatus').disabled = statusIndexV506 >= statusItemsV506.length - 1;
  $('statusViewer').classList.remove('hidden');
}
function closeStatusViewer(){ $('statusViewer').classList.add('hidden'); }
if ($('btnCloseStatus')) $('btnCloseStatus').onclick = closeStatusViewer;
if ($('btnPrevStatus')) $('btnPrevStatus').onclick = () => openStatusViewer(statusIndexV506 - 1);
if ($('btnNextStatus')) $('btnNextStatus').onclick = () => openStatusViewer(statusIndexV506 + 1);

// Substitui a listagem antiga de status.
loadStatuses = function(){
  db.ref('status').on('value', snap => {
    const list = $('statusList');
    list.innerHTML = '';
    statusItemsV506 = [];
    const now = Date.now();
    if (!snap.exists()) {
      list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum status</strong><small>Publique uma foto ou texto.</small></div></div>';
      return;
    }
    const pending = [];
    snap.forEach(userNode => userNode.forEach(stNode => {
      const s = stNode.val();
      if (!s || s.expira < now) { stNode.ref.remove(); return; }
      pending.push(db.ref('usuarios/' + s.uid).once('value').then(us => ({ status:s, user:us.val() || {} })));
    }));
    Promise.all(pending).then(items => {
      statusItemsV506 = items.sort((a,b)=>(b.status.horario||0)-(a.status.horario||0));
      if (!statusItemsV506.length) {
        list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum status</strong></div></div>';
        return;
      }
      statusItemsV506.forEach((item, index) => {
        const s = item.status, u = item.user;
        const div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = `<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome || u.email || 'Usuário')}</strong><small>${s.tipo === 'imagem' ? '📷 Foto no status' : safe(s.texto)}</small></div><small>${time(s.horario)}</small>`;
        div.onclick = () => openStatusViewer(index);
        list.appendChild(div);
      });
    });
  }, err);
};

async function joinGroup(g){
  const qtd = countMembers(g);
  if (qtd >= GROUP_LIMIT) return toast('Este grupo já chegou no limite de 100 pessoas.');
  await db.ref('grupos/' + g.id + '/membros/' + currentUser.uid).set(true);
  toast('Você entrou no grupo.');
  openGroup({...g, membros:{...(g.membros || {}), [currentUser.uid]:true}});
}
async function addMemberByEmail(){
  if (!currentGroup) return toast('Abra um grupo primeiro.');
  const email = $('groupMemberEmail').value.trim().toLowerCase();
  if (!email) return toast('Digite o email da pessoa.');
  const snapG = await db.ref('grupos/' + currentGroup.id).once('value');
  const g = snapG.val();
  if (!isOwner(g)) return toast('Somente quem criou o grupo pode adicionar pessoas.');
  if (countMembers(g) >= GROUP_LIMIT) return toast('Limite máximo de 100 pessoas atingido.');
  const snap = await db.ref('usuarios').orderByChild('email').equalTo(email).once('value');
  if (!snap.exists()) return toast('Usuário não encontrado. Ele precisa estar cadastrado.');
  let added = false;
  snap.forEach(c => {
    const u = c.val();
    if (u && u.uid) { db.ref('grupos/' + currentGroup.id + '/membros/' + u.uid).set(true); added = true; }
  });
  $('groupMemberEmail').value = '';
  toast(added ? 'Pessoa adicionada ao grupo.' : 'Não foi possível adicionar.');
}
async function leaveGroup(){
  if (!currentGroup) return;
  if (!confirm('Sair deste grupo?')) return;
  await db.ref('grupos/' + currentGroup.id + '/membros/' + currentUser.uid).remove();
  $('infoPanel').classList.add('hidden');
  show('homeScreen');
  toast('Você saiu do grupo.');
}
if ($('btnAddGroupMember')) $('btnAddGroupMember').onclick = () => addMemberByEmail().catch(err);
if ($('btnLeaveGroup')) $('btnLeaveGroup').onclick = () => leaveGroup().catch(err);
if ($('btnRefreshGroups')) $('btnRefreshGroups').onclick = () => loadGroups();

// Agora todos os grupos aparecem na aba Grupos. Se a pessoa não for membro, aparece botão Entrar.
loadGroups = function(){
  if (!currentUser) return;
  db.ref('grupos').on('value', snap => {
    const list = $('groupList');
    list.innerHTML = '';
    if (!snap.exists()) {
      list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum grupo</strong><small>Crie o primeiro grupo.</small></div></div>';
      return;
    }
    const groups = [];
    snap.forEach(c => { const g = c.val(); if (g) groups.push(g); });
    groups.sort((a,b)=>(b.horario||0)-(a.horario||0));
    groups.forEach(g => {
      const qtd = countMembers(g), member = isMember(g), owner = isOwner(g), full = qtd >= GROUP_LIMIT;
      const div = document.createElement('div');
      div.className = 'item';
      const action = member
        ? `<button class="open-btn" data-open="${g.id}">Abrir</button>`
        : full
          ? `<button class="full-btn" disabled>Lotado</button>`
          : `<button class="join-btn" data-join="${g.id}">Entrar</button>`;
      div.innerHTML = `<div class="avatar">👥</div><div class="item-content"><strong>${safe(g.nome)}</strong><small>${qtd}/${GROUP_LIMIT} pessoas ${owner ? '<span class="owner-badge"> • seu grupo</span>' : ''}</small></div><div class="group-actions"><span class="pill">${member ? 'membro' : 'público'}</span>${action}</div>`;
      div.querySelector('[data-open]')?.addEventListener('click', ev => { ev.stopPropagation(); openGroup(g); });
      div.querySelector('[data-join]')?.addEventListener('click', ev => { ev.stopPropagation(); joinGroup(g).catch(err); });
      div.onclick = () => member ? openGroup(g) : (full ? toast('Grupo lotado.') : joinGroup(g).catch(err));
      list.appendChild(div);
    });
  }, err);
};

// Criação do grupo já salva limite, descrição e criador.
$('btnCreateGroup').onclick = async () => {
  const nome = $('groupName').value.trim();
  if (!nome) return toast('Digite o nome do grupo.');
  const id = db.ref('grupos').push().key;
  await db.ref('grupos/' + id).set({
    id, nome,
    criadoPor: currentUser.uid,
    limite: GROUP_LIMIT,
    publico: true,
    membros: { [currentUser.uid]: true },
    horario: Date.now()
  });
  $('groupName').value = '';
  toast('Grupo criado. Ele já aparece na aba Grupos.');
};

openGroup = function(g){
  currentChatUser = null;
  currentGroup = g;
  $('chatName').textContent = g.nome;
  $('chatAvatar').innerHTML = '👥';
  $('chatOnline').textContent = countMembers(g) + '/' + GROUP_LIMIT + ' pessoas';
  show('chatScreen');
  listenMessages('grupos/' + g.id + '/mensagens');
};

// Painel de informação agora também funciona para grupo.
$('btnInfo').onclick = async () => {
  $('mediaGrid').innerHTML = '';
  if (currentGroup) {
    const snap = await db.ref('grupos/' + currentGroup.id).once('value');
    currentGroup = snap.val() || currentGroup;
    $('infoAvatar').innerHTML = '👥';
    $('infoName').textContent = currentGroup.nome || 'Grupo';
    $('infoStatus').textContent = countMembers(currentGroup) + '/' + GROUP_LIMIT + ' pessoas';
    $('infoBio').textContent = isOwner(currentGroup) ? 'Você criou este grupo.' : 'Grupo público.';
    $('groupTools').classList.remove('hidden');
    $('groupMembersCount').textContent = countMembers(currentGroup) + '/' + GROUP_LIMIT + ' pessoas';
    $('btnAddGroupMember').style.display = isOwner(currentGroup) ? '' : 'none';
    $('groupMemberEmail').style.display = isOwner(currentGroup) ? '' : 'none';
    $('infoPanel').classList.remove('hidden');
    return;
  }
  const u = currentChatUser;
  if (!u) return toast('Abra uma conversa primeiro.');
  $('groupTools').classList.add('hidden');
  $('infoAvatar').innerHTML = avatarHtml(u);
  $('infoName').textContent = u.nome || u.email;
  $('infoStatus').textContent = u.online ? 'online' : 'offline';
  $('infoBio').textContent = u.recado || '';
  $('infoPanel').classList.remove('hidden');
};

// ===== v507 - CHAMADAS REAIS DE ÁUDIO E VÍDEO COM WEBRTC + FIREBASE =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v508 avançado'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('firebase-messaging-sw.js?v=517').catch(console.warn); } catch(e) {}

let rtcPeer = null;
let localStream = null;
let remoteStream = null;
let activeCallId = null;
let activeCallType = 'audio';
let activeCallRole = '';
let incomingCallData = null;
let incomingCallsStarted = false;
let callUnsubs = [];
let audioMuted = false;
let videoOff = false;

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function callEl(id){ return document.getElementById(id); }
function setCallStatus(txt){ const el = callEl('callStatus'); if (el) el.textContent = txt; }
function setCallTitle(txt){ const el = callEl('callTitle'); if (el) el.textContent = txt; }
function showCallScreen(type, incoming){
  activeCallType = type || 'audio';
  callEl('callScreen')?.classList.remove('hidden');
  callEl('incomingActions')?.classList.toggle('hidden', !incoming);
  callEl('callControls')?.classList.toggle('hidden', !!incoming);
  callEl('audioAvatar')?.classList.toggle('hidden', activeCallType !== 'audio');
  if (callEl('remoteVideo')) callEl('remoteVideo').style.display = activeCallType === 'video' ? 'block' : 'none';
  if (callEl('localVideo')) callEl('localVideo').style.display = activeCallType === 'video' ? 'block' : 'none';
  if (callEl('btnToggleVideo')) callEl('btnToggleVideo').style.display = activeCallType === 'video' ? '' : 'none';
}
function hideCallScreen(){ callEl('callScreen')?.classList.add('hidden'); }
function stopStreams(){
  try { if (localStream) localStream.getTracks().forEach(t => t.stop()); } catch(e) {}
  try { if (remoteStream) remoteStream.getTracks().forEach(t => t.stop()); } catch(e) {}
  localStream = null; remoteStream = null;
  if (callEl('localVideo')) callEl('localVideo').srcObject = null;
  if (callEl('remoteVideo')) callEl('remoteVideo').srcObject = null;
}
function clearCallListeners(){
  callUnsubs.forEach(fn => { try { fn(); } catch(e) {} });
  callUnsubs = [];
}
function closePeer(){
  clearCallListeners();
  try { if (rtcPeer) rtcPeer.close(); } catch(e) {}
  rtcPeer = null;
}
async function getCallMedia(type){
  return navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
}
function createPeer(callId, role){
  const pc = new RTCPeerConnection(rtcConfig);
  remoteStream = new MediaStream();
  if (callEl('remoteVideo')) callEl('remoteVideo').srcObject = remoteStream;
  pc.ontrack = ev => ev.streams[0].getTracks().forEach(track => remoteStream.addTrack(track));
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') setCallStatus('conectado');
    if (['failed','disconnected','closed'].includes(pc.connectionState)) setCallStatus('desconectado');
  };
  pc.onicecandidate = ev => {
    if (ev.candidate && currentUser && callId) {
      db.ref('callCandidates/' + callId + '/' + role).push(ev.candidate.toJSON()).catch(console.warn);
    }
  };
  return pc;
}
function listenRemoteCandidates(callId, remoteRole){
  const r = db.ref('callCandidates/' + callId + '/' + remoteRole);
  const cb = snap => { const c = snap.val(); if (c && rtcPeer) rtcPeer.addIceCandidate(new RTCIceCandidate(c)).catch(console.warn); };
  r.on('child_added', cb);
  callUnsubs.push(() => r.off('child_added', cb));
}
function listenCallEnded(callId){
  const r = db.ref('calls/' + callId + '/status');
  const cb = snap => {
    const st = snap.val();
    if (st === 'ended' || st === 'rejected' || st === 'missed') {
      setCallStatus(st === 'rejected' ? 'chamada recusada' : 'chamada encerrada');
      setTimeout(cleanCall, 700);
    }
  };
  r.on('value', cb);
  callUnsubs.push(() => r.off('value', cb));
}
async function startCall(type){
  if (!currentUser || !currentChatUser) return toast('Abra uma conversa com um contato primeiro.');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Seu navegador não suporta microfone/câmera para WebRTC.');
  try {
    activeCallRole = 'caller'; activeCallType = type; activeCallId = db.ref('calls').push().key;
    showCallScreen(type, false);
    setCallTitle((type === 'video' ? 'Vídeo' : 'Áudio') + ' com ' + (currentChatUser.nome || currentChatUser.email));
    setCallStatus('chamando...');
    localStream = await getCallMedia(type);
    if (callEl('localVideo')) callEl('localVideo').srcObject = localStream;
    rtcPeer = createPeer(activeCallId, 'caller');
    localStream.getTracks().forEach(track => rtcPeer.addTrack(track, localStream));
    const offer = await rtcPeer.createOffer();
    await rtcPeer.setLocalDescription(offer);
    await db.ref('calls/' + activeCallId).set({
      id: activeCallId,
      from: currentUser.uid,
      fromName: currentUser.email || 'Usuário',
      to: currentChatUser.uid,
      toName: currentChatUser.nome || currentChatUser.email || 'Contato',
      type,
      status: 'ringing',
      createdAt: Date.now(),
      offer: { type: offer.type, sdp: offer.sdp }
    });
    listenRemoteCandidates(activeCallId, 'callee');
    listenCallEnded(activeCallId);
    const answerRef = db.ref('calls/' + activeCallId + '/answer');
    const answerCb = async snap => {
      const ans = snap.val();
      if (ans && rtcPeer && !rtcPeer.currentRemoteDescription) {
        await rtcPeer.setRemoteDescription(new RTCSessionDescription(ans));
        await db.ref('calls/' + activeCallId).update({ status: 'active', answeredAt: Date.now() });
        setCallStatus('conectado');
      }
    };
    answerRef.on('value', answerCb);
    callUnsubs.push(() => answerRef.off('value', answerCb));
  } catch(e) {
    cleanCall();
    if (String(e && e.name).includes('NotAllowed')) return toast('Permita microfone/câmera para fazer chamada.');
    err(e);
  }
}
async function acceptIncomingCall(){
  const call = incomingCallData;
  if (!call || !currentUser) return;
  try {
    activeCallRole = 'callee'; activeCallId = call.id; activeCallType = call.type || 'audio';
    showCallScreen(activeCallType, false);
    setCallTitle((activeCallType === 'video' ? 'Vídeo' : 'Áudio') + ' com ' + (call.fromName || 'Contato'));
    setCallStatus('conectando...');
    localStream = await getCallMedia(activeCallType);
    if (callEl('localVideo')) callEl('localVideo').srcObject = localStream;
    rtcPeer = createPeer(activeCallId, 'callee');
    localStream.getTracks().forEach(track => rtcPeer.addTrack(track, localStream));
    await rtcPeer.setRemoteDescription(new RTCSessionDescription(call.offer));
    const answer = await rtcPeer.createAnswer();
    await rtcPeer.setLocalDescription(answer);
    await db.ref('calls/' + activeCallId).update({
      status: 'active',
      answeredAt: Date.now(),
      answer: { type: answer.type, sdp: answer.sdp }
    });
    listenRemoteCandidates(activeCallId, 'caller');
    listenCallEnded(activeCallId);
    incomingCallData = null;
  } catch(e) { cleanCall(); err(e); }
}
async function rejectIncomingCall(){
  if (incomingCallData && incomingCallData.id) await db.ref('calls/' + incomingCallData.id).update({ status:'rejected', endedAt:Date.now() });
  incomingCallData = null; cleanCall();
}
async function endCall(){
  const id = activeCallId || (incomingCallData && incomingCallData.id);
  if (id) await db.ref('calls/' + id).update({ status:'ended', endedAt:Date.now() }).catch(console.warn);
  cleanCall();
}
function cleanCall(){
  closePeer(); stopStreams(); hideCallScreen(); activeCallId=null; activeCallRole=''; incomingCallData=null; audioMuted=false; videoOff=false;
  if (callEl('btnMuteAudio')) callEl('btnMuteAudio').textContent='🎙️';
  if (callEl('btnToggleVideo')) callEl('btnToggleVideo').textContent='📹';
}
function listenIncomingCalls(){
  if (!currentUser || incomingCallsStarted) return;
  incomingCallsStarted = true;
  const r = db.ref('calls').orderByChild('to').equalTo(currentUser.uid);
  r.on('child_added', snap => {
    const call = snap.val();
    if (!call || call.status !== 'ringing') return;
    if (Date.now() - (call.createdAt || 0) > 60000) { snap.ref.update({status:'missed'}); return; }
    incomingCallData = call;
    showCallScreen(call.type || 'audio', true);
    setCallTitle((call.type === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio'));
    setCallStatus((call.fromName || 'Contato') + ' está chamando...');
  });
}

// Liga os botões reais de chamada.
if (callEl('btnAudioCall')) callEl('btnAudioCall').onclick = () => startCall('audio');
if (callEl('btnVideoCall')) callEl('btnVideoCall').onclick = () => startCall('video');
if (callEl('infoCall')) callEl('infoCall').onclick = () => startCall('audio');
if (callEl('infoVideo')) callEl('infoVideo').onclick = () => startCall('video');
if (callEl('btnAcceptCall')) callEl('btnAcceptCall').onclick = () => acceptIncomingCall();
if (callEl('btnRejectCall')) callEl('btnRejectCall').onclick = () => rejectIncomingCall();
if (callEl('btnEndCall')) callEl('btnEndCall').onclick = () => endCall();
if (callEl('btnCloseCall')) callEl('btnCloseCall').onclick = () => endCall();
if (callEl('btnMuteAudio')) callEl('btnMuteAudio').onclick = () => {
  if (!localStream) return;
  audioMuted = !audioMuted;
  localStream.getAudioTracks().forEach(t => t.enabled = !audioMuted);
  callEl('btnMuteAudio').textContent = audioMuted ? '🔇' : '🎙️';
};
if (callEl('btnToggleVideo')) callEl('btnToggleVideo').onclick = () => {
  if (!localStream) return;
  videoOff = !videoOff;
  localStream.getVideoTracks().forEach(t => t.enabled = !videoOff);
  callEl('btnToggleVideo').textContent = videoOff ? '🚫' : '📹';
};

// Garante que o ouvinte de chamadas inicie depois do login.
const oldAuthHookV507 = auth.onAuthStateChanged;
try {
  auth.onAuthStateChanged(user => {
    if (user) setTimeout(listenIncomingCalls, 1200);
  });
} catch(e) { console.warn(e); }


// ===== v508 - CONTATOS, CHAMADAS, NOTIFICAÇÕES, CONTADOR E VISTO NO STATUS =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v508'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('firebase-messaging-sw.js?v=517').catch(console.warn); } catch(e) {}

let contactsListenerV508 = null;
let chatsListenerV508 = null;
let callsListenerV508 = null;
let soundUnlockedV508 = false;
let lastSeenMsgTimeV508 = Number(localStorage.lastSeenMsgTimeV508 || 0);

function ensureCallsListV508(){
  if (!$('callList') && $('tabCalls')) $('tabCalls').innerHTML = '<div id="callList" class="list"></div>';
}
function playMessageToneV508(){
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.stop(ctx.currentTime + 0.38);
  } catch(e) { console.warn(e); }
}
function notifyIncoming(m){
  if(!m || !currentUser || m.de===currentUser.uid) return;
  const msgTime = m.horario || Date.now();
  if (msgTime <= lastSeenMsgTimeV508) return;
  lastSeenMsgTimeV508 = msgTime;
  localStorage.lastSeenMsgTimeV508 = String(msgTime);
  playMessageToneV508();
  if("Notification" in window && Notification.permission==="granted") {
    new Notification("Nova mensagem", { body: m.texto || m.nome || m.tipo || 'Você recebeu uma mensagem', icon: "icon-192.png" });
  }
}

// Botão da notificação também libera o som no celular.
if ($('btnNotify')) $('btnNotify').onclick = async()=>{
  try { playMessageToneV508(); soundUnlockedV508 = true; } catch(e) {}
  if(!("Notification" in window)) return toast("Este navegador não suporta notificação.");
  const p=await Notification.requestPermission();
  toast(p==="granted"?"Notificações e toque ativados.":"Notificação não permitida.");
};

// Todos os usuários cadastrados aparecem em Contatos.
function loadAllContacts(){
  if (!currentUser) return;
  if (contactsListenerV508) try { contactsListenerV508.off(); } catch(e) {}
  contactsListenerV508 = db.ref('usuarios').orderByChild('email');
  contactsListenerV508.on('value', snap => {
    const list = $('userList');
    if (!list) return;
    list.innerHTML = '';
    if (!snap.exists()) {
      list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum contato cadastrado</strong></div></div>';
      return;
    }
    const users = [];
    snap.forEach(c => { const u = c.val(); if (u && u.uid !== currentUser.uid) users.push(u); });
    users.sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    if (!users.length) {
      list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum outro usuário cadastrado</strong><small>Cadastre outro email para testar.</small></div></div>';
      return;
    }
    users.forEach(u => userItem(u, list, `<small>${u.online?'online':'offline'}</small>`));
  }, err);
}

// Pesquisa agora filtra dentro dos contatos já cadastrados, sem esconder todos.
if ($('btnSearchUser')) $('btnSearchUser').onclick = async()=>{
  const q = $('searchEmail').value.trim().toLowerCase();
  const list = $('userList');
  if (!q) return loadAllContacts();
  try {
    const snap = await db.ref('usuarios').once('value');
    list.innerHTML='';
    let found = 0;
    snap.forEach(c=>{
      const u = c.val();
      if (!u || u.uid===currentUser.uid) return;
      const text = ((u.nome||'')+' '+(u.email||'')+' '+(u.telefone||'')+' '+(u.telefoneDigits||'')).toLowerCase();
      if (text.includes(q)) { userItem(u,list, `<small>${u.online?'online':'offline'}</small>`); found++; }
    });
    if (!found) list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum contato encontrado</strong></div></div>';
  } catch(e) { err(e); }
};

// Conversas iniciadas aparecem na aba Conversas e com contagem real de não lidas.
function loadChats(filter=""){
  if(!currentUser)return;
  if (chatsListenerV508) try { chatsListenerV508.off(); } catch(e) {}
  chatsListenerV508 = db.ref("conversas/"+currentUser.uid).orderByChild("horario");
  chatsListenerV508.on("value",async snap=>{
    const list=$("chatList"); if(!list) return;
    list.innerHTML=""; let total=0;
    if(!snap.exists()){
      list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhuma conversa ainda</strong><small>Abra Contatos e toque em uma pessoa para iniciar.</small></div></div>';
      if ($("badgeChats")) $("badgeChats").textContent=0;
      return;
    }
    const items=[]; snap.forEach(c=>items.push(c.val())); items.reverse();
    for(const c of items){
      const us=await db.ref("usuarios/"+c.uidDestino).once("value"),u=us.val(); if(!u)continue;
      const nome=(u.nome||u.email||"").toLowerCase(); if(filter&&!nome.includes(filter))continue;
      const unreadCount = Number(c.unreadCount || (c.visto?0:1)); total += unreadCount;
      const unread=unreadCount>0?`<span class="unread">${unreadCount}</span>`:"";
      const div=document.createElement("div"); div.className="item";
      div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||u.email)}</strong><small>${c.tipo==="imagem"?"📷 Imagem":c.tipo==="audio"?"🎙️ Áudio":c.tipo==="documento"?"📄 Documento":c.tipo==="localizacao"?"📍 Localização":safe(c.ultima_msg)}</small></div><small>${time(c.horario)}</small>${unread}`;
      div.onclick=()=>openChat(u); list.appendChild(div);
    }
    if ($("badgeChats")) $("badgeChats").textContent=total;
  },err)
}

function openChat(u){
  currentGroup=null; currentChatUser=u; currentChatId=chatId(currentUser.uid,u.uid);
  $("chatName").textContent=u.nome||u.email||"Contato"; $("chatAvatar").innerHTML=avatarHtml(u); $("chatOnline").textContent=u.online?"online":"offline";
  db.ref("usuarios/"+u.uid).on("value",s=>{const x=s.val();if(x){$("chatOnline").textContent=x.online?"online":"visto por último "+time(x.ultimo_visto)}});
  db.ref('conversas/'+currentUser.uid+'/'+u.uid).update({visto:true, unreadCount:0}).catch(console.warn);
  show("chatScreen"); listenMessages("mensagens/"+currentChatId);
}

async function sendMessage(data){
  const uid=currentUser.uid,dest=currentChatUser?currentChatUser.uid:"",horario=Date.now();
  const msg={de:uid,para:dest,texto:data.texto||"",tipo:data.tipo,url:data.url||"",nome:data.nome||"",horario,visto:false,replyKey:replyTo?replyTo.key:"",replyText:replyTo?replyTo.text:""};
  const path=currentGroup?"grupos/"+currentGroup.id+"/mensagens":"mensagens/"+currentChatId;
  await db.ref(path).push(msg);
  replyTo=null; if ($("replyBox")) $("replyBox").classList.add("hidden");
  if(!currentGroup){
    const last=data.tipo==="texto"?data.texto:data.tipo;
    await db.ref("conversas/"+uid+"/"+dest).set({uidDestino:dest,ultima_msg:last,tipo:data.tipo,horario,visto:true,unreadCount:0});
    const destRef = db.ref("conversas/"+dest+"/"+uid);
    const old = (await destRef.once('value')).val() || {};
    await destRef.set({uidDestino:uid,ultima_msg:last,tipo:data.tipo,horario,visto:false,unreadCount:Number(old.unreadCount||0)+1});
  }
}

// Lista de chamadas: registra tudo que passar pelo nó calls.
function callIconV508(c){ return c.type === 'video' ? '📹' : '📞'; }
function callStatusV508(c){
  if (c.status === 'ringing') return 'chamando';
  if (c.status === 'active') return 'atendida';
  if (c.status === 'rejected') return 'recusada';
  if (c.status === 'missed') return 'perdida';
  if (c.status === 'ended') return c.answeredAt ? 'encerrada' : 'não atendida';
  return c.status || 'chamada';
}
function loadCalls(){
  if (!currentUser) return;
  ensureCallsListV508();
  if (callsListenerV508) try { callsListenerV508.off(); } catch(e) {}
  callsListenerV508 = db.ref('calls').orderByChild('createdAt');
  callsListenerV508.on('value', async snap => {
    const list = $('callList'); if (!list) return;
    list.innerHTML = '';
    if (!snap.exists()) { list.innerHTML='<div class="empty-card glass"><h3>Chamadas</h3><p>Nenhuma chamada ainda.</p></div>'; return; }
    const calls = [];
    snap.forEach(c=>{ const call=c.val(); if (call && (call.from===currentUser.uid || call.to===currentUser.uid)) calls.push(call); });
    calls.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if (!calls.length) { list.innerHTML='<div class="empty-card glass"><h3>Chamadas</h3><p>Nenhuma chamada ainda.</p></div>'; return; }
    for (const c of calls) {
      const otherUid = c.from === currentUser.uid ? c.to : c.from;
      const us = await db.ref('usuarios/'+otherUid).once('value');
      const u = us.val() || {nome: c.from===currentUser.uid ? c.toName : c.fromName};
      const direction = c.from === currentUser.uid ? 'feita' : 'recebida';
      const div=document.createElement('div'); div.className='item';
      div.innerHTML = `<div class="avatar">${callIconV508(c)}</div><div class="item-content"><strong>${safe(u.nome||u.email||'Contato')}</strong><small>${direction} • ${callStatusV508(c)} • ${time(c.createdAt)}</small></div><button class="icon-btn">${c.type==='video'?'📹':'📞'}</button>`;
      div.querySelector('button').onclick = ev => { ev.stopPropagation(); openChat(u); setTimeout(()=>startCall(c.type||'audio'), 300); };
      div.onclick = () => openChat(u);
      list.appendChild(div);
    }
  }, err);
}

// Status com visualizações para o dono.
function openStatusViewer(index){
  if (!statusItemsV506.length) return;
  statusIndexV506 = Math.max(0, Math.min(index, statusItemsV506.length - 1));
  const item = statusItemsV506[statusIndexV506];
  const s = item.status, u = item.user || {};
  $('viewerAvatar').innerHTML = avatarHtml(u);
  $('viewerName').textContent = u.nome || u.email || 'Status';
  $('viewerTime').textContent = time(s.horario);
  $('viewerContent').innerHTML = s.tipo === 'imagem' ? `<img src="${s.url}" alt="Status">` : `<div class="viewer-text">${safe(s.texto || '')}</div>`;
  $('btnPrevStatus').disabled = statusIndexV506 <= 0;
  $('btnNextStatus').disabled = statusIndexV506 >= statusItemsV506.length - 1;
  $('statusViewer').classList.remove('hidden');
  if (currentUser && s.uid && s.uid !== currentUser.uid && item.key) {
    db.ref('statusViews/'+s.uid+'/'+item.key+'/'+currentUser.uid).set({uid:currentUser.uid,email:currentUser.email||'',vistoEm:Date.now()}).catch(console.warn);
  }
}

loadStatuses = function(){
  db.ref('status').on('value', snap => {
    const list = $('statusList'); list.innerHTML = ''; statusItemsV506 = [];
    const now = Date.now();
    if (!snap.exists()) { list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum status</strong><small>Publique uma foto ou texto.</small></div></div>'; return; }
    const pending = [];
    snap.forEach(userNode => userNode.forEach(stNode => {
      const s = stNode.val();
      if (!s || s.expira < now) { stNode.ref.remove(); return; }
      pending.push(Promise.all([
        db.ref('usuarios/' + s.uid).once('value'),
        db.ref('statusViews/' + s.uid + '/' + stNode.key).once('value')
      ]).then(([us,vs]) => ({ key: stNode.key, status:s, user:us.val() || {}, views:vs.val() || {} })));
    }));
    Promise.all(pending).then(items => {
      statusItemsV506 = items.sort((a,b)=>(b.status.horario||0)-(a.status.horario||0));
      if (!statusItemsV506.length) { list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum status</strong></div></div>'; return; }
      statusItemsV506.forEach((item, index) => {
        const s = item.status, u = item.user;
        const viewsCount = Object.keys(item.views || {}).length;
        const own = currentUser && s.uid === currentUser.uid;
        const div = document.createElement('div'); div.className = 'item';
        div.innerHTML = `<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome || u.email || 'Usuário')}</strong><small>${s.tipo === 'imagem' ? '📷 Foto no status' : safe(s.texto)}${own ? ' • 👁️ '+viewsCount+' visualizações' : ''}</small></div><small>${time(s.horario)}</small>`;
        div.onclick = () => openStatusViewer(index);
        list.appendChild(div);
      });
    });
  }, err);
};

// Notificação também quando a conversa recebe atualização nova.
function listenConversationNotificationsV508(){
  if (!currentUser) return;
  db.ref('conversas/'+currentUser.uid).on('child_changed', snap => {
    const c = snap.val();
    if (c && !c.visto && Number(c.unreadCount||0) > 0) {
      notifyIncoming({de:c.uidDestino, para:currentUser.uid, texto:c.ultima_msg, tipo:c.tipo, horario:c.horario});
    }
  });
}

// Inicialização v508.
startApp = function(){
  loadChats();
  loadStatuses();
  loadGroups();
  loadAllContacts();
  loadCalls();
  listenIncomingCalls();
  listenConversationNotificationsV508();
};

// ===== v509 - REVISÃO GERAL: chamadas mais estáveis + layout mais bonito =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v509'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('firebase-messaging-sw.js?v=517').catch(console.warn); } catch(e) {}

let incomingCallsRefV509 = null;
let callRingIntervalV509 = null;
let currentCallTimeoutV509 = null;

function profileNameV509(){
  try { return (currentUser && (currentUser.displayName || currentUser.email)) || 'Usuário'; } catch(e){ return 'Usuário'; }
}
function stopCallRingV509(){
  if (callRingIntervalV509) clearInterval(callRingIntervalV509);
  callRingIntervalV509 = null;
}
function ringCallV509(){
  stopCallRingV509();
  playMessageToneV508?.();
  callRingIntervalV509 = setInterval(()=>{ try{ playMessageToneV508?.(); }catch(e){} }, 1700);
}
function decorateCallScreenV509(type, incoming){
  const screen = callEl('callScreen');
  if (!screen) return;
  screen.classList.toggle('call-audio', (type || activeCallType) !== 'video');
  screen.classList.toggle('call-video', (type || activeCallType) === 'video');
  screen.classList.toggle('incoming', !!incoming);
  const st = callEl('callStatus');
  if (st && !st.classList.contains('call-status-chip')) st.classList.add('call-status-chip');
  const avatar = callEl('audioAvatar');
  if (avatar) avatar.textContent = currentChatUser && currentChatUser.foto ? '👤' : '👤';
}
const oldShowCallScreenV509 = showCallScreen;
showCallScreen = function(type, incoming){
  oldShowCallScreenV509(type, incoming);
  decorateCallScreenV509(type, incoming);
};

function resetIncomingListenerV509(){
  try { if (incomingCallsRefV509) incomingCallsRefV509.off(); } catch(e) {}
  incomingCallsRefV509 = null;
  incomingCallsStarted = false;
}
function listenIncomingCalls(){
  if (!currentUser) return;
  resetIncomingListenerV509();
  incomingCallsStarted = true;
  incomingCallsRefV509 = db.ref('calls').orderByChild('to').equalTo(currentUser.uid);
  const handler = snap => {
    const call = snap.val();
    if (!call || call.to !== currentUser.uid) return;
    if (call.status !== 'ringing') return;
    if (activeCallId && activeCallId !== call.id) return;
    if (Date.now() - (call.createdAt || 0) > 75000) { snap.ref.update({status:'missed', endedAt:Date.now()}); return; }
    incomingCallData = call;
    activeCallId = call.id;
    activeCallType = call.type || 'audio';
    showCallScreen(activeCallType, true);
    setCallTitle((activeCallType === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio'));
    setCallStatus((call.fromName || 'Contato') + ' está chamando...');
    ringCallV509();
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Chamada recebida', { body: (call.fromName || 'Contato') + ' está chamando', icon:'icon-192.png' }); } catch(e) {}
    }
  };
  incomingCallsRefV509.on('child_added', handler, err);
  incomingCallsRefV509.on('child_changed', handler, err);
}

async function startCall(type){
  if (!currentUser || !currentChatUser) return toast('Abra uma conversa com um contato primeiro.');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return toast('Seu navegador não suporta chamada neste aparelho. Abra pelo Chrome/HTTPS.');
  try {
    stopCallRingV509();
    activeCallRole = 'caller'; activeCallType = type || 'audio'; activeCallId = db.ref('calls').push().key;
    showCallScreen(activeCallType, false);
    setCallTitle((activeCallType === 'video' ? 'Vídeo' : 'Áudio') + ' com ' + (currentChatUser.nome || currentChatUser.email || 'Contato'));
    setCallStatus('pedindo permissão...');
    localStream = await getCallMedia(activeCallType);
    if (callEl('localVideo')) callEl('localVideo').srcObject = localStream;
    setCallStatus('chamando...');
    rtcPeer = createPeer(activeCallId, 'caller');
    localStream.getTracks().forEach(track => rtcPeer.addTrack(track, localStream));
    const offer = await rtcPeer.createOffer();
    await rtcPeer.setLocalDescription(offer);
    const meSnap = await db.ref('usuarios/'+currentUser.uid).once('value').catch(()=>null);
    const me = meSnap && meSnap.val ? (meSnap.val() || {}) : {};
    await db.ref('calls/' + activeCallId).set({
      id: activeCallId,
      from: currentUser.uid,
      fromName: me.nome || currentUser.email || 'Usuário',
      to: currentChatUser.uid,
      toName: currentChatUser.nome || currentChatUser.email || 'Contato',
      type: activeCallType,
      status: 'ringing',
      createdAt: Date.now(),
      offer: { type: offer.type, sdp: offer.sdp }
    });
    listenRemoteCandidates(activeCallId, 'callee');
    listenCallEnded(activeCallId);
    const answerRef = db.ref('calls/' + activeCallId + '/answer');
    const answerCb = async snap => {
      const ans = snap.val();
      if (ans && rtcPeer && !rtcPeer.currentRemoteDescription) {
        await rtcPeer.setRemoteDescription(new RTCSessionDescription(ans));
        await db.ref('calls/' + activeCallId).update({ status: 'active', answeredAt: Date.now() });
        setCallStatus('conectado');
        if (currentCallTimeoutV509) clearTimeout(currentCallTimeoutV509);
      }
    };
    answerRef.on('value', answerCb);
    callUnsubs.push(() => answerRef.off('value', answerCb));
    currentCallTimeoutV509 = setTimeout(async()=>{
      try {
        const st = (await db.ref('calls/'+activeCallId+'/status').once('value')).val();
        if (st === 'ringing') await db.ref('calls/'+activeCallId).update({status:'missed', endedAt:Date.now()});
      } catch(e) {}
    }, 65000);
  } catch(e) {
    cleanCall();
    if (String(e && e.name).includes('NotAllowed')) return toast('Permita microfone/câmera para fazer chamada.');
    err(e);
  }
}

async function acceptIncomingCall(){
  const call = incomingCallData;
  if (!call || !currentUser) return;
  try {
    stopCallRingV509();
    activeCallRole = 'callee'; activeCallId = call.id; activeCallType = call.type || 'audio';
    showCallScreen(activeCallType, false);
    setCallTitle((activeCallType === 'video' ? 'Vídeo' : 'Áudio') + ' com ' + (call.fromName || 'Contato'));
    setCallStatus('pedindo permissão...');
    localStream = await getCallMedia(activeCallType);
    if (callEl('localVideo')) callEl('localVideo').srcObject = localStream;
    setCallStatus('conectando...');
    rtcPeer = createPeer(activeCallId, 'callee');
    localStream.getTracks().forEach(track => rtcPeer.addTrack(track, localStream));
    await rtcPeer.setRemoteDescription(new RTCSessionDescription(call.offer));
    const answer = await rtcPeer.createAnswer();
    await rtcPeer.setLocalDescription(answer);
    await db.ref('calls/' + activeCallId).update({
      status: 'active', answeredAt: Date.now(),
      answer: { type: answer.type, sdp: answer.sdp }
    });
    listenRemoteCandidates(activeCallId, 'caller');
    listenCallEnded(activeCallId);
    incomingCallData = null;
    setCallStatus('conectado');
  } catch(e) { cleanCall(); err(e); }
}
async function rejectIncomingCall(){
  stopCallRingV509();
  if (incomingCallData && incomingCallData.id) await db.ref('calls/' + incomingCallData.id).update({ status:'rejected', endedAt:Date.now() });
  incomingCallData = null; cleanCall();
}
async function endCall(){
  stopCallRingV509();
  const id = activeCallId || (incomingCallData && incomingCallData.id);
  if (id) await db.ref('calls/' + id).update({ status:'ended', endedAt:Date.now() }).catch(console.warn);
  cleanCall();
}
const oldCleanCallV509 = cleanCall;
cleanCall = function(){
  stopCallRingV509();
  if (currentCallTimeoutV509) clearTimeout(currentCallTimeoutV509);
  currentCallTimeoutV509 = null;
  oldCleanCallV509();
};

if (callEl('btnAudioCall')) callEl('btnAudioCall').onclick = () => startCall('audio');
if (callEl('btnVideoCall')) callEl('btnVideoCall').onclick = () => startCall('video');
if (callEl('infoCall')) callEl('infoCall').onclick = () => startCall('audio');
if (callEl('infoVideo')) callEl('infoVideo').onclick = () => startCall('video');
if (callEl('btnAcceptCall')) callEl('btnAcceptCall').onclick = () => acceptIncomingCall();
if (callEl('btnRejectCall')) callEl('btnRejectCall').onclick = () => rejectIncomingCall();
if (callEl('btnEndCall')) callEl('btnEndCall').onclick = () => endCall();
if (callEl('btnCloseCall')) callEl('btnCloseCall').onclick = () => endCall();
if (callEl('btnMuteAudio')) callEl('btnMuteAudio').onclick = () => {
  if (!localStream) return;
  audioMuted = !audioMuted;
  localStream.getAudioTracks().forEach(t => t.enabled = !audioMuted);
  callEl('btnMuteAudio').textContent = audioMuted ? '🔇' : '🎙️';
  callEl('btnMuteAudio').classList.toggle('off', audioMuted);
};
if (callEl('btnToggleVideo')) callEl('btnToggleVideo').onclick = () => {
  if (!localStream) return;
  videoOff = !videoOff;
  localStream.getVideoTracks().forEach(t => t.enabled = !videoOff);
  callEl('btnToggleVideo').textContent = videoOff ? '🚫' : '📹';
  callEl('btnToggleVideo').classList.toggle('off', videoOff);
};

function callStatusV508(c){
  if (c.status === 'ringing') return c.from === currentUser.uid ? 'chamando' : 'tocando';
  if (c.status === 'active') return 'atendida';
  if (c.status === 'rejected') return 'recusada';
  if (c.status === 'missed') return 'perdida';
  if (c.status === 'ended') return c.answeredAt ? 'encerrada' : 'não atendida';
  return c.status || 'chamada';
}
function loadCalls(){
  if (!currentUser) return;
  ensureCallsListV508();
  if (callsListenerV508) try { callsListenerV508.off(); } catch(e) {}
  callsListenerV508 = db.ref('calls').orderByChild('createdAt');
  callsListenerV508.on('value', async snap => {
    const list = $('callList'); if (!list) return;
    list.innerHTML = '';
    const calls = [];
    if (snap.exists()) snap.forEach(c=>{ const call=c.val(); if (call && (call.from===currentUser.uid || call.to===currentUser.uid)) calls.push(call); });
    calls.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if (!calls.length) { list.innerHTML='<div class="empty-card glass"><h3>📞 Chamadas</h3><p>Suas ligações de áudio e vídeo vão aparecer aqui.</p></div>'; return; }
    for (const c of calls) {
      const otherUid = c.from === currentUser.uid ? c.to : c.from;
      const us = await db.ref('usuarios/'+otherUid).once('value').catch(()=>null);
      const u = (us && us.val && us.val()) || {uid:otherUid,nome: c.from===currentUser.uid ? c.toName : c.fromName};
      const outgoing = c.from === currentUser.uid;
      const missed = c.status === 'missed' || (!outgoing && c.status === 'ended' && !c.answeredAt);
      const div=document.createElement('div');
      div.className='item call-item '+(outgoing?'outgoing':'incoming')+(missed?' missed':'');
      div.innerHTML = `<div class="avatar">${c.type==='video'?'📹':'📞'}</div><div class="item-content"><strong>${safe(u.nome||u.email||'Contato')}</strong><small>${outgoing?'feita':'recebida'} • ${callStatusV508(c)} • ${time(c.createdAt)}</small></div><button class="icon-btn" title="Ligar de novo">${c.type==='video'?'📹':'📞'}</button>`;
      div.querySelector('button').onclick = ev => { ev.stopPropagation(); openChat(u); setTimeout(()=>startCall(c.type||'audio'), 350); };
      div.onclick = () => openChat(u);
      list.appendChild(div);
    }
  }, err);
}

const oldStartAppV509 = startApp;
startApp = function(){
  try { oldStartAppV509(); } catch(e) { console.warn(e); }
  setTimeout(()=>{ try{ loadAllContacts(); loadCalls(); listenIncomingCalls(); }catch(e){ console.warn(e); } }, 500);
};

// ===== v510 - Conversas completas, histórico de chamadas com duração e ticks azuis =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v510'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('firebase-messaging-sw.js?v=517').catch(console.warn); } catch(e) {}

function formatDateTimeV510(ms){
  const d = new Date(ms || Date.now());
  return d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) + ' ' + d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
}
function formatDurationV510(c){
  const start = c.answeredAt || c.createdAt || 0;
  const end = c.endedAt || (c.status === 'active' ? Date.now() : 0);
  if (!start || !end || end <= start || c.status === 'ringing') return '00:00';
  let s = Math.floor((end - start) / 1000);
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  return h > 0
    ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
    : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function lastTextV510(m){
  if (!m) return '';
  if (m.apagada) return 'Mensagem apagada';
  if (m.tipo === 'imagem') return '📷 Imagem';
  if (m.tipo === 'audio') return '🎙️ Áudio';
  if (m.tipo === 'documento') return '📄 Documento';
  if (m.tipo === 'localizacao') return '📍 Localização';
  return m.texto || '';
}

// Renderiza novamente quando a mensagem muda, assim o ✓✓ fica azul quando o outro usuário visualizar.
function renderMessage(m,ref){
  const wrap=document.createElement('div');
  wrap.className='msg-wrap '+(m.de===currentUser.uid?'me':'other');
  const tickClass = (m.de===currentUser.uid && m.visto) ? 'time read-ticks' : 'time';
  const ticks = m.de===currentUser.uid ? (m.visto ? '✓✓' : '✓') : '';
  wrap.innerHTML=`<div class="bubble" title="Clique para opções">${m.replyText?`<div class="reply-preview">${safe(m.replyText)}</div>`:''}${contentHtml(m)}${m.reaction?`<div class="reactions">${safe(m.reaction)}</div>`:''}<span class="${tickClass}">${time(m.horario)} ${ticks}</span></div>`;
  wrap.onclick=()=>messageMenu(m,ref);
  $('messagesList').appendChild(wrap);
}
function listenMessages(path){
  const box = $('messagesList');
  if (!box) return;
  box.innerHTML='';
  if(messagesListenerRef) messagesListenerRef.off();
  messagesListenerRef=db.ref(path);
  messagesListenerRef.on('value', snap=>{
    box.innerHTML='';
    const updates=[];
    snap.forEach(child=>{
      const m=child.val() || {}; m.key=child.key;
      renderMessage(m, child.ref);
      if(m.para===currentUser.uid && !m.visto) updates.push(child.ref.update({visto:true, vistoEm:Date.now()}));
      if (m.de !== currentUser.uid) notifyIncoming(m);
    });
    box.scrollTop=box.scrollHeight;
    updates.forEach(p=>p.catch(console.warn));
  }, err);
}

// Conversas: mostra conversas salvas e também reconstrói conversas antigas pelo nó mensagens.
async function loadChatsFromMessagesV510(map){
  const snap = await db.ref('mensagens').once('value').catch(()=>null);
  if (!snap || !snap.exists()) return;
  snap.forEach(chatNode=>{
    const key = chatNode.key || '';
    if (!key.includes(currentUser.uid)) return;
    let last = null, unread = 0, otherUid = '';
    chatNode.forEach(msgNode=>{
      const m = msgNode.val() || {};
      if (m.de !== currentUser.uid && m.para !== currentUser.uid) return;
      if (!last || (m.horario||0) > (last.horario||0)) last = m;
      if (m.para === currentUser.uid && !m.visto) unread++;
      if (m.de === currentUser.uid) otherUid = m.para || otherUid;
      if (m.para === currentUser.uid) otherUid = m.de || otherUid;
    });
    if (!last || !otherUid) return;
    const current = map[otherUid];
    if (!current || (last.horario||0) > (current.horario||0)) {
      map[otherUid] = { uidDestino: otherUid, ultima_msg: lastTextV510(last), tipo: last.tipo || 'texto', horario: last.horario || Date.now(), visto: unread===0, unreadCount: unread };
    }
  });
}
async function renderChatsV510(filter=''){
  const list=$('chatList'); if(!list || !currentUser) return;
  list.innerHTML='';
  const map = {};
  const convSnap = await db.ref('conversas/'+currentUser.uid).once('value').catch(()=>null);
  if (convSnap && convSnap.exists()) convSnap.forEach(c=>{ const v=c.val(); if(v && v.uidDestino) map[v.uidDestino]=v; });
  await loadChatsFromMessagesV510(map);
  const items = Object.values(map).sort((a,b)=>(b.horario||0)-(a.horario||0));
  let total=0, shown=0;
  for (const c of items){
    const us=await db.ref('usuarios/'+c.uidDestino).once('value').catch(()=>null);
    const u=(us && us.val && us.val()) || {uid:c.uidDestino,nome:'Contato'};
    const nome=(u.nome||u.email||'').toLowerCase(); if(filter && !nome.includes(filter)) continue;
    const unreadCount = Number(c.unreadCount || (c.visto?0:1)); total += unreadCount;
    const unread=unreadCount>0?`<span class="unread">${unreadCount}</span>`:'';
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||u.email||'Contato')}</strong><small>${lastTextV510(c)}</small></div><small>${time(c.horario)}</small>${unread}`;
    div.onclick=()=>openChat(u); list.appendChild(div); shown++;
  }
  if (!shown) list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhuma conversa ainda</strong><small>Abra Contatos e toque em uma pessoa para iniciar.</small></div></div>';
  if ($('badgeChats')) $('badgeChats').textContent=total;
}
function loadChats(filter=''){
  if(!currentUser)return;
  if (chatsListenerV508) try { chatsListenerV508.off(); } catch(e) {}
  renderChatsV510(filter).catch(err);
  chatsListenerV508 = db.ref('conversas/'+currentUser.uid);
  chatsListenerV508.on('value',()=>renderChatsV510(($('chatSearch')?.value||'').trim().toLowerCase()).catch(err),err);
  db.ref('mensagens').off('value');
  db.ref('mensagens').on('value',()=>renderChatsV510(($('chatSearch')?.value||'').trim().toLowerCase()).catch(console.warn));
}
function openChat(u){
  currentGroup=null; currentChatUser=u; currentChatId=chatId(currentUser.uid,u.uid);
  $('chatName').textContent=u.nome||u.email||'Contato'; $('chatAvatar').innerHTML=avatarHtml(u); $('chatOnline').textContent=u.online?'online':'offline';
  db.ref('usuarios/'+u.uid).on('value',s=>{const x=s.val();if(x){$('chatOnline').textContent=x.online?'online':'visto por último '+time(x.ultimo_visto)}});
  db.ref('conversas/'+currentUser.uid+'/'+u.uid).update({visto:true, unreadCount:0}).catch(console.warn);
  db.ref('mensagens/'+currentChatId).once('value').then(s=>{s.forEach(m=>{const v=m.val()||{}; if(v.para===currentUser.uid && !v.visto) m.ref.update({visto:true,vistoEm:Date.now()});});}).catch(console.warn);
  show('chatScreen'); listenMessages('mensagens/'+currentChatId);
}

// Chamadas: lista todas com hora e duração.
function loadCalls(){
  if (!currentUser) return;
  ensureCallsListV508();
  if (callsListenerV508) try { callsListenerV508.off(); } catch(e) {}
  callsListenerV508 = db.ref('calls').orderByChild('createdAt');
  callsListenerV508.on('value', async snap => {
    const list = $('callList'); if (!list) return;
    list.innerHTML = '';
    const calls = [];
    if (snap.exists()) snap.forEach(c=>{ const call=c.val(); if (call && (call.from===currentUser.uid || call.to===currentUser.uid)) calls.push(call); });
    calls.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if (!calls.length) { list.innerHTML='<div class="empty-card glass"><h3>📞 Chamadas</h3><p>Áudio e vídeo ficam registrados aqui com horário e duração.</p></div>'; return; }
    for (const c of calls) {
      const otherUid = c.from === currentUser.uid ? c.to : c.from;
      const us = await db.ref('usuarios/'+otherUid).once('value').catch(()=>null);
      const u = (us && us.val && us.val()) || {uid:otherUid,nome: c.from===currentUser.uid ? c.toName : c.fromName};
      const outgoing = c.from === currentUser.uid;
      const missed = c.status === 'missed' || (!outgoing && c.status === 'ended' && !c.answeredAt);
      const dur = formatDurationV510(c);
      const div=document.createElement('div');
      div.className='item call-item '+(outgoing?'outgoing':'incoming')+(missed?' missed':'');
      div.innerHTML = `<div class="avatar">${c.type==='video'?'📹':'📞'}</div><div class="item-content"><strong>${safe(u.nome||u.email||'Contato')}</strong><small>${outgoing?'feita':'recebida'} • ${callStatusV508(c)} • ${formatDateTimeV510(c.createdAt)} • duração ${dur}</small></div><button class="icon-btn" title="Ligar de novo">${c.type==='video'?'📹':'📞'}</button>`;
      div.querySelector('button').onclick = ev => { ev.stopPropagation(); openChat(u); setTimeout(()=>startCall(c.type||'audio'), 350); };
      div.onclick = () => openChat(u);
      list.appendChild(div);
    }
  }, err);
}

// Ao encerrar, grava duração calculável para aparecer no histórico.
async function endCall(){
  stopCallRingV509();
  const id = activeCallId || (incomingCallData && incomingCallData.id);
  if (id) {
    const refCall = db.ref('calls/' + id);
    const old = (await refCall.once('value').catch(()=>null));
    const c = old && old.val ? (old.val()||{}) : {};
    const endedAt = Date.now();
    const start = c.answeredAt || c.createdAt || endedAt;
    await refCall.update({ status:'ended', endedAt, durationMs: Math.max(0, endedAt - start) }).catch(console.warn);
  }
  cleanCall();
}

const oldStartAppV510 = startApp;
startApp = function(){
  try { oldStartAppV510(); } catch(e) { console.warn(e); }
  setTimeout(()=>{ try{ loadAllContacts(); loadChats(); loadCalls(); listenIncomingCalls(); }catch(e){ console.warn(e); } }, 500);
};

// ===== v511 - cache local + chamadas pendentes/offline + avisos de fundo =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v511'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('firebase-messaging-sw.js?v=517').catch(console.warn); } catch(e) {}

const CACHE_PREFIX_V511 = 'bp_v511_';
const CALL_TIMEOUT_V511 = 75000;
function cacheKeyV511(name){ return CACHE_PREFIX_V511 + (currentUser ? currentUser.uid + '_' : '') + name; }
function saveCacheV511(name, data){
  try { localStorage.setItem(cacheKeyV511(name), JSON.stringify({savedAt: Date.now(), data})); } catch(e) { console.warn('cache cheio', e); }
}
function readCacheV511(name, fallback){
  try { const raw = localStorage.getItem(cacheKeyV511(name)); return raw ? (JSON.parse(raw).data || fallback) : fallback; } catch(e){ return fallback; }
}
function shortCacheListV511(arr, max){ return Array.isArray(arr) ? arr.slice(0, max || 80) : []; }
function notifySwV511(title, body){
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({type:'SHOW_NOTIFICATION', title, body, icon:'icon-192.png'});
      return;
    }
  } catch(e) {}
  try { if ('Notification' in window && Notification.permission === 'granted') new Notification(title, {body, icon:'icon-192.png'}); } catch(e) {}
}

// Presença mais correta: só fica online enquanto o app/PWA está conectado ao Firebase.
function setupPresenceV511(){
  if (!currentUser) return;
  const connectedRef = db.ref('.info/connected');
  connectedRef.off('value');
  connectedRef.on('value', snap => {
    if (snap.val() === true) {
      db.ref('usuarios/'+currentUser.uid).update({online:true, ultimo_visto:Date.now(), conectado_em:Date.now()}).catch(console.warn);
      db.ref('usuarios/'+currentUser.uid).onDisconnect().update({online:false, ultimo_visto:firebase.database.ServerValue.TIMESTAMP});
    }
  });
}

// Cache das mensagens: abre rápido, depois atualiza ao vivo pelo Firebase.
const oldListenMessagesV511 = listenMessages;
listenMessages = function(path){
  const box = $('messagesList');
  if (!box) return;
  const cacheName = 'messages_' + path.replaceAll('/','_');
  const cached = readCacheV511(cacheName, []);
  if (cached.length) {
    box.innerHTML = '';
    cached.forEach(m => renderMessage(m, db.ref(path+'/'+(m.key || 'cache'))));
    box.scrollTop = box.scrollHeight;
  }
  if (messagesListenerRef) messagesListenerRef.off();
  messagesListenerRef = db.ref(path);
  messagesListenerRef.on('value', snap => {
    box.innerHTML = '';
    const arr = [];
    const updates = [];
    snap.forEach(child => {
      const m = child.val() || {}; m.key = child.key;
      arr.push(m);
      renderMessage(m, child.ref);
      if (m.para === currentUser.uid && !m.visto) updates.push(child.ref.update({visto:true, vistoEm:Date.now()}));
      if (m.de !== currentUser.uid) notifyIncoming(m);
    });
    saveCacheV511(cacheName, shortCacheListV511(arr, 200));
    box.scrollTop = box.scrollHeight;
    updates.forEach(p => p.catch(console.warn));
  }, err);
};

// Notificação/toque para mensagem em segundo plano; quando app estiver aberto, não fica incomodando.
notifyIncoming = function(m){
  if(!m || !currentUser || m.de === currentUser.uid) return;
  const msgTime = m.horario || Date.now();
  if (msgTime <= Number(localStorage.lastSeenMsgTimeV511 || localStorage.lastSeenMsgTimeV508 || 0)) return;
  localStorage.lastSeenMsgTimeV511 = String(msgTime);
  if (document.visibilityState !== 'visible') {
    playMessageToneV508?.();
    notifySwV511('Nova mensagem', m.texto || m.nome || m.tipo || 'Você recebeu uma mensagem');
  } else {
    playMessageToneV508?.();
  }
};

// Contatos em cache.
const oldLoadAllContactsV511 = loadAllContacts;
loadAllContacts = function(){
  const list = $('userList');
  const cached = readCacheV511('contacts', []);
  if (list && cached.length) {
    list.innerHTML = '';
    cached.forEach(u => userItem(u, list, `<small>${u.online?'online':'offline'}</small>`));
  }
  if (!currentUser) return;
  if (contactsListenerV508) try { contactsListenerV508.off(); } catch(e) {}
  contactsListenerV508 = db.ref('usuarios').orderByChild('email');
  contactsListenerV508.on('value', snap => {
    const list = $('userList'); if (!list) return;
    list.innerHTML = '';
    const users = [];
    if (snap.exists()) snap.forEach(c => { const u = c.val(); if (u && u.uid !== currentUser.uid) users.push(u); });
    users.sort((a,b)=>(a.nome||a.email||'').localeCompare(b.nome||b.email||''));
    saveCacheV511('contacts', users);
    if (!users.length) return list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhum outro usuário cadastrado</strong><small>Cadastre outro email para testar.</small></div></div>';
    users.forEach(u => userItem(u, list, `<small>${u.online?'online':'offline'}</small>`));
  }, err);
};

// Conversas em cache + reconstrução pelo nó mensagens.
const oldRenderChatsV510 = renderChatsV510;
renderChatsV510 = async function(filter=''){
  const list = $('chatList'); if(!list || !currentUser) return;
  const cached = readCacheV511('chats', []);
  if (cached.length) {
    list.innerHTML='';
    let totalCached=0;
    cached.forEach(item => {
      const c=item.c, u=item.u || {uid:c.uidDestino,nome:'Contato'};
      const nome=(u.nome||u.email||'').toLowerCase(); if(filter && !nome.includes(filter)) return;
      const unreadCount=Number(c.unreadCount || (c.visto?0:1)); totalCached += unreadCount;
      const div=document.createElement('div'); div.className='item';
      div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||u.email||'Contato')}</strong><small>${safe(c.ultima_msg||lastTextV510(c))}</small></div><small>${time(c.horario)}</small>${unreadCount>0?`<span class="unread">${unreadCount}</span>`:''}`;
      div.onclick=()=>openChat(u); list.appendChild(div);
    });
    if ($('badgeChats')) $('badgeChats').textContent=totalCached;
  }
  const map = {};
  const convSnap = await db.ref('conversas/'+currentUser.uid).once('value').catch(()=>null);
  if (convSnap && convSnap.exists()) convSnap.forEach(c=>{ const v=c.val(); if(v && v.uidDestino) map[v.uidDestino]=v; });
  await loadChatsFromMessagesV510(map);
  const items = Object.values(map).sort((a,b)=>(b.horario||0)-(a.horario||0));
  let total=0, shown=0, cacheItems=[];
  list.innerHTML='';
  for (const c of items){
    const us=await db.ref('usuarios/'+c.uidDestino).once('value').catch(()=>null);
    const u=(us && us.val && us.val()) || {uid:c.uidDestino,nome:'Contato'};
    cacheItems.push({c,u});
    const nome=(u.nome||u.email||'').toLowerCase(); if(filter && !nome.includes(filter)) continue;
    const unreadCount = Number(c.unreadCount || (c.visto?0:1)); total += unreadCount;
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||u.email||'Contato')}</strong><small>${safe(c.ultima_msg||lastTextV510(c))}</small></div><small>${time(c.horario)}</small>${unreadCount>0?`<span class="unread">${unreadCount}</span>`:''}`;
    div.onclick=()=>openChat(u); list.appendChild(div); shown++;
  }
  saveCacheV511('chats', shortCacheListV511(cacheItems, 120));
  if (!shown) list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhuma conversa ainda</strong><small>Abra Contatos e toque em uma pessoa para iniciar.</small></div></div>';
  if ($('badgeChats')) $('badgeChats').textContent=total;
};

// Chamadas: cache, pendentes e offline.
function callStatusV511(c){
  if (c.status === 'pending_offline') return 'não tocou: usuário offline';
  if (c.status === 'unavailable') return 'usuário indisponível';
  return callStatusV508(c);
}
loadCalls = function(){
  if (!currentUser) return;
  ensureCallsListV508();
  const list = $('callList');
  const cached = readCacheV511('calls', []);
  if (list && cached.length) renderCallsListV511(cached);
  if (callsListenerV508) try { callsListenerV508.off(); } catch(e) {}
  callsListenerV508 = db.ref('calls').orderByChild('createdAt');
  callsListenerV508.on('value', async snap => {
    const calls = [];
    if (snap.exists()) snap.forEach(c=>{ const call=c.val(); if (call && (call.from===currentUser.uid || call.to===currentUser.uid)) calls.push(call); });
    calls.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    const enriched=[];
    for (const c of calls) {
      const otherUid = c.from === currentUser.uid ? c.to : c.from;
      const us = await db.ref('usuarios/'+otherUid).once('value').catch(()=>null);
      const u = (us && us.val && us.val()) || {uid:otherUid,nome: c.from===currentUser.uid ? c.toName : c.fromName};
      enriched.push({c,u});
    }
    saveCacheV511('calls', shortCacheListV511(enriched, 120));
    renderCallsListV511(enriched);
  }, err);
};
function renderCallsListV511(items){
  const list = $('callList'); if (!list) return;
  list.innerHTML='';
  if (!items.length) { list.innerHTML='<div class="empty-card glass"><h3>📞 Chamadas</h3><p>Áudio e vídeo ficam registrados aqui com horário e duração.</p></div>'; return; }
  items.forEach(({c,u})=>{
    const outgoing = c.from === currentUser.uid;
    const missed = c.status === 'missed' || c.status === 'pending_offline' || (!outgoing && c.status === 'ended' && !c.answeredAt);
    const div=document.createElement('div'); div.className='item call-item '+(outgoing?'outgoing':'incoming')+(missed?' missed':'');
    div.innerHTML = `<div class="avatar">${c.type==='video'?'📹':'📞'}</div><div class="item-content"><strong>${safe(u.nome||u.email||'Contato')}</strong><small>${outgoing?'feita':'recebida'} • ${callStatusV511(c)} • ${formatDateTimeV510(c.createdAt)} • duração ${formatDurationV510(c)}</small></div><button class="icon-btn" title="Ligar de novo">${c.type==='video'?'📹':'📞'}</button>`;
    div.querySelector('button').onclick = ev => { ev.stopPropagation(); openChat(u); setTimeout(()=>startCall(c.type||'audio'), 350); };
    div.onclick=()=>openChat(u); list.appendChild(div);
  });
}

// Se o destinatário estiver offline, não tenta WebRTC; registra a chamada para aparecer quando ele voltar.
const startCallRealV511 = startCall;
startCall = async function(type){
  if (!currentUser || !currentChatUser) return toast('Abra uma conversa com um contato primeiro.');
  const us = await db.ref('usuarios/'+currentChatUser.uid).once('value').catch(()=>null);
  const u = (us && us.val && us.val()) || currentChatUser;
  if (!u.online) {
    const id = db.ref('calls').push().key;
    await db.ref('calls/'+id).set({
      id,
      from: currentUser.uid,
      fromName: currentUser.email || 'Usuário',
      to: currentChatUser.uid,
      toName: currentChatUser.nome || currentChatUser.email || 'Contato',
      type: type || 'audio',
      status: 'pending_offline',
      createdAt: Date.now(),
      endedAt: Date.now()
    });
    return toast('O usuário está offline. A chamada foi registrada e ele verá quando reconectar.');
  }
  return startCallRealV511(type);
};
if (callEl('btnAudioCall')) callEl('btnAudioCall').onclick = () => startCall('audio');
if (callEl('btnVideoCall')) callEl('btnVideoCall').onclick = () => startCall('video');
if (callEl('infoCall')) callEl('infoCall').onclick = () => startCall('audio');
if (callEl('infoVideo')) callEl('infoVideo').onclick = () => startCall('video');

// Recebe chamada quando o app está aberto/minimizado. Se estiver totalmente fechado, a web não consegue atender WebRTC sem Push/FCM/servidor.
const oldListenIncomingCallsV511 = listenIncomingCalls;
listenIncomingCalls = function(){
  if (!currentUser) return;
  resetIncomingListenerV509?.();
  incomingCallsStarted = true;
  incomingCallsRefV509 = db.ref('calls').orderByChild('to').equalTo(currentUser.uid);
  const handler = snap => {
    const call = snap.val();
    if (!call || call.to !== currentUser.uid) return;
    if (call.status === 'pending_offline') {
      if (!call.notifiedToUser) {
        snap.ref.update({notifiedToUser:true}).catch(console.warn);
        notifySwV511('Chamada perdida', (call.fromName || 'Contato') + ' tentou ligar enquanto você estava offline.');
      }
      return;
    }
    if (call.status !== 'ringing') return;
    if (activeCallId && activeCallId !== call.id) return;
    if (Date.now() - (call.createdAt || 0) > CALL_TIMEOUT_V511) { snap.ref.update({status:'missed', endedAt:Date.now()}); return; }
    incomingCallData = call; activeCallId = call.id; activeCallType = call.type || 'audio';
    showCallScreen(activeCallType, true);
    setCallTitle((activeCallType === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio'));
    setCallStatus((call.fromName || 'Contato') + ' está chamando...');
    ringCallV509?.();
    notifySwV511('Chamada recebida', (call.fromName || 'Contato') + ' está chamando');
  };
  incomingCallsRefV509.on('child_added', handler, err);
  incomingCallsRefV509.on('child_changed', handler, err);
};

// Cache dos status e visualizações.
const oldLoadStatusesV511 = loadStatuses;
loadStatuses = function(){
  const list = $('statusList');
  const cached = readCacheV511('status', []);
  if (list && cached.length) renderStatusListV511(cached);
  db.ref('status').on('value', snap => {
    const now = Date.now();
    const pending=[];
    if (snap.exists()) snap.forEach(userNode => userNode.forEach(stNode => {
      const s = stNode.val();
      if (!s || s.expira < now) { stNode.ref.remove(); return; }
      pending.push(Promise.all([
        db.ref('usuarios/' + s.uid).once('value'),
        db.ref('statusViews/' + s.uid + '/' + stNode.key).once('value')
      ]).then(([us,vs]) => ({ key: stNode.key, status:s, user:us.val() || {}, views:vs.val() || {} })));
    }));
    Promise.all(pending).then(items=>{
      statusItemsV506 = items.sort((a,b)=>(b.status.horario||0)-(a.status.horario||0));
      saveCacheV511('status', shortCacheListV511(statusItemsV506, 80));
      renderStatusListV511(statusItemsV506);
    });
  }, err);
};
function renderStatusListV511(items){
  const list=$('statusList'); if (!list) return;
  list.innerHTML='';
  if (!items.length) { list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhum status</strong><small>Publique uma foto ou texto.</small></div></div>'; return; }
  items.forEach((item,index)=>{
    const s=item.status, u=item.user||{}, own=currentUser && s.uid===currentUser.uid, viewsCount=Object.keys(item.views||{}).length;
    const div=document.createElement('div'); div.className='item';
    div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome || u.email || 'Usuário')}</strong><small>${s.tipo === 'imagem' ? '📷 Foto no status' : safe(s.texto)}${own ? ' • 👁️ '+viewsCount+' visualizações' : ''}</small></div><small>${time(s.horario)}</small>`;
    div.onclick=()=>openStatusViewer(index); list.appendChild(div);
  });
}

const oldStartAppV511 = startApp;
startApp = function(){
  try { setupPresenceV511(); } catch(e) { console.warn(e); }
  try { oldStartAppV511(); } catch(e) { console.warn(e); }
  setTimeout(()=>{ try{ loadAllContacts(); loadChats(); loadCalls(); loadStatuses(); listenIncomingCalls(); }catch(e){ console.warn(e); } }, 400);
};


// ===== v517 - Push FCM com chave VAPID informada =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v517 FCM'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js?v=514').catch(console.warn); } catch(e) {}

// IMPORTANTE: troque pelo seu par de chaves Web Push do Firebase Cloud Messaging.
// Firebase Console > Configurações do projeto > Cloud Messaging > Web Push certificates > Generate key pair.
window.FCM_VAPID_KEY_V512 = window.FCM_VAPID_KEY_V512 || 'BNVYSbKeSP3WM_puSG15NIO1bVIlh3pFs-dfGQsecuSjRQuoT_SuM8s8zmaqNgD1bQ5JrZle7WAYZeVigQ-6Xrg';
let fcmReadyV512 = false;

async function initPushV512(){
  try {
    if (!currentUser || !('Notification' in window) || !('serviceWorker' in navigator) || !firebase.messaging) return;
    if (window.FCM_VAPID_KEY_V512.includes('COLE_SUA_CHAVE')) {
      console.warn('FCM VAPID KEY não configurada. Notificação com app fechado só ativa depois de colocar a chave VAPID.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;
    const reg = await navigator.serviceWorker.register('service-worker.js?v=514');
    const messaging = firebase.messaging();
    const token = await messaging.getToken({ vapidKey: window.FCM_VAPID_KEY_V512, serviceWorkerRegistration: reg });
    if (!token) return;
    await db.ref('usuarios/' + currentUser.uid + '/fcmTokens/' + safeKeyV512(token)).set({ token, plataforma:'web', atualizado: Date.now() });
    await db.ref('usuarios/' + currentUser.uid).update({ fcmToken: token, pushAtivo: true });
    fcmReadyV512 = true;
    messaging.onMessage(payload => {
      const n = payload.notification || {};
      notifyV511(n.title || 'Bate-papo', n.body || 'Nova atualização');
    });
  } catch(e) { console.warn('Erro ao ativar FCM', e); }
}
function safeKeyV512(token){ return String(token).replace(/[.#$\[\]/]/g, '_'); }

const oldAuthChangedV512 = auth.onAuthStateChanged;
// Como o listener principal já existe, apenas tenta ativar push ao abrir home também.
setTimeout(()=>{ if(currentUser) initPushV512(); }, 2500);

async function queuePushV512(toUid, type, title, body, extra){
  try {
    if (!currentUser || !toUid || toUid === currentUser.uid) return;
    await db.ref('pushQueue').push({
      toUid,
      fromUid: currentUser.uid,
      type,
      title: title || 'Bate-papo',
      body: body || '',
      data: extra || {},
      createdAt: Date.now(),
      status: 'pending'
    });
  } catch(e){ console.warn('pushQueue falhou', e); }
}

const sendMessageV511_original_for_v512 = sendMessage;
sendMessage = async function(data){
  await sendMessageV511_original_for_v512(data);
  try {
    if (!currentGroup && currentChatUser) {
      let body = 'Nova mensagem';
      if (data.tipo === 'texto') body = data.texto || 'Nova mensagem';
      if (data.tipo === 'audio') body = '🎙️ Enviou um áudio';
      if (data.tipo === 'imagem') body = '📷 Enviou uma foto';
      if (data.tipo === 'documento') body = '📄 Enviou um documento';
      if (data.tipo === 'localizacao') body = '📍 Enviou uma localização';
      await queuePushV512(currentChatUser.uid, 'message', 'Nova mensagem', body, {chatId: currentChatId, tipo:data.tipo||'texto'});
    }
  } catch(e){ console.warn(e); }
};
if (callEl('btnSend')) callEl('btnSend').onclick = async()=>{const t=$('messageText').value.trim();if(!t||(!currentChatUser&&!currentGroup))return;try{await sendMessage({texto:t,tipo:'texto'});$('messageText').value=''}catch(e){err(e)}};

const startCallV511_original_for_v512 = startCall;
startCall = async function(type){
  if (currentChatUser) {
    const title = type === 'video' ? 'Chamada de vídeo' : 'Chamada de áudio';
    const body = (currentUser.email || 'Alguém') + ' está chamando você';
    await queuePushV512(currentChatUser.uid, 'call', title, body, {callType:type, fromUid:currentUser.uid});
  }
  return startCallV511_original_for_v512(type);
};
if (callEl('btnAudioCall')) callEl('btnAudioCall').onclick = () => startCall('audio');
if (callEl('btnVideoCall')) callEl('btnVideoCall').onclick = () => startCall('video');
if (callEl('infoCall')) callEl('infoCall').onclick = () => startCall('audio');
if (callEl('infoVideo')) callEl('infoVideo').onclick = () => startCall('video');

// Botão sino também força pedir permissão de push.
try { if ($('btnNotif')) $('btnNotif').onclick = () => initPushV512().then(()=>toast(fcmReadyV512?'Notificações ativadas.':'Coloque a chave VAPID para ativar app fechado.')); } catch(e) {}


/* ===== v517: VAPID completa + home compacta + conversas sem duplicar ===== */
try { window.APP_VERSION = '514'; if ($('debugText')) $('debugText').textContent = 'Projeto: ferramentas-projeto | v517'; } catch(e) {}

let renderChatsV514Seq = 0;
async function collectChatsV514(){
  const map = {};
  const me = currentUser && currentUser.uid;
  if (!me) return map;

  const convSnap = await db.ref('conversas/'+me).once('value').catch(()=>null);
  if (convSnap && convSnap.exists()) convSnap.forEach(child=>{
    const c = child.val() || {};
    const uid = c.uidDestino || child.key;
    if (!uid || uid === me) return;
    const antigo = map[uid];
    if (!antigo || Number(c.horario||0) >= Number(antigo.horario||0)) map[uid] = {...c, uidDestino: uid};
  });

  const msgSnap = await db.ref('mensagens').once('value').catch(()=>null);
  if (msgSnap && msgSnap.exists()) msgSnap.forEach(chatNode=>{
    let last = null, unread = 0, otherUid = '';
    chatNode.forEach(msgNode=>{
      const m = msgNode.val() || {};
      if (m.de !== me && m.para !== me) return;
      const h = Number(m.horario || 0);
      if (!last || h > Number(last.horario || 0)) last = m;
      if (m.para === me && !m.visto) unread++;
      if (m.de === me && m.para) otherUid = m.para;
      if (m.para === me && m.de) otherUid = m.de;
    });
    if (!last || !otherUid || otherUid === me) return;
    const item = {
      uidDestino: otherUid,
      ultima_msg: (typeof lastTextV510 === 'function' ? lastTextV510(last) : (last.texto || last.tipo || 'Mensagem')),
      tipo: last.tipo || 'texto',
      horario: last.horario || Date.now(),
      visto: unread === 0,
      unreadCount: unread
    };
    const atual = map[otherUid];
    if (!atual || Number(item.horario||0) >= Number(atual.horario||0)) map[otherUid] = {...atual, ...item, unreadCount: Math.max(Number(atual?.unreadCount||0), unread)};
  });
  return map;
}

async function renderChatsV514(filter=''){
  const list = $('chatList');
  if (!list || !currentUser) return;
  const seq = ++renderChatsV514Seq;
  const map = await collectChatsV514();
  if (seq !== renderChatsV514Seq) return;
  const items = Object.values(map).sort((a,b)=>Number(b.horario||0)-Number(a.horario||0));
  list.innerHTML = '';
  let total = 0, shown = 0;
  const seen = new Set();
  for (const c of items){
    const uid = c.uidDestino;
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    const us = await db.ref('usuarios/'+uid).once('value').catch(()=>null);
    if (seq !== renderChatsV514Seq) return;
    const u = (us && us.val && us.val()) || {uid, nome:'Contato'};
    const nomeBusca = (u.nome || u.email || '').toLowerCase();
    if (filter && !nomeBusca.includes(filter)) continue;
    const unreadCount = Number(c.unreadCount || (c.visto ? 0 : 1));
    total += unreadCount;
    const last = c.ultima_msg || (typeof lastTextV510 === 'function' ? lastTextV510(c) : 'Mensagem');
    const div = document.createElement('div');
    div.className = 'item chat-row-v517';
    div.innerHTML = `<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome || u.email || 'Contato')}</strong><small>${safe(last)}</small></div><small class="item-hour">${time(c.horario)}</small>${unreadCount>0?`<span class="unread">${unreadCount}</span>`:''}`;
    div.onclick = () => openChat(u);
    list.appendChild(div);
    shown++;
  }
  if (!shown) list.innerHTML = '<div class="item"><div class="item-content"><strong>Nenhuma conversa ainda</strong><small>Abra Contatos e toque em uma pessoa para iniciar.</small></div></div>';
  if ($('badgeChats')) $('badgeChats').textContent = total;
}

loadChats = function(filter=''){
  if (!currentUser) return;
  if (chatsListenerV508) try { chatsListenerV508.off(); } catch(e) {}
  try { db.ref('mensagens').off('value'); } catch(e) {}
  renderChatsV514(filter).catch(err);
  chatsListenerV508 = db.ref('conversas/'+currentUser.uid);
  chatsListenerV508.on('value', () => renderChatsV514(($('chatSearch')?.value || '').trim().toLowerCase()).catch(err), err);
  db.ref('mensagens').on('value', () => renderChatsV514(($('chatSearch')?.value || '').trim().toLowerCase()).catch(console.warn));
};

try { if ($('chatSearch')) $('chatSearch').oninput = () => loadChats($('chatSearch').value.trim().toLowerCase()); } catch(e) {}
setTimeout(()=>{ try { if (currentUser) { initPushV512 && initPushV512(); loadChats(); } } catch(e) { console.warn(e); } }, 1200);

async function importPhoneContacts(){
  try{
    if(!("contacts" in navigator) || !navigator.contacts.select){
      return toast("Seu navegador não permite pegar contatos do telefone. No Chrome Android/PWA instalado costuma aparecer essa permissão.");
    }
    const props=["name","tel","email"];
    const selected=await navigator.contacts.select(props,{multiple:true});
    if(!selected || !selected.length) return toast("Nenhum contato selecionado.");
    const tels=new Set(), emails=new Set();
    selected.forEach(c=>{(c.tel||[]).forEach(t=>{const d=phoneDigits(t); if(d) tels.add(d.slice(-11));});(c.email||[]).forEach(e=>emails.add(String(e).toLowerCase()));});
    const snap=await db.ref("usuarios").once("value");
    const list=$("userList"); list.innerHTML=""; let found=0;
    snap.forEach(ch=>{const u=ch.val(); if(!u || u.uid===currentUser.uid) return; const ud=phoneDigits(u.telefoneDigits||u.telefone).slice(-11); const em=String(u.email||"").toLowerCase(); if((ud && tels.has(ud)) || (em && emails.has(em))){ userItem(u,list); found++; }});
    if(!found) list.innerHTML='<div class="item"><div class="item-content"><strong>Nenhum usuário encontrado</strong><small>Nenhum contato selecionado está cadastrado no app.</small></div></div>';
  }catch(e){ if(e && e.name==="AbortError") return; err(e); }
}
if($("btnImportPhoneContacts")) $("btnImportPhoneContacts").onclick=importPhoneContacts;
