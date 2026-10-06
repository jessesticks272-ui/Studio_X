import { auth } from "./firebase.js";
import { getUserProfile, getCreatorProfile, getUserConversationMessages, sendMessage, subscribeToConversation } from "./firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const $=id=>document.getElementById(id);
const gate=$("messagesGate"), shell=$("messagesShell"), threadList=$("threadList");
const header=$("chatHeader"), avatar=$("chatHeaderAvatar"), headerName=$("chatHeaderName");
const messagesEl=$("chatMessages"), compose=$("chatCompose"), input=$("messageInput"), sendBtn=$("sendMessageBtn");
const status=$("messageStatus");
let currentUser=null, activeThread=null, unsubscribe=null, threads=[];

function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function time(v){const d=v?.toDate?v.toDate():(v?new Date(v):null);return d&&!Number.isNaN(d.getTime())?d.toLocaleString([],{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}):"";}

function renderThreads(){
  threadList.querySelectorAll(".thread-item,.thread-list-empty").forEach(e=>e.remove());
  if(!threads.length){threadList.insertAdjacentHTML("beforeend",'<div class="thread-list-empty">No conversations yet. Visit <a href="creators.html">Creators</a> to message someone.</div>');return;}
  threads.forEach(t=>{
    const el=document.createElement("button"); el.type="button";
    el.className="thread-item"+(activeThread?.id===t.id?" active":"");
    el.innerHTML='<div class="thread-item-avatar">'+esc((t.name||"?")[0].toUpperCase())+'</div><div class="thread-item-info"><div class="thread-item-name">'+esc(t.name)+'</div><div class="thread-item-preview">'+esc(t.preview||"No messages yet")+'</div></div>';
    el.onclick=()=>openThread(t.id,t.name); threadList.appendChild(el);
  });
}
function renderMessages(list){
  messagesEl.innerHTML="";
  if(!list.length){messagesEl.innerHTML='<div class="chat-empty"><div class="founder-icon">💬</div><p>No messages yet. Start the conversation.</p></div>';return;}
  list.forEach(m=>{const b=document.createElement("div");b.className="chat-bubble "+(m.fromId===currentUser.uid?"sent":"received");b.innerHTML=esc(m.text)+(time(m.createdAt)?'<span class="chat-bubble-time">'+esc(time(m.createdAt))+'</span>':"");messagesEl.appendChild(b);});
  messagesEl.scrollTop=messagesEl.scrollHeight;
}
function openThread(id,name){
  if(!currentUser||id===currentUser.uid)return;
  activeThread={id,name:name||"LyTune User"}; header.classList.remove("is-hidden");compose.classList.remove("is-hidden");
  avatar.textContent=activeThread.name[0].toUpperCase();headerName.textContent=activeThread.name;renderThreads();
  if(unsubscribe)unsubscribe();
  messagesEl.innerHTML='<div class="chat-empty"><p>Loading messages…</p></div>';
  unsubscribe=subscribeToConversation(currentUser.uid,id,(list,error)=>{
    if(error){messagesEl.innerHTML='<div class="chat-empty"><p>Could not load messages. Check your Firestore rules.</p></div>';return;}
    renderMessages(list);const t=threads.find(x=>x.id===id);if(t&&list.length)t.preview=list[list.length-1].text;renderThreads();
  });
}
async function buildThreads(){
  const all=await getUserConversationMessages(currentUser.uid), map=new Map();
  all.forEach(m=>{const other=m.fromId===currentUser.uid?m.toId:m.fromId;if(other&&!map.has(other))map.set(other,m);});
  threads=await Promise.all([...map.entries()].map(async([id,last])=>{
    const p=await getCreatorProfile(id).catch(()=>null);const u=p||await getUserProfile(id).catch(()=>null);
    return {id,name:u?.name||"LyTune User",preview:last.text||""};
  }));renderThreads();
}
async function sendCurrent(){
  const text=input.value.trim();if(!text||!activeThread||!currentUser)return;
  sendBtn.disabled=true;if(status)status.textContent="";
  try{await sendMessage(currentUser.uid,activeThread.id,text);input.value="";}catch(e){console.error(e);if(status)status.textContent="Message could not be sent. Check your connection and Firestore rules.";}finally{sendBtn.disabled=false;}
}
async function init(){
  gate.classList.add("is-hidden");shell.classList.remove("is-hidden");
  try{await buildThreads();const p=new URLSearchParams(location.search),to=p.get("to"),name=p.get("name");if(to&&to!==currentUser.uid)openThread(to,name);else if(threads.length)openThread(threads[0].id,threads[0].name);else messagesEl.innerHTML='<div class="chat-empty"><div class="founder-icon">💬</div><p>Choose a creator to start your first conversation.</p></div>';}catch(e){console.error(e);messagesEl.innerHTML='<div class="chat-empty"><p>Messages could not be loaded. Check your Firestore rules.</p></div>';}
}
sendBtn?.addEventListener("click",sendCurrent);input?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendCurrent();}});
onAuthStateChanged(auth,async user=>{if(unsubscribe)unsubscribe();currentUser=user||null;if(!user){gate.classList.remove("is-hidden");shell.classList.add("is-hidden");return;}await init();});
