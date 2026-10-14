(()=>{
  const KEY='balconia-promo-flash-dismissed';
  try{if(sessionStorage.getItem(KEY)==='1')return;}catch{}
  const bar=document.createElement('div');
  bar.className='promo-flash';
  bar.setAttribute('role','region');
  bar.setAttribute('aria-label','Shipping offer');
  bar.innerHTML=`<div class="promo-flash-inner">
      <span>Use code <span class="promo-code">BALCONIA</span></span>
      <span>Free shipping on DIY orders ₹5,000+ · Free shipping &amp; installation on makeovers ₹15,000+</span>
      <a href="catalogue.html">Shop now ↗</a>
    </div>
    <button type="button" class="promo-flash-close" aria-label="Dismiss offer">×</button>`;
  document.documentElement.classList.add('promo-flash-on');
  const mount=()=>{
    if(document.body){
      document.body.prepend(bar);
    }else{
      document.addEventListener('DOMContentLoaded',()=>document.body.prepend(bar),{once:true});
    }
  };
  mount();
  bar.querySelector('.promo-flash-close').onclick=()=>{
    bar.remove();
    document.documentElement.classList.remove('promo-flash-on');
    try{sessionStorage.setItem(KEY,'1');}catch{}
  };
})();
