/*******************************************************
 *  Copa de la Ciudadanía Digital — app.js (COMPLETO)
 *  - Modo 1 jugador y Multijugador (Firebase RTDB)
 *  - Salas con código de 4 dígitos y enlace/QR
 *  - Ranking local (LocalStorage) + global (Firebase)
 *  - Sonidos: inicio / espera (lobby) / juego / final
 *  - Control de volumen + botón ON/OFF
 *******************************************************/

/***********************
 *  Firebase (Realtime DB)
 ***********************/
const FIREBASE_ENABLED = true;

/*******************************************************
 *  CONFIG: Firebase + utilidades
 *******************************************************/
const firebaseConfig = {
  apiKey: "AIzaSyBUJLB57u7uw48G9LyRplDO-x8tQ8gVEGM",
  authDomain: "copa-387c8.firebaseapp.com",
  databaseURL: "https://copa-387c8-default-rtdb.firebaseio.com", // 👈 CLAVE
  projectId: "copa-387c8",
  storageBucket: "copa-387c8.firebasestorage.app",
  messagingSenderId: "203974305127",
  appId: "1:203974305127:web:300a3d44c120f759d5bbc2"
};

// La página carga firebase-app-compat y firebase-database-compat en index.html
let db = null;
try {
  const appFB = firebase.initializeApp(firebaseConfig);
  db = firebase.database();
  console.log("[FB] Inicializado OK");
} catch (e) {
  console.warn("[FB] No se pudo inicializar Firebase (continuo con local):", e);
}

/*******************************************************
 *  BANCO DE PREGUNTAS (tu set actual + puedes sumar más)
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
 *  RANKING LOCAL (respaldo) + GLOBAL (Firebase)
 *******************************************************/
const STORAGE_KEY = "cd_scores_v1";

function loadScoresLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "[]";
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function saveScoresLocal(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}
function addScoreLocal(entry) {
  const arr = loadScoresLocal();
  arr.push(entry);
  saveScoresLocal(arr);
}
function getTopLocal(n=10) {
  return loadScoresLocal().sort((a,b)=> b.points - a.points).slice(0,n);
}
function clearScoresLocal() {
  localStorage.removeItem(STORAGE_KEY);
}

// GLOBAL Firebase: write/read
async function addScoreGlobal(entry) {
  if (!db) throw new Error("Firebase DB no disponible");
  await db.ref("scores").push(entry); // crea /scores si no existe
}

async function getTopGlobal(n=10) {
  if (!db) throw new Error("Firebase DB no disponible");
  // Traigo por points (limitToLast) y ordeno descendente en cliente
  const snap = await db.ref("scores").orderByChild("points").limitToLast(n).once("value");
  const arr = [];
  snap.forEach(child => {
    const v = child.val();
    if (v && typeof v.points === "number") arr.push(v);
  });
  return arr.sort((a,b) => b.points - a.points).slice(0, n);
}

/*******************************************************
 *  ESTADO + HELPERS UI
 *******************************************************/
const CATEGORIES = [...new Set(QUESTIONS.map(q=>q.category))];

const state = {
  difficulty: "Normal",
  selectedCats: new Set(CATEGORIES),
  pool: [],
  idx: 0,
  points: 0,
  lives: 3,
  time: 60,
  timerId: null,
  used5050: false,
  usedSkip: false,
  medals: { seguridad:0, empatia:0, critico:0, bienestar:0 },
  player: "Anónimo",
  finalScore: 0,
  // audio
  currentTrack: null
};

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function show(id){
  ["#screen-start","#screen-game","#screen-end","#screen-leaderboard","#screen-lobby"]
    .forEach(s=>$(s).classList.add("hidden"));
  $(id).classList.remove("hidden");
}
function setProgress(){ const pct = (state.idx / state.pool.length) * 100; $("#progress").style.width = pct + "%"; }
function setLivesUI(){
  const hearts = "❤️".repeat(state.lives) + "🖤".repeat(Math.max(0,3-state.lives));
  $("#lives").textContent = hearts;
}
function setKpis(){
  $("#points").textContent = state.points;
  $("#round").textContent  = state.idx+1;
  $("#time").textContent   = state.time + "s";
  $("#ui-player").textContent = state.player;
}
function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }
function diffMult(){
  return state.difficulty==="Hard" ? 1.3 : state.difficulty==="Easy" ? 0.8 : 1.0;
}
function formatDate(ts){
  try {
    const d = new Date(ts);
    return d.toLocaleString([], { hour12:false });
  } catch { return ""; }
}

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[s]));
}

