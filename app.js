// ===== COLOQUE A CONFIGURAÇÃO DO SEU FIREBASE AQUI =====
const firebaseConfig = {
  apiKey: "COLE_AQUI",
  authDomain: "COLE_AQUI.firebaseapp.com",
  databaseURL: "https://COLE_AQUI-default-rtdb.firebaseio.com",
  projectId: "COLE_AQUI",
  storageBucket: "COLE_AQUI.appspot.com",
  messagingSenderId: "COLE_AQUI",
  appId: "COLE_AQUI"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

let currentUser = null;
let currentChatUser = null;
let currentChatId = null;
let mediaRecorder = null;
let audioChunks = [];
let recording = false;
let messagesListenerRef = null;

const $ = (id) => document.getElementById(id);

function show(screenId) {
  ["authScreen", "homeScreen", "chatScreen", "profileScreen"].forEach(id => {
    $(id).classList.add("hidden");
  });
  $(screenId).classList.remove("hidden");
}

function toast(msg) {
  alert(msg);
}

function formatTime(ms) {
  const d = new Date(ms);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function getChatId(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function safeText(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ===== AUTH =====
$("btnRegister").onclick = async () => {
  const name = $("authName").value.trim();
  const email = $("authEmail").value.trim();
  const pass = $("authPassword").value.trim();

  if (!name || !email || !pass) return toast("Preencha nome, email e senha.");

  try {
    const result = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = result.user.uid;

    await db.ref("usuarios/" + uid).set({
      uid,
      nome: name,
      email,
      foto: "",
      recado: "Olá! Estou usando o Bate-papo.",
      online: true,
      ultimo_visto: Date.now()
    });
  } catch (e) {
    toast(e.message);
  }
};

$("btnLogin").onclick = async () => {
  const email = $("authEmail").value.trim();
  const pass = $("authPassword").value.trim();
  if (!email || !pass) return toast("Preencha email e senha.");

  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    toast(e.message);
  }
};

$("btnLogout").onclick = async () => {
  if (currentUser) {
    await db.ref("usuarios/" + currentUser.uid).update({
      online: false,
      ultimo_visto: Date.now()
    });
  }
  auth.signOut();
};

auth.onAuthStateChanged(async (user) => {
  if (!user) {
    currentUser = null;
    show("authScreen");
    return;
  }

  currentUser = user;
  await db.ref("usuarios/" + user.uid).update({
    online: true,
    ultimo_visto: Date.now()
  });

  db.ref("usuarios/" + user.uid).onDisconnect().update({
    online: false,
    ultimo_visto: firebase.database.ServerValue.TIMESTAMP
  });

  show("homeScreen");
  loadChats();
  loadStatuses();
});

// ===== ABAS =====
document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    $("tabChats").classList.add("hidden");
    $("tabStatus").classList.add("hidden");
    $("tabUsers").classList.add("hidden");

    $("tab" + btn.dataset.tab.charAt(0).toUpperCase() + btn.dataset.tab.slice(1)).classList.remove("hidden");
  };
});

// ===== BUSCAR CONTATO =====
$("btnSearchUser").onclick = async () => {
  const email = $("searchEmail").value.trim().toLowerCase();
  if (!email) return toast("Digite o email do contato.");

  const snap = await db.ref("usuarios").orderByChild("email").equalTo(email).once("value");
  $("userList").innerHTML = "";

  if (!snap.exists()) {
    $("userList").innerHTML = `<div class="item"><div class="item-content"><strong>Nenhum contato encontrado</strong></div></div>`;
    return;
  }

  snap.forEach(child => {
    const u = child.val();
    if (u.uid !== currentUser.uid) addUserItem(u, $("userList"));
  });
};

function addUserItem(u, container) {
  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `
    <div class="avatar">${u.foto ? `<img src="${u.foto}">` : "👤"}</div>
    <div class="item-content">
      <strong>${safeText(u.nome)}</strong>
      <small>${safeText(u.recado || u.email)}</small>
    </div>
  `;
  div.onclick = () => openChat(u);
  container.appendChild(div);
}

