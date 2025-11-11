/*******************************************************
 *  Copa de la Ciudadanía Digital — app.js (COMPLETO)
 *  - Modo 1 jugador y Multijugador (Firebase RTDB)
 *  - Salas con código de 4 dígitos y enlace/QR
 *  - Ranking local (LocalStorage) + global (Firebase)
 *  - Sonidos: inicio / espera (lobby) / juego / final
 *  - Botón “Nueva partida” vuelve al inicio y sale de la sala si corresponde
 *  - Invitados: no pueden cambiar dificultad/categorías (las define el host)
 *******************************************************/

/***********************
 *  Firebase (Realtime DB)
 ***********************/
const FIREBASE_ENABLED = true;

const firebaseConfig = {
  apiKey: "AIzaSyBUJLB57u7uw48G9LyRplDO-x8tQ8gVEGM",
  authDomain: "copa-387c8.firebaseapp.com",
  databaseURL: "https://copa-387c8-default-rtdb.firebaseio.com",
  projectId: "copa-387c8",
  storageBucket: "copa-387c8.appspot.com",
  messagingSenderId: "203974305127",
  appId: "1:203974305127:web:300a3d44c120f759d5bbc2",
  measurementId: "G-J7W12H9DMC"
};

let fbApp = null, fbDb = null;
if (FIREBASE_ENABLED && window.firebase) {
  fbApp = firebase.initializeApp(firebaseConfig);
  fbDb  = firebase.database();
  console.log("✅ Firebase conectado");
} else {
  console.warn("⚠️ Firebase no disponible, solo funcionará el modo local.");
}

/*******************************************************
 *  SONIDOS
 *******************************************************/
const sfx = {
  enabled: true,      // si querés que arranque muteado, poné false
  unlocked: false,    // se vuelve true tras el primer gesto del usuario
  clips: {
    inicio: new Audio('sonidos/inicio.mp3'),
    lobby:  new Audio('sonidos/espera.mp3'),
    game:   new Audio('sonidos/juego.mp3'),
    end:    new Audio('sonidos/fin2.mp3')
  }
};

sfx.clips.inicio.loop = true;
sfx.clips.lobby.loop  = true;
sfx.clips.game.loop   = true;
sfx.clips.end.loop    = false;

sfx.clips.inicio.volume = 0.25;
sfx.clips.lobby.volume  = 0.25;
sfx.clips.game.volume   = 0.22;
sfx.clips.end.volume    = 0.30;

function sfxStopAll(){
  Object.values(sfx.clips).forEach(a=>{
    try { a.pause(); a.currentTime = 0; } catch(e){}
  });
}

function sfxPlay(name){
  if (!sfx.enabled || !sfx.unlocked) return;
  const a = sfx.clips[name];
  if(!a) return;
  a.play().catch(()=>{/* algunos navegadores pueden bloquear si no hay gesto */});
}

/*******************************************************
 *  BANCO DE PREGUNTAS (ejemplo)
 *******************************************************/
