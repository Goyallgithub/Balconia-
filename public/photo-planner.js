(()=>{const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n/100);let current=null,previewUrl=null,requestId=crypto.randomUUID(),busy=false,atelierTimer=null,atelierStage=0;
let catalogProducts=[],extraIds=[],pickerLoaded=false;
const EXTRA_MAX=10;
const CAT_NAMES={plants:'Plants & pots',lights:'Lighting',furniture:'Furniture',decor:'Decor',flooring:'Rugs & flooring'};

const ATELIER_STAGES=[
  {title:'Reading your balcony',line:'Saving your photo and understanding light, edges and layout.'},
  {title:'Building your recipe',line:'Choosing catalogue products to match your mood and budget.'},
  {title:'Designing the makeover',line:'Placing those real products into your balcony with AI — this is the Balconia moment.'},
  {title:'Polishing the concept',line:'Almost ready. Keep this page open.'}
];

const answers=()=>{
  const base=Object.fromEntries(['mood','area','budget','sun','length','width'].map(k=>[k,document.getElementById(k)?.value]));
  base.otherNotes='';
  base.extraProductIds=[...extraIds];
  return base;
};
const error=t=>{$('#planner-error').textContent=t;};

function syncExtraHidden(){
  const el=$('#extra-product-ids');
  if(el)el.value=extraIds.join(',');
}

function renderExtraChips(){
  const box=$('#extra-product-chips');
  if(!box)return;
  if(!extraIds.length){
    box.innerHTML='<p class="footnote extra-empty">No catalogue picks yet.</p>';
    syncExtraHidden();
    return;
  }
  box.innerHTML=extraIds.map(id=>{
    const p=catalogProducts.find(x=>x.id===id)||{id,name:id,image:''};
    return `<button type="button" class="extra-chip" data-remove-extra="${esc(id)}" title="Remove">
      ${p.image?`<img src="${esc(p.image)}" alt="">`:''}<span>${esc(p.name)}</span><span aria-hidden="true">×</span>
    </button>`;
  }).join('');
  box.querySelectorAll('[data-remove-extra]').forEach(btn=>{
    btn.onclick=()=>{
      extraIds=extraIds.filter(x=>x!==btn.dataset.removeExtra);
      requestId=crypto.randomUUID();
      renderExtraChips();
    };
  });
  syncExtraHidden();
}

async function loadCatalog(){
  if(pickerLoaded&&catalogProducts.length)return catalogProducts;
  const r=await fetch('shop-data.json?v=prices-20261012');
  if(!r.ok)throw Error('Could not load the catalogue.');
  const all=await r.json();
  const seen=new Set();
  catalogProducts=[];
  for(const p of all){
    if(!Number.isInteger(p.pricePaise)||p.pricePaise<=0)continue;
    const key=p.catalogueGroup||p.id;
    if(seen.has(key))continue;
    seen.add(key);
    catalogProducts.push({
      id:p.id,
      name:p.modelName||p.name,
      category:p.category||'decor',
      pricePaise:p.pricePaise,
      image:p.images?.[0]?.src||''
    });
  }
  pickerLoaded=true;
  return catalogProducts;
}

function ensurePickerDialog(){
  let d=$('#catalogue-picker');
  if(d)return d;
  d=document.createElement('dialog');
  d.id='catalogue-picker';
  d.className='catalogue-picker';
  d.innerHTML=`<button type="button" class="picker-close" aria-label="Close">×</button>
    <h2>Choose from the catalogue</h2>
    <p class="footnote">Select up to ${EXTRA_MAX} pieces to feature in your AI makeover. We’ll place them if they fit your budget.</p>
    <div class="picker-tools">
      <input id="picker-search" type="search" placeholder="Search plants, lights, furniture…" aria-label="Search catalogue">
      <select id="picker-category" aria-label="Category"><option value="all">All categories</option>${Object.entries(CAT_NAMES).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select>
    </div>
    <p class="footnote" id="picker-count"></p>
    <div id="picker-grid" class="picker-grid"></div>
    <div class="picker-footer">
      <button type="button" class="button" id="picker-done">Add selected ↗</button>
    </div>`;
  document.body.appendChild(d);
  d.querySelector('.picker-close').onclick=()=>d.close();
  d.addEventListener('click',e=>{if(e.target===d)d.close();});
  d.addEventListener('close',()=>{
    if(d._originScroll!=null&&Math.abs((window.scrollY||document.documentElement.scrollTop)-d._originScroll)>1){
      window.scrollTo({top:d._originScroll,behavior:'instant'});
    }
  });
  const draw=()=>{
    const q=($('#picker-search').value||'').toLowerCase().trim();
    const cat=$('#picker-category').value;
    let list=catalogProducts.filter(p=>(cat==='all'||p.category===cat)&&(!q||(p.name+' '+p.id).toLowerCase().includes(q)));
    $('#picker-count').textContent=`${list.length} pieces · ${extraIds.length}/${EXTRA_MAX} selected`;
    $('#picker-grid').innerHTML=list.slice(0,120).map(p=>{
      const on=extraIds.includes(p.id);
      return `<button type="button" class="picker-card${on?' is-selected':''}" data-pick="${esc(p.id)}" ${!on&&extraIds.length>=EXTRA_MAX?'disabled':''}>
        <img src="${esc(p.image)}" alt="" loading="lazy">
        <span class="picker-name">${esc(p.name)}</span>
        <span class="picker-price">${money(p.pricePaise)}</span>
      </button>`;
    }).join('')||'<p class="footnote">No matches.</p>';
    $('#picker-grid').querySelectorAll('[data-pick]').forEach(btn=>{
      btn.onclick=()=>{
        const id=btn.dataset.pick;
        if(extraIds.includes(id))extraIds=extraIds.filter(x=>x!==id);
        else if(extraIds.length<EXTRA_MAX)extraIds.push(id);
        requestId=crypto.randomUUID();
        draw();
        renderExtraChips();
      };
    });
  };
  $('#picker-search').oninput=draw;
  $('#picker-category').onchange=draw;
  $('#picker-done').onclick=()=>{renderExtraChips();d.close();};
  d._draw=draw;
  return d;
}

async function openCataloguePicker(e){
  if(e?.preventDefault)e.preventDefault();
  const currentScroll=window.scrollY||document.documentElement.scrollTop;
  try{
    await loadCatalog();
    const d=ensurePickerDialog();
    d._originScroll=currentScroll;
    d._draw();
    if(!d.open){
      d.showModal();
      if(Math.abs((window.scrollY||document.documentElement.scrollTop)-currentScroll)>1){
        window.scrollTo({top:currentScroll,behavior:'instant'});
      }
    }
  }catch(err){error(err.message);}
}

$('#open-catalogue-picker')?.addEventListener('click',openCataloguePicker);
renderExtraChips();
loadCatalog().then(renderExtraChips).catch(()=>{});

async function authHeaders(){
  const token=window.BalconiaAuth?await window.BalconiaAuth.getAccessToken():null;
  return token?{Authorization:'Bearer '+token}:{};
}

async function api(url,options={}){
  const headers=Object.assign({},options.headers||{},await authHeaders());
  const r=await fetch(url,{...options,headers});
  const d=await r.json().catch(()=>({}));
  if(!r.ok){
    if(d.code==='auth_required'||r.status===401){
      if(window.BalconiaAuth?.open)window.BalconiaAuth.open();
    }
    if(d.signInUrl){error(d.error);const a=document.createElement('a');a.href=d.signInUrl;a.target='_top';a.textContent='Sign in to continue';$('#planner-error').append(' ',a);}
    const e=new Error(d.error||'Please try again.');e.data=d;throw e;
  }
  return d;
}

function ensureAtelier(){
  let el=$('#design-atelier');
  if(el)return el;
  el=document.createElement('div');
  el.id='design-atelier';
  el.className='design-atelier';
  el.hidden=true;
  el.setAttribute('role','dialog');
  el.setAttribute('aria-modal','true');
  el.setAttribute('aria-labelledby','atelier-title');
  document.body.appendChild(el);
  return el;
}

function setAtelierStage(i){
  atelierStage=i%ATELIER_STAGES.length;
  const stage=ATELIER_STAGES[atelierStage];
  const title=$('#atelier-title');
  const line=$('#atelier-line');
  const steps=$('#atelier-steps');
  if(title)title.textContent=stage.title;
  if(line)line.textContent=stage.line;
  if(steps){
    [...steps.children].forEach((li,idx)=>{
      li.classList.toggle('is-active',idx===atelierStage);
      li.classList.toggle('is-done',idx<atelierStage);
    });
  }
}

function showAtelier(photoSrc){
  const el=ensureAtelier();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.innerHTML=`<div class="atelier-veil"></div>
    <div class="atelier-card">
      <span class="eyebrow">BALCONIA ATELIER</span>
      <h2 id="atelier-title">${esc(ATELIER_STAGES[0].title)}</h2>
      <p id="atelier-line">${esc(ATELIER_STAGES[0].line)}</p>
      <div class="atelier-frame${reduced?'':' atelier-frame-live'}">
        ${photoSrc?`<img src="${esc(photoSrc)}" alt="Your balcony while we design">`:''}
        <div class="atelier-sweep" aria-hidden="true"></div>
        <div class="atelier-bloom" aria-hidden="true"></div>
      </div>
      <ol id="atelier-steps" class="atelier-steps">${ATELIER_STAGES.map((s,i)=>`<li class="${i===0?'is-active':''}"><span>${esc(s.title)}</span></li>`).join('')}</ol>
      <p class="atelier-note">Your photo stays yours. AI only styles it with priced Balconia catalogue pieces.</p>
    </div>`;
  el.hidden=false;
  document.body.classList.add('atelier-open');
  clearInterval(atelierTimer);
  if(!reduced)atelierTimer=setInterval(()=>setAtelierStage(Math.min(atelierStage+1,2)),5200);
  setAtelierStage(0);
}

function hideAtelier(){
  clearInterval(atelierTimer);
  atelierTimer=null;
  const el=$('#design-atelier');
  if(!el)return;
  el.hidden=true;
  document.body.classList.remove('atelier-open');
}

$('#balcony-photo')?.addEventListener('change',()=>{requestId=crypto.randomUUID();const file=$('#balcony-photo').files[0];if(previewUrl)URL.revokeObjectURL(previewUrl);$('#upload-preview').hidden=true;if(!file)return;if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){error('Please choose a JPEG, PNG or WebP photo under 8 MB.');$('#balcony-photo').value='';return;}error('');previewUrl=URL.createObjectURL(file);$('#upload-preview').src=previewUrl;$('#upload-preview').hidden=false;});
$('#quiz-form')?.addEventListener('input',e=>{if(e.target.id!=='photo-consent')requestId=crypto.randomUUID();});

