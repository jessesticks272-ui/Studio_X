import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getCreatorProfile, getPublishedBeatsByOwner } from "./firestore.js";

const $ = id => document.getElementById(id);
const uid = new URLSearchParams(location.search).get("uid");
let currentUser = null;
let following = false;

function esc(value){
  const d=document.createElement("div");
  d.textContent=value ?? "";
  return d.innerHTML;
}

function initials(name){
  return String(name || "Creator").split(/\s+/).filter(Boolean).map(x=>x[0]).join("").slice(0,2).toUpperCase();
}

function renderBeats(beats){
  const box=$("beats");
  $("beatCount").textContent=String(beats.length);
  if(!beats.length){
    box.innerHTML='<div class="empty-beats"><h3>No published beats yet</h3><p>This creator has not published a beat to the marketplace.</p></div>';
    return;
  }
  box.innerHTML=beats.map(b=>{
    const cover=b.coverUrl ? ' style="background-image:url(\''+esc(b.coverUrl)+'\');background-size:cover;background-position:center;"' : "";
    const art=b.coverUrl ? "" : '<span>♫</span>';
    const audio=b.previewUrl||b.audioUrl||"";
    return '<article class="beat-card"><div class="art"'+cover+'>'+art+'</div><div class="beat-info"><h3>'+esc(b.title||"Untitled Beat")+'</h3><p>'+esc(b.genre||"Beat")+' · '+esc(b.bpm||"—")+' BPM · '+esc(b.key||"—")+'</p><div class="bar"><span></span></div></div><button class="play" type="button" data-audio="'+esc(audio)+'" aria-label="Preview '+esc(b.title||"beat")+'">▶</button><a class="beat-open" href="beat.html?id='+encodeURIComponent(b.id)+'">View</a></article>';
  }).join("");

  let active=null;
  box.querySelectorAll(".play").forEach(btn=>{
    btn.addEventListener("click",()=>{
      if(active){active.pause();active=null;}
      const src=btn.dataset.audio;
      if(!src){btn.textContent="—";return;}
      active=new Audio(src);
      active.play().catch(()=>{});
      btn.classList.add("active");
      active.addEventListener("ended",()=>{btn.classList.remove("active");active=null;});
    });
  });
}

async function loadProfile(){
  if(!uid){
    $("creatorName").textContent="Creator not found";
    $("creatorRole").textContent="No creator ID was provided.";
    $("beats").innerHTML='<div class="empty-beats"><p>Open a creator profile from a beat or creator directory.</p></div>';
    return;
  }
  const [profile, beats] = await Promise.all([getCreatorProfile(uid), getPublishedBeatsByOwner(uid)]);
  if(!profile) throw new Error("Creator not found");

  const name=profile.name || profile.displayName || "LyTune Creator";
  $("creatorName").textContent=name;
  $("creatorRole").textContent=profile.role==="producer" ? "Producer" : profile.role==="artist" ? "Artist" : "Creator";
  $("avatar").textContent=initials(name);
  $("bio").textContent=profile.bio || "Creator on LyTune Studio X.";
  if(profile.location) $("location").textContent="📍 "+profile.location;
  $("instagram").href=profile.instagram || "#";
  $("tiktok").href=profile.tiktok || "#";
  $("youtube").href=profile.youtube || "#";
  $("editBtn").hidden = !currentUser || currentUser.uid !== uid;
  const messageBtn=$("messageBtn");
  if(messageBtn){
    messageBtn.hidden = !!currentUser && currentUser.uid === uid;
    messageBtn.onclick = () => {
      if(!currentUser){ location.href="login.html?redirect="+encodeURIComponent(location.href); return; }
      location.href="message.html?to="+encodeURIComponent(uid)+"&name="+encodeURIComponent(name);
    };
  }
  renderBeats(beats);

  const key="lytune_following_creator_"+uid;
  following=localStorage.getItem(key)==="1";
  $("followBtn").textContent=following ? "Following" : "Follow";
  $("followers").textContent=profile.followers || "0";
}

$("followBtn").addEventListener("click",()=>{
  following=!following;
  localStorage.setItem("lytune_following_creator_"+uid, following ? "1":"0");
  $("followBtn").textContent=following ? "Following" : "Follow";
});

$("shareBtn").addEventListener("click",async()=>{
  try{await navigator.clipboard.writeText(location.href);$("shareBtn").textContent="Copied!";setTimeout(()=>$("shareBtn").textContent="Share",1500);}
  catch{$("shareBtn").textContent="Copy page URL";}
});

$("editBtn").addEventListener("click",()=>location.href="creator-edit.html");

onAuthStateChanged(auth,user=>{
  currentUser=user||null;
  if(uid) loadProfile().catch(error=>{
    console.error("Creator load failed:",error);
    $("creatorName").textContent="Creator not found";
    $("creatorRole").textContent="This profile is unavailable.";
    $("beats").innerHTML='<div class="empty-beats"><p>Return to the creator directory and choose another creator.</p></div>';
  });
});