const QUESTIONS = [
  {
    text: "Tu app favorita te pide activarte la ubicación 'siempre' para poder usar un filtro. ¿Qué hacés?",
    options: [
      "Acepto 'siempre', total no pasa nada",
      "Solo 'al usar la app' y reviso por qué lo pide",
      "Desactivo ubicación del teléfono para todo",
      "Comparto ubicación con mis amigos por las dudas"
    ],
    answer: 1,
    explain: "Conceder permisos mínimos reduce tu huella de datos. 'Al usar la app' limita el acceso innecesario.",
    category: "Privacidad",
    tags: ["seguridad"]
  },
  {
    text: "Te llega una noticia viral con una foto impactante. ¿Primer paso responsable?",
    options: [
      "Compartirla rápido para avisar a todos",
      "Leer solo el titular",
      "Buscar la fuente original y fecha, y hacer búsqueda inversa de imagen",
      "Opinar en comentarios para ver qué dicen"
    ],
    answer: 2,
    explain: "Verificar fuente, fecha y la imagen (reverse image) ayuda a detectar desinformación.",
    category: "Fake News",
    tags: ["critico"]
  },
  {
    text: "Un compañero recibe burlas en un grupo por su acento. ¿Qué opción promueve mejor convivencia?",
    options: [
      "Ignorar, no es mi problema",
      "Reírme para encajar",
      "Pedir respeto y avisar al adulto/a referente si continúa",
      "Sacar captura y subirla a otra red"
    ],
    answer: 2,
    explain: "Intervenir con respeto y escalar si sigue es clave para frenar el ciberacoso.",
    category: "Convivencia",
    tags: ["empatia"]
  },
  {
    text: "Tu contraseña: 'mate123'. ¿Qué mejorarías?",
    options: [
      "Nada, es corta y fácil",
      "Agrego símbolos, mayúsculas y la hago larga (pasfrase)",
      "La anoto en una nota del celu",
      "Uso la misma en todas para no olvidarme"
    ],
    answer: 1,
    explain: "Usá frases largas con variedad de caracteres o gestor de contraseñas. Nunca repitas.",
    category: "Seguridad",
    tags: ["seguridad"]
  },
  {
    text: "Llevás 5 horas seguidas scrolleando y te duele la cabeza.",
    options: [
      "Sigo, ya fue",
      "Pongo recordatorio de descanso y cambio de actividad",
      "Subo un meme del dolor de cabeza",
      "Subo el brillo al máximo"
    ],
    answer: 1,
    explain: "Pausas programadas y alternar actividades cuidan tu bienestar digital.",
    category: "Bienestar",
    tags: ["bienestar"]
  },
  {
    text: "Un influencer recomienda una 'inversión segura' con link raro.",
    options: [
      "Entro y conecto mi cuenta",
      "Le pregunto por DM si es real",
      "Reviso dominio, opiniones externas y desconfío de promesas",
      "Comparto para que otros ganen"
    ],
    answer: 2,
    explain: "Cuidado con phishing/esquemas. Verificá dominio y reseñas; si suena demasiado bueno, dudá.",
    category: "Pensamiento crítico",
    tags: ["critico","seguridad"]
  },
  {
    text: "Publican tu foto sin permiso en un grupo.",
    options: [
      "Respondo con insultos",
      "Solicito que la bajen, reporto y pido apoyo a referentes",
      "Comparto otras fotos para tapar esa",
      "La dejo para no quedar mal"
    ],
    answer: 1,
    explain: "Tenés derecho a tu imagen. Pedí retiro, reportá y buscá apoyo adulto/institucional.",
    category: "Derechos digitales",
    tags: ["empatia","seguridad"]
  },
  {
    text: "La app te ofrece 'iniciar con Google' o crear cuenta nueva.",
    options: [
      "Siempre con Google para todo",
      "Elijo según confianza y permisos; a veces es mejor cuenta separada",
      "Creo cuenta y uso misma contraseña de siempre",
      "Le presto mi cuenta a un amigo"
    ],
    answer: 1,
    explain: "Evitar el 'single sign-on' en servicios dudosos puede reducir riesgos de acceso cruzado.",
    category: "Privacidad",
    tags: ["seguridad"]
  },
  {
    text: "Un amigo pide tus credenciales 'solo por hoy' para un juego.",
    options: [
      "Se las doy, es mi amigo",
      "Le digo que no y le explico por qué",
      "Cambio la contraseña después de dárselas",
      "Le doy pero sin correo"
    ],
    answer: 1,
    explain: "No compartas credenciales. Ofrecé ayuda sin entregar acceso.",
    category: "Seguridad",
    tags: ["seguridad","empatia"]
  },
  {
    text: "Ves un comentario discriminatorio en una publicación escolar.",
    options: [
      "Like si te reís",
      "Reporto y dejo un comentario promoviendo respeto",
      "Comparto en historias para exponerlos",
      "Nada, para qué meterse"
    ],
    answer: 1,
    explain: "Reportar y promover respeto ayuda a construir comunidad segura.",
    category: "Convivencia",
    tags: ["empatia"]
  }
];

/*******************************************************
 *  Ranking (LocalStorage + Firebase)
 *******************************************************/
const STORAGE_KEY="cd_scores_v1", STORAGE_PLAYER="cd_last_player";

function loadScores(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]")||[]}catch{return[]} }
function saveScores(a){ localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); }
function addScoreLocal(e){
  const a=loadScores();
  a.push(e);
  saveScores(a.slice(-200)); // guardamos hasta 200 últimos
}
function getSortedAllLocal(){ return loadScores().sort((a,b)=> b.points-a.points || a.ts-b.ts); }
function getTopLocal(n=10){ return getSortedAllLocal().slice(0,n); }
function clearScoresLocal(){ localStorage.removeItem(STORAGE_KEY); }

