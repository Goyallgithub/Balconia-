(()=>{
  const KEY='balconia-diwali-flash-dismissed';
  try{if(sessionStorage.getItem(KEY)==='1')return;}catch{}
  const bar=document.createElement('div');
  bar.className='promo-flash diwali-flash';
  bar.setAttribute('role','region');
  bar.setAttribute('aria-label','Diwali offer');
  bar.innerHTML=`<div class="promo-flash-inner">
      <span class="diwali-flash-mark" aria-hidden="true">✦</span>
      <span>Use code <span class="promo-code">BALCONIA</span> this Diwali — free shipping on orders ₹500+ · free installation on orders ₹1,000+</span>
      <a href="diwali.html">Shop festive combos ↗</a>
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
