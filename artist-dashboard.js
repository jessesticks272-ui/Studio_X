import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getUserBeats } from "./firestore.js";

const $=id=>document.getElementById(id);
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

let currentBeats=[];
function renderReleases(beats=[]){
  currentBeats=beats;
  $("releaseStat").textContent=beats.length;
  const list=$("releaseList");
  if(!beats.length){
    list.innerHTML='<article class="release"><div class="release-art">♫</div><div class="release-info"><b>No releases yet</b><span>Upload a beat from Studio X to see it here.</span></div><span class="status-badge">READY</span></article>';
    return;
  }
  list.innerHTML=beats.slice(0,3).map(b=>'<article class="release"><div class="release-art">♫</div><div class="release-info"><b>'+escapeHtml(b.name)+'</b><span>'+escapeHtml(b.genre||"Music")+' • '+escapeHtml(b.bpm||"—")+' BPM • '+escapeHtml(b.key||"—")+'</span></div><div class="release-meta"><b>0</b><span>plays</span></div><span class="status-badge">READY</span></article>').join("");
}

async function loadReleases(user){
  if(!user){renderReleases([]);return}
  try{
    const beats=await getUserBeats(user.uid);
    renderReleases(beats);
  }catch(error){
    console.error("Could not load Firestore beats:",error);
    $("releaseStat").textContent="0";
    $("releaseList").innerHTML='<article class="release"><div class="release-art">!</div><div class="release-info"><b>Catalog unavailable</b><span>Check your Firestore rules or index.</span></div></article>';
  }
}

function applyUser(user){
  if(!user)return;
  const name=user.displayName||user.email?.split("@")[0]||"Creator";
  const initial=name.trim().charAt(0).toUpperCase()||"X";
  $("artistName").textContent=name.split(" ")[0];
  $("profileName").textContent=name;
  $("userBadge").textContent=initial;
  $("profileAvatar").textContent=initial;
  $("menuName").textContent=name;
  $("menuEmail").textContent=user.email||"Signed in";
  const saved=JSON.parse(localStorage.getItem("lytune-user")||"{}");
  const followers=Number(saved.followers||0);
  $("followerStat").textContent=followers;
  $("sideFollowers").textContent=followers;
  loadReleases(user);
}
onAuthStateChanged(auth,applyUser);

$("userBadge").addEventListener("click",()=>{$("accountMenu").classList.toggle("hidden")});
document.addEventListener("click",e=>{if(!e.target.closest(".account-wrap"))$("accountMenu").classList.add("hidden")});
$("logoutButton").addEventListener("click",async()=>{try{await signOut(auth)}finally{localStorage.removeItem("lytune-user");localStorage.removeItem("lytune-token");location.href="index.html"}});
$("themeToggle")?.addEventListener("click",()=>{const light=document.documentElement.dataset.theme==="light";document.documentElement.dataset.theme=light?"dark":"light";try{localStorage.setItem("lytune-theme",light?"dark":"light")}catch{}});