function addScoreCloud(entry){
  if(!FIREBASE_ENABLED || !fbDb) return;
  fbDb.ref("/scores").push(entry).catch(err=>console.warn("No se pudo guardar en Firebase",err));
}

/*******************************************************
 *  Estado + helpers
 *******************************************************/
const CATEGORIES=[...new Set(QUESTIONS.map(q=>q.category))];
const state={
  mode:"solo", host:false, roomCode:null, roomName:null, peers:new Map(),
  difficulty:"Normal", selectedCats:new Set(CATEGORIES),
  pool:[], idx:0, points:0, lives:3, time:60, timerId:null,
  used5050:false, usedSkip:false,
  medals:{seguridad:0, empatia:0, critico:0, bienestar:0},
  player:"Anónimo", finalScore:0, finalPosition:null
};
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));

function setProgress(){ const pct=state.pool.length?(state.idx/state.pool.length)*100:0; $("#progress").style.width=pct+"%"; }
function setLivesUI(){ $("#lives").textContent="❤️".repeat(state.lives)+"🖤".repeat(Math.max(0,3-state.lives)); }
function setKpis(){ $("#points").textContent=state.points; $("#round").textContent=state.idx+1; $("#time").textContent=state.time+"s"; $("#ui-player").textContent=state.player; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
function diffMult(){ return state.difficulty==="Hard"?1.3:state.difficulty==="Easy"?0.8:1.0; }
function formatDate(ts){ return new Date(ts).toLocaleString([], {hour12:false}); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;","\>":"&gt;","\"":"&quot;","'":"&#39;"}[c]||c)); }

function getCurrentScreenId(){
  const ids = ["#screen-start","#screen-lobby","#screen-game","#screen-end","#screen-leaderboard"];
  for (const id of ids){
    const el = document.querySelector(id);
    if (el && !el.classList.contains("hidden")) return id;
  }
  return "#screen-start";
}

/* Mostrar pantalla + audio contextual */
function show(id){
  ["#screen-start","#screen-lobby","#screen-game","#screen-end","#screen-leaderboard"]
    .forEach(s=>$(s)?.classList.add("hidden"));
  $(id)?.classList.remove("hidden");

  sfxStopAll();
  if (!sfx.enabled || !sfx.unlocked) return;

  if (id === "#screen-start")      sfxPlay("inicio");
  else if (id === "#screen-lobby") sfxPlay("lobby");
  else if (id === "#screen-game")  sfxPlay("game");
  else if (id === "#screen-end")   sfxPlay("end");
}

/* 🔒 Lock config (dif + categorías) cuando sos invitado */
function lockConfig(lock){
  $$("#screen-start [data-diff]").forEach(b=>{ b.disabled = !!lock; b.classList.toggle("disabled", !!lock); });
  $$("#cats .pill").forEach(b=>{ b.disabled = !!lock; b.classList.toggle("disabled", !!lock); });
}

/*******************************************************
 *  Desbloqueo global de audio (móviles / GitHub Pages)
 *******************************************************/
function setupAudioUnlock(){
  const tryUnlock = () => {
    if (sfx.unlocked) return;
    sfx.unlocked = true;

    // "Priming" de cada clip dentro del gesto del usuario
    Object.values(sfx.clips).forEach(a=>{
      try { a.play().then(()=>a.pause()).catch(()=>{}); } catch(e){}
    });

    // reproducir lo que corresponda a la pantalla visible
    const current = getCurrentScreenId();
    if      (current === "#screen-start")  sfxPlay("inicio");
    else if (current === "#screen-lobby")  sfxPlay("lobby");
    else if (current === "#screen-game")   sfxPlay("game");
    else if (current === "#screen-end")    sfxPlay("end");

    document.removeEventListener("click", tryUnlock);
    document.removeEventListener("touchstart", tryUnlock);
    document.removeEventListener("keydown", tryUnlock);
  };

  document.addEventListener("click", tryUnlock);
  document.addEventListener("touchstart", tryUnlock);
  document.addEventListener("keydown", tryUnlock);
}

/*******************************************************
 *  Inicio (montaje UI)
 *******************************************************/
