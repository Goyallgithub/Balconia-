
async function balconiaAuthHeaders(){try{if(window.BalconiaAuth?.getAccessToken){const t=await window.BalconiaAuth.getAccessToken();if(t)return{Authorization:'Bearer '+t};}}catch{}return{};}
import {states} from './states.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n/100),key='balconia-bag-v1';
let products=[],cart=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))cart=saved.filter(x=>typeof x.id==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=20);}catch{}
let designContext=null;try{designContext=JSON.parse(sessionStorage.getItem('balconia-design-context')||'null');}catch{}
let selectedFulfillment = (designContext?.fulfilmentType==='balconia'||designContext?.fulfilmentType==='installation') ? 'installation' : 'diy';
const managed=()=>selectedFulfillment==='installation';
const installationItem=p=>p.fulfilmentMode==='installation-required'||p.requiresInstallation===true;
const fulfilmentLabel=p=>`<span class="fulfilment-label">${installationItem(p)?'Requires installation · 15 km city coverage':'Delivery-only product · Delhi NCR delivery; installation not included'}</span>`;
const names={plants:'Greenery & pots',lights:'Warm light',flooring:'Underfoot',furniture:'Comfort',decor:'Finishing touches'};
const COUPON_CODE='BALCONIA';
const FREE_SHIP_PAISE=50000;      // ₹500
const SHIP_FEE_PAISE=15000;       // ₹150
const FREE_INSTALL_PAISE=100000;  // ₹1,000
const INSTALL_FEE_PAISE=50000;    // ₹500
const couponKey='balconia-coupon-v1';
let appliedCoupon='';
try{appliedCoupon=String(sessionStorage.getItem(couponKey)||'').toUpperCase();}catch{}
const toast=t=>{const el=$('#toast');el.textContent=t;el.style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.style.display='none',2800);};
function save(){try{localStorage.setItem(key,JSON.stringify(cart));}catch{toast('Your browser cannot save the bag between visits.');}document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=cart.reduce((s,x)=>s+x.quantity,0));}
const lines=()=>cart.map(x=>({...x,p:products.find(p=>p.id===x.id)})).filter(x=>x.p&&x.p.pricePaise!==null),subtotal=()=>lines().reduce((n,x)=>n+x.p.pricePaise*x.quantity,0);
function couponActive(){return appliedCoupon===COUPON_CODE;}
function needsInstallation(){return selectedFulfillment==='installation';}
function orderFees(overrideFulfillment=null){
  const total=subtotal();
  const diwali=couponActive();
  const fulfillment=overrideFulfillment||selectedFulfillment||'diy';
  const showInstall=fulfillment==='installation';
  // Diwali code BALCONIA unlocks free shipping at ₹500+ and free installation at ₹1,000+
  const shippingPaise=diwali&&total>=FREE_SHIP_PAISE?0:SHIP_FEE_PAISE;
  const installationPaise=showInstall?(diwali&&total>=FREE_INSTALL_PAISE?0:INSTALL_FEE_PAISE):0;
  const shipFree=shippingPaise===0;
  const installFree=showInstall&&installationPaise===0;
  const shipNeed=Math.max(0,FREE_SHIP_PAISE-total);
  const installNeed=Math.max(0,FREE_INSTALL_PAISE-total);
  const noteParts=[];
  if(!diwali){
    noteParts.push('Apply code BALCONIA for Diwali offers: free shipping on orders ₹500+, free installation on orders ₹1,000+.');
    noteParts.push(`Shipping ₹150${showInstall?' · Installation ₹500':''} until the code is applied.`);
  }else{
    noteParts.push(shipFree?`BALCONIA applied · free shipping.`:`BALCONIA applied · shipping ₹150 · add ${money(shipNeed)} more for free shipping.`);
    if(showInstall){
      noteParts.push(installFree?`Free installation.`:`Installation ₹500 · add ${money(installNeed)} more for free installation.`);
    }
  }
  return {
    shippingPaise,
    installationPaise,
    showInstall,
    shipFree,
    installFree,
    couponCode:diwali?COUPON_CODE:null,
    grandTotalPaise:total+shippingPaise+installationPaise,
    note:noteParts.join(' '),
  };
}
function couponBox(){
  const fees=orderFees();
  const status=couponActive()
    ?(fees.shipFree||fees.installFree?'Diwali offer applied.':'BALCONIA applied — add a little more to unlock free shipping / installation.')
    :'Enter BALCONIA to unlock Diwali shipping & installation offers.';
  return `<div class="coupon-box">
    <label for="coupon-code">Diwali coupon</label>
    <div class="coupon-row">
      <input id="coupon-code" type="text" maxlength="24" placeholder="Enter code" value="${esc(appliedCoupon)}" autocomplete="off" aria-label="Coupon code">
      <button type="button" class="btn secondary" id="apply-coupon">${couponActive()?'Applied':'Apply'}</button>
    </div>
    <p class="coupon-msg ${couponActive()?(fees.shipFree||fees.installFree?'is-ok':'is-warn'):''}" id="coupon-msg">${esc(status)}</p>
  </div>`;
}
function bindCoupon(rerender){
  const apply=()=>{
    const raw=($('#coupon-code')?.value||'').trim().toUpperCase();
    if(!raw){appliedCoupon='';try{sessionStorage.removeItem(couponKey);}catch{}toast('Coupon cleared');rerender();return;}
    if(raw!==COUPON_CODE){toast('That coupon is not valid. Try BALCONIA.');return;}
    appliedCoupon=COUPON_CODE;
    try{sessionStorage.setItem(couponKey,appliedCoupon);}catch{}
    const fees=orderFees();
    toast(fees.shipFree||fees.installFree?'BALCONIA applied — Diwali offer unlocked':'BALCONIA applied — add a little more to unlock free shipping / installation');
    rerender();
  };
  $('#apply-coupon')?.addEventListener('click',apply);
  $('#coupon-code')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}});
}
function cartQty(id){const x=cart.find(x=>x.id===id);return x?x.quantity:0;}
function isLivingPlant(p){return Boolean(p?.category==='plants'&&p?.plantOnly===true);}
function isPlanter(p){return Boolean(p?.category==='plants'&&!p?.plantOnly&&(p?.detail==='Planters'||p?.id?.startsWith('POT-')||/planter|pot/i.test(p?.name||'')));}