async function cleanPhoto(file){const bitmap=await createImageBitmap(file);if(bitmap.width<300||bitmap.height<300)throw Error('Please use a clearer photo at least 300 pixels wide and tall.');const scale=Math.min(1,1536/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not read this photo.')), 'image/webp',.92));}

$('#quiz-form')?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(busy)return;
  if(window.BalconiaAuth?.enabled && !window.BalconiaAuth.requireSignIn()){
    error('Please sign in first to create your personalised balcony makeover.');
    return;
  }
  busy=true;
  const button=$('#generate-design');
  button.disabled=true;
  button.textContent='Designing your balcony…';
  error('');
  const result=$('#result');
  result.hidden=true;
  result.innerHTML='';
  showAtelier(previewUrl||'');
  try{
    const file=$('#balcony-photo').files[0];
    if(!file)throw Error('Please upload your balcony photo.');
    setAtelierStage(0);
    const form=new FormData();
    form.append('photo',await cleanPhoto(file),'balcony.webp');
    form.append('answers',JSON.stringify(answers()));
    form.append('requestId',requestId);
    form.append('consent',$('#photo-consent').checked?'yes':'no');
    current=await api('/api/designs',{method:'POST',body:form});
    sessionStorage.setItem('balconia-last-design',current.id);
    setAtelierStage(1);
    if(current.generationAvailable&&current.status!=='complete'&&!current.renderUrl){
      setAtelierStage(2);
      current=await api('/api/designs/'+current.id+'/generate',{method:'POST'});
      setAtelierStage(3);
    }
    hideAtelier();
    render({reveal:true});
  }catch(err){
    hideAtelier();
    if(current?.plan){
      current={...current,status:'failed',lastError:err.message};
      render();
      const again=$('#design-error');
      if(again)again.textContent=err.message;
    }else{
      error(err.message);
    }
  }finally{
    busy=false;
    button.disabled=false;
    button.textContent='Create my balcony design & estimate ↗';
  }
});

