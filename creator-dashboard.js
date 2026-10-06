import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getCreatorProfile } from "./firestore.js";

const OWNER_EMAIL="jessesticks272@gmail.com";
const $=id=>document.getElementById(id);
let members=[]; let activeFilter="all";

function dateValue(value){if(!value)return null;const d=value?.toDate?value.toDate():new Date(value);return Number.isNaN(d.getTime())?null:d}
function dateText(value){const d=dateValue(value);return d?d.toLocaleString("en-NG",{day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit"}):"Not recorded"}
function escapeHtml(value){const d=document.createElement("div");d.textContent=value??"";return d.innerHTML}
function render(){
  const term=($("search").value||"").trim().toLowerCase();
  const rows=members.filter(m=>{const role=(m.role||"artist").toLowerCase();return(activeFilter==="all"||role===activeFilter)&&(String(m.name||"").toLowerCase().includes(term)||String(m.email||"").toLowerCase().includes(term))});
  $("memberTable").innerHTML=rows.map(m=>'<tr><td><span class="member-name">'+escapeHtml(m.name||"LyTune User")+'</span><span class="member-email">'+escapeHtml(m.email||"")+'</span></td><td class="role">'+escapeHtml((m.role||"artist").replace(/^./,x=>x.toUpperCase()))+'</td><td>'+dateText(m.createdAt)+'</td><td>'+dateText(m.lastLoginAt||m.lastSeenAt)+'</td><td><span class="status-dot"><i></i> Account</span></td></tr>').join("");
  $("state").textContent=rows.length?"":(members.length?"No members match this search.":"No registered members yet.");
  $("state").style.display=rows.length?"none":"block";
  $("memberCount").textContent=members.length;
  $("producerCount").textContent=members.filter(m=>m.role==="producer").length;
  $("artistCount").textContent=members.filter(m=>m.role==="artist").length;
}
async function loadMembers(){
  try{const snap=await getDocs(query(collection(db,"users"),orderBy("createdAt","desc")));members=snap.docs.map(d=>({uid:d.id,...d.data()}));render()}
  catch(error){console.error(error);$("state").textContent="Could not load members. Firestore rules must allow the owner account to read users.";$("state").className="state error";$("state").style.display="block"}
}
function exportCsv(){
  const rows=[["Name","Email","Role","Joined","Last login"],...members.map(m=>[m.name||"",m.email||"",m.role||"",dateText(m.createdAt),dateText(m.lastLoginAt||m.lastSeenAt)])];
  const csv=rows.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));const a=document.createElement("a");a.href=url;a.download="lytune-members.csv";a.click();URL.revokeObjectURL(url);
}
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");activeFilter=btn.dataset.filter;render()}));
$("search").addEventListener("input",render);$("exportBtn").addEventListener("click",exportCsv);
$("logoutBtn").addEventListener("click",async()=>{await signOut(auth);location.href="index.html"});
onAuthStateChanged(auth,async user=>{
  if(!user){location.href="auth.html";return}
  if((user.email||"").toLowerCase()!==OWNER_EMAIL.toLowerCase()){$("state").textContent="This creator control room is only available to the owner account.";$("state").className="state error";$("state").style.display="block";setTimeout(()=>location.href="index.html",1800);return}
  $("creatorName").textContent=user.displayName||"Jesse Sticks";$("creatorEmail").textContent=user.email||OWNER_EMAIL;$("profileBtn").href="creator-profile.html?uid="+encodeURIComponent(user.uid);
  try{const profile=await getCreatorProfile(user.uid);if(profile?.name)$("creatorName").textContent=profile.name}catch{}
  await loadMembers();
  try{const beats=await getDocs(collection(db,"beats"));$("beatCount").textContent=String(beats.docs.filter(d=>d.data().status==="published").length)}catch{}
});