function mountStart(){
  const last=(localStorage.getItem(STORAGE_PLAYER)||"").trim();
  if($("#player-name")&&last) $("#player-name").value=last;

  // Botón Sonido (si existe en el HTML)
  const btnSound = $("#btn-sound");
  if (btnSound){
    const refreshLabel = () => btnSound.textContent = sfx.enabled ? "🔈 Sonido: ON" : "🔇 Sonido: OFF";
    refreshLabel();
    btnSound.addEventListener("click", e=>{
      e.stopPropagation();
      sfx.enabled = !sfx.enabled;
      refreshLabel();
      if(!sfx.enabled) sfxStopAll();
      else {
        const current = getCurrentScreenId();
        if      (current === "#screen-start")  sfxPlay("inicio");
        else if (current === "#screen-lobby")  sfxPlay("lobby");
        else if (current === "#screen-game")   sfxPlay("game");
        else if (current === "#screen-end")    sfxPlay("end");
      }
    });
  }

  // Modo
  $("#mode-solo")?.addEventListener("click",()=>{
    state.mode="solo"; state.host=false;
    $("#mode-solo").classList.add("primary");
    $("#mode-multi").classList.remove("primary");
    $("#solo-controls").classList.remove("hidden");
    $("#multi-controls").classList.add("hidden");
    lockConfig(false);
  });
  $("#mode-multi")?.addEventListener("click",()=>{
    state.mode="host"; state.host=true;
    $("#mode-multi").classList.add("primary");
    $("#mode-solo").classList.remove("primary");
    $("#solo-controls").classList.add("hidden");
    $("#multi-controls").classList.remove("hidden");
    lockConfig(false);
  });

  // Dificultad
  $$("#screen-start [data-diff]").forEach(b=>{
    b.addEventListener("click",()=>{
      if (b.disabled) return;
      state.difficulty=b.dataset.diff;
      $$("#screen-start [data-diff]").forEach(x=>x.classList.remove("primary"));
      b.classList.add("primary");
    });
  });

  // Categorías
  const cats=$("#cats"); cats.innerHTML="";
  CATEGORIES.forEach(cat=>{
    const btn=document.createElement("button");
    btn.className="pill"; btn.textContent=cat; btn.ariaPressed="true";
    btn.addEventListener("click",()=>{
      if(btn.disabled) return;
      if(state.selectedCats.has(cat)){ state.selectedCats.delete(cat); btn.ariaPressed="false"; btn.classList.add("ghost"); }
      else { state.selectedCats.add(cat); btn.ariaPressed="true"; btn.classList.remove("ghost"); }
    });
    cats.appendChild(btn);
  });

  // Ranking
  $("#btn-start-lb-full")?.addEventListener("click", ()=>{ renderLeaderboard(); show("#screen-leaderboard"); });
  $("#btn-back-home")?.addEventListener("click", ()=> show("#screen-start"));
  $("#btn-clear")?.addEventListener("click", ()=>{
    if(confirm("¿Seguro que querés borrar el histórico local?")){
      clearScoresLocal(); renderLeaderboard();
    }
  });
  $("#see-leaderboard")?.addEventListener("click", ()=>{ renderLeaderboard(); show("#screen-leaderboard"); });
  $("#share")?.addEventListener("click", shareScore);

  // 1 jugador
  $("#btn-start")?.addEventListener("click", startGameSolo);

  // Multijugador
  $("#btn-create-room")?.addEventListener("click", createRoomFlow);
  $("#btn-join-room")?.addEventListener("click", ()=> $("#join-panel").classList.toggle("hidden"));
  $("#btn-join-confirm")?.addEventListener("click", joinRoomFlow);

  // Lobby
  $("#btn-lobby-start")?.addEventListener("click", hostStartMatch);
  $("#btn-lobby-leave")?.addEventListener("click", leaveRoom);

  // Botón “Nueva partida” de la pantalla final
  $("#restart")?.addEventListener("click", ()=>{
    if (state.roomCode) leaveRoom();
    else show("#screen-start");
  });

  // Auto-join por URL ?room=XXXX
  checkRoomParamOnLoad();
}

function captureName(){
  const name=($("#player-name")?.value||"").trim();
  state.player=name||"Anónimo";
  try{localStorage.setItem(STORAGE_PLAYER,state.player)}catch{}
}

