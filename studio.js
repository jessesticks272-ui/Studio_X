import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL } from "./firebase-storage.js";
import { addBeat, updateBeat, deleteBeat, getUserBeats } from "./firestore.js";

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
    const editId=new URLSearchParams(location.search).get("edit");
    if(editId){
      const ownedBeats=await getUserBeats(user.uid).catch(()=>[]);
      const target=ownedBeats.find(beat=>beat.id===editId);
      if(target)loadBeatForEdit(target);
    }
  } else {
    $("connection").textContent = "Not signed in";
  }
});

let selectedFile = null;
let selectedMasterFile = null;
let editingBeat = null;
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

function resetBeatForm(){
  editingBeat = null;
  selectedFile = null;
  selectedMasterFile = null;
  $("beatFile").value = "";
  $("beatMasterFile").value = "";
  $("fileInfo").textContent = "";
  $("masterFileInfo").textContent = "";
  ["beatName","beatKey","beatMood","beatPrice","beatCoverUrl","beatAudioUrl","beatDescription"].forEach(id => $(id).value = "");
  $("beatBpm").value = "";
  $("beatStatus").value = "draft";
  document.querySelectorAll(".tag").forEach((tag,index)=>tag.classList.toggle("active",index===0));
  $("saveBeat").textContent = "Save Beat";
  $("cancelEdit").classList.add("hidden");
}

function loadBeatForEdit(beat){
  editingBeat = beat;
  selectedFile = null;
  selectedMasterFile = null;
  $("beatFile").value = "";
  $("beatMasterFile").value = "";
  $("beatName").value = beat.title || "";
  $("beatGenre").value = beat.genre || "Afrobeat";
  $("beatBpm").value = beat.bpm || "";
  $("beatKey").value = beat.key || "";
  $("beatMood").value = beat.mood || "";
  $("beatPrice").value = beat.price ?? 0;
  $("beatLicense").value = beat.licenseType || "lease";
  $("beatCoverUrl").value = beat.coverUrl || "";
  $("beatAudioUrl").value = beat.previewUrl || beat.audioUrl || "";
  $("beatDescription").value = beat.description || "";
  $("beatStatus").value = beat.status === "published" ? "published" : "draft";
  $("fileInfo").textContent = beat.previewUrl || beat.audioUrl ? "✓ Existing preview will be kept unless replaced." : "No preview attached yet.";
  $("masterFileInfo").textContent = beat.masterStoragePath ? "🔒 A private master is already stored." : "No private master attached.";
  const activeTags = new Set(Array.isArray(beat.tags) ? beat.tags : []);
  document.querySelectorAll(".tag").forEach(tag=>tag.classList.toggle("active",activeTags.has(tag.textContent.trim())));
  $("saveBeat").textContent = "Save Changes";
  $("cancelEdit").classList.remove("hidden");
  $("uploadStatus").textContent = "Editing “" + (beat.title || "Untitled Beat") + "”.";
  quicks.forEach(x=>x.classList.toggle("active",x.dataset.panel==="upload"));
  Object.entries(panels).forEach(([key,p])=>p.classList.toggle("hidden",key!=="upload"));
  $("uploadPanel").scrollIntoView({behavior:"smooth",block:"start"});
}

$("cancelEdit").addEventListener("click",()=>{
  resetBeatForm();
  $("uploadStatus").textContent = "Editing cancelled. Your saved release was not changed.";
});

