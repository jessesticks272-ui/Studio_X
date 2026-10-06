import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "./firebase-storage.js";
import { addBeat, getUserBeats } from "./firestore.js";

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

let currentUser = null;
onAuthStateChanged(auth, user => {
  currentUser = user || null;
  if(user){
    $("userBadge").textContent = (user.displayName || user.email || "X").trim().charAt(0).toUpperCase();
    $("accountText").textContent = user.email || "Signed in";
    $("connection").textContent = "Firebase connected";
  } else {
    $("connection").textContent = "Not signed in";
  }
});

let selectedFile = null;
renderCatalog();
function setSelectedFile(file){
  selectedFile = file || null;
  $("fileInfo").textContent = selectedFile ? "✓ " + selectedFile.name : "";
  if(selectedFile && !$("beatName").value) $("beatName").value = selectedFile.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
}
$("beatFile").addEventListener("change", e => setSelectedFile(e.target.files[0]));

const drop=$("dropZone");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="rgba(25,215,255,.9)"}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="rgba(25,215,255,.4)"}));
drop.addEventListener("drop",e=>{e.preventDefault();setSelectedFile(e.dataTransfer.files[0])});

document.querySelectorAll(".tag").forEach(tag=>tag.addEventListener("click",()=>tag.classList.toggle("active")));

$("saveBeat").addEventListener("click", async () => {
  if(!selectedFile && !$("beatAudioUrl").value.trim()){ $("uploadStatus").textContent="Choose an audio file or enter a hosted audio/preview URL."; return; }
  if(!currentUser){ $("uploadStatus").textContent="Please sign in before uploading."; return; }

  const name=$("beatName").value.trim()||selectedFile.name;
  const genre=$("beatGenre").value;
  const bpm=$("beatBpm").value ? Number($("beatBpm").value) : null;
  const key=$("beatKey").value.trim();
  const mood=$("beatMood").value.trim();
  const price=$("beatPrice").value ? Number($("beatPrice").value) : 0;
  const licenseType=$("beatLicense").value || "lease";
  const coverUrl=$("beatCoverUrl").value.trim();
  const audioUrl=$("beatAudioUrl").value.trim();
  if(audioUrl && !/^https?:\\/\\//i.test(audioUrl)){ $("uploadStatus").textContent="Audio URL must start with http:// or https://."; return; }
  const description=$("beatDescription").value.trim();
  const tags=Array.from(document.querySelectorAll(".tag.active")).map(tag=>tag.textContent.trim());
  const status=$("uploadStatus");
  const button=$("saveBeat");

  try{
    button.disabled=true;
    let downloadURL=audioUrl;
    let storagePath="";
    let fileName=selectedFile?.name || "";
    let contentType=selectedFile?.type || "audio/mpeg";

    if(selectedFile){
      status.textContent="Uploading to Firebase Storage…";
      const safeName=selectedFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const storageRef=ref("beats/"+currentUser.uid+"/"+Date.now()+"_"+safeName);
      await uploadBytes(storageRef, selectedFile, {contentType});
      downloadURL=await getDownloadURL(storageRef);
      storagePath=storageRef.fullPath;
    } else {
      status.textContent="Saving your catalog release…";
    }

    if(!downloadURL){
      throw new Error("A hosted audio/preview URL is required when no file is selected.");
    }

    const beatId=await addBeat(currentUser.uid,{
      title:name,
      producerName:currentUser.displayName || currentUser.email?.split("@")[0] || "LyTune Producer",
      genre, bpm, key, mood, tags,
      price, currency:"USD", licenseType,
      description, coverUrl,
      status:"published",
      previewUrl:downloadURL,
      audioUrl:downloadURL,
      fileName,
      storagePath,
      contentType
    });

    status.textContent="✓ Beat uploaded, published and saved to your Studio X catalog.";
    await renderCatalog();
  }catch(error){
    console.error("Beat upload failed:",error);
    status.textContent="Upload failed. Check Firebase Storage setup and try again.";
  }finally{
    button.disabled=false;
  }
});

async function renderCatalog(){
  const box=$("catalog");
  try{
    const beats=currentUser ? await getUserBeats(currentUser.uid) : [];
    $("catalogCount").textContent=beats.length+" BEAT"+(beats.length===1?"":"S");
    if(!beats.length){
      box.className="catalog-empty";
      box.innerHTML="<div>♫</div><h3>Your catalog starts here</h3><p>Publish a release and it will appear here from Firebase.</p>";
      return;
    }
    box.className="catalog-list";
    box.innerHTML=beats.map(b=>{
      const status=b.status||"draft";
      const ownerUrl="creator-profile.html?uid="+encodeURIComponent(b.ownerId||currentUser.uid);
      const beatUrl=b.id ? "beat.html?id="+encodeURIComponent(b.id) : "#";
      const audio=b.previewUrl||b.audioUrl;
      return '<article class="catalog-row">'+
        '<div class="catalog-art">'+(b.coverUrl?'<img src="'+escapeHtml(b.coverUrl)+'" alt="">':'♫')+'</div>'+
        '<div class="catalog-main"><b>'+escapeHtml(b.title||"Untitled Beat")+'</b><small>'+escapeHtml(b.genre||"Music")+' • '+escapeHtml(b.bpm||"—")+' BPM • '+escapeHtml(b.key||"—")+'</small><small class="catalog-links"><a href="'+beatUrl+'">View beat</a><a href="'+ownerUrl+'">View storefront</a>'+(audio?'<span>Audio ready</span>':'<span>Audio missing</span>')+'</small></div>'+
        '<span class="catalog-status '+(status==="published"?"published":"")+'">'+escapeHtml(status)+'</span>'+
      '</article>';
    }).join("");
  }catch(error){
    console.error("Catalog load failed:",error);
    box.className="catalog-empty";
    box.innerHTML="<div>!</div><h3>Catalog unavailable</h3><p>We could not load your Firebase catalog right now.</p>";
  }
}

function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
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
