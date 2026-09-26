/* Creator directory interactions */
(function(){
  "use strict";
  const creators=[
    {name:"Kay_Drumz",role:"Afrobeat Producer",location:"Lagos, Nigeria",initial:"K",gradient:"linear-gradient(135deg,#19D7FF,#007BFF)",bio:"Warm percussion, melodic grooves and modern Afrobeat textures.",tags:["Afrobeat","Drums","Melodic"]},
    {name:"Talemo_Beats",role:"Amapiano Producer",location:"Johannesburg, South Africa",initial:"T",gradient:"linear-gradient(135deg,#9B2EFF,#19D7FF)",bio:"Log drums, piano-led progressions and late-night Amapiano energy.",tags:["Amapiano","Log Drums","Piano"]},
    {name:"Spanky_Drill",role:"Trap & Drill Producer",location:"Accra, Ghana",initial:"S",gradient:"linear-gradient(135deg,#007BFF,#9B2EFF)",bio:"Dark melodies, punchy drums and hard-hitting contemporary production.",tags:["Drill","Trap","808s"]},
    {name:"PianoKeysSA",role:"Amapiano Producer",location:"Pretoria, South Africa",initial:"P",gradient:"linear-gradient(135deg,#007BFF,#19D7FF)",bio:"Soulful chords and rolling grooves designed for vocal artists.",tags:["Amapiano","Soul","Keys"]},
    {name:"BeatMason",role:"Street Vibes Producer",location:"Accra, Ghana",initial:"B",gradient:"linear-gradient(135deg,#9B2EFF,#007BFF)",bio:"Raw street-pop rhythms with hooks made to cut through the mix.",tags:["Street Vibes","Afro","Percussion"]},
    {name:"DJ Kaywise",role:"Afrobeat Producer",location:"Lagos, Nigeria",initial:"D",gradient:"linear-gradient(135deg,#19D7FF,#9B2EFF)",bio:"Sample profile layout showing how an established creator can appear.",tags:["Afrobeat","Club","Fusion"]}
  ];
  let genre="all",query="";
  const following=new Set(JSON.parse(localStorage.getItem("lytune_following_creators")||"[]"));
  function matches(c){
    const text=[c.name,c.role,c.location,c.bio].concat(c.tags).join(" ").toLowerCase();
    return (genre==="all"||text.indexOf(genre)>-1)&&text.indexOf(query)>-1;
  }
  function card(c){
    const f=following.has(c.name);
    return '<article class="creator-card"><div class="creator-cover" style="background:'+c.gradient+'"><div class="creator-avatar-wrap"><div class="creator-avatar" style="background:'+c.gradient+'">'+c.initial+'</div></div></div><div class="creator-body"><div class="creator-head"><div class="creator-info"><h3>'+c.name+' <span class="verified-badge" title="Preview profile">✓</span></h3><div class="creator-role">'+c.role+'</div><div class="creator-location">📍 '+c.location+'</div></div><span class="creator-founding-badge">Preview</span></div><p class="creator-bio">'+c.bio+'</p><div class="creator-tags">'+c.tags.map(function(t){return '<span class="creator-tag">'+t+'</span>';}).join("")+'</div><div class="creator-actions"><button class="creator-follow-btn '+(f?"following":"")+'" data-follow="'+c.name+'" type="button">'+(f?"Following ✓":"Follow")+'</button><a class="creator-view-btn" href="explore.html?producer='+encodeURIComponent(c.name)+'">View Beats</a></div></div></article>';
  }
  function render(){
    const grid=document.getElementById("creatorsGrid");
    const count=document.getElementById("resultsCount");
    const mode=document.getElementById("modeIndicator");
    if(!grid)return;
    const list=creators.filter(matches);
    if(count)count.textContent=list.length+(list.length===1?" creator":" creators");
    if(mode)mode.textContent="Preview profiles • Live producer API coming next";
    grid.innerHTML=list.length?list.map(card).join(""):'<div class="creator-empty-note"><div class="founder-icon">🔎</div><h2>No creators match your search</h2><p>Try another name or genre.</p></div>';
    grid.querySelectorAll("[data-follow]").forEach(function(btn){
      btn.addEventListener("click",function(){
        const name=btn.getAttribute("data-follow");
        if(following.has(name))following.delete(name);else following.add(name);
        localStorage.setItem("lytune_following_creators",JSON.stringify(Array.from(following)));
        render();
      });
    });
  }
  document.addEventListener("DOMContentLoaded",function(){
    const input=document.getElementById("creatorSearchInput");
    if(input)input.addEventListener("input",function(e){query=e.target.value.trim().toLowerCase();render();});
    document.querySelectorAll("[data-genre]").forEach(function(btn){
      btn.addEventListener("click",function(){
        document.querySelectorAll("[data-genre]").forEach(function(b){b.classList.remove("active");});
        btn.classList.add("active");
        genre=btn.getAttribute("data-genre").toLowerCase();
        render();
      });
    });
    render();
  });
})();