$("saveBeat").addEventListener("click", async () => {
  const statusBox=$("uploadStatus");
  if(!currentUser){statusBox.textContent="Please sign in before managing your catalog.";return;}
  if(selectedFile && (!isAudioFile(selectedFile) || selectedFile.size > 25 * 1024 * 1024)){
    statusBox.textContent="Preview audio must be an audio file no larger than 25 MB.";return;
  }
  if(selectedMasterFile && (!isAudioFile(selectedMasterFile) || selectedMasterFile.size > 250 * 1024 * 1024)){
    statusBox.textContent="The full master must be an audio file no larger than 250 MB.";return;
  }

  const name=$("beatName").value.trim();
  if(!name){statusBox.textContent="Add a title for this beat.";return;}
  const genre=$("beatGenre").value;
  const bpm=$("beatBpm").value ? Number($("beatBpm").value) : null;
  if(bpm!==null && (!Number.isInteger(bpm) || bpm<40 || bpm>220)){statusBox.textContent="BPM must be a whole number between 40 and 220.";return;}
  const price=$("beatPrice").value ? Number($("beatPrice").value) : 0;
  if(!Number.isFinite(price)||price<0){statusBox.textContent="Enter a valid non-negative price.";return;}
  const audioUrl=$("beatAudioUrl").value.trim();
  if(audioUrl && !audioUrl.startsWith("https://")){statusBox.textContent="Audio URL must use HTTPS.";return;}
  const releaseStatus=$("beatStatus").value==="published"?"published":"draft";
  const button=$("saveBeat");
  const tags=Array.from(document.querySelectorAll(".tag.active")).map(tag=>tag.textContent.trim());

  try{
    button.disabled=true;
    let previewURL=audioUrl || editingBeat?.previewUrl || editingBeat?.audioUrl || "";
    let previewStoragePath=editingBeat?.previewStoragePath || "";
    let masterStoragePath=editingBeat?.masterStoragePath || "";
    let fileName=editingBeat?.fileName || "";
    let contentType=editingBeat?.contentType || "audio/mpeg";

    if(selectedFile){
      statusBox.textContent="Uploading public preview…";
      const safeName=selectedFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const previewRef=ref("previews/"+currentUser.uid+"/"+Date.now()+"_"+safeName);
      contentType=audioContentType(selectedFile);
      await uploadBytes(previewRef,selectedFile,{contentType});
      previewURL=await getDownloadURL(previewRef);
      previewStoragePath=previewRef.fullPath;
      fileName=selectedFile.name;
    }
    if(selectedMasterFile){
      statusBox.textContent="Uploading private full master…";
      const safeName=selectedMasterFile.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const masterRef=ref("masters/"+currentUser.uid+"/"+Date.now()+"_"+safeName);
      await uploadBytes(masterRef,selectedMasterFile,{contentType:audioContentType(selectedMasterFile)});
      masterStoragePath=masterRef.fullPath;
    }
    if(releaseStatus==="published" && !previewURL){
      statusBox.textContent="Add a preview before publishing. You can save this release as a draft meanwhile.";return;
    }

    const payload={
      title:name,
      producerName:currentUser.displayName || currentUser.email?.split("@")[0] || "LyTune Producer",
      genre,bpm,key:$("beatKey").value.trim(),mood:$("beatMood").value.trim(),tags,
      price,currency:"USD",licenseType:$("beatLicense").value || "lease",
      description:$("beatDescription").value.trim(),coverUrl:$("beatCoverUrl").value.trim(),
      status:releaseStatus,previewUrl:previewURL,audioUrl:previewURL,fileName,
      previewStoragePath,masterStoragePath,masterAvailable:Boolean(masterStoragePath),contentType
    };

    if(editingBeat){
      await updateBeat(currentUser.uid,editingBeat.id,payload);
      statusBox.textContent=releaseStatus==="published"?"✓ Beat updated and published.":"✓ Changes saved as a draft.";
    }else{
      await addBeat(currentUser.uid,payload);
      statusBox.textContent=releaseStatus==="published"?"✓ Beat published to your catalogue.":"✓ Draft saved. Add a preview when you're ready to publish.";
    }
    resetBeatForm();
    await renderCatalog();
  }catch(error){
    console.error("Beat save failed:",error);
    statusBox.textContent=error?.message || "Could not save this beat. Check your connection and try again.";
  }finally{
    button.disabled=false;
  }
});