function renderStatusHtml(){
  if(current.renderUrl){
    return `<figure class="reveal-figure makeover-after">
      <img src="${esc(current.renderUrl)}" alt="AI makeover of your balcony using Balconia catalogue products">
      <figcaption>After · your balcony, restyled</figcaption>
      <a class="text-link" href="${esc(current.renderUrl)}" download="Balconia-My-Balcony.webp">Save my design ↓</a>
    </figure>`;
  }
  if(!current.generationAvailable){
    return `<div class="render-status"><strong>Personalised image generation is not enabled yet</strong><p>Your photo and product estimate are saved.</p></div>`;
  }
  if(current.status==='failed'){
    return `<div class="render-status render-status-failed"><strong>Image generation did not finish</strong><p>${esc(current.lastError||'Please try again.')}</p><button type="button" class="button" id="retry-render">Retry my AI makeover ↗</button></div>`;
  }
  return `<div class="render-status"><strong>Finish your personalised image</strong><p>Your product plan is ready. Generate the makeover from your photo and these catalogue pieces.</p><button type="button" class="button" id="retry-render">Generate my AI makeover ↗</button></div>`;
}

function render(opts={}){
  const result=$('#result');
  result.hidden=false;
  result.classList.toggle('result-reveal',!!opts.reveal);
  const p=current.plan;
  const c=(typeof concepts!=='undefined'?concepts.find(x=>x.id===p.answers.mood):null);
  const remaining=current.generationsRemaining;
  const remNote=remaining==null?'':`<p class="footnote">AI images left on this account: <strong>${remaining}</strong>.</p>`;
  const picks=(p.answers?.extraProductIds||[]).filter(Boolean);
  const other=picks.length?`<p class="footnote"><strong>Your catalogue picks:</strong> ${picks.map(id=>{const it=p.items.find(x=>x.id===id);return esc(it?.name||id);}).join(', ')}</p>`:(p.answers?.otherNotes?`<p class="footnote"><strong>Your note:</strong> ${esc(p.answers.otherNotes)}</p>`:'');
  const budget=p.answers?.budget?`<p class="makeover-budget">Planning budget <strong>${esc(p.answers.budget)}</strong> · ${p.items.length} catalogue pieces · ${money(p.subtotalPaise)}</p>`:'';
  const hero=current.renderUrl
    ? `<div class="makeover-hero"><span class="eyebrow">YOUR PERSONALISED MAKEOVER</span><h3>${esc(c?c.name:'Your balcony')} — reimagined</h3><p class="makeover-lede">This is your balcony photograph, redesigned with real Balconia products chosen for your answers.</p>${budget}</div>`
    : `<span class="eyebrow">YOUR BALCONY · YOUR PRODUCT PLAN</span><h3>${esc(c?c.name:p.answers.mood)}</h3>${budget}`;

  result.innerHTML=`${hero}${other}${remNote}
    <div class="balcony-comparison${current.renderUrl?' balcony-comparison-ready':''}">
      <figure class="makeover-before"><img src="${esc(current.originalUrl)}" alt="Your uploaded balcony photograph"><figcaption>Before · your balcony</figcaption></figure>
      ${renderStatusHtml()}
    </div>
    <p class="footnote">AI places suggested catalogue products into your photographed space. It cannot verify dimensions — measure before ordering.</p>
    <div class="estimate-box"><span>Estimated product cost</span><strong id="estimate-total">${money(p.subtotalPaise)}</strong><p>Sum of catalogue selling prices × quantities below. Delivery and installation are separate.</p></div>

    <div class="makeover-next-steps" id="makeover-next-steps">
      <div class="next-step-card card-makeover">
        <span class="step-tag recommended">RECOMMENDED · ALL INCLUSIVE</span>
        <h4>Option B: Balconia Makeover</h4>
        <span class="step-sub">Products + Professional Installation</span>
        <p>Full-service makeover: we deliver all pieces, unbox, style and professionally install your balcony nook.</p>
        <button type="button" class="button button-makeover" id="choose-service">Order Makeover (Installation) ↗</button>
      </div>

      <div class="next-step-card card-diy">
        <span class="step-tag">DELIVERY ONLY</span>
        <h4>Option A: DIY Products</h4>
        <span class="step-sub">Delivery across Delhi NCR</span>
        <p>Order these catalogue pieces delivered safely to your doorstep across Delhi NCR with DIY setup instructions.</p>
        <div class="step-actions">
          <button type="button" class="button button-diy-direct" id="order-diy-direct">Proceed to Checkout (DIY) ↗</button>
          <button type="button" class="button button-outline" id="choose-diy">Review &amp; Edit Items (${p.items.length}) ↓</button>
        </div>
      </div>
    </div>

    <p class="footnote">DIY products: delivery within Delhi NCR. Balconia installation: coverage confirmed from Delivery details at checkout.</p>
    <section id="diy-products"><h3>Products in this makeover</h3>
      <p class="footnote">These catalogue items shaped your AI image. Change quantities to update the estimate.</p>
      <div class="diy-products-top-action">
        <span>Selected total: <strong id="selected-total-top">${money(p.subtotalPaise)}</strong></span>
        <button type="button" class="button small" id="order-diy-top">Proceed to Checkout · COD ↗</button>
      </div>
      <div class="design-products">${p.items.map(x=>`<article class="design-product"><img src="${esc(x.image)}" alt="${esc(x.name)}" loading="lazy"><div><a href="catalogue.html#${esc(x.id)}">${esc(x.name)} ↗</a><small>${x.plantOnly?'Plant with nursery pot/bag; decorative planter extra':esc(x.size||'Confirm finish and dimensions before dispatch')}</small><strong>${money(x.unitPricePaise)} each</strong><label>Quantity <input type="number" min="0" max="20" step="1" value="${x.quantity}" data-plan-id="${esc(x.id)}" aria-label="Quantity for ${esc(x.name)}"></label></div></article>`).join('')}</div>
      <p class="selection-total">Selected product subtotal: <strong id="selected-total">${money(p.subtotalPaise)}</strong></p>
      <div class="diy-checkout-actions">
        <button type="button" class="button" id="order-diy">Proceed to Checkout · Cash on Delivery ↗</button>
        <button type="button" class="button secondary" id="order-diy-bag">View items in Bag ↗</button>
      </div>
      <p class="footnote">Your bag will be updated with this design’s selected products. Cash on Delivery is available across Delhi NCR.</p>
    </section>
    <ul class="fit-notes">${p.notes.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>
    <div id="design-error" role="alert"></div>
    <button type="button" class="delete-photo" id="delete-design">Delete this design and its photos</button>`;

  result.querySelectorAll('[data-plan-id]').forEach(x=>x.oninput=updateTotal);
  $('#choose-diy').onclick=()=>$('#diy-products').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  $('#order-diy-direct').onclick=()=>toCheckout('diy');
  $('#order-diy-top').onclick=()=>toCheckout('diy');
  $('#order-diy').onclick=()=>toCheckout('diy');
  $('#order-diy-bag').onclick=()=>toCheckout('diy','cart.html');
  $('#choose-service').onclick=()=>toCheckout('balconia');
  if($('#retry-render'))$('#retry-render').onclick=()=>retryGenerate();
  $('#delete-design').onclick=async()=>{try{await api('/api/designs/'+current.id,{method:'DELETE'});sessionStorage.removeItem('balconia-last-design');current=null;result.hidden=true;$('#balcony-photo').value='';$('#upload-preview').hidden=true;error('Your saved design and photos have been deleted.');}catch(e){$('#design-error').textContent=e.message;}};
  setTimeout(()=>{const hero=result.querySelector('.makeover-hero')||result;hero.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});},80);
}

