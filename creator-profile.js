import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const $=id=>document.getElementById(id);
const saved=JSON.parse(localStorage.getItem("lytune-user")||"null");
let current=saved;
function render(user){
  current=user||saved;
  const name=current?.name||current?.displayName||"Jesse Sticks";
  $("creatorName").textContent=name;
  $("creatorRole").textContent=(current?.role==="producer"?"Producer":current?.role==="artist"?"Artist":"Artist · Producer");
  $("avatar").textContent=name.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase();
}
render(current);
try{
 const app=initializeApp(firebaseConfig);
 const auth=getAuth(app);
 onAuthStateChanged(auth,user=>{
   if(user) render({name:user.displayName||user.email?.split("@")[0],email:user.email,photoURL:user.photoURL,role:localStorage.getItem("lytune-role")||"artist",uid:user.uid});
 });
}catch(e){}

let following=false;
$("followBtn").addEventListener("click",()=>{following=!following;$("followBtn").textContent=following?"Following":"Follow";$("followers").textContent=following?"1":"0";});
$("shareBtn").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(location.href);$("shareBtn").textContent="Copied!";setTimeout(()=>$("shareBtn").textContent="Share",1500)}catch{$("shareBtn").textContent="Copy page URL";}});
$("editBtn").addEventListener("click",()=>alert("Profile editing will be connected to Firebase when we build the creator account backend."));
document.querySelectorAll(".play").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".play").forEach(x=>x.classList.remove("active"));btn.classList.add("active");}));