// ===== LISTA DE CONVERSAS =====
function loadChats() {
  const uid = currentUser.uid;
  db.ref("conversas/" + uid).orderByChild("horario").on("value", async snap => {
    const list = $("chatList");
    list.innerHTML = "";

    if (!snap.exists()) {
      list.innerHTML = `<div class="item"><div class="item-content"><strong>Nenhuma conversa ainda</strong><small>Busque um contato pelo email.</small></div></div>`;
      return;
    }

    const items = [];
    snap.forEach(child => items.push(child.val()));
    items.reverse();

    for (const c of items) {
      const userSnap = await db.ref("usuarios/" + c.uidDestino).once("value");
      const u = userSnap.val();
      if (!u) continue;

      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div class="avatar">${u.foto ? `<img src="${u.foto}">` : "👤"}</div>
        <div class="item-content">
          <strong>${safeText(u.nome)}</strong>
          <small>${c.tipo === "imagem" ? "📷 Imagem" : c.tipo === "audio" ? "🎙️ Áudio" : safeText(c.ultima_msg)}</small>
        </div>
        <small>${formatTime(c.horario || Date.now())}</small>
      `;
      div.onclick = () => openChat(u);
      list.appendChild(div);
    }
  });
}

// ===== CHAT =====
function openChat(user) {
  currentChatUser = user;
  currentChatId = getChatId(currentUser.uid, user.uid);

  $("chatName").textContent = user.nome || "Contato";
  $("chatAvatar").innerHTML = user.foto ? `<img src="${user.foto}">` : "👤";
  $("chatOnline").textContent = user.online ? "online" : "offline";

  db.ref("usuarios/" + user.uid).on("value", snap => {
    const u = snap.val();
    if (!u) return;
    $("chatOnline").textContent = u.online ? "online" : "visto por último " + formatTime(u.ultimo_visto || Date.now());
  });

  show("chatScreen");
  listenMessages();
}

$("btnBack").onclick = () => {
  if (messagesListenerRef) messagesListenerRef.off();
  show("homeScreen");
};

function listenMessages() {
  const list = $("messagesList");
  list.innerHTML = "";

  if (messagesListenerRef) messagesListenerRef.off();
  messagesListenerRef = db.ref("mensagens/" + currentChatId);

  messagesListenerRef.on("child_added", snap => {
    const m = snap.val();
    renderMessage(m);

    if (m.para === currentUser.uid && !m.visto) {
      snap.ref.update({ visto: true });
      try { $("notifySound").play(); } catch(e) {}
    }
  });
}

function renderMessage(m) {
  const wrap = document.createElement("div");
  wrap.className = "msg-wrap " + (m.de === currentUser.uid ? "me" : "other");

  let content = "";
  if (m.tipo === "imagem") {
    content = `<img src="${m.url}" onclick="window.open('${m.url}', '_blank')" />`;
  } else if (m.tipo === "audio") {
    content = `<audio controls src="${m.url}"></audio>`;
  } else {
    content = safeText(m.texto);
  }

  wrap.innerHTML = `
    <div class="bubble">
      ${content}
      <span class="time">${formatTime(m.horario || Date.now())} ${m.de === currentUser.uid ? (m.visto ? "✓✓" : "✓") : ""}</span>
    </div>
  `;

  $("messagesList").appendChild(wrap);
  $("messagesList").scrollTop = $("messagesList").scrollHeight;
}

$("btnSend").onclick = sendTextMessage;

async function sendTextMessage() {
  const text = $("messageText").value.trim();
  if (!text || !currentChatUser) return;

  await sendMessage({
    texto: text,
    tipo: "texto",
    url: ""
  });

  $("messageText").value = "";
}

async function sendMessage(data) {
  const uid = currentUser.uid;
  const dest = currentChatUser.uid;
  const horario = Date.now();

  const msg = {
    de: uid,
    para: dest,
    texto: data.texto || "",
    tipo: data.tipo,
    url: data.url || "",
    horario,
    visto: false
  };

  await db.ref("mensagens/" + currentChatId).push(msg);

  const lastText = data.tipo === "texto" ? data.texto : data.tipo;

  await db.ref("conversas/" + uid + "/" + dest).set({
    uidDestino: dest,
    ultima_msg: lastText,
    tipo: data.tipo,
    horario,
    visto: true
  });

  await db.ref("conversas/" + dest + "/" + uid).set({
    uidDestino: uid,
    ultima_msg: lastText,
    tipo: data.tipo,
    horario,
    visto: false
  });
}

// ===== IMAGEM =====
$("btnPickImage").onclick = () => $("imageInput").click();

$("imageInput").onchange = async (e) => {
  const file = e.target.files[0];
  if (!file || !currentChatUser) return;

  const path = `chat_images/${currentUser.uid}_${Date.now()}_${file.name}`;
  const ref = storage.ref(path);

  await ref.put(file);
  const url = await ref.getDownloadURL();

  await sendMessage({
    texto: "",
    tipo: "imagem",
    url
  });

  $("imageInput").value = "";
};

// ===== ÁUDIO =====
$("btnRecord").onclick = async () => {
  if (!recording) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];

      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: "audio/webm" });
        const path = `audios/${currentUser.uid}_${Date.now()}.webm`;
        const ref = storage.ref(path);

        await ref.put(blob);
        const url = await ref.getDownloadURL();

        await sendMessage({
          texto: "",
          tipo: "audio",
          url
        });
      };

      mediaRecorder.start();
      recording = true;
      $("btnRecord").classList.add("recording");
      $("btnRecord").textContent = "⏹️";
    } catch (e) {
      toast("Permita o microfone para gravar áudio.");
    }
  } else {
    mediaRecorder.stop();
    recording = false;
    $("btnRecord").classList.remove("recording");
    $("btnRecord").textContent = "🎙️";
  }
};

// ===== STATUS =====
$("btnPostStatus").onclick = async () => {
  const text = $("statusText").value.trim();
  const file = $("statusImage").files[0];

  if (!text && !file) return toast("Digite um texto ou escolha uma imagem.");

  let url = "";
  let tipo = text ? "texto" : "imagem";

  if (file) {
    tipo = "imagem";
    const path = `status/${currentUser.uid}_${Date.now()}_${file.name}`;
    const ref = storage.ref(path);
    await ref.put(file);
    url = await ref.getDownloadURL();
  }

  await db.ref("status/" + currentUser.uid).push({
    uid: currentUser.uid,
    tipo,
    texto: text,
    url,
    horario: Date.now(),
    expira: Date.now() + 86400000
  });

  $("statusText").value = "";
  $("statusImage").value = "";
};

function loadStatuses() {
  db.ref("status").on("value", async snap => {
    const list = $("statusList");
    list.innerHTML = "";

    const now = Date.now();

    if (!snap.exists()) {
      list.innerHTML = `<div class="item"><div class="item-content"><strong>Nenhum status</strong></div></div>`;
      return;
    }

    snap.forEach(userNode => {
      userNode.forEach(stNode => {
        const s = stNode.val();
        if (!s || s.expira < now) {
          stNode.ref.remove();
          return;
        }

        db.ref("usuarios/" + s.uid).once("value").then(userSnap => {
          const u = userSnap.val() || {};
          const div = document.createElement("div");
          div.className = "item";
          div.innerHTML = `
            <div class="avatar">${u.foto ? `<img src="${u.foto}">` : "👤"}</div>
            <div class="item-content">
              <strong>${safeText(u.nome || "Usuário")}</strong>
              <small>${s.tipo === "imagem" ? "📷 Foto no status" : safeText(s.texto)}</small>
            </div>
          `;
          div.onclick = () => {
            if (s.tipo === "imagem") window.open(s.url, "_blank");
            else alert(s.texto);
          };
          list.prepend(div);
        });
      });
    });
  });
}

// ===== PERFIL =====
$("btnProfile").onclick = async () => {
  const snap = await db.ref("usuarios/" + currentUser.uid).once("value");
  const u = snap.val() || {};
  $("profileName").value = u.nome || "";
  $("profileBio").value = u.recado || "";
  $("profilePhotoPreview").innerHTML = u.foto ? `<img src="${u.foto}">` : "👤";
  show("profileScreen");
};

$("btnBackProfile").onclick = () => show("homeScreen");

$("btnSaveProfile").onclick = async () => {
  const name = $("profileName").value.trim();
  const bio = $("profileBio").value.trim();
  const file = $("profilePhoto").files[0];

  let data = { nome: name, recado: bio };

  if (file) {
    const path = `profile/${currentUser.uid}_${Date.now()}_${file.name}`;
    const ref = storage.ref(path);
    await ref.put(file);
    data.foto = await ref.getDownloadURL();
  }

  await db.ref("usuarios/" + currentUser.uid).update(data);
  toast("Perfil salvo.");
  show("homeScreen");
};

// ===== PWA =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

// ===== FECHAR ABA =====
window.addEventListener("beforeunload", () => {
  if (currentUser) {
    db.ref("usuarios/" + currentUser.uid).update({
      online: false,
      ultimo_visto: Date.now()
    });
  }
});
