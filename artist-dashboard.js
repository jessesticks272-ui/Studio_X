import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const $=id=>document.getElementById(id);
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function localBeats(){try{return JSON.parse(localStorage.getItem("lytune-studio-beats")||"[]")}catch{return[]}}
function renderReleases(){
  const beats=localBeats();
  $("releaseStat").textContent=beats.length;
  const list=$("releaseList");
  const fallback=[
    {name:"Midnight Lagos",genre:"Afrobeat",bpm:"104",key:"C#m",plays:"4.2K"},
    {name:"Street Energy",genre:"Amapiano",bpm:"112",key:"F#m",plays:"3.8K"},
    {name:"After Hours",genre:"Afro-fusion",bpm:"98",key:"Am",plays:"2.6K"}
  ];
  const items=beats.length?beats.slice(0,3).map((b,i)=>({...b,plays:["1.2K","820","540"][i]||"0"})):fallback;
  list.innerHTML=items.map(b=>'<article class="release"><div class="release-art">♫</div><div class="release-info"><b>'+escapeHtml(b.name)+'</b><span>'+escapeHtml(b.genre||"Music")+' • '+escapeHtml(b.bpm||"—")+' BPM • '+escapeHtml(b.key||"—")+'</span></div><div class="release-meta"><b>'+escapeHtml(b.plays||"0")+'</b><span>plays</span></div><span class="status-badge">READY</span></article>').join("");
}
renderReleases();

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
}
onAuthStateChanged(auth,applyUser);

$("userBadge").addEventListener("click",()=>{$("accountMenu").classList.toggle("hidden")});
document.addEventListener("click",e=>{if(!e.target.closest(".account-wrap"))$("accountMenu").classList.add("hidden")});
$("logoutButton").addEventListener("click",async()=>{try{await signOut(auth)}finally{localStorage.removeItem("lytune-user");localStorage.removeItem("lytune-token");location.href="index.html"}});

$("themeToggle")?.addEventListener("click",()=>{const light=document.documentElement.dataset.theme==="light";document.documentElement.dataset.theme=light?"dark":"light";try{localStorage.setItem("lytune-theme",light?"dark":"light")}catch{}});
