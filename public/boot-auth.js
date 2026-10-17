(async()=>{
  let pendingOpen=false;
  document.addEventListener('click',(e)=>{
    const btn=e.target?.closest?.('#account-signin');
    if(!btn)return;
    e.preventDefault();
    if(window.BalconiaAuth?.open)window.BalconiaAuth.open();
    else pendingOpen=true;
  });

  try{
    const r=await fetch('/api/public-config');
    const cfg=await r.json();
    window.BALCONIA_SUPABASE_URL=cfg.supabaseUrl||'';
    window.BALCONIA_SUPABASE_ANON_KEY=cfg.supabaseAnonKey||'';
    window.BALCONIA_MAX_GENERATIONS=cfg.maxGenerations||2;
  }catch{
    window.BALCONIA_SUPABASE_URL='';
    window.BALCONIA_SUPABASE_ANON_KEY='';
  }
  const s=document.createElement('script');
  s.src='auth.js?v=signup-no-email-1';
  s.onload=()=>{if(pendingOpen&&window.BalconiaAuth?.open)window.BalconiaAuth.open();};
  document.body.appendChild(s);
})();