function setupMatchPoolFromUI(){
  state.points=0; state.lives=3; state.used5050=false; state.usedSkip=false;
  state.medals={seguridad:0, empatia:0, critico:0, bienestar:0};
  state.pool=QUESTIONS.filter(q=>state.selectedCats.has(q.category));
  if(!state.pool.length) state.pool=QUESTIONS.slice();
  shuffle(state.pool);
  state.time=state.difficulty==="Easy"?75:state.difficulty==="Hard"?45:60;
  state.idx=0;
}

function goToGameAndStart(){
  show("#screen-game");
  renderQuestion(); setLivesUI(); setKpis(); setProgress();
  $("#power-5050").disabled=false; $("#power-skip").disabled=false; $("#explain").textContent="";
  startTimer();
}

/*******************************************************
 *  Firebase: paths, canal y mensajes
 *******************************************************/
let fbEventsRef=null, fbEventsListener=null;
let fbRosterRef=null, fbRosterListener=null;

function firebaseRoomPath(code){ return `/rooms/${code}`; }
function firebaseEventsPath(code){ return `/rooms/${code}/events`; }
function firebaseRosterPath(code){ return `/rooms/${code}/roster`; }

function openChannel(code){
  if(!fbDb) return;
  closeChannel();

  fbEventsRef = fbDb.ref(firebaseEventsPath(code));
  fbEventsListener = fbEventsRef.limitToLast(1).on('child_added', snap=>{
    const msg = snap.val();
    if (msg) handleRoomMessage(msg);
  });

  fbRosterRef = fbDb.ref(firebaseRosterPath(code));
  fbRosterListener = fbRosterRef.on("value", snap=>{
    const data = snap.val() || {};
    state.peers = new Map(
      Object.entries(data).map(([peerId,info])=>[peerId,{name:info.name}])
    );
    renderLobbyPlayers();
  });
}

function closeChannel(){
  if(fbEventsRef && fbEventsListener){ fbEventsRef.off('child_added', fbEventsListener); }
  if(fbRosterRef && fbRosterListener){ fbRosterRef.off('value', fbRosterListener); }
  fbEventsRef=fbEventsListener=fbRosterRef=fbRosterListener=null;
}

function sendRoom(type, payload={}){
  if(!state.roomCode || !fbDb) return;
  const msg={type, payload, from: state.player, ts: Date.now()};
  fbDb.ref(firebaseEventsPath(state.roomCode)).push(msg);
}

/*******************************************************
 *  Flujos Multijugador
 *******************************************************/
function genCode4(){ return String(Math.floor(1000+Math.random()*9000)); }

function updateLobbyList(name, peerId){
  if(!peerId) peerId = `${name}-${Math.random().toString(36).slice(2,7)}`;
  state.peers.set(peerId, {name});
  if(state.roomCode && fbDb){
    fbDb.ref(firebaseRosterPath(state.roomCode)+"/"+peerId).set({name});
  }
  renderLobbyPlayers();
}

function renderLobbyPlayers(){
  const ul=$("#lobby-players"); if(!ul) return;
  ul.innerHTML="";
  if(state.host){
    const liHost=document.createElement("li");
    liHost.textContent=`👑 ${state.player} (host)`;
    ul.appendChild(liHost);
  }
  [...state.peers.values()].forEach(p=>{
    const li=document.createElement("li");
    li.textContent=`👤 ${p.name}`;
    ul.appendChild(li);
  });
}

function updateShareArtifacts(){
  if(!state.roomCode) return;
  const shareUrl = `${location.origin}${location.pathname}?room=${state.roomCode}`;
  const linkEl = $("#lobby-room-link");
  if(linkEl) linkEl.textContent = shareUrl;

  const btnCopy = $("#btn-copy-link");
  if(btnCopy){
    btnCopy.onclick = () => {
      if(navigator.clipboard?.writeText){
        navigator.clipboard.writeText(shareUrl)
          .then(()=> alert("Enlace copiado 📋"))
          .catch(()=> window.prompt("Copiá el enlace:", shareUrl));
      } else {
        window.prompt("Copiá el enlace:", shareUrl);
      }
    };
  }

  if (window.QRCode) {
    const qrEl = $("#qr");
    if(qrEl){
      qrEl.innerHTML = "";
      new QRCode(qrEl, { text: shareUrl, width: 128, height: 128, correctLevel: QRCode.CorrectLevel.M });
    }
  }
}