async function renderCatalog(){
  const box=$("catalog");
  try{
    const beats=currentUser?await getUserBeats(currentUser.uid):[];
    $("catalogCount").textContent=beats.length+" BEAT"+(beats.length===1?"":"S");
    const term=($("catalogSearch")?.value||"").trim().toLowerCase();
    const filter=$("catalogFilter")?.value||"all";
    const filtered=beats.filter(beat=>{
      const matchesText=!term || [beat.title,beat.genre,beat.mood].some(value=>String(value||"").toLowerCase().includes(term));
      const matchesStatus=filter==="all" || (beat.status||"draft")===filter;
      return matchesText&&matchesStatus;
    });
    if(!beats.length){
      box.className="catalog-empty";
      box.innerHTML="<div>♫</div><h3>Your catalogue starts here</h3><p>Save a draft or publish your first preview to begin building your producer catalogue.</p>";
      return;
    }
    if(!filtered.length){
      box.className="catalog-empty";
      box.innerHTML="<div>⌕</div><h3>No matching releases</h3><p>Try another search or status filter.</p>";
      return;
    }
    box.className="catalog-list";
    box.innerHTML=filtered.map(beat=>{
      const state=beat.status==="published"?"published":"draft";
      const ownerUrl="creator-profile.html?uid="+encodeURIComponent(beat.ownerId||currentUser.uid);
      const beatUrl="beat.html?id="+encodeURIComponent(beat.id);
      const preview=beat.previewUrl||beat.audioUrl;
      return '<article class="catalog-row">'+
        '<div class="catalog-art">'+(beat.coverUrl?'<img src="'+escapeHtml(beat.coverUrl)+'" alt="">':'♫')+'</div>'+
        '<div class="catalog-main"><b>'+escapeHtml(beat.title||"Untitled Beat")+'</b><small>'+escapeHtml(beat.genre||"Music")+' · '+escapeHtml(beat.bpm||"—")+' BPM · '+escapeHtml(beat.key||"—")+'</small><small class="catalog-links">'+(state==="published"?'<a href="'+beatUrl+'">View public page</a>':'<span>Not visible in Explore</span>')+'<a href="'+ownerUrl+'">View storefront</a>'+(preview?'<span>Preview ready</span>':'<span>Preview needed</span>')+(beat.masterStoragePath?'<span>Private master stored</span>':'<span>No master stored</span>')+'</small></div>'+
        '<span class="catalog-status '+state+'">'+state+'</span>'+
        '<div class="catalog-actions"><button class="catalog-action" type="button" data-action="edit" data-id="'+escapeHtml(beat.id)+'">Edit</button><button class="catalog-action" type="button" data-action="toggle" data-id="'+escapeHtml(beat.id)+'">'+(state==="published"?"Unpublish":"Publish")+'</button><button class="catalog-action danger" type="button" data-action="delete" data-id="'+escapeHtml(beat.id)+'">Delete</button></div>'+
      '</article>';
    }).join("");
  }catch(error){
    console.error("Catalog load failed:",error);
    box.className="catalog-empty";
    box.innerHTML="<div>!</div><h3>Catalogue unavailable</h3><p>We could not load your Firebase catalogue. Please refresh and try again.</p>";
  }
}

$("catalogSearch")?.addEventListener("input",renderCatalog);
$("catalogFilter")?.addEventListener("change",renderCatalog);
$("catalog")?.addEventListener("click",async event=>{
  const button=event.target.closest("button[data-action]");
  if(!button||!currentUser)return;
  const id=button.dataset.id;
  const beats=await getUserBeats(currentUser.uid).catch(()=>[]);
  const beat=beats.find(item=>item.id===id);
  if(!beat)return;
  const action=button.dataset.action;
  if(action==="edit"){loadBeatForEdit(beat);return;}
  if(action==="toggle"){
    const next=beat.status==="published"?"draft":"published";
    if(next==="published" && !(beat.previewUrl||beat.audioUrl)){
      $("uploadStatus").textContent="Add a preview before publishing this draft.";
      loadBeatForEdit(beat);
      return;
    }
    button.disabled=true;
    try{
      await updateBeat(currentUser.uid,id,{status:next});
      await renderCatalog();
      $("uploadStatus").textContent=next==="published"?"✓ Beat published.":"✓ Beat unpublished and moved to drafts.";
    }catch(error){
      console.error("Could not change beat status:",error);
      $("uploadStatus").textContent="Could not update this release. Please try again.";
    }finally{button.disabled=false;}
    return;
  }
  if(action==="delete"){
    if(!confirm("Delete “"+(beat.title||"Untitled Beat")+"” from your catalogue? This removes its catalogue record. Stored audio files are not automatically deleted."))return;
    button.disabled=true;
    try{
      await deleteBeat(currentUser.uid,id);
      if(editingBeat?.id===id)resetBeatForm();
      await renderCatalog();
      $("uploadStatus").textContent="Beat removed from your catalogue. Stored audio files may need separate cleanup.";
    }catch(error){
      console.error("Could not delete beat:",error);
      $("uploadStatus").textContent="Could not delete this beat. Please try again.";
    }finally{button.disabled=false;}
  }
});

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
