const members=[
{id:1,name:"Ada Williams",email:"ada@example.com",type:"Artist",plan:"Pro",payment:"paid",amount:15000,date:"Oct 2, 2026"},
{id:2,name:"Daniel Okafor",email:"daniel@example.com",type:"Producer",plan:"Pro",payment:"paid",amount:15000,date:"Oct 1, 2026"},
{id:3,name:"Maya Stone",email:"maya@example.com",type:"Artist",plan:"Starter",payment:"pending",amount:5000,date:"Oct 1, 2026"},
{id:4,name:"Kelechi Beats",email:"kelechi@example.com",type:"Producer",plan:"Pro",payment:"paid",amount:15000,date:"Sep 30, 2026"},
{id:5,name:"Tobi A.",email:"tobi@example.com",type:"Artist",plan:"Starter",payment:"paid",amount:5000,date:"Sep 29, 2026"},
{id:6,name:"Zara Keys",email:"zara@example.com",type:"Producer",plan:"Pro",payment:"pending",amount:15000,date:"Sep 28, 2026"}
];
const $=id=>document.getElementById(id);
const initials=n=>n.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
let filter="all";
function money(n){return "₦"+Number(n).toLocaleString("en-NG")}
function render(){
 const q=($("memberSearch").value||"").toLowerCase().trim();
 const rows=members.filter(m=>(filter==="all"||m.payment===filter||m.type.toLowerCase()===filter)&&(m.name+" "+m.email).toLowerCase().includes(q));
 $("memberTable").innerHTML=rows.map(m=>'<tr><td><div class="member"><span class="member-avatar">'+initials(m.name)+'</span><div><b>'+m.name+'</b><small>'+m.email+'</small></div></div></td><td class="type">'+m.type+'</td><td>'+m.plan+'</td><td><span class="status '+m.payment+'">'+(m.payment==="paid"?"Paid":"Pending")+'</span></td><td>'+m.date+'</td><td><button class="view-btn" data-id="'+m.id+'">View</button></td></tr>').join("");
 $("emptyState").classList.toggle("hidden",rows.length>0);
 $("totalMembers").textContent=members.length;
 $("paidMembers").textContent=members.filter(m=>m.payment==="paid").length;
 $("pendingMembers").textContent=members.filter(m=>m.payment==="pending").length;
 $("revenue").textContent=money(members.filter(m=>m.payment==="paid").reduce((a,m)=>a+m.amount,0));
}
function renderPayments(){
 const paid=members.filter(m=>m.payment==="paid");
 $("paymentList").innerHTML=paid.map(m=>'<div class="payment-row"><div class="payment-user">'+m.name+'<small>'+m.plan+' subscription</small></div><div class="payment-amount">'+money(m.amount)+'</div><div class="payment-date">'+m.date+'</div><span class="status paid">Paid</span></div>').join("");
}
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));btn.classList.add("active");filter=btn.dataset.filter;render()}));
$("memberSearch").addEventListener("input",render);
document.addEventListener("click",e=>{const b=e.target.closest(".view-btn");if(!b)return;const m=members.find(x=>x.id===Number(b.dataset.id));alert(m.name+"\n"+m.email+"\n"+m.type+" • "+m.plan+"\nPayment: "+(m.payment==="paid"?"Paid":"Pending"));});
$("accountButton").addEventListener("click",()=>{const menu=$("accountMenu");menu.classList.toggle("hidden");$("accountButton").setAttribute("aria-expanded",String(menu.classList.contains("hidden")===false))});
document.addEventListener("click",e=>{if(!e.target.closest(".account-wrap"))$("accountMenu").classList.add("hidden")});
$("themeToggle").addEventListener("click",()=>{const light=document.documentElement.dataset.theme==="light";document.documentElement.dataset.theme=light?"dark":"light";localStorage.setItem("lytune-theme",light?"dark":"light")});
$("logoutButton").addEventListener("click",()=>{if(window.LytuneAuth)window.LytuneAuth.logout();location.href="index.html"});
$("exportBtn").addEventListener("click",()=>{const csv=["Name,Email,Type,Plan,Payment,Joined",...members.map(m=>[m.name,m.email,m.type,m.plan,m.payment,m.date].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(","))].join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="lytune-members.csv";a.click();URL.revokeObjectURL(a.href)});
render();renderPayments();