function findBestPlanterFor(plant){
  const name=(plant.name||'').toLowerCase();
  const desc=(plant.description||'').toLowerCase();
  const isExtraLarge=/large tub|tub plant|5 feet|6 feet|bird of paradise - large/i.test(name+' '+desc);
  const isLarge=/palm|areca|bamboo palm|ficus|monstera|3 feet|4 feet|cypress|dracaena|large/i.test(name+' '+desc);
  const isSmall=/succulent|jade|cactus|syngonium|money plant|pothos|spider plant|fern|dwarf/i.test(name+' '+desc);
  const minDia = isExtraLarge ? 35 : isLarge ? 28 : isSmall ? 14 : 20;
  const maxDia = isExtraLarge ? 48 : isLarge ? 38 : isSmall ? 22 : 30;

  const inCart = new Set(cart.map(x=>x.id));
  const planters = products.filter(x=>isPlanter(x)&&typeof x.pricePaise==='number'&&x.pricePaise>0);

  const matched = [];
  for(const pot of planters){
    const s=(pot.size||'').toLowerCase();
    let dia = 28;
    const diaMatch = s.match(/(?:dia|diameter)[:\s]*(\d+(?:\.\d+)?)\s*(?:cm)?/);
    const inchMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:inch|inches|")/);
    const cmMatch = s.match(/(\d+(?:\.\d+)?)\s*[×x*]\s*(\d+(?:\.\d+)?)/);
    if(diaMatch) dia = Math.round(parseFloat(diaMatch[1]));
    else if(inchMatch) dia = Math.round(parseFloat(inchMatch[1])*2.54);
    else if(cmMatch) dia = Math.round(parseFloat(cmMatch[1]));

    if(dia >= minDia && dia <= maxDia){
      matched.push({ pot, dia, inCart: inCart.has(pot.id) });
    }
  }

  if(!matched.length) return null;

  matched.sort((a,b)=>{
    if(a.inCart !== b.inCart) return a.inCart ? 1 : -1;
    const aSierra = a.pot.id.startsWith('POT-') ? 0 : 1;
    const bSierra = b.pot.id.startsWith('POT-') ? 0 : 1;
    if(aSierra !== bSierra) return aSierra - bSierra;
    return a.pot.pricePaise - b.pot.pricePaise;
  });

  return matched[0].pot;
}

function setQty(id,quantity){
  const p=products.find(p=>p.id===id);if(!p||p.pricePaise===null)return;
  const next=Math.max(0,Math.min(20,quantity));
  const i=cart.findIndex(x=>x.id===id);
  if(next<=0){if(i>=0)cart.splice(i,1);}
  else if(i>=0)cart[i].quantity=next;
  else cart.push({id,quantity:next});
  sessionStorage.removeItem('balconia-order-request');
  save();
}

