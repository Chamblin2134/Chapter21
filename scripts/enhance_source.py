from pathlib import Path

source_path = Path('/home/ubuntu/avery-institute-web/client/public/avery-source.html')
source = source_path.read_text(encoding='utf-8')
marker = 'data-avery-enhanced="cart-mobile-tabs"'
if marker in source:
    raise SystemExit('Source is already enhanced.')

style = r'''
<style data-avery-enhanced="cart-mobile-tabs">
/* Interaction pass: the source remains a dark editorial institute experience; motion is calm, directional, and keyboard-friendly. */
.avery-cart-backdrop{position:fixed;inset:0;z-index:9998;background:rgba(3,5,5,.68);opacity:0;visibility:hidden;transition:opacity .28s cubic-bezier(.23,1,.32,1),visibility .28s ease;}
.avery-cart-backdrop.is-open{opacity:1;visibility:visible;}
.v14-header-cart{position:static!important;}
.v14-cart-panel{position:fixed!important;inset:0 0 0 auto!important;width:min(440px,calc(100vw - 18px))!important;height:100dvh!important;max-height:none!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;gap:0!important;padding:28px 26px 24px!important;background:#101313!important;border:0!important;border-left:1px solid rgba(208,146,75,.58)!important;border-radius:0!important;box-shadow:-22px 0 60px rgba(0,0,0,.42)!important;transform:translateX(104%);visibility:hidden;opacity:0;transition:transform .3s cubic-bezier(.23,1,.32,1),opacity .22s ease,visibility .3s ease;}
.v14-cart-panel[hidden]{display:none!important;}
.v14-cart-panel.is-open{transform:translateX(0);visibility:visible;opacity:1;}
.v14-cart-title{font-size:1.6rem!important;letter-spacing:.01em!important;padding-right:42px!important;margin:0!important;}
.avery-cart-close{position:absolute;top:20px;right:20px;width:34px;height:34px;border:1px solid rgba(208,146,75,.4);border-radius:50%;background:transparent;color:#efd5ae;font:400 25px/1 Manrope,sans-serif;cursor:pointer;transition:background .18s ease,border-color .18s ease,transform .18s ease;}
.avery-cart-close:hover,.avery-cart-close:focus-visible{background:rgba(208,146,75,.18);border-color:#d0924b;transform:rotate(4deg);outline:none;}
#v14CartBody{flex:1 1 auto;min-height:0;overflow:auto;margin:22px -8px 0 0;padding:0 8px 0 0;scrollbar-color:#71502f #111313;}
.v14-cart-item{grid-template-columns:minmax(0,1fr) auto!important;gap:14px!important;padding:18px 0!important;}
.v14-cart-item strong{font:600 1.08rem/1.15 'Cormorant Garamond',serif!important;color:#f4e7d6!important;}
.v14-cart-item span{display:block;margin-top:6px;color:#bdb5aa;}
.v14-cart-remove{margin-top:8px!important;color:#db9898!important;}
.avery-cart-quantity{display:flex;align-items:center;gap:8px;margin-top:12px;}
.avery-cart-quantity button{width:27px;height:27px;border:1px solid rgba(208,146,75,.52);border-radius:50%;background:#151817;color:#f4d5ad;font:500 17px/1 Manrope,sans-serif;cursor:pointer;transition:background .16s ease,transform .16s ease;}
.avery-cart-quantity button:hover,.avery-cart-quantity button:focus-visible{background:#2a2117;transform:translateY(-1px);outline:2px solid rgba(226,173,108,.45);outline-offset:2px;}
.avery-cart-quantity-value{min-width:22px;text-align:center;color:#eee3d5;font-size:.78rem;font-weight:700;}
.v14-cart-total{margin:18px 0 12px!important;padding-top:18px;border-top:1px solid rgba(208,146,75,.28);font-size:.96rem!important;}
.v14-cart-checkout{min-height:48px!important;flex:0 0 auto;}
.v14-cart-checkout:disabled{opacity:.46;cursor:not-allowed;}
.v14-cart-note{flex:0 0 auto!important;margin:12px 0 0!important;}
.avery-cart-notice{display:none;margin:10px 0 0;padding:10px 12px;border-left:3px solid #d0924b;background:rgba(208,146,75,.1);color:#e5d2b6;font-size:.76rem;line-height:1.5;}
.avery-cart-notice.is-visible{display:block;}
.avery-mobile-toggle{display:none;align-items:center;justify-content:center;width:42px;height:42px;flex:0 0 42px;border:1px solid rgba(208,146,75,.58);border-radius:4px;background:#101313;color:#efd5ae;cursor:pointer;}
.avery-mobile-toggle .line{display:block;width:18px;height:1px;margin:4px auto;background:#efd5ae;transition:transform .25s cubic-bezier(.23,1,.32,1),opacity .18s ease;}
.avery-mobile-toggle.is-open .line:nth-child(1){transform:translateY(5px) rotate(45deg);}
.avery-mobile-toggle.is-open .line:nth-child(2){opacity:0;}
.avery-mobile-toggle.is-open .line:nth-child(3){transform:translateY(-5px) rotate(-45deg);}
button[role=tab]{position:relative;}
button[role=tab][aria-selected=true]{box-shadow:inset 0 -2px 0 #d0924b;}
@media(max-width:780px){
  .header{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:10px!important;padding:12px 18px 10px!important;min-height:0!important;}
  .brand{width:auto!important;min-width:0!important;flex:1 1 auto!important;text-align:left!important;}
  .brand .avery-brand-mark{margin-left:0!important;margin-right:auto!important;}
  .brand .name{font-size:27px!important;}
  .brand .subname{font-size:14px!important;}
  .brand .hh{font-size:12px!important;}
  .brand em{font-size:10px!important;}
  .avery-mobile-toggle{display:block;order:2;}
  .v14-header-cart{order:3;margin-left:0!important;}
  .v14-header-cart .v14-cart-toggle{width:42px!important;height:42px!important;padding:0!important;justify-content:center!important;border-radius:4px!important;font-size:0!important;}
  .v14-header-cart .v14-cart-icon{margin:0!important;}
  .v14-header-cart .v14-cart-count{position:absolute;margin:0 0 29px 25px;min-width:17px;height:17px;font-size:.62rem;}
  .nav{order:4!important;flex:0 0 100%!important;width:100%!important;display:flex!important;flex-direction:column!important;gap:0!important;margin:0!important;padding:0!important;max-height:0;overflow:hidden;opacity:0;transform:translateY(-10px);pointer-events:none;border-top:1px solid transparent;transition:max-height .32s cubic-bezier(.23,1,.32,1),opacity .22s ease,transform .32s cubic-bezier(.23,1,.32,1),border-color .22s ease!important;}
  .nav.is-open{max-height:70vh;opacity:1;transform:translateY(0);pointer-events:auto;border-top-color:#2a231b;}
  .nav a{display:block;width:100%;padding:14px 4px;border-bottom:1px solid #201d19;font-size:11px!important;letter-spacing:.18em!important;}
  .nav a:last-child{border-bottom:0;}
  .hero{margin-top:100px!important;}
  .v14-cart-panel{width:min(430px,calc(100vw - 12px))!important;padding:24px 20px 20px!important;}
}
@media(prefers-reduced-motion:reduce){.v14-cart-panel,.avery-cart-backdrop,.nav,.avery-mobile-toggle .line,.avery-cart-quantity button{transition:none!important;}}
</style>
'''

