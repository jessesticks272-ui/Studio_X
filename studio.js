import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const $ = (id) => document.getElementById(id);
const panels = { upload:$("uploadPanel"), ai:$("aiPanel"), catalog:$("catalogPanel") };
const quicks = document.querySelectorAll(".quick");

quicks.forEach(btn => btn.addEventListener("click", () => {
  const name = btn.dataset.panel;
  quicks.forEach(x => x.classList.toggle("active", x === btn));
  Object.entries(panels).forEach(([key,p]) => p.classList.toggle("hidden", key !== name));
  panels[name].scrollIntoView({behavior:"smooth",block:"start"});
}));

$("themeToggle")?.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "light";
  document.documentElement.dataset.theme = current ? "dark" : "light";
  try { localStorage.setItem("lytune-theme", current ? "dark" : "light"); } catch {}
});

onAuthStateChanged(auth, user => {
  if(user){
    $("userBadge").textContent = (user.displayName || user.email || "X").trim().charAt(0).toUpperCase();
    $("accountText").textContent = user.email || "Signed in";
    $("connection").textContent = "Firebase connected";
  }
});

let selectedFile = null;
$("beatFile").addEventListener("change", e => {
  selectedFile = e.target.files[0] || null;
  $("fileInfo").textContent = selectedFile ? "✓ " + selectedFile.name : "";
  if(selectedFile && !$("beatName").value) $("beatName").value = selectedFile.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
});
const drop=$("dropZone");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="rgba(25,215,255,.9)"}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="rgba(25,215,255,.4)"}));
drop.addEventListener("drop",e=>{selectedFile=e.dataTransfer.files[0]||null;if(selectedFile){$("fileInfo").textContent="✓ "+selectedFile.name;$("beatName").value ||= selectedFile.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ")}});

document.querySelectorAll(".tag").forEach(tag=>tag.addEventListener("click",()=>tag.classList.toggle("active")));

$("saveBeat").addEventListener("click",()=>{
  if(!selectedFile){$("uploadStatus").textContent="Choose an audio file first.";return}
  const beat={name:$("beatName").value.trim()||selectedFile.name,genre:$("beatGenre").value,bpm:$("beatBpm").value||"—",key:$("beatKey").value||"—",file:selectedFile.name,date:new Date().toLocaleDateString()};
  const beats=JSON.parse(localStorage.getItem("lytune-studio-beats")||"[]"); beats.unshift(beat); localStorage.setItem("lytune-studio-beats",JSON.stringify(beats));
  $("uploadStatus").textContent="✓ Added to your local Studio X catalog.";
  renderCatalog();
});

function renderCatalog(){
  const beats=JSON.parse(localStorage.getItem("lytune-studio-beats")||"[]");
  $("catalogCount").textContent=beats.length+" BEAT"+(beats.length===1?"":"S");
  const box=$("catalog");
  if(!beats.length){box.className="catalog-empty";box.innerHTML="<div>♫</div><h3>Your catalog starts here</h3><p>Upload your first beat and it will appear here.</p>";return}
  box.className="catalog-list";box.innerHTML=beats.map(b=>'<div class="catalog-row"><div class="catalog-art">♫</div><div><b>'+escapeHtml(b.name)+'</b><small>'+escapeHtml(b.genre)+' • '+escapeHtml(b.bpm)+' BPM • '+escapeHtml(b.key)+'</small></div><span>'+escapeHtml(b.date)+'</span></div>').join("");
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
renderCatalog();

$("aiGenerate").addEventListener("click",()=>{
  const prompt=$("aiPrompt").value.trim();
  const result=$("aiResult");
  if(!prompt){result.textContent="Describe your idea first, then Studio X can shape it.";result.classList.remove("hidden");return}
  result.innerHTML="<b>Studio X production direction</b><br><br>Build around the core mood in your idea. Keep the groove clear, leave space for the vocal, and use a strong rhythmic identity. Suggested starting point: Afrobeat / Afro-fusion, 100–112 BPM, warm percussion, a memorable melodic motif and a clean low end.<br><br><b>Next move:</b> turn the strongest phrase in your idea into the main musical hook, then test it against 2–3 contrasting drum patterns.";
  result.classList.remove("hidden");
});

$("userBadge")?.addEventListener("click",()=>{const m=$("accountMenu");m.classList.toggle("hidden");$("userBadge").setAttribute("aria-expanded",String(!m.classList.contains("hidden")))});
document.addEventListener("click",e=>{if(!e.target.closest(".account-wrap"))$("accountMenu")?.classList.add("hidden")});
$("logoutButton")?.addEventListener("click",async()=>{try{await import("https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js").then(({signOut})=>signOut(auth))}catch{};localStorage.removeItem("lytune-user");localStorage.removeItem("lytune-token");location.href="index.html"});
