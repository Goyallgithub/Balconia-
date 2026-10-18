(()=>{
const STORAGE_KEY='balconia-supabase-session';
let session=null;
try{session=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{session=null;}

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
    const pin=h.querySelector(':scope > .delivery-location');
    if(pin)actions.appendChild(pin);
  });
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
  return session;
}

let pendingToken=null;
let pendingDestination='';
let pendingMethod='email';
let pendingNotice='';
let pendingDevOtp='';
let resendTimer=null;
let resendCountdown=0;

function ensureUi(){
  if(document.getElementById('auth-dialog'))return;
  const d=document.createElement('dialog');
  d.id='auth-dialog';
  d.className='auth-dialog';
  d.innerHTML=`<button type="button" class="auth-close" aria-label="Close">×</button>
    <div id="auth-content"></div>`;
  document.body.appendChild(d);

  d.querySelector('.auth-close').onclick=()=>d.close();
  d.addEventListener('click',e=>{if(e.target===d)d.close();});

  renderView('signin');
}

function renderView(view){
  const container=document.getElementById('auth-content');
  if(!container)return;
  clearInterval(resendTimer);

  if(view==='signin'){
    container.innerHTML=`<h2 id="auth-title">Sign in to Balconia</h2>
      <p class="auth-lede">Access your saved balcony designs, AI concepts and order history.</p>
      <form id="auth-form">
        <label>Email address<input name="email" type="email" required autocomplete="email" placeholder="name@example.com"></label>
        <label>Password<input name="password" type="password" required minlength="6" autocomplete="current-password" placeholder="••••••••"></label>
        <p id="auth-error" role="alert"></p>
        <button type="submit" class="button" id="auth-submit">Sign in ↗</button>
      </form>
      <p class="auth-switch">New to Balconia? <button type="button" id="auth-to-signup">Create an account</button></p>`;

    document.getElementById('auth-to-signup').onclick=()=>renderView('signup');
    document.getElementById('auth-form').onsubmit=async e=>{
      e.preventDefault();
      const err=document.getElementById('auth-error');
      const sub=document.getElementById('auth-submit');
      err.textContent='';
      sub.disabled=true;
      const fd=new FormData(e.target);
      try{
        const r=await fetch('/api/auth/signin',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(Object.fromEntries(fd))
        });
        const data=await r.json();
        if(!r.ok)throw new Error(data.error||'Sign in failed');
        save(data);
        document.getElementById('auth-dialog').close();
      }catch(ex){
        err.textContent=ex.message;
      }finally{
        sub.disabled=false;
      }
    };
  } else if(view==='signup'){
    container.innerHTML=`<h2 id="auth-title">Create your account</h2>
      <p class="auth-lede">Save your balcony designs and unlock your AI generations.</p>
      <form id="auth-form">
        <label>Full name<input name="fullName" type="text" required minlength="2" autocomplete="name" placeholder="Pooja Sharma"></label>
        <label>Email address<input name="email" type="email" required autocomplete="email" placeholder="name@example.com"></label>
        <label>Mobile number with country code<input name="phone" type="tel" required autocomplete="tel" placeholder="+91 98765 43210" value="+91 "></label>
        <label>Password<input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Minimum 6 characters"></label>
        <label>Confirm password<input name="confirmPassword" type="password" required minlength="6" autocomplete="new-password" placeholder="Re-enter password"></label>
        <label>Verify via OTP
          <div class="auth-method-group">
            <label class="auth-method-pill">
              <input type="radio" name="verifyMethod" value="email" checked>
              <span>Email OTP</span>
            </label>
            <label class="auth-method-pill">
              <input type="radio" name="verifyMethod" value="phone">
              <span>Mobile OTP</span>
            </label>
          </div>
        </label>
        <p id="auth-error" role="alert"></p>
        <button type="submit" class="button" id="auth-submit">Send verification code ↗</button>
      </form>
      <p class="auth-switch">Already have an account? <button type="button" id="auth-to-signin">Sign in</button></p>`;

    document.getElementById('auth-to-signin').onclick=()=>renderView('signin');
    document.getElementById('auth-form').onsubmit=async e=>{
      e.preventDefault();
      const err=document.getElementById('auth-error');
      const sub=document.getElementById('auth-submit');
      err.textContent='';
      sub.disabled=true;
      const fd=new FormData(e.target);
      const payload=Object.fromEntries(fd);

      if(payload.password!==payload.confirmPassword){
        err.textContent='Passwords do not match.';
        sub.disabled=false;
        return;
      }

      try{
        const r=await fetch('/api/auth/send-otp',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify(payload)
        });
        const data=await r.json();
        if(!r.ok)throw new Error(data.error||'Could not send verification code.');
        pendingToken=data.verificationToken;
        pendingDestination=data.destination;
        pendingMethod=data.verifyMethod;
        pendingNotice=data.sandboxNotice||'';
        pendingDevOtp=data.devOtp||'';
        resendCountdown=data.cooldownSeconds||60;
        renderView('otp');
      }catch(ex){
        err.textContent=ex.message;
      }finally{
        sub.disabled=false;
      }
    };
  } else if(view==='otp'){
    container.innerHTML=`<h2 id="auth-title">Verify ${pendingMethod==='email'?'Email':'Mobile'}</h2>
      <p class="auth-lede">We sent a 6-digit verification code to <strong>${esc(pendingDestination)}</strong>.</p>
      ${pendingNotice?`<div style="background:#eaf3ec;border:1px solid #c9decb;color:#204a25;padding:10px 12px;border-radius:8px;font-size:13px;line-height:1.45;margin:12px 0;">
        <strong>Verification code:</strong> <span style="font-size:16px;font-weight:700;letter-spacing:2px;margin-left:4px;">${esc(pendingDevOtp||'')}</span>
        <div style="font-size:11px;opacity:0.85;margin-top:4px;">${esc(pendingNotice)}</div>
      </div>`:''}
      <form id="auth-otp-form">
        <label>Enter 6-digit code
          <input name="otp" class="auth-otp-input" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code" placeholder="······" autofocus>
        </label>
        <div class="auth-resend-row">
          <button type="button" class="auth-back-btn" id="auth-edit-details">← Edit details</button>
          <button type="button" class="auth-resend-btn" id="auth-resend" disabled>Resend code (${resendCountdown}s)</button>
        </div>
        <p id="auth-error" role="alert"></p>
        <button type="submit" class="button" id="auth-otp-submit">Verify &amp; Create account ↗</button>
      </form>`;

    if(pendingDevOtp){
      const otpInp=container.querySelector('input[name="otp"]');
      if(otpInp)otpInp.value=pendingDevOtp;
    }

    document.getElementById('auth-edit-details').onclick=()=>renderView('signup');

    const resendBtn=document.getElementById('auth-resend');
    const updateCountdown=()=>{
      if(resendCountdown>0){
        resendBtn.disabled=true;
        resendBtn.textContent=`Resend code (${resendCountdown}s)`;
        resendCountdown--;
      }else{
        resendBtn.disabled=false;
        resendBtn.textContent='Resend verification code';
        clearInterval(resendTimer);
      }
    };
    updateCountdown();
    resendTimer=setInterval(updateCountdown,1000);

    resendBtn.onclick=async()=>{
      const err=document.getElementById('auth-error');
      err.textContent='';
      resendBtn.disabled=true;
      try{
        const r=await fetch('/api/auth/resend-otp',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({verificationToken:pendingToken})
        });
        const data=await r.json();
        if(!r.ok)throw new Error(data.error||'Failed to resend code.');
        pendingNotice=data.sandboxNotice||'';
        pendingDevOtp=data.devOtp||'';
        resendCountdown=data.cooldownSeconds||60;
        if(pendingDevOtp){
          const otpInp=container.querySelector('input[name="otp"]');
          if(otpInp)otpInp.value=pendingDevOtp;
        }
        updateCountdown();
        resendTimer=setInterval(updateCountdown,1000);
      }catch(ex){
        err.textContent=ex.message;
        resendBtn.disabled=false;
      }
    };

    document.getElementById('auth-otp-form').onsubmit=async e=>{
      e.preventDefault();
      const err=document.getElementById('auth-error');
      const sub=document.getElementById('auth-otp-submit');
      err.textContent='';
      sub.disabled=true;
      const otp=e.target.elements.otp.value.trim();

      try{
        const r=await fetch('/api/auth/verify-otp',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({verificationToken:pendingToken,otp})
        });
        const data=await r.json();
        if(!r.ok)throw new Error(data.error||'Verification failed.');
        save(data);
        document.getElementById('auth-dialog').close();
      }catch(ex){
        err.textContent=ex.message;
      }finally{
        sub.disabled=false;
      }
    };
  }
}

