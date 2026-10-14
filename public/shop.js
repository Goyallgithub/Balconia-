
async function balconiaAuthHeaders(){try{if(window.BalconiaAuth?.getAccessToken){const t=await window.BalconiaAuth.getAccessToken();if(t)return{Authorization:'Bearer '+t};}}catch{}return{};}
import {states} from './states.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(n/100),key='balconia-bag-v1';
let products=[],cart=[];try{const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))cart=saved.filter(x=>typeof x.id==='string'&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=20);}catch{}
let designContext=null;try{designContext=JSON.parse(sessionStorage.getItem('balconia-design-context')||'null');}catch{}
const managed=designContext?.fulfilmentType==='balconia';
const installationItem=p=>p.fulfilmentMode==='installation-required'||p.requiresInstallation===true;
const fulfilmentLabel=p=>`<span class="fulfilment-label">${installationItem(p)?'Requires installation · 15 km city coverage':'Delivery-only product · Delhi NCR delivery; installation not included'}</span>`;
const names={plants:'Greenery & pots',lights:'Warm light',flooring:'Underfoot',furniture:'Comfort',decor:'Finishing touches'};
const COUPON_CODE='BALCONIA';
const DIY_FREE_SHIP_PAISE=500000;       // ₹5,000
const MAKEOVER_FREE_SHIP_PAISE=1500000; // ₹15,000
const couponKey='balconia-coupon-v1';
let appliedCoupon='';
try{appliedCoupon=String(sessionStorage.getItem(couponKey)||'').toUpperCase();}catch{}
const toast=t=>{const el=$('#toast');el.textContent=t;el.style.display='block';clearTimeout(window.toastTimer);window.toastTimer=setTimeout(()=>el.style.display='none',2800);};
function save(){try{localStorage.setItem(key,JSON.stringify(cart));}catch{toast('Your browser cannot save the bag between visits.');}document.querySelectorAll('[data-cart-count]').forEach(e=>e.textContent=cart.reduce((s,x)=>s+x.quantity,0));}
const lines=()=>cart.map(x=>({...x,p:products.find(p=>p.id===x.id)})).filter(x=>x.p&&x.p.pricePaise!==null),subtotal=()=>lines().reduce((n,x)=>n+x.p.pricePaise*x.quantity,0);
function couponActive(){return appliedCoupon===COUPON_CODE;}
function shippingOffer(){
  const total=subtotal();
  const threshold=managed?MAKEOVER_FREE_SHIP_PAISE:DIY_FREE_SHIP_PAISE;
  const qualified=total>=threshold;
  const active=couponActive()&&qualified;
  const need=Math.max(0,threshold-total);
  if(managed){
    return {
      active,
      qualified,
      threshold,
      need,
      label:active?'Free shipping & installation':'Shipping & installation',
      value:active?'FREE':'Quoted separately',
      note:active
        ?'Coupon BALCONIA applied · free shipping and installation on this makeover (product subtotal ₹15,000+).'
        :couponActive()
          ?`Add ${money(need)} more to unlock free shipping & installation with BALCONIA.`
          :'Apply code BALCONIA · free shipping & installation on makeovers ₹15,000+.'
    };
  }
  return {
    active,
    qualified,
    threshold,
    need,
    label:active?'Shipping':'Shipping',
    value:active?'FREE':'To be confirmed',
    note:active
      ?'Coupon BALCONIA applied · free shipping on this bag (₹5,000+).'
      :couponActive()
        ?`Add ${money(need)} more to unlock free shipping with BALCONIA.`
        :'Apply code BALCONIA · free shipping on DIY orders ₹5,000+.'
  };
}
function couponBox(){
  const offer=shippingOffer();
  return `<div class="coupon-box">
    <label for="coupon-code">Coupon code</label>
    <div class="coupon-row">
      <input id="coupon-code" type="text" maxlength="24" placeholder="e.g. BALCONIA" value="${esc(appliedCoupon)}" autocomplete="off" aria-label="Coupon code">
      <button type="button" class="btn secondary" id="apply-coupon">${couponActive()?'Applied':'Apply'}</button>
    </div>
    <p class="coupon-msg ${couponActive()?(offer.active?'is-ok':'is-warn'):''}" id="coupon-msg">${esc(offer.note)}</p>
  </div>`;
}
function bindCoupon(rerender){
  const apply=()=>{
    const raw=($('#coupon-code')?.value||'').trim().toUpperCase();
    if(!raw){appliedCoupon='';try{sessionStorage.removeItem(couponKey);}catch{}toast('Coupon cleared');rerender();return;}
    if(raw!==COUPON_CODE){toast('That coupon is not valid. Try BALCONIA.');return;}
    appliedCoupon=COUPON_CODE;
    try{sessionStorage.setItem(couponKey,appliedCoupon);}catch{}
    toast(shippingOffer().active?'BALCONIA applied — free shipping unlocked':'BALCONIA applied — add a little more to unlock free shipping');
    rerender();
  };
  $('#apply-coupon')?.addEventListener('click',apply);
  $('#coupon-code')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();apply();}});
}
function add(id){const p=products.find(p=>p.id===id);if(!p||p.pricePaise===null)return;const x=cart.find(x=>x.id===id);if(x&&x.quantity>=20)return toast('Maximum 20 per product.');if(x)x.quantity++;else cart.push({id,quantity:1});sessionStorage.removeItem('balconia-order-request');save();toast('Added to your bag');}
function image(p,i=0){const a=p.images[i];return `<img ${(p.thumbnailOnly||p.cataloguePreview)?`class="${p.cataloguePreview?'planter-preview':'catalogue-thumbnail'}" style="--source-width:${a.width}px;--source-height:${a.height}px;--source-ratio:${a.width}/${a.height}"`:""} src="${esc(a.src)}" width="${a.width}" height="${a.height}" loading="lazy" alt="${esc(p.name)} — ${esc(a.label)}">`;}
function price(p){return p.pricePaise===null?'<div class="price">Price on request</div>':`<div class="price"><strong>${money(p.pricePaise)}</strong>${p.mrpPaise? (p.planterOnly&&p.mrpPaise===p.pricePaise?`<span class="note">MRP ${money(p.mrpPaise)}</span>`:`<del>MRP ${money(p.mrpPaise)}</del>`):''}${p.discount?`<span class="discount">${p.discount}% off</span>`:''}</div>`;}
const plantNote=p=>p.planterOnly?'Planter only · plants not included':p.aiEnhanced?'5 × 7 ft · AI-enhanced product illustration':p.thumbnailOnly?'Catalogue preview · 5 × 7 ft':p.plantOnly?'Plant price only · decorative pot extra':'';
function deliveryNote(){
  const offer=shippingOffer();
  if(managed){
    return `<p class="delivery-note"><strong>Balconia makeover request.</strong> Product subtotal is shown below. ${offer.active?'Shipping and installation are <strong>FREE</strong> with coupon BALCONIA on this bag.':'Installation, labour and delivery are quoted separately unless coupon BALCONIA unlocks free shipping &amp; installation (₹15,000+).'}</p><p class="delivery-note">Cash on Delivery for products. Coverage confirmed for Delhi NCR. No online payment is collected at this step.</p>`;
  }
  return `<p class="delivery-note">${offer.active?'<strong>Free shipping</strong> unlocked with coupon BALCONIA on this bag (₹5,000+).':'Shipping charges are confirmed before dispatch unless coupon BALCONIA unlocks free shipping (₹5,000+).'} Cash on Delivery only. Delivery limited to verified Delhi NCR addresses.</p>`;
}
function modelOptions(p){if(!p.catalogueGroup)return '';const group=products.filter(x=>x.catalogueGroup===p.catalogueGroup),sizes=[...new Set(group.map(x=>x.variantSize))],colours=[...new Set(group.map(x=>x.colour))];return `<div class="planter-options"><label>Size<select data-planter-size>${sizes.map(x=>`<option ${x===p.variantSize?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>Finish<select data-planter-colour>${colours.map(x=>`<option ${x===p.colour?'selected':''}>${esc(x)}</option>`).join('')}</select></label></div><p class="note">Vendor SKU: ${esc(p.vendorSku)} · No discount applied. Plants are not included.</p>`;}
function shop(){let category=new URLSearchParams(location.search).get('category')||'all';if(!names[category])category='all';const draw=()=>{$('#products').classList.toggle('underfoot-grid',category==='flooring');let items=products.filter(p=>(category==='all'||p.category===category)&&(p.name+' '+p.description).toLowerCase().includes($('#search').value.toLowerCase()));const seen=new Set();items=items.filter(p=>{const key=p.catalogueGroup||p.id;if(seen.has(key))return false;seen.add(key);return true;});if($('#sort').value!=='featured')items.sort((a,b)=>a.pricePaise===null&&b.pricePaise===null?0:a.pricePaise===null?1:b.pricePaise===null?-1:$('#sort').value==='low'?a.pricePaise-b.pricePaise:b.pricePaise-a.pricePaise);$('#result-count').textContent=`${items.length} thoughtful pieces · Prices in INR`;$('#products').innerHTML=items.length?items.map(p=>`<article class="product-card"><button class="photo-button" data-view="${esc(p.id)}" aria-label="View ${esc(p.name)}">${image(p)}<span class="tag">${esc(names[p.category])}</span></button><h3><a href="#${esc(p.id)}" data-view="${esc(p.id)}">${esc(p.modelName||p.name)}</a></h3><p class="description">${esc(p.description.split('\n')[0])}</p>${p.catalogueGroup?'<p class="note">From</p>':''}${price(p)}${fulfilmentLabel(p)}<p class="note">${plantNote(p)}</p>${p.catalogueGroup?`<button class="btn" data-view="${esc(p.id)}">Choose size & finish</button>`:p.pricePaise===null?`<button class="btn secondary" data-view="${esc(p.id)}">See details · price pending</button>`:`<button class="btn" data-add="${esc(p.id)}">Add to bag</button>`}</article>`).join(''):'<p>No products found. Try another search.</p>';};const tabs=()=>{$('#categories').innerHTML=Object.entries({all:'All pieces',...names}).map(([k,v])=>`<button data-category="${k}" class="${category===k?'active':''}" aria-pressed="${category===k}">${v}</button>`).join('');};tabs();draw();$('#categories').onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;history.replaceState(null,'',category==='all'?'catalogue.html':'?category='+category);tabs();draw();};$('#search').oninput=draw;$('#sort').onchange=draw;$('#products').onclick=e=>{const a=e.target.closest('[data-add]'),v=e.target.closest('[data-view]');if(a)add(a.dataset.add);if(v){e.preventDefault();detail(v.dataset.view);}};$('.close').onclick=()=>$('#product-dialog').close();}
function detail(id){if(document.body.classList.contains('pin-locked'))return;const p=products.find(p=>p.id===id);if(!p)return;$('#product-detail').innerHTML=`<div class="detail-layout"><div><div class="gallery-main">${image(p)}</div><div class="thumbs">${p.images.map((a,i)=>`<button data-image="${i}" class="${i===0?'selected':''}" aria-label="View photo ${i+1}">${image(p,i)}</button>`).join('')}</div></div><div class="detail-copy"><span class="mini-label">${esc(names[p.category])} · ${esc(p.id)}</span><h2>${esc(p.modelName||p.name)}</h2>${modelOptions(p)}${price(p)}${fulfilmentLabel(p)}${!p.mrpPaise&&p.pricePaise!==null?'<p class="note">MRP: Not supplied · Discount: Not supplied. Selling price shown above.</p>':''}${p.cataloguePreview?'<p class="note">First photo: high-resolution AI-generated planter-only illustration based on the catalogue. Other photos are original catalogue previews. Photos show finish examples, not a separate photograph for each size and colour.</p>':''}${p.aiEnhanced?'<p class="note">AI-enhanced product illustrations based on the catalogue. Fine pattern details may vary; confirm the supplied carpet before dispatch.</p>':''}${p.thumbnailOnly?'<p class="note">Catalogue preview enlarged for browsing. Full-resolution photographs are still awaited.</p>':''}${p.plantOnly?'<p class="delivery-note">Price is for the plant in its supplied nursery pot/bag. The decorative planter shown in styled photos is not included. Plant size and appearance may vary; confirm planter options before dispatch.</p>':''}<p class="full-description">${esc(p.description)}</p>${p.size?`<p><strong>Dimensions:</strong> ${esc(p.size)}</p>`:''}${p.light?`<p><strong>Light:</strong> ${esc(p.light)}</p>`:''}<p class="note">Styled catalogue photographs are illustrative. Confirm finish, dimensions and included items before dispatch.</p>${p.pricePaise!==null?`<button class="btn" data-add="${esc(p.id)}">Add to bag · ${money(p.pricePaise)}</button>`:'<p class="delivery-note">Price and availability need confirmation. This item cannot be ordered yet.</p>'}<p class="delivery-status" data-delivery-status></p>${deliveryNote()}</div></div>`;$('#product-detail').onclick=e=>{const b=e.target.closest('[data-image]'),a=e.target.closest('[data-add]');if(b){$('.gallery-main').innerHTML=image(p,Number(b.dataset.image));document.querySelectorAll('.thumbs button').forEach(x=>x.classList.toggle('selected',x===b));}if(a)add(a.dataset.add);};$('#product-detail').onchange=e=>{if(!e.target.matches('[data-planter-size],[data-planter-colour]'))return;const size=$('[data-planter-size]').value,colour=$('[data-planter-colour]').value,selector=e.target.matches('[data-planter-size]')?'[data-planter-size]':'[data-planter-colour]',variant=products.find(x=>x.catalogueGroup===p.catalogueGroup&&x.variantSize===size&&x.colour===colour);if(variant){detail(variant.id);$(selector)?.focus();}};window.BalconiaDelivery?.refresh();if(!$('#product-dialog').open)$('#product-dialog').showModal();}
function summary(button=''){
  const offer=shippingOffer();
  return `<aside class="panel summary"><h2>Your order</h2>${lines().map(x=>`<div class="total-row"><span>${esc(x.p.name)} × ${x.quantity}</span><strong>${money(x.p.pricePaise*x.quantity)}</strong></div>`).join('')}<hr><div class="total-row"><strong>Product subtotal</strong><strong>${money(subtotal())}</strong></div><div class="total-row shipping-row ${offer.active?'is-free':''}"><span>${esc(offer.label)}</span><strong>${esc(offer.value)}</strong></div>${couponBox()}<p class="shipping-threshold note">${managed?`Makeover free shipping &amp; installation from ${money(MAKEOVER_FREE_SHIP_PAISE)} with code BALCONIA.`:`DIY free shipping from ${money(DIY_FREE_SHIP_PAISE)} with code BALCONIA.`}</p>${deliveryNote()}${button}</aside>`;
}
function cartPage(){
  if(!lines().length){$('#cart-content').innerHTML='<div class="empty"><h2>Your bag is waiting for a little magic.</h2><a class="btn" href="catalogue.html">Explore the shop</a></div>';return;}
  $('#cart-content').innerHTML=`<div class="checkout-grid"><section>
    <div class="cart-offer-banner ${shippingOffer().active?'is-unlocked':''}">
      <strong>${shippingOffer().active?'Offer unlocked':'Almost there'}</strong>
      <p>${esc(shippingOffer().note)}</p>
    </div>
    ${lines().map(x=>`<article class="cart-item">${image(x.p)}<div><h3>${esc(x.p.name)}</h3><p class="note">${plantNote(x.p)}</p><div class="quantity"><button data-qty="${esc(x.id)}" data-delta="-1" aria-label="Reduce quantity">−</button><span>${x.quantity}</span><button data-qty="${esc(x.id)}" data-delta="1" aria-label="Increase quantity">+</button></div> <button class="remove" data-remove="${esc(x.id)}">Remove</button></div><strong>${money(x.p.pricePaise*x.quantity)}</strong></article>`).join('')}
    <p><a href="catalogue.html">← Continue exploring</a></p>
  </section>${summary('<a class="btn" href="checkout.html">Checkout · Cash on Delivery</a>')}</div>`;
  bindCoupon(cartPage);
  $('#cart-content').onclick=e=>{
    if(e.target.closest('#apply-coupon')||e.target.closest('#coupon-code'))return;
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
function checkout(){if(!lines().length){$('#checkout-content').innerHTML='<div class="empty"><h2>Add a little something first.</h2><a class="btn" href="catalogue.html">Shop the recipe</a></div>';return;}$('#checkout-content').innerHTML=`<div class="checkout-grid"><form class="panel" id="delivery-form"><h2>${managed?'Makeover request details':'Delivery details'}</h2><div class="form-fields">${field('name','Full name',true,'text',100)}${field('phone','Mobile number',true,'tel',10)}${field('email','Email (optional)',false,'email',120)}${field('alternatePhone','Alternate mobile (optional)',false,'tel',10)}<label class="wide">House / flat, building and street *<textarea name="address" required minlength="8" maxlength="240" rows="3" autocomplete="street-address"></textarea></label>${field('area','Area / locality',false,'text',150)}${field('landmark','Landmark (optional)',false,'text',150)}${field('city','City / town',true,'text',100)}${field('pin','PIN code',true,'text',6)}<label>State / Union Territory *<select name="state" required><option value="">Choose state</option>${states.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label><label class="wide">Delivery notes (optional)<textarea name="notes" maxlength="400" rows="2" placeholder="Gate access or delivery instructions"></textarea></label></div>${managed?'<div class="coverage-switch"><p>Outside the installation area? You can order these products for DIY setup if city delivery is available.</p><button type="button" id="switch-to-products">Continue with products only</button></div>':''}<h3>Payment method</h3><p>◉ Cash on Delivery — pay when your confirmed order arrives.</p><label class="check-label"><input type="checkbox" name="acknowledged" required><span>I understand this is an order request, and availability, delivery coverage and delivery charges need confirmation before dispatch. I agree to be contacted on the mobile number provided about this order.</span></label>${managed?'<label class="check-label"><input type="checkbox" name="serviceAcknowledged" required><span>I am requesting a Balconia makeover quotation. With coupon BALCONIA and product subtotal ₹15,000+, shipping &amp; installation are free; otherwise they are quoted before confirmation.</span></label>':''}<p class="note">Your delivery details are saved securely with your order and used to arrange fulfilment. They are not stored in this browser.</p><p id="order-error" class="error" role="alert"></p><button class="btn" id="place-order">${managed?'Request Balconia makeover quote':'Place COD order request'}</button></form>${summary('<a href="cart.html">Edit your bag</a>')}</div>`;bindCoupon(checkout);window.BalconiaCoverage?.mount();if($('#switch-to-products'))$('#switch-to-products').onclick=()=>{sessionStorage.setItem('balconia-design-context',JSON.stringify({...designContext,fulfilmentType:'diy'}));location.reload();};$('#delivery-form').elements.city.value=window.BalconiaDelivery?.current?.city||'';$('#delivery-form').elements.state.value=window.BalconiaDelivery?.current?.state||'';window.BalconiaDelivery?.refresh();$('#delivery-form').onsubmit=async e=>{e.preventDefault();const button=$('#place-order');button.disabled=true;button.textContent='Saving your order…';$('#order-error').textContent='';const fd=new FormData(e.target),customer=Object.fromEntries([...fd.entries()].filter(([k])=>!['acknowledged','serviceAcknowledged'].includes(k)));let requestId=sessionStorage.getItem('balconia-order-request');if(!requestId){requestId=crypto.randomUUID();sessionStorage.setItem('balconia-order-request',requestId);}try{const response=await fetch('/api/orders',{method:'POST',headers:Object.assign({'Content-Type':'application/json'},await balconiaAuthHeaders()),body:JSON.stringify({requestId,customer,items:lines().map(x=>({id:x.id,quantity:x.quantity})),paymentMethod:'cod',deliveryAcknowledged:fd.has('acknowledged'),designId:designContext?.designId||null,fulfilmentType:managed?'balconia':'diy',serviceAcknowledged:fd.has('serviceAcknowledged'),couponCode:couponActive()?COUPON_CODE:null,shippingOffer:shippingOffer()})});const data=await response.json();if(!response.ok)throw Error(data.error||'Order could not be saved.');const receiptItems=lines().map(x=>`${x.p.name} × ${x.quantity}: ${money(x.p.pricePaise*x.quantity)}`);const offerSnap=shippingOffer();const shipLabel=offerSnap.value;const couponSnap=couponActive()?COUPON_CODE:'';cart=[];save();sessionStorage.removeItem('balconia-order-request');sessionStorage.removeItem('balconia-design-context');$('#checkout-content').innerHTML=`<section class="panel receipt"><span class="eyebrow">YOUR REQUEST HAS BEEN SAVED</span><h2>A little closer to your balcony moment.</h2><p>Order reference: <strong>${esc(data.id)}</strong></p><p>Product subtotal: <strong>${money(data.subtotalPaise)}</strong></p><p>Payment: <strong>Cash on Delivery</strong></p><p>Shipping: <strong>${esc(shipLabel)}</strong>${couponSnap?` · coupon ${couponSnap}`:''}</p><p class="delivery-note">${esc(offerSnap.note)}</p><p class="note">Keep this reference. ${managed?'Your makeover request is awaiting an itemised service quote and availability review.':'Your request is awaiting confirmation before dispatch.'}</p><button class="btn" id="download-receipt">Save order receipt</button> <a class="btn secondary" href="catalogue.html">Back to shop</a></section>`;$('#download-receipt').onclick=()=>{const blob=new Blob([`Balconia order request\nReference: ${data.id}\nStatus: ${managed?'awaiting service quotation':'awaiting confirmation'}\n${receiptItems.join('\n')}\nProduct subtotal: ${money(data.subtotalPaise)}\nCash on Delivery\nShipping: ${shipLabel}${couponSnap?' · coupon '+couponSnap:''}\n${offerSnap.note}\nDelivery coverage confirmed for Delhi NCR before dispatch.`],{type:'text/plain'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=data.id+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};}catch(error){$('#order-error').textContent=error.message||'Connection failed. Please try again; your bag is safe.';button.disabled=false;button.textContent=managed?'Request Balconia makeover quote':'Place COD order request';}};}
save();try{await window.BalconiaDelivery.ready;const r=await fetch('shop-data.json?v=prices-20261012');if(!r.ok)throw Error();products=await r.json();cart=cart.filter(x=>products.some(p=>p.id===x.id&&p.pricePaise!==null));save();({shop,cart:cartPage,checkout})[document.body.dataset.page]();if(document.body.dataset.page==='shop'&&products.some(p=>p.id===location.hash.slice(1)))detail(location.hash.slice(1));}catch{const container=$('#products')||$('#cart-content')||$('#checkout-content');container.innerHTML='<p class="error">We could not load the shop. Please check your connection and <a href="">try again</a>.</p>';}
