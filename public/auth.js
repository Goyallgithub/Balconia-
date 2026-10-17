(()=>{
const url=window.BALCONIA_SUPABASE_URL||'';
const anon=window.BALCONIA_SUPABASE_ANON_KEY||'';

function mountShell(){
  document.querySelectorAll('header').forEach(h=>{
    let actions=h.querySelector('.header-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.className='header-actions';
      const cta=h.querySelector('a.button.small, a.button');
      if(cta&&cta.parentElement===h){
        h.insertBefore(actions,cta);
        actions.appendChild(cta);
      }else{
        h.appendChild(actions);
      }
    }
    if(!actions.querySelector('#account-chip')){
      const chip=document.createElement('div');
      chip.id='account-chip';
      chip.className='account-chip';
      actions.insertBefore(chip, actions.firstChild);
    }
    // Move delivery PIN into actions if pin-gate already appended it to header
    const pin=h.querySelector(':scope > .delivery-location');
    if(pin)actions.appendChild(pin);
  });
}

if(!url||!anon){
  window.BalconiaAuth={
    enabled:false,
    open(){alert('Sign-in is not configured yet.');},
    getAccessToken:async()=>null,
    requireSignIn:()=>{alert('Sign-in is not configured yet. Add Supabase keys to enable accounts.');return false;},
    getUser:async()=>null
  };
  const boot=()=>{mountShell();const el=document.getElementById('account-chip');if(el){el.innerHTML=`<button type="button" class="account-link" id="account-signin">Sign in</button>`;document.getElementById('account-signin').onclick=()=>window.BalconiaAuth.open();}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  return;
}

const STORAGE_KEY='balconia-supabase-session';
let session=null;
try{session=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{session=null;}

async function api(path,options={}){
  const headers=Object.assign({'Content-Type':'application/json','apikey':anon},options.headers||{});
  if(session?.access_token)headers.Authorization='Bearer '+session.access_token;
  const r=await fetch(url+'/auth/v1'+path,{...options,headers});
  const text=await r.text();
  let data=null;try{data=text?JSON.parse(text):null;}catch{data={message:text};}
  if(!r.ok)throw new Error(data?.msg||data?.error_description||data?.message||'Auth failed');
  return data;
}

function save(s){
  session=s;
  if(s)localStorage.setItem(STORAGE_KEY,JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
  renderChip();
}

async function refreshIfNeeded(){
  if(!session?.refresh_token)return session;
  const exp=(session.expires_at||0)*1000;
  if(exp && Date.now()<exp-60000)return session;
  try{
    const data=await api('/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});
    save({...session,...data,user:data.user||session.user,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600)});
  }catch{save(null);}
  return session;
}

function ensureUi(){
  if(document.getElementById('auth-dialog'))return;
  const d=document.createElement('dialog');
  d.id='auth-dialog';
  d.className='auth-dialog';
  d.innerHTML=`<button type="button" class="auth-close" aria-label="Close">×</button>
    <h2 id="auth-title">Sign in to Balconia</h2>
    <p class="auth-lede">Save designs, AI previews (max 2 per account) and orders to your profile.</p>
    <form id="auth-form">
      <label>Email<input name="email" type="email" required autocomplete="email"></label>
      <label>Password<input name="password" type="password" required minlength="6" autocomplete="current-password"></label>
      <p id="auth-error" role="alert"></p>
      <button type="submit" class="button" id="auth-submit">Sign in ↗</button>
    </form>
    <p class="auth-switch">New here? <button type="button" id="auth-toggle">Create an account</button></p>`;
  document.body.appendChild(d);
  let mode='signin';
  const title=()=>document.getElementById('auth-title');
  const submit=()=>document.getElementById('auth-submit');
  const err=()=>document.getElementById('auth-error');
  d.querySelector('.auth-close').onclick=()=>d.close();
  d.addEventListener('click',e=>{if(e.target===d)d.close();});
  document.getElementById('auth-toggle').onclick=()=>{
    mode=mode==='signin'?'signup':'signin';
    title().textContent=mode==='signin'?'Sign in to Balconia':'Create your Balconia account';
    submit().textContent=mode==='signin'?'Sign in ↗':'Create account ↗';
    document.getElementById('auth-toggle').textContent=mode==='signin'?'Create an account':'Already have an account? Sign in';
    err().textContent='';
  };
  document.getElementById('auth-form').onsubmit=async e=>{
    e.preventDefault();
    err().textContent='';
    const fd=new FormData(e.target);
    const email=String(fd.get('email')||'').trim();
    const password=String(fd.get('password')||'');
    submit().disabled=true;
    try{
      if(mode==='signup'){
        // Soft-launch: create via our API (no Supabase confirmation email / rate limit).
        const r=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
        const data=await r.json().catch(()=>({}));
        if(!r.ok)throw new Error(data.error||data.message||'Could not create account');
        if(data.access_token)save({...data,user:data.user||{email}});
        else {
          err().textContent=data.error||'Account created — please sign in.';
          mode='signin';
          title().textContent='Sign in to Balconia';
          submit().textContent='Sign in ↗';
          return;
        }
      }else{
        const data=await api('/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
        save({...data,user:data.user||{email}});
      }
      d.close();
    }catch(ex){err().textContent=ex.message;}
    finally{submit().disabled=false;}
  };
}

function openAuth(){ensureUi();document.getElementById('auth-dialog').showModal();}

let gensLeft=null;

async function refreshGens(){
  if(!session?.access_token){gensLeft=null;return;}
  try{
    const r=await fetch('/api/designs',{headers:{Authorization:'Bearer '+session.access_token,'Cache-Control':'no-store'}});
    if(!r.ok)return;
    const data=await r.json();
    if(typeof data.generationsRemaining==='number')gensLeft=data.generationsRemaining;
  }catch{}
}

function renderChip(){
  const el=document.getElementById('account-chip');
  if(!el)return;
  if(session?.access_token && (session?.user?.email||session?.user?.id)){
    const label=(session.user.email||'Account').split('@')[0];
    const gens=gensLeft==null?'':` · ${gensLeft} AI left`;
    el.innerHTML=`<button type="button" class="account-link account-link-on" id="account-menu" title="Signed in — click to sign out">${esc(label)}${esc(gens)}</button>`;
    document.getElementById('account-menu').onclick=()=>{
      if(confirm('Sign out of Balconia?'))save(null);
    };
    refreshGens().then(()=>{
      if(gensLeft==null)return;
      const btn=document.getElementById('account-menu');
      if(btn)btn.textContent=`${label} · ${gensLeft} AI left`;
    });
  }else{
    el.innerHTML=`<button type="button" class="account-link" id="account-signin">Sign in</button>`;
    document.getElementById('account-signin').onclick=openAuth;
  }
}

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

window.BalconiaAuth={
  enabled:true,
  open:openAuth,
  requireSignIn(){if(session?.access_token)return true;openAuth();return false;},
  async getAccessToken(){await refreshIfNeeded();return session?.access_token||null;},
  async getUser(){await refreshIfNeeded();return session?.user||null;}
};

function boot(){
  mountShell();
  renderChip();
  // Keep PIN button inside header-actions when pin-gate adds it later
  const header=document.querySelector('header');
  if(header){
    new MutationObserver(()=>{
      const actions=header.querySelector('.header-actions');
      const pin=header.querySelector(':scope > .delivery-location');
      if(actions&&pin)actions.appendChild(pin);
    }).observe(header,{childList:true});
  }
  if(location.hash==='#account')openAuth();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
