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
 

let currentUser = null;
onAuthStateChanged(auth, async user => {
  currentUser = user || null;
  if(user){
    $("userBadge").textContent = (user.displayName || user.email || "X").trim().charAt(0).toUpperCase();
    $("accountText").textContent = user.email || "Signed in";
    $("connection").textContent = "Firebase connected";
    await renderCatalog();
  } else {
    $("connection").textContent = "Not signed in";
  }
});

let selectedFile = null;
let selectedMasterFile = null;
renderCatalog();
function isAudioFile(file){
  const extension=String(file?.name||"").split(".").pop().toLowerCase();
  return Boolean(file && (
    file.type.startsWith("audio/") ||
    ["mp3","wav","m4a","aac","ogg","flac","webm"].includes(extension)
  ));
}
function audioContentType(file){
  if(file?.type?.startsWith("audio/")) return file.type;
  const extension=String(file?.name||"").split(".").pop().toLowerCase();
  return ({
    mp3:"audio/mpeg", wav:"audio/wav", m4a:"audio/mp4",
    aac:"audio/aac", ogg:"audio/ogg", flac:"audio/flac", webm:"audio/webm"
  })[extension] || "audio/mpeg";
}
function setSelectedFile(file){
  selectedFile = file || null;
  $("fileInfo").textContent = selectedFile ? "✓ " + selectedFile.name : "";
  if(selectedFile && !$("beatName").value) $("beatName").value = selectedFile.name.replace(/\.[^.]+$/,"").replace(/[_-]+/g," ");
}
$("beatFile").addEventListener("change", e => setSelectedFile(e.target.files[0]));
$("beatMasterFile").addEventListener("change", e => {
  selectedMasterFile = e.target.files[0] || null;
  $("masterFileInfo").textContent = selectedMasterFile ? "🔒 " + selectedMasterFile.name + " (private master)" : "";
});

const drop=$("dropZone");
["dragenter","dragover"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="rgba(25,215,255,.9)"}));
["dragleave","drop"].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.style.borderColor="rgba(25,215,255,.4)"}));
drop.addEventListener("drop",e=>{e.preventDefault();setSelectedFile(e.dataTransfer.files[0])});

document.querySelectorAll(".tag").forEach(tag=>tag.addEventListener("click",()=>tag.classList.toggle("active")));

$("saveBeat").addEventListener("click", async () => {
  if(!selectedFile && !$("beatAudioUrl").value.trim()){ $("uploadStatus").textContent="Choose a preview audio file or enter a hosted preview URL."; return; }
  if(selectedFile && (!isAudioFile(selectedFile) || selectedFile.size > 25 * 1024 * 1024)){ $("uploadStatus").textContent="Preview audio must be an audio file no larger than 25 MB."; return; }
  if(selectedMasterFile && (!isAudioFile(selectedMasterFile) || selectedMasterFile.size > 250 * 1024 * 1024)){ $("uploadStatus").textContent="The full master must be an audio file no larger than 250 MB."; return; }
  if(!currentUser){ $("uploadStatus").textContent="Please sign in before uploading."; return; }

  const name=$("beatName").value.trim()||(selectedFile ? selectedFile.name.replace(/\.[^.]+$/,"") : "Untitled Beat");
  const genre=$("beatGenre").value;
  const bpm=$("beatBpm").value ? Number($("beatBpm").value) : null;
  const key=$("beatKey").value.trim();
  const mood=$("beatMood").value.trim();
  const price=$("beatPrice").value ? Number($("beatPrice").value) : 0;
  const licenseType=$("beatLicense").value || "lease";
  const coverUrl=$("beatCoverUrl").value.trim();
  const audioUrl=$("beatAudioUrl").value.trim();
  if(audioUrl && !audioUrl.startsWith("https://")){ $("uploadStatus").textContent="Audio URL must use HTTPS."; return; }
  const description=$("beatDescription").value.trim();
  const tags=Array.from(document.querySelectorAll(".tag.active")).map(tag=>tag.textContent.trim());
  const status=$("uploadStatus");
  const button=$("saveBeat");

  try{
    button.disabled=true;
    let previewURL=audioUrl;
    let previewStoragePath="";
    let masterStoragePath="";
    let fileName=selectedFile?.name || "";
    let contentType=selectedFile ? audioContentType(selectedFile) : "audio/mpeg";

    if(selectedFile){
      status.textContent="Uploading public preview…";
      const safeName=selectedFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const previewRef=ref("previews/"+currentUser.uid+"/"+Date.now()+"_"+safeName);
      await uploadBytes(previewRef, selectedFile, {contentType});
      previewURL=await getDownloadURL(previewRef);
      previewStoragePath=previewRef.fullPath;
    }

    if(selectedMasterFile){
      status.textContent="Uploading private full master…";
      const safeMasterName=selectedMasterFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const masterRef=ref("masters/"+currentUser.uid+"/"+Date.now()+"_"+safeMasterName);
      await uploadBytes(masterRef, selectedMasterFile, {
        contentType:audioContentType(selectedMasterFile)
      });
      masterStoragePath=masterRef.fullPath;
    }

    if(!previewURL){
      throw new Error("A hosted preview URL is required.");
    }

    await addBeat(currentUser.uid,{
      title:name,
      producerName:currentUser.displayName || currentUser.email?.split("@")[0] || "LyTune Producer",
      genre, bpm, key, mood, tags,
      price, currency:"USD", licenseType,
      description, coverUrl,
      status:"published",
      previewUrl:previewURL,
      audioUrl:previewURL,
      fileName,
      previewStoragePath,
      masterStoragePath,
      masterAvailable:Boolean(masterStoragePath),
      contentType
    });

    status.textContent=masterStoragePath
      ? "✓ Preview published and full master stored privately."
      : "✓ Preview published. Add a private full master before enabling paid downloads.";
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