function add(id){
  const q=cartQty(id);
  if(q>=20){toast('Maximum 20 per product.');return;}
  const p=products.find(x=>x.id===id);
  setQty(id,q+1);

  if(isLivingPlant(p)){
    const livingPlantsCount = cart.filter(x=>{const item=products.find(p=>p.id===x.id);return isLivingPlant(item);}).reduce((s,x)=>s+x.quantity,0);
    const plantersCount = cart.filter(x=>{const item=products.find(p=>p.id===x.id);return isPlanter(item);}).reduce((s,x)=>s+x.quantity,0);

    if(plantersCount < livingPlantsCount){
      const paired = findBestPlanterFor(p);
      if(paired){
        setQty(paired.id, cartQty(paired.id)+1);
        toast(`Added ${p.name} + paired with ${paired.name}`);
        return;
      } else {
        toast(`Added ${p.name}. (Note: decorative planter not included; no exact match in catalogue)`);
        return;
      }
    }
  }
}
function bagControls(id,opts={}){
  const q=cartQty(id);
  const p=products.find(x=>x.id===id);
  if(!q){
    const label=opts.withPrice&&p?.pricePaise!=null?`Add to bag · ${money(p.pricePaise)}`:'Add to bag';
    return `<button class="btn" data-add="${esc(id)}">${label}</button>`;
  }
  return `<div class="bag-stepper" data-bag-id="${esc(id)}">
    <button type="button" class="bag-step" data-qty="${esc(id)}" data-delta="-1" aria-label="Remove one">−</button>
    <span class="bag-step-count" aria-live="polite">${q} in bag</span>
    <button type="button" class="bag-step" data-qty="${esc(id)}" data-delta="1" aria-label="Add one">+</button>
  </div>`;
}
function image(p,i=0){const a=p.images[i];return `<img ${(p.thumbnailOnly||p.cataloguePreview)?`class="${p.cataloguePreview?'planter-preview':'catalogue-thumbnail'}" style="--source-width:${a.width}px;--source-height:${a.height}px;--source-ratio:${a.width}/${a.height}"`:""} src="${esc(a.src)}" width="${a.width}" height="${a.height}" loading="lazy" alt="${esc(p.name)} — ${esc(a.label)}">`;}
function price(p){return p.pricePaise===null?'<div class="price">Price on request</div>':`<div class="price"><strong>${money(p.pricePaise)}</strong>${p.mrpPaise? (p.planterOnly&&p.mrpPaise===p.pricePaise?`<span class="note">MRP ${money(p.mrpPaise)}</span>`:`<del>MRP ${money(p.mrpPaise)}</del>`):''}${p.discount?`<span class="discount">${p.discount}% off</span>`:''}</div>`;}
const plantNote=p=>p.planterOnly?'Planter only · plants not included':p.aiEnhanced?'5 × 7 ft · AI-enhanced product illustration':p.thumbnailOnly?'Catalogue preview · 5 × 7 ft':p.plantOnly?'Plant price only · decorative pot extra':'';
function deliveryNote(){
  const fees=orderFees();
  if(managed()){
    return `<p class="delivery-note"><strong>Balconia makeover request.</strong> ${esc(fees.note)}</p><p class="delivery-note">Cash on Delivery for products. Coverage confirmed for Delhi NCR. No online payment is collected at this step.</p>`;
  }
  return `<p class="delivery-note">${esc(fees.note)} Cash on Delivery only. Delivery limited to verified Delhi NCR addresses.</p>`;
}
function modelOptions(p){if(!p.catalogueGroup)return '';const group=products.filter(x=>x.catalogueGroup===p.catalogueGroup),sizes=[...new Set(group.map(x=>x.variantSize))],colours=[...new Set(group.map(x=>x.colour))];return `<div class="planter-options"><label>Size<select data-planter-size>${sizes.map(x=>`<option ${x===p.variantSize?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Finish<select data-planter-colour>${colours.map(x=>`<option ${x===p.colour?'selected':''}>${esc(x)}</option>`).join('')}</select></label></div><p class="note">Vendor SKU: ${esc(p.vendorSku)} · Plants are not included.</p>`;}
function shop(){const getCategory=()=>{const c=new URLSearchParams(location.search).get('category')||'all';return names[c]?c:'all';};let category=getCategory();const draw=()=>{$('#products').classList.toggle('underfoot-grid',category==='flooring');let items=products.filter(p=>(category==='all'||p.category===category)&&(p.name+' '+p.description).toLowerCase().includes($('#search').value.toLowerCase()));const seen=new Set();items=items.filter(p=>{const key=p.catalogueGroup||p.id;if(seen.has(key))return false;seen.add(key);return true;});if($('#sort').value!=='featured')items.sort((a,b)=>a.pricePaise===null&&b.pricePaise===null?0:a.pricePaise===null?1:b.pricePaise===null?-1:$('#sort').value==='low'?a.pricePaise-b.pricePaise:b.pricePaise-a.pricePaise);$('#result-count').textContent=`${items.length} thoughtful pieces · Prices in INR`;$('#products').innerHTML=items.length?items.map(p=>`<article class="product-card"><button class="photo-button" data-view="${esc(p.id)}" aria-label="View ${esc(p.name)}">${image(p)}<span class="tag">${esc(names[p.category])}</span></button><h3><a href="#${esc(p.id)}" data-view="${esc(p.id)}">${esc(p.modelName||p.name)}</a></h3><p class="description">${esc(p.description.split('\n')[0])}</p>${p.catalogueGroup?'<p class="note">From</p>':''}${price(p)}${fulfilmentLabel(p)}<p class="note">${plantNote(p)}</p>${p.catalogueGroup?`<button class="btn" data-view="${esc(p.id)}">Choose size & finish</button>`:p.pricePaise===null?`<button class="btn secondary" data-view="${esc(p.id)}">See details · price pending</button>`:bagControls(p.id)}</article>`).join(''):'<p>No products found. Try another search.</p>';};const tabs=()=>{$('#categories').innerHTML=Object.entries({all:'All pieces',...names}).map(([k,v])=>`<button data-category="${k}" class="${category===k?'active':''}" aria-pressed="${category===k}">${v}</button>`).join('');};tabs();draw();$('#categories').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;const nextCat=b.dataset.category;if(nextCat===category)return;category=nextCat;const u=new URL(location.href);if(category==='all'){u.searchParams.delete('category');}else{u.searchParams.set('category',category);}history.pushState({category},'',u.pathname+u.search+u.hash);tabs();draw();};window.addEventListener('popstate',()=>{category=getCategory();tabs();draw();});$('#search').oninput=draw;$('#sort').onchange=draw;$('#products').onclick=e=>{const a=e.target.closest('[data-add]'),q=e.target.closest('[data-qty]'),v=e.target.closest('[data-view]');if(a){add(a.dataset.add);draw();}else if(q){const id=q.dataset.qty;setQty(id,cartQty(id)+Number(q.dataset.delta));draw();}if(v){e.preventDefault();detail(v.dataset.view);}};$('.close').onclick=()=>$('#product-dialog').close();}
function ensureProductDialog(){
  let dialog=$('#product-dialog');
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.id='product-dialog';
    dialog.innerHTML='<button class="close" type="button" aria-label="Close product">×</button><div id="product-detail"></div>';
    document.body.appendChild(dialog);
  }
  if(!dialog._boundCloseSync){
    dialog._boundCloseSync=true;
    dialog.addEventListener('close',()=>{
      if(document.body.dataset.page==='cart')cartPage();
      if(document.body.dataset.page==='checkout'){
        const s=$('.panel.summary');if(s)s.outerHTML=summary('<a href="cart.html">Edit your bag</a>');
      }
    });
  }
  return dialog;
}
function detail(id){
  if(document.body.classList.contains('pin-locked'))return;
  const p=products.find(p=>p.id===id);
  if(!p)return;
  const dialog=ensureProductDialog();
  $('#product-detail').innerHTML=`<div class="detail-layout"><div><div class="gallery-main">${image(p)}</div><div class="thumbs">${p.images.map((a,i)=>`<button data-image="${i}" class="${i===0?'selected':''}" aria-label="View photo ${i+1}">${image(p,i)}</button>`).join('')}</div></div><div class="detail-copy"><span class="mini-label">${esc(names[p.category])} · ${esc(p.id)}</span><h2>${esc(p.modelName||p.name)}</h2>${modelOptions(p)}${price(p)}${fulfilmentLabel(p)}${!p.mrpPaise&&p.pricePaise!==null?'<p class="note">MRP: Not supplied · Discount: Not supplied. Selling price shown above.</p>':''}${p.cataloguePreview?'<p class="note">First photo: high-resolution AI-generated planter-only illustration based on the catalogue. Other photos are original catalogue previews. Photos show finish examples, not a separate photograph for each size and colour.</p>':''}${p.aiEnhanced?'<p class="note">AI-enhanced product illustrations based on the catalogue. Fine pattern details may vary; confirm the supplied carpet before dispatch.</p>':''}${p.thumbnailOnly?'<p class="note">Catalogue preview enlarged for browsing. Full-resolution photographs are still awaited.</p>':''}${p.plantOnly?'<p class="delivery-note">Price is for the plant in its supplied nursery pot/bag. The decorative planter shown in styled photos is not included. Plant size and appearance may vary; confirm planter options before dispatch.</p>':''}<p class="full-description">${esc(p.description)}</p>${p.size?`<p><strong>Dimensions:</strong> ${esc(p.size)}</p>`:''}${p.light?`<p><strong>Light:</strong> ${esc(p.light)}</p>`:''}<p class="note">Styled catalogue photographs are illustrative. Confirm finish, dimensions and included items before dispatch.</p>${p.pricePaise!==null?bagControls(p.id,{withPrice:true}):'<p class="delivery-note">Price and availability need confirmation. This item cannot be ordered yet.</p>'}<p class="catalogue-backlink"><a href="catalogue.html#${esc(p.id)}" target="_blank" rel="noopener">Open full piece in shop catalogue ↗</a></p><p class="delivery-status" data-delivery-status></p>${deliveryNote()}</div></div>`;
  $('#product-detail').onclick=e=>{
    const b=e.target.closest('[data-image]'),a=e.target.closest('[data-add]'),q=e.target.closest('[data-qty]');
    if(b){
      $('.gallery-main').innerHTML=image(p,Number(b.dataset.image));
      document.querySelectorAll('.thumbs button').forEach(x=>x.classList.toggle('selected',x===b));
    }
    if(a){
      add(a.dataset.add);
      detail(id);
      if(document.body.dataset.page==='cart')cartPage();
      if(document.body.dataset.page==='checkout'){
        const s=$('.panel.summary');if(s)s.outerHTML=summary('<a href="cart.html">Edit your bag</a>');
      }
    }
    if(q){
      setQty(q.dataset.qty,cartQty(q.dataset.qty)+Number(q.dataset.delta));
      detail(id);
      if(document.body.dataset.page==='cart')cartPage();
      if(document.body.dataset.page==='checkout'){
        const s=$('.panel.summary');if(s)s.outerHTML=summary('<a href="cart.html">Edit your bag</a>');
      }
    }
  };
  $('#product-detail').onchange=e=>{
    if(!e.target.matches('[data-planter-size],[data-planter-colour]'))return;
    const size=$('[data-planter-size]').value,colour=$('[data-planter-colour]').value,selector=e.target.matches('[data-planter-size]')?'[data-planter-size]':'[data-planter-colour]',variant=products.find(x=>x.catalogueGroup===p.catalogueGroup&&x.variantSize===size&&x.colour===colour);
    if(variant){
      detail(variant.id);
      $(selector)?.focus();
    }
  };
  window.BalconiaDelivery?.refresh();
  if(!dialog.open)dialog.showModal();
}
function summary(button=''){
  const fees=orderFees();
  const shipRow=`<div class="total-row shipping-row ${fees.shipFree?'is-free':''}"><span>Shipping</span><strong>${fees.shipFree?'FREE':money(fees.shippingPaise)}</strong></div>`;
  const installRow=fees.showInstall?`<div class="total-row shipping-row ${fees.installFree?'is-free':''}"><span>Installation</span><strong>${fees.installFree?'FREE':money(fees.installationPaise)}</strong></div>`:'';
  return `<aside class="panel summary"><h2>Your order</h2>${lines().map(x=>`<div class="total-row"><span><a class="summary-product-link" href="catalogue.html#${esc(x.p.id)}" data-view="${esc(x.p.id)}" target="_blank" title="View photos and specifications for ${esc(x.p.name)}">${esc(x.p.name)}</a> × ${x.quantity}</span><strong>${money(x.p.pricePaise*x.quantity)}</strong></div>`).join('')}<hr><div class="total-row"><strong>Product subtotal</strong><strong>${money(subtotal())}</strong></div>${shipRow}${installRow}<div class="total-row"><strong>Estimated total</strong><strong>${money(fees.grandTotalPaise)}</strong></div>${couponBox()}<p class="shipping-threshold note">With <strong>BALCONIA</strong>: free shipping ₹500+ · free installation ₹1,000+.</p>${deliveryNote()}${button}</aside>`;
}
function cartPage(){
  if(!lines().length){$('#cart-content').innerHTML='<div class="empty"><h2>Your bag is waiting for a little magic.</h2><a class="btn" href="catalogue.html">Explore the shop</a></div>';return;}
  const fees=orderFees();
  const totalCount=lines().reduce((s,x)=>s+x.quantity,0);
  $('#cart-content').innerHTML=`
    <div class="cart-top-bar">
      <div>
        <span>Bag Summary</span>
        <strong>${totalCount} ${totalCount===1?'item':'items'} · ${money(fees.grandTotalPaise)}</strong>
      </div>
      <a class="btn" href="checkout.html">Proceed to Checkout ↗</a>
    </div>
    <div class="checkout-grid"><section>
      <div class="cart-offer-banner ${couponActive()&&fees.shipFree&&(!fees.showInstall||fees.installFree)?'is-unlocked':''}">
        <strong>${couponActive()?'Diwali offer':'Use code BALCONIA'}</strong>
        <p>${esc(fees.note)}</p>
      </div>
      ${lines().map(x=>`<article class="cart-item">
        <a class="cart-item-photo" href="catalogue.html#${esc(x.p.id)}" data-view="${esc(x.p.id)}" aria-label="View photos and specifications for ${esc(x.p.name)}" target="_blank">${image(x.p)}</a>
        <div>
          <h3><a class="cart-item-title-link" href="catalogue.html#${esc(x.p.id)}" data-view="${esc(x.p.id)}" target="_blank">${esc(x.p.name)}</a></h3>
          <button type="button" class="cart-item-view-btn" data-view="${esc(x.p.id)}" aria-label="View photos of ${esc(x.p.name)}">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true" width="13" height="13"><circle cx="10" cy="11" r="3"/><path d="M4 6h3l1.5-2h3L13 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>
            <span>View photos &amp; details ↗</span>
          </button>
          <p class="note">${plantNote(x.p)}</p>
          <div class="quantity">
            <button data-qty="${esc(x.id)}" data-delta="-1" aria-label="Reduce quantity">−</button>
            <span>${x.quantity}</span>
            <button data-qty="${esc(x.id)}" data-delta="1" aria-label="Increase quantity">+</button>
          </div>
          <button class="remove" data-remove="${esc(x.id)}">Remove</button>
        </div>
        <strong>${money(x.p.pricePaise*x.quantity)}</strong>
      </article>`).join('')}
      <p><a href="catalogue.html">← Continue exploring</a></p>
    </section>${summary('<a class="btn" href="checkout.html">Checkout · Cash on Delivery</a>')}</div>
    <div class="cart-sticky-bar">
      <div class="cart-sticky-info">
        <span class="cart-sticky-label">Total (${totalCount} ${totalCount===1?'item':'items'})</span>
        <strong class="cart-sticky-total">${money(fees.grandTotalPaise)}</strong>
      </div>
      <a class="btn cart-sticky-btn" href="checkout.html">Checkout · COD ↗</a>
    </div>`;
  bindCoupon(cartPage);
  $('#cart-content').onclick=e=>{
    if(e.target.closest('#apply-coupon')||e.target.closest('#coupon-code'))return;
    const v=e.target.closest('[data-view]');
    if(v && !e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0){
      e.preventDefault();
      detail(v.dataset.view);
      return;
    }
    const q=e.target.closest('[data-qty]'),r=e.target.closest('[data-remove]');
    if(q){const x=cart.find(x=>x.id===q.dataset.qty);x.quantity=Math.max(1,Math.min(20,x.quantity+Number(q.dataset.delta)));}
    else if(r)cart=cart.filter(x=>x.id!==r.dataset.remove);
    else return;
    sessionStorage.removeItem('balconia-order-request');
    save();
    cartPage();
  };
}
function field(name,label,required=false,type='text',max=150){return `<label>${label}${required?' *':''}<input name="${name}" type="${type}" ${required?'required':''} maxlength="${max}" ${name==='phone'||name==='alternatePhone'?'inputmode="tel" pattern="[6-9][0-9]{9}"':name==='pin'?'inputmode="numeric" pattern="[1-9][0-9]{5}"':''}></label>`;}
function checkout(){
  if(!lines().length){
    $('#checkout-content').innerHTML='<div class="empty"><h2>Add a little something first.</h2><a class="btn" href="catalogue.html">Shop the recipe</a></div>';
    return;
  }
  const renderCheckout = () => {
    const isInst = selectedFulfillment === 'installation';
    const fees = orderFees();
    $('#checkout-content').innerHTML=`<div class="checkout-grid"><form class="panel" id="delivery-form">
      <h2>Delivery & Fulfillment Details</h2>
      
      <div class="fulfillment-selector">
        <h3>Choose your fulfillment option</h3>
        <div class="fulfillment-options">
          <label class="fulfillment-card ${!isInst?'selected':''}" id="card-diy">
            <input type="radio" name="fulfilmentType" value="diy" ${!isInst?'checked':''}>
            <div class="card-body">
              <strong>Option A: Products Only — DIY</strong>
              <p>Purchase products only. Delivered safely across Delhi NCR with setup instructions.</p>
              <span class="fee-badge">Shipping: ${fees.shipFree?'FREE':money(fees.shippingPaise)}</span>
            </div>
          </label>
          <label class="fulfillment-card ${isInst?'selected':''}" id="card-installation">
            <input type="radio" name="fulfilmentType" value="installation" ${isInst?'checked':''}>
            <div class="card-body">
              <strong>Option B: Products + Professional Installation</strong>
              <p>Complete makeover: expert delivery, unboxing, styling and professional installation.</p>
              <span class="fee-badge">${fees.installFree?'Installation: FREE':'Installation: ₹500'} · Subject to service area</span>
            </div>
          </label>
        </div>
      </div>

      <div class="form-fields">
        ${field('name','Full name',true,'text',100)}
        ${field('phone','Mobile number',true,'tel',10)}
        ${field('email','Email (optional)',false,'email',120)}
        ${field('alternatePhone','Alternate mobile (optional)',false,'tel',10)}
        <label class="wide">House / flat, building and street *<textarea name="address" required minlength="8" maxlength="240" rows="3" autocomplete="street-address"></textarea></label>
        ${field('area','Area / locality',false,'text',150)}
        ${field('landmark','Landmark (optional)',false,'text',150)}
        ${field('city','City / town',true,'text',100)}
        ${field('pin','PIN code',true,'text',6)}
        <label>State / Union Territory *<select name="state" required><option value="">Choose state</option>${states.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
        <label class="wide">Delivery notes (optional)<textarea name="notes" maxlength="400" rows="2" placeholder="Gate access or delivery instructions"></textarea></label>
      </div>

      <h3>Payment method</h3>
      <p>◉ Cash on Delivery — pay when your confirmed order arrives.</p>
      
      <label class="check-label">
        <input type="checkbox" name="acknowledged" required>
        <span>I understand this is an order request, and availability, delivery coverage and delivery charges need confirmation before dispatch. I agree to be contacted on the mobile number provided about this order.</span>
      </label>
      
      ${isInst?`<label class="check-label" id="service-ack-label">
        <input type="checkbox" name="serviceAcknowledged" required>
        <span>I am requesting Balconia Professional Installation. With Diwali code BALCONIA: free shipping on orders ₹500+ and free installation on orders ₹1,000+; otherwise shipping ₹150 and installation ₹500 apply.</span>
      </label>`:''}

      <p class="note">Your delivery details are saved securely with your order and used to arrange fulfilment. They are not stored in this browser.</p>
      <p id="order-error" class="error" role="alert"></p>
      <button class="btn" id="place-order">${isInst?'Request Balconia makeover quote':'Place COD order request'}</button>
    </form>${summary('<a href="cart.html">Edit your bag</a>')}</div>`;

    bindCoupon(renderCheckout);
    window.BalconiaCoverage?.mount();

    $('#delivery-form').elements.city.value=window.BalconiaDelivery?.current?.city||'';
    $('#delivery-form').elements.state.value=window.BalconiaDelivery?.current?.state||'';
    window.BalconiaDelivery?.refresh();

    document.querySelectorAll('input[name="fulfilmentType"]').forEach(radio => {
      radio.onchange = () => {
        selectedFulfillment = radio.value;
        renderCheckout();
      };
    });

    $('#delivery-form').onsubmit=async e=>{
      e.preventDefault();
      const button=$('#place-order');
      button.disabled=true;
      button.textContent='Saving your order…';
      $('#order-error').textContent='';
      const fd=new FormData(e.target);
      const customer=Object.fromEntries([...fd.entries()].filter(([k])=>!['acknowledged','serviceAcknowledged','fulfilmentType'].includes(k)));
      let requestId=sessionStorage.getItem('balconia-order-request');
      if(!requestId){
        requestId=crypto.randomUUID();
        sessionStorage.setItem('balconia-order-request',requestId);
      }
      try{
        const response=await fetch('/api/orders',{
          method:'POST',
          headers:Object.assign({'Content-Type':'application/json'},await balconiaAuthHeaders()),
          body:JSON.stringify({
            requestId,
            customer,
            items:lines().map(x=>({id:x.id,quantity:x.quantity})),
            paymentMethod:'cod',
            deliveryAcknowledged:fd.has('acknowledged'),
            designId:designContext?.designId||null,
            fulfilmentType:selectedFulfillment,
            serviceAcknowledged:isInst ? fd.has('serviceAcknowledged') : true,
            couponCode:couponActive()?COUPON_CODE:null,
            fees:orderFees()
          })
        });
        const data=await response.json();
        if(!response.ok)throw Error(data.error||'Order could not be saved.');
        const receiptItems=lines().map(x=>`${x.p.name} × ${x.quantity}: ${money(x.p.pricePaise*x.quantity)}`);
        const feesSnap=orderFees();
        const shipLabel=feesSnap.shipFree?'FREE':money(feesSnap.shippingPaise);
        const installLabel=feesSnap.showInstall?(feesSnap.installFree?'FREE':money(feesSnap.installationPaise)):'';
        cart=[];
        save();
        sessionStorage.removeItem('balconia-order-request');
        sessionStorage.removeItem('balconia-design-context');
        $('#checkout-content').innerHTML=`<section class="panel receipt">
          <span class="eyebrow">YOUR REQUEST HAS BEEN SAVED</span>
          <h2>A little closer to your balcony moment.</h2>
          <p>Order reference: <strong>${esc(data.id)}</strong></p>
          <p>Fulfillment: <strong>${esc(data.fulfilmentLabel || (data.fulfilmentType==='installation'?'Option B: Products + Professional Installation':'Option A: Products Only — DIY'))}</strong></p>
          <p>Product subtotal: <strong>${money(data.subtotalPaise)}</strong></p>
          <p>Payment: <strong>Cash on Delivery</strong></p>
          <p>Shipping: <strong>${esc(data.fees?.shippingFree?'FREE':(data.fees?money(data.fees.shippingPaise):shipLabel))}</strong></p>
          ${feesSnap.showInstall?`<p>Installation: <strong>${esc(data.fees?.installationFree?'FREE':(data.fees?money(data.fees.installationPaise):installLabel))}</strong></p>`:''}
          <p>Estimated total: <strong>${money(data.totalPaise || (data.subtotalPaise + (data.fees?.shippingPaise||feesSnap.shippingPaise) + (feesSnap.showInstall?(data.fees?.installationPaise||feesSnap.installationPaise):0)))}</strong></p>
          <p class="delivery-note">${esc(data.fees?.note||feesSnap.note)}</p>
          <p class="note">Keep this reference. ${isInst?'Your makeover request is awaiting an itemised service quote and availability review.':'Your request is awaiting confirmation before dispatch.'}</p>
          <button class="btn" id="download-pdf-receipt">Download PDF Receipt</button> <a class="btn secondary" href="catalogue.html">Back to shop</a>
        </section>`;
        $('#download-pdf-receipt').onclick=async e=>{
          e.preventDefault();
          const btn=$('#download-pdf-receipt');
          btn.disabled=true;
          btn.textContent='Preparing PDF…';
          try{
            const headers=await balconiaAuthHeaders();
            const res=await fetch(`/api/orders/${encodeURIComponent(data.id)}/receipt?download=1`,{headers});
            if(!res.ok)throw new Error('PDF receipt unavailable');
            const blob=await res.blob();
            const url=URL.createObjectURL(blob);
            const a=document.createElement('a');
            a.href=url;
            a.download=`Balconia-Receipt-${data.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(()=>URL.revokeObjectURL(url),2000);
            btn.textContent='Download PDF Receipt';
            btn.disabled=false;
            const token=await window.BalconiaAuth?.getAccessToken?.().catch(()=>'');
            const tokenParam=token?`&token=${encodeURIComponent(token)}`:'';
            window.open(`/api/orders/${encodeURIComponent(data.id)}/receipt?download=1${tokenParam}`,'_blank');
          }catch(err){
            btn.disabled=false;
            btn.textContent='Download PDF Receipt';
            toast(err.message||'Receipt download unavailable right now.');
          }
        };
      }catch(error){
        $('#order-error').textContent=error.message||'Connection failed. Please try again; your bag is safe.';
        button.disabled=false;
        button.textContent=isInst?'Request Balconia makeover quote':'Place COD order request';
      }
    };
  };
  renderCheckout();
}
save();try{await window.BalconiaDelivery.ready;let r;try{r=await fetch('/api/products?t='+Date.now(),{cache:'no-cache'});if(!r.ok)throw Error();}catch{r=await fetch('shop-data.json?v=catalogue-20261016',{cache:'no-cache'});}if(!r.ok)throw Error();products=await r.json();cart=cart.filter(x=>products.some(p=>p.id===x.id&&p.pricePaise!==null));save();({shop,cart:cartPage,checkout})[document.body.dataset.page]();if(products.some(p=>p.id===location.hash.slice(1)))detail(location.hash.slice(1));}catch{const container=$('#products')||$('#cart-content')||$('#checkout-content');container.innerHTML='<p class="error">We could not load the shop. Please check your connection and <a href="">try again</a>.</p>';}

window.addEventListener('hashchange',()=>{
  const h=location.hash.slice(1);
  if(h&&products.some(p=>p.id===h))detail(h);
});

document.addEventListener('click',e=>{
  const v=e.target.closest('[data-view]');
  if(v&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&e.button===0){
    e.preventDefault();
    detail(v.dataset.view);
    return;
  }
  const closeBtn=e.target.closest('#product-dialog .close,[data-dialog-close]');
  if(closeBtn){
    e.preventDefault();
    const d=$('#product-dialog');
    if(d&&d.open)d.close();
    return;
  }
  const dialog=$('#product-dialog');
  if(dialog&&dialog.open&&e.target===dialog){
    dialog.close();
    return;
  }
});