/*******************************************************
 *  AUDIO (volumen + crossfade simple)
 *******************************************************/
const audioEl = new Audio();
audioEl.loop = true;
audioEl.volume = 0.7; // puedes ajustar

function playMusic(src){
  try {
    if (!src) return;
    if (audioEl.src.endsWith(src)) { audioEl.play().catch(()=>{}); return; }
    audioEl.pause();
    audioEl.src = src;
    audioEl.currentTime = 0;
    audioEl.play().catch(()=>{ /* navegador puede bloquear hasta interacción */ });
  } catch(e){ console.warn("Audio error:", e); }
}
function stopMusic(){
  try { audioEl.pause(); } catch {}
}

/*******************************************************
 *  INICIO
 *******************************************************/
function mountStart(){
  // Dificultad
  $$("#screen-start [data-diff]").forEach(b=>{
    b.addEventListener("click",()=>{
      state.difficulty = b.dataset.diff;
      $$("#screen-start [data-diff]").forEach(x=>x.classList.remove("primary"));
      b.classList.add("primary");
    });
  });

  // Categorías
  const cats = $("#cats");
  cats.innerHTML = "";
  CATEGORIES.forEach(cat=>{
    const btn = document.createElement("button");
    btn.className = "pill";
    btn.textContent = cat;
    btn.ariaPressed = "true";
    btn.addEventListener("click",()=>{
      if(state.selectedCats.has(cat)){ state.selectedCats.delete(cat); btn.ariaPressed="false"; btn.classList.add("ghost"); }
      else { state.selectedCats.add(cat); btn.ariaPressed="true"; btn.classList.remove("ghost"); }
    });
    cats.appendChild(btn);
  });

  // Ranking desde inicio
  $("#btn-start-lb-full")?.addEventListener("click", ()=>{ renderLeaderboard(); show("#screen-leaderboard"); });

  // Botón borrar histórico (pantalla ranking)
  $("#btn-clear")?.addEventListener("click", ()=>{
    if(confirm("¿Borrar ranking local en este dispositivo?")){ clearScoresLocal(); renderLeaderboard(); }
  });

  // Volver
  $("#btn-back-home")?.addEventListener("click", ()=> show("#screen-start"));

  // Empezar 1 jugador
  $("#btn-start")?.addEventListener("click", startGame);

  // Fin
  $("#restart")?.addEventListener("click", ()=>{ stopMusic(); playMusic("sonidos/inicio.mp3"); show("#screen-start"); });
  $("#see-leaderboard")?.addEventListener("click", ()=>{ renderLeaderboard(); show("#screen-leaderboard"); });
  $("#share")?.addEventListener("click", shareScore);

  // Poderes
  $("#power-5050")?.addEventListener("click", power5050);
  $("#power-skip")?.addEventListener("click", powerSkip);

  // Siguiente
  $("#next")?.addEventListener("click", nextQuestion);

  // Música de inicio (al primer click en la página para evitar bloqueo)
  document.body.addEventListener("click", function once(){
    playMusic("sonidos/inicio.mp3");
    document.body.removeEventListener("click", once);
  }, { once:true });
}