function selection(){return [...document.querySelectorAll('[data-plan-id]')].map(x=>({id:x.dataset.planId,quantity:Number(x.value)})).filter(x=>x.quantity>0);}
function validSelection(){const all=[...document.querySelectorAll('[data-plan-id]')];if(all.some(x=>!Number.isInteger(Number(x.value))||Number(x.value)<0||Number(x.value)>20))throw Error('Use whole quantities from 0 to 20.');const list=selection();if(!list.length)throw Error('Select at least one product.');return list;}
function updateTotal(){const list=selection();const total=list.some(x=>!Number.isInteger(x.quantity)||x.quantity>20)?'Check quantities':money(list.reduce((s,x)=>s+current.plan.items.find(p=>p.id===x.id).unitPricePaise*x.quantity,0));$('#selected-total').textContent=total;const topTotal=$('#selected-total-top');if(topTotal&&total!=='Check quantities')topTotal.textContent=total;const est=$('#estimate-total');if(est&&total!=='Check quantities')est.textContent=total;}
async function toCheckout(type,targetUrl=null){try{if(type==='balconia'&&window.BalconiaCoverage?.requireMakeover){const ok=await window.BalconiaCoverage.requireMakeover();if(ok===false)return;}const list=validSelection();localStorage.setItem('balconia-bag-v1',JSON.stringify(list));sessionStorage.setItem('balconia-design-context',JSON.stringify({designId:current.id,fulfilmentType:type}));sessionStorage.removeItem('balconia-order-request');location.href=targetUrl||(type==='diy'?'checkout.html':'checkout.html');}catch(e){const err=$('#design-error');if(err){err.textContent=e.message;err.scrollIntoView({behavior:'smooth',block:'center'});}}}

async function retryGenerate(){
  if(busy)return;
  busy=true;
  showAtelier(current?.originalUrl||previewUrl||'');
  setAtelierStage(2);
  try{
    current=await api('/api/designs/'+current.id+'/generate',{method:'POST'});
    hideAtelier();
    render({reveal:true});
  }catch(e){
    hideAtelier();
    try{current=await api('/api/designs/'+current.id);if(current.renderUrl){render({reveal:true});return;}}catch{}
    current={...current,status:'failed',lastError:e.message};
    render();
    const again=$('#design-error');
    if(again)again.textContent=e.message;
  }finally{busy=false;}
}

const result=$('#result');
if(result){result.replaceChildren();result.hidden=true;}
try{sessionStorage.removeItem('balconia-last-design');}catch{}
})();