function openAuth(initialView='signin'){
  ensureUi();
  renderView(initialView);
  document.getElementById('auth-dialog').showModal();
}

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

function getAccountLabel(user){
  const full=(user?.user_metadata?.full_name||user?.user_metadata?.name||'').trim();
  if(full){
    const first=full.split(/\s+/)[0];
    return first.length>10?first.slice(0,9)+'…':first;
  }
  if(user?.email){
    const part=user.email.split('@')[0];
    return part.length>10?part.slice(0,9)+'…':part;
  }
  if(user?.phone){
    return '…'+user.phone.slice(-4);
  }
  return 'Account';
}

function renderChip(){
  const el=document.getElementById('account-chip');
  if(!el)return;
  if(session?.access_token && (session?.user?.email||session?.user?.phone||session?.user?.id)){
    const label=getAccountLabel(session.user);
    const gens=gensLeft==null?'':` · ${gensLeft} AI`;
    const fullIdent=session.user.email||session.user.phone||session.user.user_metadata?.full_name||'Account';
    el.innerHTML=`<button type="button" class="account-link account-link-on" id="account-menu" title="${esc(fullIdent)} — click to sign out">${esc(label)}${esc(gens)}</button>`;
    document.getElementById('account-menu').onclick=()=>{
      if(confirm('Sign out of Balconia?'))save(null);
    };
    refreshGens().then(()=>{
      if(gensLeft==null)return;
      const btn=document.getElementById('account-menu');
      if(btn)btn.textContent=`${label} · ${gensLeft} AI`;
    });
  }else{
    el.innerHTML=`<button type="button" class="account-link" id="account-signin">Sign in</button>`;
    document.getElementById('account-signin').onclick=()=>openAuth('signin');
  }
}

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

window.BalconiaAuth={
  enabled:true,
  open:openAuth,
  requireSignIn(){if(session?.access_token)return true;openAuth('signin');return false;},
  async getAccessToken(){await refreshIfNeeded();return session?.access_token||null;},
  async getUser(){await refreshIfNeeded();return session?.user||null;}
};

function boot(){
  mountShell();
  renderChip();
  const header=document.querySelector('header');
  if(header){
    new MutationObserver(()=>{
      const actions=header.querySelector('.header-actions');
      const pin=header.querySelector(':scope > .delivery-location');
      if(actions&&pin)actions.appendChild(pin);
    }).observe(header,{childList:true});
  }
  if(location.hash==='#account')openAuth('signin');
  if(location.hash==='#signup')openAuth('signup');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();

