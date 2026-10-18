const concepts=[
{id:'chai',image:'balcony.jpg',name:'The Chai Club',group:'slow',tag:'Coffee & tea corner',symbol:'☕',color:'#e9ddc8',ink:'#7b593c',story:'Two cups. A fresh breeze. A slower start before the world wakes up.',items:['Compact bistro table and one or two chairs','Potted greenery matched to your sunlight','Outdoor mat and a tray for your daily tea ritual'],layout:'Place a small table along the wall with movable chairs. Keep door swing and the main walkway clear.',light:'Soft ambient lighting for early mornings and evenings.'},
{id:'read',image:'read.jpg',name:'One More Chapter',group:'quiet',tag:'Reading nook',symbol:'❧',color:'#dbe2d3',ink:'#49613d',story:'A comfortable seat, a leafy view, and absolutely nowhere to rush.',items:['Comfortable compact chair with a supportive cushion','Small side table for your book and cup','A leafy plant grouping in coordinated pots'],layout:'Use the sheltered end of the balcony for the chair. Check comfort, glare and rain exposure.',light:'A suitable task light for reading, with fairy lights for atmosphere.'},
{id:'party',image:'party.jpg',name:'The Golden Hour Club',group:'social',tag:'Party lounge',symbol:'✷',color:'#e9d2b9',ink:'#8a4f32',story:'Good company, little bites, and conversations that outlast the sunset.',items:['Space-efficient movable seating and a snack table','Warm fairy lights and outdoor matting','A restrained plant grouping and decorative serving tray'],layout:'Plan for the actual guest count and comfortable circulation. Small balconies suit an intimate hangout.',light:'Warm string lights fixed within your balcony boundary.'},
{id:'zen',image:'zen.jpg',name:'The Quiet Hour',group:'quiet',tag:'Meditation space',symbol:'◉',color:'#dddccf',ink:'#656750',story:'A gentle pause. A deep breath. A small green space to come back to yourself.',items:['Comfortable floor cushion or low seat','A clean outdoor mat on a dry, even surface','A few plants and a simple decorative accent'],layout:'Keep the centre open and position plants along the wall. Protect seating from damp and rain.',light:'Gentle indirect lighting; uncluttered views and soft colours.'},
{id:'date',image:'date.jpg',name:'Just Us, Outside',group:'social',tag:'Romantic date space',symbol:'♡',color:'#e8d6d1',ink:'#8a5b50',story:'Your favourite table for two. No reservation, no commute, just you.',items:['Table for two with comfortable compact chairs','Fairy lights, battery candles and a decorative vase','Layered plants, cushions and outdoor matting'],layout:'Angle seating toward each other while leaving a clear route to the door.',light:'A warm pendant under a sheltered ceiling, plus soft accent lights.'},
{id:'music',image:'music.jpg',name:'The Listening Room',group:'quiet',tag:'Music corner',symbol:'♫',color:'#d8dfdb',ink:'#496359',story:'Your favourite playlist, a comfortable corner, and an evening that feels like yours.',items:['A lounge chair or compact floor seating','Small side table and a plant grouping','Warm lighting, outdoor matting and textured cushions'],layout:'Set seating near the sheltered wall; headphones work well for a personal listening ritual.',light:'Low ambient light for a relaxed evening; protect devices from weather.'},
{id:'garden',image:'garden.jpg',name:'Mint to Be',group:'green',tag:'Herb & kitchen garden',symbol:'❧',color:'#e1e4ce',ink:'#546644',story:'A few leaves for your chai. A new reason to step outside every morning.',items:['Herb pots with drainage and plant saucers','A compact plant stand with room to access each pot','A comfortable folding chair for your morning garden ritual'],layout:'Place herbs where their light requirements are met. Keep drainage clear, and allow space to water and harvest.',light:'Natural light comes first; choose edible plants after checking actual sun exposure.'}];
const galleries=window.BALCONIA_GALLERIES;
const cards=document.getElementById('cards');
cards.innerHTML=concepts.map((c,i)=>{const design=galleries[c.id];return `<article class="card" data-group="${c.group}" data-nook="${c.id}"><button type="button" class="card-art experience-art" data-concept="${c.id}" aria-label="Explore ${c.name}"><img src="${design.image}" alt="${design.alt}" width="${design.width}" height="${design.height}" loading="lazy" decoding="async"><span class="number">NOOK / 0${i+1}</span></button><div class="card-content"><span class="tag">${c.tag}</span><h3>${c.name}</h3><p>${c.story}</p><button data-concept="${c.id}" aria-label="Explore ${c.name}">Explore this moment <span>↗</span></button></div></article>`}).join('');
const mood=document.getElementById('mood');mood.innerHTML=concepts.map(c=>`<option value="${c.id}">${c.tag}</option>`).join('');
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-pressed',String(x===b))});document.querySelectorAll('.card').forEach(x=>x.hidden=b.dataset.filter!=='all'&&x.dataset.group!==b.dataset.filter)}));
const dialog=document.getElementById('concept-dialog');cards.addEventListener('click',e=>{const b=e.target.closest('[data-concept]');if(!b)return;const c=concepts.find(x=>x.id===b.dataset.concept);document.getElementById('dialog-content').innerHTML=`<span class="eyebrow">${c.tag}</span><h2>${c.name}</h2><img class="experience-dialog-image" src="${galleries[c.id].image}" alt="${galleries[c.id].alt}" width="${galleries[c.id].width}" height="${galleries[c.id].height}"><p>${c.story}</p><h3>Catalogue pieces for this nook</h3><ul class="nook-product-list">${galleries[c.id].products.map(p=>`<li><a href="catalogue.html#${p.id}">${p.name} ↗</a></li>`).join('')}</ul><h3>Bring the moment to life</h3><ul>${c.items.map(x=>`<li>${x}</li>`).join('')}</ul><p><b>Layout idea:</b> ${c.layout}</p><p><b>Lighting:</b> ${c.light}</p><p class="footnote">AI-created design illustration using catalogue references. Product details and placement need a site-specific plan. Decorative planters are separate from plant prices. ${c.id==='garden'?'Herb varieties are selected separately; the listed plants shown here are ornamental.':''}</p><button class="button" id="choose">Make this my starting point ↗</button><button type="button" class="button small" data-makeover-check>Check Makeover Availability ↗</button>`;dialog.showModal();document.getElementById('choose').onclick=()=>{mood.value=c.id;dialog.close();document.getElementById('quiz').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});mood.focus({preventScroll:true})};});dialog.querySelector('.close').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});