function createRoomFlow(){
  if(!fbDb){ alert("Firebase no está disponible. Solo podés usar 1 jugador."); return; }

  captureName();
  state.mode="host"; state.host=true;
  const inputRoomName = ($("#room-name")?.value || "").trim();
  state.roomCode=genCode4();
  state.roomName = inputRoomName || `Sala ${state.roomCode}`;

  fbDb.ref(firebaseRoomPath(state.roomCode)).set({
    createdAt: Date.now(),
    host: state.player,
    roomName: state.roomName
  });

  openChannel(state.roomCode);

  state.peers = new Map();
  updateLobbyList(state.player, `host-${Math.random().toString(36).slice(2,7)}`);

  $("#lobby-room-name").textContent=state.roomName;
  $("#lobby-room-code").textContent=state.roomCode;
  renderLobbyPlayers();
  show("#screen-lobby");

  updateShareArtifacts();

  const shareUrl = `${location.origin}${location.pathname}?room=${state.roomCode}`;
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(shareUrl).catch(()=>{});
}

function joinRoomFlow(){
  if(!fbDb){ alert("Firebase no está disponible. Solo podés usar 1 jugador."); return; }

  captureName();
  const code=($("#join-code")?.value||"").trim();
  if(!/^\d{4}$/.test(code)){ alert("Ingresá un código de 4 dígitos válido."); return; }

  state.mode="guest"; state.host=false; state.roomCode=code; state.roomName=`Sala ${code}`;

  // 🔒 Invitados: bloquear dificultad/categorías
  lockConfig(true);

  openChannel(code);

  const peerId=`${state.player}-${Math.random().toString(36).slice(2,7)}`;
  sendRoom("hello", { playerName: state.player, peerId });
  sendRoom("join",  { playerName: state.player, peerId });

  $("#lobby-room-name").textContent=state.roomName;
  $("#lobby-room-code").textContent=state.roomCode;
  renderLobbyPlayers();
  show("#screen-lobby");
  updateShareArtifacts();
}

function hostStartMatch(){
  if(!state.host) return;

  const poolIdxs=(QUESTIONS.map((q,i)=>({q,i})).filter(x=>state.selectedCats.has(x.q.category)).map(x=>x.i));
  const finalIdxs = (poolIdxs.length?poolIdxs:QUESTIONS.map((_,i)=>i));
  shuffle(finalIdxs);

  const time = state.difficulty==="Easy"?75:state.difficulty==="Hard"?45:60;
  const payload={ roomCode:state.roomCode, difficulty:state.difficulty, selectedCats:[...state.selectedCats], poolIdxs:finalIdxs, time };
  applyStartPayload(payload);
  sendRoom("start", payload);
  goToGameAndStart();
}

function applyStartPayload(p){
  state.difficulty=p.difficulty;
  state.selectedCats=new Set(p.selectedCats);

  if (!state.host) lockConfig(true);

  state.pool=(p.poolIdxs||[]).map(i=>QUESTIONS[i]);
  if(!state.pool.length){ state.pool=QUESTIONS.slice(); shuffle(state.pool); }
  state.time=p.time ?? (state.difficulty==="Easy"?75:state.difficulty==="Hard"?45:60);
  state.points=0; state.lives=3; state.used5050=false; state.usedSkip=false;
  state.medals={seguridad:0, empatia:0, critico:0, bienestar:0}; state.idx=0;
}

function leaveRoom(){
  if(state.roomCode && fbDb){
    const peerId=`${state.player}-leave`;
    sendRoom("leave",{peerId});
    fbDb.ref(firebaseRosterPath(state.roomCode)).once("value").then(snap=>{
      const roster=snap.val()||{};
      Object.keys(roster).forEach(pid=>{
        if(roster[pid]?.name===state.player){
          fbDb.ref(firebaseRosterPath(state.roomCode)+"/"+pid).remove();
        }
      });
    }).finally(()=> closeChannel());
  }
  state.roomCode=null; state.roomName=null; state.host=false; state.mode="solo"; state.peers.clear();
  lockConfig(false);
  show("#screen-start");
}

/*******************************************************
 *  Mensajes de sala
 *******************************************************/
function handleRoomMessage({type, payload}={}){
  if(!type) return;

  if(type==="hello" && state.host){
    updateLobbyList(payload.playerName, payload.peerId);
    const players=[...state.peers.entries()].map(([peerId,info])=>({peerId,name:info.name}));
    sendRoom("roster", { players });
  }

  if(type==="roster" && !state.host){
    state.peers.clear();
    payload.players?.forEach(p=> state.peers.set(p.peerId, {name:p.name}));
    renderLobbyPlayers();
  }

  if(type==="join" && state.host){
    updateLobbyList(payload.playerName, payload.peerId);
  }

  if(type==="leave"){
    state.peers.delete(payload.peerId);
    renderLobbyPlayers();
  }

  if(type==="start"){
    applyStartPayload(payload);
    goToGameAndStart();
  }
}