function startGame(){
  const nameInput = $("#player-name");
  const name = (nameInput?.value || "").trim();
  state.player = name || "Anónimo";

  state.points = 0; state.lives = 3; state.used5050 = false; state.usedSkip = false;
  state.medals = { seguridad:0, empatia:0, critico:0, bienestar:0 };

  state.pool = QUESTIONS.filter(q=>state.selectedCats.has(q.category));
  if(state.pool.length===0) state.pool = QUESTIONS.slice();
  shuffle(state.pool);

  state.time = state.difficulty==="Easy" ? 75 : state.difficulty==="Hard" ? 45 : 60;

  state.idx = 0;
  show("#screen-game");
  stopMusic();
  playMusic("sonidos/juego.mp3");

  renderQuestion();
  setLivesUI();
  setKpis();
  setProgress();
  $("#explain").textContent = "";
  $("#power-5050").disabled = false;
  $("#power-skip").disabled = false;
  startTimer();
}

function startTimer(){
  clearInterval(state.timerId);
  state.timerId = setInterval(()=>{
    state.time--;
    $("#time").textContent = state.time + "s";
    if(state.time<=0){
      clearInterval(state.timerId);
      state.lives = 0;
      setLivesUI();
      endGame();
    }
  }, 1000);
}

function renderQuestion(){
  const q = state.pool[state.idx];
  $("#qcat").textContent = q.category;
  $("#qtext").textContent = q.text;
  $("#explain").textContent = "";
  $("#next").classList.add("hidden");
  const wrap = $("#answers");
  wrap.innerHTML = "";
  const opts = q.options.map((text,i)=>({text, i}));
  shuffle(opts).forEach(({text,i})=>{
    const btn = document.createElement("button");
    btn.className = "option";
    btn.textContent = text;
    btn.addEventListener("click",()=>selectAnswer(i, btn));
    wrap.appendChild(btn);
  });
}

function selectAnswer(chosenIndex, btnEl){
  $$("#answers .option").forEach(b=>b.disabled=true);

  const q = state.pool[state.idx];
  const correct = (chosenIndex === q.answer);
  if(correct){
    btnEl.classList.add("correct");
    const base = state.difficulty==="Hard" ? 150 : state.difficulty==="Easy" ? 80 : 100;
    state.points += base;
    q.tags?.forEach(tag=>{
      if(tag==="seguridad") state.medals.seguridad++;
      if(tag==="empatia")  state.medals.empatia++;
      if(tag==="critico")  state.medals.critico++;
      if(tag==="bienestar")state.medals.bienestar++;
    });
    $("#explain").textContent = "✔️ Correcto. " + q.explain;
  }else{
    btnEl.classList.add("wrong");
    const correctText = q.options[q.answer];
    $$("#answers .option").forEach(b=>{
      if(b.textContent===correctText) b.classList.add("correct");
    });
    const penalty = state.difficulty==="Hard" ? 2 : 1;
    state.lives = Math.max(0, state.lives - penalty);
    setLivesUI();
    $("#explain").textContent = "❌ Incorrecto. " + q.explain;
  }
  $("#points").textContent = state.points;
  $("#next").classList.remove("hidden");
  $("#next").focus();
}

function power5050(){
  if(state.used5050) return;
  const q = state.pool[state.idx];
  const buttons = $$("#answers .option").filter(b=>!b.disabled);
  const incorrect = buttons.filter(b=> b.textContent !== q.options[q.answer]);
  shuffle(incorrect).slice(0, Math.max(1, incorrect.length-1)).forEach(b=>{ b.classList.add("hidden"); b.disabled=true; });
  state.used5050 = true;
  $("#power-5050").disabled = true;
}

function powerSkip(){
  if(state.usedSkip) return;
  state.usedSkip = true;
  $("#power-skip").disabled = true;
  state.points += 20; // pequeña recompensa por prudencia
  nextQuestion();
}

function nextQuestion(){
  state.idx++;
  setProgress();
  if(state.lives<=0 || state.idx>=state.pool.length){
    endGame();
    return;
  }
  renderQuestion();
  setKpis();
}