const lengthInput=document.getElementById('length'),widthInput=document.getElementById('width');
[lengthInput,widthInput].forEach(x=>x.addEventListener('input',()=>{const l=Number(lengthInput.value),w=Number(widthInput.value);document.getElementById('area-note').textContent=l>0&&w>0?'Your balcony: '+(l*w).toFixed(1)+' sq ft. Door swing and usable width still matter.':'Exact dimensions help us think beyond square footage.'}));

function initMobileSliders(){
  const cardsEl=document.getElementById('cards');
  const cardsPrev=document.getElementById('cards-prev');
  const cardsNext=document.getElementById('cards-next');
  const cardsDots=document.getElementById('cards-dots');

  function updateCardsSlider(){
    if(!cardsEl||!cardsDots)return;
    const visibleCards=[...cardsEl.querySelectorAll('.card:not([hidden])')];
    cardsDots.innerHTML='';
    if(visibleCards.length<=1){
      if(cardsPrev)cardsPrev.style.display='none';
      if(cardsNext)cardsNext.style.display='none';
      return;
    }
    if(cardsPrev)cardsPrev.style.display='';
    if(cardsNext)cardsNext.style.display='';

    visibleCards.forEach((c,idx)=>{
      const dot=document.createElement('button');
      dot.type='button';
      dot.className='slider-dot'+(idx===0?' active':'');
      dot.setAttribute('aria-label',`Go to slide ${idx+1}`);
      dot.onclick=()=>c.scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'});
      cardsDots.appendChild(dot);
    });
    syncCardsActiveDot();
  }

  function syncCardsActiveDot(){
    if(!cardsEl||!cardsDots)return;
    const visibleCards=[...cardsEl.querySelectorAll('.card:not([hidden])')];
    if(!visibleCards.length)return;
    const scrollLeft=cardsEl.scrollLeft;
    let closestIndex=0,minDiff=Infinity;
    visibleCards.forEach((c,i)=>{
      const diff=Math.abs(c.offsetLeft-cardsEl.offsetLeft-scrollLeft);
      if(diff<minDiff){minDiff=diff;closestIndex=i;}
    });
    const dots=cardsDots.querySelectorAll('.slider-dot');
    dots.forEach((d,i)=>d.classList.toggle('active',i===closestIndex));
    if(cardsPrev)cardsPrev.disabled=scrollLeft<=4;
    if(cardsNext)cardsNext.disabled=scrollLeft>=cardsEl.scrollWidth-cardsEl.clientWidth-4;
  }

  if(cardsEl){
    cardsEl.addEventListener('scroll',syncCardsActiveDot,{passive:true});
    if(cardsPrev){
      cardsPrev.onclick=()=>{
        const firstCard=cardsEl.querySelector('.card:not([hidden])');
        const scrollAmount=firstCard?(firstCard.offsetWidth+16):280;
        cardsEl.scrollBy({left:-scrollAmount,behavior:'smooth'});
      };
    }
    if(cardsNext){
      cardsNext.onclick=()=>{
        const firstCard=cardsEl.querySelector('.card:not([hidden])');
        const scrollAmount=firstCard?(firstCard.offsetWidth+16):280;
        cardsEl.scrollBy({left:scrollAmount,behavior:'smooth'});
      };
    }
    updateCardsSlider();
  }

  document.querySelectorAll('[data-filter]').forEach(b=>{
    b.addEventListener('click',()=>{
      cardsEl.scrollTo({left:0,behavior:'instant'});
      setTimeout(updateCardsSlider,60);
    });
  });

  const stepsEl=document.querySelector('.steps');
  const stepsPrev=document.getElementById('steps-prev');
  const stepsNext=document.getElementById('steps-next');
  const stepsDots=document.getElementById('steps-dots');

  if(stepsEl&&stepsDots){
    stepsDots.innerHTML='';
    const articles=[...stepsEl.querySelectorAll('article')];
    const totalPages=Math.ceil(articles.length/2);

    for(let p=0;p<totalPages;p++){
      const dot=document.createElement('button');
      dot.type='button';
      dot.className='slider-dot'+(p===0?' active':'');
      dot.setAttribute('aria-label',`Steps slide ${p+1}`);
      const pageIndex=p;
      dot.onclick=()=>{
        const target=articles[pageIndex*2];
        if(target)target.scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'});
      };
      stepsDots.appendChild(dot);
    }

    function syncStepsActiveDot(){
      const scrollLeft=stepsEl.scrollLeft;
      const maxScroll=stepsEl.scrollWidth-stepsEl.clientWidth;
      const progress=maxScroll>0?scrollLeft/maxScroll:0;
      const activePage=Math.min(totalPages-1,Math.max(0,Math.round(progress*(totalPages-1))));
      const dots=stepsDots.querySelectorAll('.slider-dot');
      dots.forEach((d,i)=>d.classList.toggle('active',i===activePage));
      if(stepsPrev)stepsPrev.disabled=scrollLeft<=4;
      if(stepsNext)stepsNext.disabled=scrollLeft>=maxScroll-4;
    }

    stepsEl.addEventListener('scroll',syncStepsActiveDot,{passive:true});
    if(stepsPrev){
      stepsPrev.onclick=()=>{
        stepsEl.scrollBy({left:-stepsEl.clientWidth,behavior:'smooth'});
      };
    }
    if(stepsNext){
      stepsNext.onclick=()=>{
        stepsEl.scrollBy({left:stepsEl.clientWidth,behavior:'smooth'});
      };
    }
    syncStepsActiveDot();
  }

  const layersEl=document.querySelector('.layers');
  const layersPrev=document.getElementById('layers-prev');
  const layersNext=document.getElementById('layers-next');
  const layersDots=document.getElementById('layers-dots');

  if(layersEl&&layersDots){
    layersDots.innerHTML='';
    const articles=[...layersEl.querySelectorAll('article')];
    const totalPages=Math.ceil(articles.length/2);

    for(let p=0;p<totalPages;p++){
      const dot=document.createElement('button');
      dot.type='button';
      dot.className='slider-dot'+(p===0?' active':'');
      dot.setAttribute('aria-label',`Recipe slide ${p+1}`);
      const pageIndex=p;
      dot.onclick=()=>{
        const target=articles[pageIndex*2];
        if(target)target.scrollIntoView({behavior:'smooth',inline:'start',block:'nearest'});
      };
      layersDots.appendChild(dot);
    }

    function syncLayersActiveDot(){
      const scrollLeft=layersEl.scrollLeft;
      const maxScroll=layersEl.scrollWidth-layersEl.clientWidth;
      const progress=maxScroll>0?scrollLeft/maxScroll:0;
      const activePage=Math.min(totalPages-1,Math.max(0,Math.round(progress*(totalPages-1))));
      const dots=layersDots.querySelectorAll('.slider-dot');
      dots.forEach((d,i)=>d.classList.toggle('active',i===activePage));
      if(layersPrev)layersPrev.disabled=scrollLeft<=4;
      if(layersNext)layersNext.disabled=scrollLeft>=maxScroll-4;
    }

    layersEl.addEventListener('scroll',syncLayersActiveDot,{passive:true});
    if(layersPrev){
      layersPrev.onclick=()=>{
        layersEl.scrollBy({left:-layersEl.clientWidth,behavior:'smooth'});
      };
    }
    if(layersNext){
      layersNext.onclick=()=>{
        layersEl.scrollBy({left:layersEl.clientWidth,behavior:'smooth'});
      };
    }
    syncLayersActiveDot();
  }
}

initMobileSliders();