/*******************************************************
 *  Juego
 *******************************************************/
function startGameSolo(){
  captureName();
  setupMatchPoolFromUI();
  goToGameAndStart();
}

function startTimer(){
  clearInterval(state.timerId);
  state.timerId=setInterval(()=>{
    state.time--;
    $("#time").textContent=state.time+"s";
    if(state.time<=0){
      clearInterval(state.timerId);
      state.lives=0; setLivesUI(); endGame();
    }
  },1000);
}

function renderQuestion(){
  const q=state.pool[state.idx];
  $("#qcat").textContent=q.category;
  $("#qtext").textContent=q.text;
  $("#explain").textContent="";
  $("#next").classList.add("hidden");

  const wrap=$("#answers"); wrap.innerHTML="";
  const opts=q.options.map((t,i)=>({t,i}));
  shuffle(opts).forEach(({t,i})=>{
    const b=document.createElement("button");
    b.className="option"; b.textContent=t;
    b.addEventListener("click",()=>selectAnswer(i,b));
    wrap.appendChild(b);
  });
}

function selectAnswer(chosenIndex,btn){
  $$("#answers .option").forEach(b=>b.disabled=true);
  const q=state.pool[state.idx];
  const correct=(chosenIndex===q.answer);

  if(correct){
    btn.classList.add("correct");
    const base=state.difficulty==="Hard"?150:state.difficulty==="Easy"?80:100;
    state.points+=base;
    q.tags.forEach(tag=>{
      if(tag==="seguridad")state.medals.seguridad++;
      if(tag==="empatia")state.medals.empatia++;
      if(tag==="critico")state.medals.critico++;
      if(tag==="bienestar")state.medals.bienestar++;
    });
    $("#explain").textContent="✔️ Correcto. "+q.explain;
  }else{
    btn.classList.add("wrong");
    const ct=q.options[q.answer];
    $$("#answers .option").forEach(b=>{ if(b.textContent===ct) b.classList.add("correct"); });
    const penalty=state.difficulty==="Hard"?2:1;
    state.lives=Math.max(0, state.lives-penalty);
    setLivesUI();
    $("#explain").textContent="❌ Incorrecto. "+q.explain;
  }

  $("#points").textContent=state.points;
  $("#next").classList.remove("hidden");
  $("#next").focus();
}

// Poderes
$("#power-5050")?.addEventListener("click",()=>{
  if(state.used5050) return;
  const q=state.pool[state.idx];
  const buttons=$$("#answers .option").filter(b=>!b.disabled && !b.classList.contains("hidden"));
  const correctText=q.options[q.answer];
  const incorrect=buttons.filter(b=>b.textContent!==correctText);
  const toHide=Math.max(0, incorrect.length-1);
  shuffle(incorrect).slice(0,toHide).forEach(b=>{ b.classList.add("hidden"); b.disabled=true; });
  state.used5050=true; $("#power-5050").disabled=true;
});

$("#power-skip")?.addEventListener("click",()=>{
  if(state.usedSkip) return;
  state.usedSkip=true; $("#power-skip").disabled=true; state.points+=20;
  if(state.idx>=state.pool.length-1){ endGame(); } else { nextQuestion(); }
});

$("#next")?.addEventListener("click", nextQuestion);
function nextQuestion(){
  state.idx++; setProgress();
  if(state.lives<=0 || state.idx>=state.pool.length){ endGame(); return; }
  renderQuestion(); setKpis();
}