script = r'''
<script data-avery-enhanced="cart-mobile-tabs">
(function(){
  'use strict';
  const CART_KEY='avery-cart-quantities-v1';
  const safeJson=(value,fallback)=>{try{return JSON.parse(value)||fallback}catch{return fallback}};
  let quantities=safeJson(localStorage.getItem(CART_KEY)||'{}',{});
  const saveQuantities=()=>localStorage.setItem(CART_KEY,JSON.stringify(quantities));
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value||0);

  function setupCart(){
    const wrap=document.getElementById('v14HeaderCart');
    const toggle=document.getElementById('v14CartToggle');
    const panel=document.getElementById('v14CartPanel');
    const body=document.getElementById('v14CartBody');
    const checkout=document.getElementById('v14CartCheckout');
    if(!wrap||!toggle||!panel||!body||!checkout)return;
    let backdrop=document.querySelector('.avery-cart-backdrop');
    if(!backdrop){
      backdrop=document.createElement('div');
      backdrop.className='avery-cart-backdrop';
      backdrop.hidden=true;
      backdrop.setAttribute('aria-hidden','true');
      document.body.appendChild(backdrop);
    }
    if(!panel.querySelector('.avery-cart-close')){
      const close=document.createElement('button');
      close.type='button';
      close.className='avery-cart-close';
      close.setAttribute('aria-label','Close shopping cart');
      close.textContent='×';
      panel.appendChild(close);
    }
    let notice=panel.querySelector('.avery-cart-notice');
    if(!notice){
      notice=document.createElement('div');
      notice.className='avery-cart-notice';
      notice.setAttribute('role','status');
      panel.insertBefore(notice,panel.querySelector('.v14-cart-note')||null);
    }
    let closeTimer;
    const isOpen=()=>panel.classList.contains('is-open');
    const setDrawer=open=>{
      clearTimeout(closeTimer);
      if(open){
        panel.hidden=false;
        backdrop.hidden=false;
        panel.classList.add('is-open');
        backdrop.classList.add('is-open');
        toggle.setAttribute('aria-expanded','true');
        document.body.classList.add('avery-cart-lock');
        window.requestAnimationFrame(()=>panel.querySelector('.avery-cart-close')?.focus({preventScroll:true}));
      }else{
        panel.classList.remove('is-open');
        backdrop.classList.remove('is-open');
        toggle.setAttribute('aria-expanded','false');
        document.body.classList.remove('avery-cart-lock');
        closeTimer=window.setTimeout(()=>{
          if(!isOpen()){
            panel.hidden=true;
            backdrop.hidden=true;
          }
        },300);
        window.requestAnimationFrame(()=>toggle.focus({preventScroll:true}));
      }
    };
    const showNotice=(message,isError=false)=>{
      notice.textContent=message;
      notice.style.borderLeftColor=isError?'#c87979':'#d0924b';
      notice.classList.add('is-visible');
      window.clearTimeout(showNotice.timer);
      showNotice.timer=window.setTimeout(()=>notice.classList.remove('is-visible'),5200);
    };
    const refresh=()=>{
      const rows=[...body.querySelectorAll('.v14-cart-item')];
      let units=0,subtotal=0;
      rows.forEach(row=>{
        const remove=row.querySelector('[data-v14-remove-cart]');
        const id=remove?.dataset.v14RemoveCart;
        if(!id)return;
        row.dataset.averyCartId=id;
        const span=row.querySelector('span');
        const priceMatch=(span?.textContent||'').match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
        const unitPrice=priceMatch?Number(priceMatch[1].replace(/,/g,''))||0:0;
        const current=Math.max(1,Math.min(99,Number(quantities[id])||1));
        quantities[id]=current;
        if(!row.querySelector('.avery-cart-quantity')){
          const controls=document.createElement('div');
          controls.className='avery-cart-quantity';
          controls.setAttribute('aria-label','Quantity');
          controls.innerHTML='<button type="button" data-avery-cart-qty="decrease" aria-label="Decrease quantity">−</button><span class="avery-cart-quantity-value">'+current+'</span><button type="button" data-avery-cart-qty="increase" aria-label="Increase quantity">+</button>';
          row.querySelector('div')?.appendChild(controls);
        }else{
          const value=row.querySelector('.avery-cart-quantity-value');
          if(value)value.textContent=String(current);
        }
        units+=current;
        subtotal+=unitPrice*current;
      });
      saveQuantities();
      const count=document.getElementById('v14CartCount');
      const total=document.getElementById('v14CartTotal');
      if(count)count.textContent=String(units);
      if(total)total.textContent=money(subtotal);
      toggle.setAttribute('aria-label','Open shopping cart, '+units+' '+(units===1?'item':'items'));
      checkout.disabled=rows.length===0;
      if(rows.length===0)notice.classList.remove('is-visible');
    };
    toggle.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();setDrawer(!isOpen());},true);
    panel.querySelector('.avery-cart-close').addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();setDrawer(false);},true);
    backdrop.addEventListener('click',()=>setDrawer(false));
    document.addEventListener('pointerdown',event=>{
      if(isOpen()&&!panel.contains(event.target)&&!toggle.contains(event.target)&&!backdrop.contains(event.target))setDrawer(false);
    });
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-avery-cart-qty]');
      if(!button||!body.contains(button))return;
      event.preventDefault();
      event.stopPropagation();
      const row=button.closest('.v14-cart-item');
      const id=row?.dataset.averyCartId;
      if(!id)return;
      const next=Math.max(1,Math.min(99,(Number(quantities[id])||1)+(button.dataset.averyCartQty==='increase'?1:-1)));
      quantities[id]=next;
      saveQuantities();
      refresh();
    });
    checkout.addEventListener('click',async event=>{
      event.preventDefault();
      event.stopImmediatePropagation();
      refresh();
      const rows=[...body.querySelectorAll('.v14-cart-item')];
      const resourceIds=rows.flatMap(row=>{const id=row.dataset.averyCartId;return id?Array(Math.max(1,Number(quantities[id])||1)).fill(id):[]});
      if(!resourceIds.length)return;
      showNotice('Opening secure checkout…');
      try{
        const response=await fetch('/api/stripe/cart-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resourceIds})});
        const result=await response.json().catch(()=>({}));
        if(!response.ok||!result.checkoutUrl)throw new Error(result.error||'Secure checkout is not active yet. Please contact the Institute to complete this purchase.');
        window.location.href=result.checkoutUrl;
      }catch(error){showNotice(error instanceof Error?error.message:'Unable to open checkout.',true);}
    },true);
    const observer=new MutationObserver(()=>window.requestAnimationFrame(refresh));
    observer.observe(body,{childList:true,subtree:true});
    refresh();
    window.setTimeout(refresh,700);
  }

  function setupMobileNav(){
    const header=document.querySelector('.header');
    const nav=document.querySelector('.nav');
    if(!header||!nav)return;
    nav.id=nav.id||'averyMainNav';
    nav.setAttribute('aria-label','Primary navigation');
    let button=header.querySelector('.avery-mobile-toggle');
    if(!button){
      button=document.createElement('button');
      button.type='button';
      button.className='avery-mobile-toggle';
      button.setAttribute('aria-label','Open navigation menu');
      button.setAttribute('aria-controls',nav.id);
      button.setAttribute('aria-expanded','false');
      button.innerHTML='<span class="line"></span><span class="line"></span><span class="line"></span>';
      header.insertBefore(button,nav);
    }
    const close=()=>{nav.classList.remove('is-open');button.classList.remove('is-open');button.setAttribute('aria-expanded','false');button.setAttribute('aria-label','Open navigation menu');};
    const open=()=>{nav.classList.add('is-open');button.classList.add('is-open');button.setAttribute('aria-expanded','true');button.setAttribute('aria-label','Close navigation menu');};
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();nav.classList.contains('is-open')?close():open();});
    nav.addEventListener('click',event=>{if(event.target.closest('a'))close();});
    document.addEventListener('click',event=>{if(nav.classList.contains('is-open')&&!header.contains(event.target))close();});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'){close();if(document.querySelector('.v14-cart-panel.is-open'))document.querySelector('.avery-cart-close')?.click();}});
  }

  function makeTabsInteractive(){
    const selectors=['.store-tab','.account-tab','.topic-btn','.v9-audience-btn','.v9-filter-btn','.v9-audience-btn','.audience-tab','.clinician-subtab','[data-v9-audience]','[data-v11-client-filter]','[data-v9-edu-filter]','[data-v9-clin-filter]','[data-v10-resource-filter]','[data-audience-choice]'];
    const controls=[...document.querySelectorAll(selectors.join(','))];
    controls.forEach(control=>{
      if(control.tagName==='BUTTON')control.setAttribute('role','tab');
      if(!control.hasAttribute('aria-selected'))control.setAttribute('aria-selected',control.classList.contains('active')?'true':'false');
      control.addEventListener('click',()=>{
        window.setTimeout(()=>{
          const className=[...control.classList].find(name=>selectors.some(selector=>selector.startsWith('.')&&selector.slice(1)===name));
          const group=control.parentElement;
          if(!group)return;
          const peers=className?[...group.querySelectorAll('.'+className)]:[...group.children].filter(node=>node.matches?.('button[role=tab]'));
          peers.forEach(peer=>{peer.setAttribute('aria-selected',peer===control?'true':'false');});
          if(!control.classList.contains('active')&&peers.length)control.classList.add('active');
        },0);
      });
    });
  }

  function init(){setupMobileNav();setupCart();makeTabsInteractive();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.setTimeout(init,0));
  else window.setTimeout(init,0);
  window.addEventListener('load',()=>window.setTimeout(init,350),{once:true});
})();
</script>
'''

source = source.replace('</head>', style + '\n</head>', 1)
source = source.replace('</body>', script + '\n</body>', 1)
source_path.write_text(source, encoding='utf-8')
print(f'Enhanced {source_path}')
