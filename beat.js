(async function(){
  const app=document.getElementById('app');
  const id=new URLSearchParams(location.search).get('id');

  function esc(v){
    const d=document.createElement('div');
    d.textContent=v??'';
    return d.innerHTML;
  }

  function money(v,c){
    return (c||'USD')+' '+Number(v||0).toFixed(2);
  }

  function render(b){
    const genre=esc(b.genre||'Beat');
    const producer=esc(b.producerName||'Independent Producer');
    const preview=b.previewUrl||b.audioUrl||'';

    app.innerHTML='<div class="beat-shell">'+
      '<div class="art" style="'+(b.coverUrl?'background-image:url("'+esc(b.coverUrl)+'");background-size:cover;background-position:center;':'')+'">'+
        (!b.coverUrl?'<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><circle cx="50" cy="50" r="31" stroke="white" stroke-width="3"/><path d="M50 31v38M38 42v16M62 38v24M27 47v6M73 45v10" stroke="white" stroke-width="5" stroke-linecap="round"/></svg>':'')+
        '<span class="art-label">'+genre+'</span></div>'+
      '<section><div class="eyebrow">'+genre+'</div>'+
      '<h1 class="title">'+esc(b.title||'Untitled Beat')+'</h1>'+
      '<div class="producer"><a href="'+(b.ownerId?'creator-profile.html?uid='+encodeURIComponent(b.ownerId):'#')+'">'+producer+'</a></div>'+
      '<div class="meta">'+(b.bpm?'<span class="pill">'+esc(b.bpm)+' BPM</span>':'')+(b.key?'<span class="pill">'+esc(b.key)+'</span>':'')+(b.mood?'<span class="pill">'+esc(b.mood)+'</span>':'')+'</div>'+
      '<div class="panel"><h3>Preview</h3>'+
      '<audio id="audio" controls preload="metadata"'+(preview?' src="'+esc(preview)+'"':'')+'></audio>'+
      '<p id="previewMsg" class="desc">'+(preview?'':'No audio preview has been uploaded for this beat yet.')+'</p></div>'+
      '<div class="panel"><h3>About this beat</h3><p class="desc">'+esc(b.description||'No description added yet.')+'</p></div>'+
      '<div class="panel"><h3>License & purchase</h3><div class="licenses"><div class="license"><div><strong>'+esc(b.licenseType||'License options coming soon')+'</strong><span>Full license terms will be shown before payment.</span></div><button class="buy" id="buy" type="button">Buy '+money(b.price,b.currency)+'</button></div></div></div>'+
      '</section></div>';

    document.getElementById('buy').onclick=()=>{
      localStorage.setItem('lytune-cart',JSON.stringify([{id:b.id,title:b.title,price:b.price,currency:b.currency||'USD',licenseType:b.licenseType||'lease'}]));
      location.href='checkout.html';
    };
  }

  try{
    const {getBeat}=await import('./firestore.js');
    const beat=await getBeat(id);
    if(!beat || beat.status!=='published') throw new Error('Beat not found');
    render(beat);
  }catch(error){
    console.error('Beat load failed:',error);
    app.innerHTML='<div class="error">This beat could not be found or is not published yet.<br><br><a class="back-link" href="explore.html">Return to Explore</a></div>';
  }
})();