function endGame(){
  clearInterval(state.timerId);
  const mult=diffMult(), bonusTiempo=Math.max(0,state.time)*2;
  state.finalScore=Math.round(state.points*mult + bonusTiempo);

  const entry={
    name:state.player,
    points:state.finalScore,
    difficulty:(state.difficulty==="Easy"?"Fácil":state.difficulty==="Hard"?"Difícil":"Normal"),
    medals:{...state.medals},
    ts:Date.now()
  };

  // local + nube
  addScoreLocal(entry);
  addScoreCloud(entry);

  const allSorted=getSortedAllLocal(); // para posición aproximada local
  const pos=allSorted.findIndex(e=>e.ts===entry.ts)+1; state.finalPosition=pos||null;

  show("#screen-end");
  $("#sum-player").textContent=state.player;
  $("#sum-points").textContent=state.finalScore;
  $("#sum-rounds").textContent=Math.min(state.idx,state.pool.length);
  $("#med-sec").textContent=state.medals.seguridad;
  $("#med-emp").textContent=state.medals.empatia;
  $("#med-crit").textContent=state.medals.critico;
  $("#med-bien").textContent=state.medals.bienestar;
  $("#final-position").textContent=`Posición en ranking: ${state.finalPosition ?? "—"}`;
}

/*******************************************************
 *  Ranking + compartir (Firebase + local fallback)
 *******************************************************/
function renderLeaderboardLocal(){
  const tbody=$("#lb-body"); if(!tbody) return;
  tbody.innerHTML="";
  const top=getTopLocal(10);
  if(!top.length){
    const tr=document.createElement("tr");
    tr.innerHTML=`<td colspan="5" class="small">No hay puntajes aún. ¡Jugá una partida!</td>`;
    tbody.appendChild(tr); return;
  }
  top.forEach((e,i)=>{
    const tr=document.createElement("tr");
    tr.innerHTML=`<td>${i+1}</td><td>${escapeHtml(e.name)}</td><td>${e.points}</td><td>${e.difficulty}</td><td>${formatDate(e.ts)}</td>`;
    tbody.appendChild(tr);
  });
}

function renderLeaderboard(){
  const tbody=$("#lb-body"); if(!tbody) return;
  tbody.innerHTML="";

  if(!FIREBASE_ENABLED || !fbDb){
    renderLeaderboardLocal();
    return;
  }

  fbDb.ref("/scores").orderByChild("points").limitToLast(50).once("value")
    .then(snap=>{
      const rows = [];
      snap.forEach(child=>{
        const v = child.val();
        if(v && typeof v.points === "number") rows.push(v);
      });
      rows.sort((a,b)=> b.points - a.points || (a.ts||0) - (b.ts||0));
      const top = rows.slice(0,10);

      if(!top.length){
        const tr=document.createElement("tr");
        tr.innerHTML=`<td colspan="5" class="small">No hay puntajes aún. ¡Jugá una partida!</td>`;
        tbody.appendChild(tr); return;
      }
      top.forEach((e,i)=>{
        const tr=document.createElement("tr");
        tr.innerHTML=`<td>${i+1}</td><td>${escapeHtml(e.name)}</td><td>${e.points}</td><td>${e.difficulty||"-"}</td><td>${formatDate(e.ts||Date.now())}</td>`;
        tbody.appendChild(tr);
      });
    })
    .catch(err=>{
      console.warn("Error leyendo ranking global, uso local",err);
      renderLeaderboardLocal();
    });
}

function shareScore(){
  const posStr=state.finalPosition?` (Posición: ${state.finalPosition})`:"";
  const txt=`🏆 Mi puntaje en la Copa de la Ciudadanía Digital: ${state.finalScore} puntos${posStr} — Jugador: ${state.player}, ${state.difficulty}`;
  if(navigator.clipboard?.writeText){
    navigator.clipboard.writeText(txt).then(()=>alert("¡Puntaje copiado! 📋")).catch(()=>fallbackShare(txt));
  } else fallbackShare(txt);
}
function fallbackShare(t){ window.prompt("Copiá tu puntaje (Ctrl+C):", t); }

/*******************************************************
 *  Auto-join por ?room=XXXX
 *******************************************************/
function checkRoomParamOnLoad(){
  const params = new URLSearchParams(window.location.search);
  const code = params.get("room");
  if(code && /^\d{4}$/.test(code)){
    $("#mode-multi")?.click();
    $("#join-panel")?.classList.remove("hidden");
    const input = $("#join-code");
    if(input) input.value = code;
    // Si querés auto-entrar sin tocar nada, podés descomentar:
    // setTimeout(()=> joinRoomFlow(), 500);
  }
}

/*******************************************************
 *  Inicio de la app
 *******************************************************/
function init(){
  mountStart();
  show("#screen-start");     // pantalla inicial (sin audio aún)
  setupAudioUnlock();        // desbloqueo de audio para móviles / GitHub
}
init();
