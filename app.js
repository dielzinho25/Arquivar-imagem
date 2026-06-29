// ===== BATE-PAPO AVANÇADO - FIREBASE WEB V8 - v504 =====
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

firebase.initializeApp(firebaseConfig);
const auth=firebase.auth(), db=firebase.database(), storage=firebase.storage();
const $=id=>document.getElementById(id);
let currentUser=null,currentChatUser=null,currentChatId=null,currentGroup=null,messagesListenerRef=null,mediaRecorder=null,audioChunks=[],recording=false,replyTo=null,deferredPrompt=null;

function show(id){["authScreen","homeScreen","chatScreen","profileScreen"].forEach(s=>{const el=$(s); if(el){el.classList.add("hidden"); el.style.display="none";}}); const target=$(id); if(target){target.classList.remove("hidden"); target.style.display="block";} const panel=$("infoPanel"); if(panel && id!=="chatScreen") panel.classList.add("hidden");}
function toast(m){alert(String(m||"Erro"))}
function safe(t){return String(t||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function time(ms){return new Date(ms||Date.now()).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}
function chatId(a,b){return a<b?`${a}_${b}`:`${b}_${a}`}
function err(e){console.error(e);let m=e&&e.message?e.message:String(e);if(m.includes("API key"))m="API KEY inválida. Confira a chave Browser no Firebase/Google Cloud.";if(m.includes("operation-not-allowed"))m="Ative Email/Senha em Authentication > Sign-in method.";if(m.includes("permission_denied"))m="Permissão negada. Confira as regras do Realtime Database/Storage.";toast(m)}
function debug(){if($("debugText"))$("debugText").textContent="Projeto: "+firebaseConfig.projectId+" | v504"}debug();

if(localStorage.theme==="light")document.body.classList.add("light");
$("btnTheme").onclick=()=>{document.body.classList.toggle("light");localStorage.theme=document.body.classList.contains("light")?"light":"dark"};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("btnInstall").classList.remove("hidden")});
$("btnInstall").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null;$("btnInstall").classList.add("hidden")}};
$("btnNotify").onclick=async()=>{if(!("Notification" in window))return toast("Este navegador não suporta notificação.");const p=await Notification.requestPermission();toast(p==="granted"?"Notificações ativadas.":"Notificação não permitida.")};
if("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js?v=503").catch(console.warn);

$("btnRegister").onclick=async()=>{const name=$("authName").value.trim(),email=$("authEmail").value.trim().toLowerCase(),pass=$("authPassword").value.trim();if(!name||!email||!pass)return toast("Preencha nome, email e senha.");try{const r=await auth.createUserWithEmailAndPassword(email,pass);currentUser=r.user;await db.ref("usuarios/"+currentUser.uid).set({uid:currentUser.uid,nome:name,email,foto:"",recado:"Olá! Estou usando o Bate-papo.",online:true,ultimo_visto:Date.now()});show("homeScreen");startApp()}catch(e){err(e)}};
$("btnLogin").onclick=async()=>{const email=$("authEmail").value.trim().toLowerCase(),pass=$("authPassword").value.trim();if(!email||!pass)return toast("Preencha email e senha.");try{const r=await auth.signInWithEmailAndPassword(email,pass);currentUser=r.user;await setOnline(true);show("homeScreen");startApp()}catch(e){err(e)}};
$("btnLogout").onclick=async()=>{try{await setOnline(false);await auth.signOut()}catch(e){err(e)}};
auth.onAuthStateChanged(async u=>{try{if(!u){currentUser=null;show("authScreen");return}currentUser=u;await db.ref("usuarios/"+u.uid).update({uid:u.uid,email:u.email||"",online:true,ultimo_visto:Date.now()});db.ref("usuarios/"+u.uid).onDisconnect().update({online:false,ultimo_visto:firebase.database.ServerValue.TIMESTAMP});show("homeScreen");startApp()}catch(e){err(e)}});
async function setOnline(v){if(currentUser)await db.ref("usuarios/"+currentUser.uid).update({online:v,ultimo_visto:Date.now()})}
function startApp(){loadChats();loadStatuses();loadGroups()}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");["tabChats","tabStatus","tabUsers","tabGroups","tabCalls"].forEach(id=>$(id).classList.add("hidden"));$("tab"+b.dataset.tab[0].toUpperCase()+b.dataset.tab.slice(1)).classList.remove("hidden")});
$("chatSearch").oninput=()=>loadChats($("chatSearch").value.trim().toLowerCase());

function avatarHtml(u){return u&&u.foto?`<img src="${u.foto}">`:"👤"}
function userItem(u,container,extra=""){const div=document.createElement("div");div.className="item";div.innerHTML=`<div class="avatar">${avatarHtml(u)}</div><div class="item-content"><strong>${safe(u.nome||u.email)}</strong><small>${safe(u.recado||u.email||"")}</small></div>${extra}`;div.onclick=()=>openChat(u);container.appendChild(div)}
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

$("btnProfile").onclick=async()=>{try{const s=await db.ref("usuarios/"+currentUser.uid).once("value"),u=s.val()||{};$("profileName").value=u.nome||"";$("profileBio").value=u.recado||"";$("profilePhotoPreview").innerHTML=avatarHtml(u);show("profileScreen")}catch(e){err(e)}};$("btnBackProfile").onclick=()=>show("homeScreen");$("btnSaveProfile").onclick=async()=>{try{const data={nome:$("profileName").value.trim(),recado:$("profileBio").value.trim()};const f=$("profilePhoto").files[0];if(f){const r=storage.ref(`profile/${currentUser.uid}_${Date.now()}_${f.name}`);await r.put(f);data.foto=await r.getDownloadURL()}await db.ref("usuarios/"+currentUser.uid).update(data);toast("Perfil salvo.");show("homeScreen")}catch(e){err(e)}};
$("btnInfo").onclick=()=>{const u=currentChatUser;if(!u)return toast("Informações do grupo ainda simples.");$("infoAvatar").innerHTML=avatarHtml(u);$("infoName").textContent=u.nome||u.email;$("infoStatus").textContent=u.online?"online":"offline";$("infoBio").textContent=u.recado||"";$("mediaGrid").innerHTML="";$("infoPanel").classList.remove("hidden")};$("btnCloseInfo").onclick=()=>$("infoPanel").classList.add("hidden");$("infoMsg").onclick=()=>$("infoPanel").classList.add("hidden");$("infoCall").onclick=()=>toast("Chamada de áudio: precisa integrar WebRTC/servidor de chamada.");$("infoVideo").onclick=()=>toast("Chamada de vídeo: precisa integrar WebRTC/servidor de chamada.");$("btnAudioCall").onclick=$("infoCall").onclick;$("btnVideoCall").onclick=$("infoVideo").onclick;
window.addEventListener("beforeunload",()=>{if(currentUser)db.ref("usuarios/"+currentUser.uid).update({online:false,ultimo_visto:Date.now()})});

// ===== v506 - STATUS DENTRO DO APP + GRUPOS VISÍVEIS COM LIMITE DE 100 =====
try { if ($('debugText')) $('debugText').textContent = 'Projeto: ' + firebaseConfig.projectId + ' | v506'; } catch(e) {}
try { if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js?v=506').catch(console.warn); } catch(e) {}

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