async function endGame(){
  clearInterval(state.timerId);
  stopMusic();
  playMusic("sonidos/fin2.mp3");

  // Puntaje final: base * multiplicador + bonus por tiempo restante
  const mult = diffMult();
  const bonusTiempo = Math.max(0, state.time) * 2;
  state.finalScore = Math.round(state.points * mult + bonusTiempo);

  const entry = {
    name: state.player,
    points: state.finalScore,
    difficulty: (state.difficulty==="Easy"?"Fácil":state.difficulty==="Hard"?"Difícil":"Normal"),
    ts: Date.now()
  };

  // Guardar local SIEMPRE
  addScoreLocal(entry);

  // Intentar guardar global
  try {
    await addScoreGlobal(entry);
  } catch (e) {
    console.warn("No pude guardar en ranking global, queda local:", e);
  }

  // Render de resumen
  show("#screen-end");
  $("#sum-player").textContent = state.player;
  $("#sum-points").textContent = state.finalScore;
  $("#sum-rounds").textContent = Math.min(state.idx, state.pool.length);
  $("#med-sec").textContent  = state.medals.seguridad;
  $("#med-emp").textContent  = state.medals.empatia;
  $("#med-crit").textContent = state.medals.critico;
  $("#med-bien").textContent = state.medals.bienestar;

  // Posición (aprox) usando global primero
  try {
    const top = await getTopGlobal(50);
    const all = top.concat(entry).sort((a,b)=> b.points - a.points);
    const pos = all.findIndex(e => e === entry || (e.ts === entry.ts && e.name === entry.name)) + 1;
    $("#final-position").textContent = `Posición en ranking: ${pos || "—"}`;
  } catch {
    const all = loadScoresLocal().sort((a,b)=> b.points - a.points);
    const pos = all.findIndex(e => e === entry) + 1;
    $("#final-position").textContent = `Posición en ranking: ${pos || "—"}`;
  }
}

/*******************************************************
 *  RANKING UI
 *******************************************************/
async function renderLeaderboard(){
  const tbody = $("#lb-body");
  tbody.innerHTML = "";

  // Intento global
  try {
    const top = await getTopGlobal(10);
    if(top.length===0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" class="small">No hay puntajes aún. ¡Jugá una partida!</td>`;
      tbody.appendChild(tr);
      return;
    }
    top.forEach((e, i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${escapeHtml(e.name)}</td>
        <td>${e.points}</td>
        <td>${escapeHtml(e.difficulty || "")}</td>
        <td>${formatDate(e.ts)}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.warn("Error leyendo ranking global, uso local", err);
    const top = getTopLocal(10);
    if(top.length===0){
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" class="small">No hay puntajes aún. ¡Jugá una partida!</td>`;
      tbody.appendChild(tr);
      return;
    }
    top.forEach((e, i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${i+1}</td>
        <td>${escapeHtml(e.name)}</td>
        <td>${e.points}</td>
        <td>${escapeHtml(e.difficulty || "")}</td>
        <td>${formatDate(e.ts)}</td>
      `;
      tbody.appendChild(tr);
    });
  }
}

/*******************************************************
 *  Compartir
 *******************************************************/
function shareScore(){
  const txt = `🏆 Mi puntaje en la Copa de la Ciudadanía Digital: ${state.finalScore} puntos (Jugador: ${state.player}, ${state.difficulty})`;
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>{
      alert("¡Puntaje copiado al portapapeles! 📋");
    }).catch(()=> fallbackShare(txt));
  } else fallbackShare(txt);
}
function fallbackShare(text){
  window.prompt("Copiá tu puntaje (Ctrl+C):", text);
}

/*******************************************************
 *  START
 *******************************************************/
mountStart();

// Si alguien llega directo con ancla #ranking
if (location.hash === "#ranking") {
  renderLeaderboard();
  show("#screen-leaderboard");
}
