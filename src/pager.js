import {createWheelIntent,wheelPixels,swipeDirection} from './page-input.js';

export function initPager(){
  const root=document.documentElement,pages=[...document.querySelectorAll('main>.page-screen')];
  if(!pages.length)return;
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),phone=matchMedia('(max-width:760px)');
  const footer=document.querySelector('.footer');
  if(footer)pages.at(-1).append(footer);
  const labels=['Home','Leaderboard','Dataset','Method','Findings','Usage','Citations'];
  const nav=document.createElement('nav');nav.className='page-nav';nav.setAttribute('aria-label','Page navigation');
  nav.innerHTML=pages.map((p,i)=>`<button type="button" data-page="${i}" aria-label="${labels[i]}" aria-controls="${p.id}"><span class="page-dot" aria-hidden="true"></span><span class="page-nav-label" aria-hidden="true">${labels[i]}</span></button>`).join('');
  document.body.append(nav);
  const dots=[...nav.querySelectorAll('button')],progress=document.querySelector('.scroll-progress');
  const wheel=createWheelIntent();
  let index=-1,busy=false,lockedUntil=0,settleTimer,pending=null,animations=[],touch=null;
  function pageForHash(){
    let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return 0;}
    const target=id?document.getElementById(id):null;
    const page=target?.closest('.page-screen');return Math.max(0,pages.indexOf(page));
  }
  function announce(phase){document.dispatchEvent(new CustomEvent('utility:pagechange',{detail:{id:pages[index].id,index,phase}}));}
  function parts(page){
    const selectors=page.id==='top'?'.hero-title-block,.hero-divider,.hero-description,.resource-links,.hero-art,.hero-bottom'
      :page.id==='results'?'.section-heading,.benchmark-dashboard,.results-footnote'
      :page.id==='dataset'?'.section-heading,.dataset-facts,.distribution-panel'
      :page.classList.contains('story-section')?'.section-heading,.story-tabs,.story-copy,.story-visual'
      :page.id==='usage'?'.usage-layout>div':'.citation-layout>h2,.citation-intro,.citation-card,.footer';
    return [...page.querySelectorAll(selectors)];
  }
  function animate(page,direction,enter){
    if(motion.matches)return;
    parts(page).forEach((node,i)=>{
      const art=node.classList.contains('hero-art'),distance=art?54:20+(i%3)*7;
      const frames=enter?[{opacity:0,transform:`translate3d(0,${distance*direction}px,0)`},{opacity:1,transform:'translate3d(0,0,0)'}]
        :[{opacity:1,transform:'translate3d(0,0,0)'},{opacity:0,transform:`translate3d(0,${-12*direction}px,0)`}];
      animations.push(node.animate(frames,{duration:enter?(art?660:480):220,delay:enter?Math.min(i*35,140):0,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'}));
    });
  }
  function finish(){
    clearTimeout(settleTimer);busy=false;delete root.dataset.pageTransitioning;
    pages.forEach(p=>p.classList.remove('is-leaving'));
    animations.forEach(a=>a.cancel());animations=[];
    announce('settled');
    if(pending){const next=pending;pending=null;go(next.index,next.options);}
  }
  function go(next,{history='replace',focus=false,initial=false}={}){
    next=Math.max(0,Math.min(pages.length-1,next));
    if(next===index)return;
    if(busy&&!initial){pending={index:next,options:{history,focus}};return;}
    const previous=pages[index],direction=next>=index?1:-1;
    index=next;busy=true;root.dataset.pageTransitioning='true';
    lockedUntil=performance.now()+(motion.matches?250:760);
    pages.forEach((p,i)=>{
      const active=i===index;p.classList.toggle('is-active',active);p.classList.toggle('is-leaving',p===previous);
      p.dataset.pageActive=String(active);p.inert=!active;p.setAttribute('aria-hidden',String(!active));
    });
    dots.forEach((b,i)=>{if(i===index)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.querySelectorAll('.header nav a').forEach(a=>{if(a.hash==='#'+pages[index].id)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    root.dataset.activePage=pages[index].id;
    if(progress)progress.style.transform=`scaleX(${index/(pages.length-1)})`;
    if(!initial&&history!=='none')window.history[history==='push'?'pushState':'replaceState'](null,'','#'+pages[index].id);
    if(focus){const heading=pages[index].querySelector('h1,h2');heading.tabIndex=-1;heading.focus({preventScroll:true});}
    announce('start');
    if(previous)animate(previous,direction,false);
    animate(pages[index],direction,true);
    settleTimer=setTimeout(finish,motion.matches?0:820);
  }
  function canScroll(target,direction){
    let node=target instanceof Element?target:pages[index];
    while(node&&node!==document.body){
      const overflow=getComputedStyle(node).overflowY;
      if(/auto|scroll/.test(overflow)&&node.scrollHeight>node.clientHeight+2){
        if(direction>0?node.scrollTop+node.clientHeight<node.scrollHeight-2:node.scrollTop>2)return true;
      }
      if(node===pages[index])break;
      node=node.parentElement;
    }
    return false;
  }
  function blocked(target){return document.body.classList.contains('dialog-open')||target?.closest('dialog[open]');}
  window.addEventListener('wheel',e=>{
    if(e.ctrlKey||e.metaKey||blocked(e.target)||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
    if(e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
    const delta=wheelPixels(e.deltaY,e.deltaMode,innerHeight);
    const result=wheel.update(delta,performance.now(),{locked:busy||performance.now()<lockedUntil,nested:canScroll(e.target,Math.sign(delta))});
    if(!result.allowNative&&e.cancelable)e.preventDefault();
    if(result.direction)go(index+result.direction);
  },{passive:false});
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||blocked(e.target))return;
    if(e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
    if(e.key===' '&&e.target.closest('button,a,[role="button"],[role="tab"]'))return;
    const direction=['ArrowDown','PageDown',' '].includes(e.key)?(e.shiftKey&&e.key===' '?-1:1):['ArrowUp','PageUp'].includes(e.key)?-1:0;
    if(!direction&&!['Home','End'].includes(e.key))return;
    if(direction&&canScroll(e.target,direction))return;
    e.preventDefault();if(e.repeat||busy)return;
    go(e.key==='Home'?0:e.key==='End'?pages.length-1:index+direction,{focus:true});
  });
  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1||blocked(e.target)){touch=null;return;}
    touch={x:e.touches[0].clientX,y:e.touches[0].clientY,target:e.target,axis:null,claimed:false,turned:false};
  },{passive:true});
  document.addEventListener('touchmove',e=>{
    if(!touch||e.touches.length!==1||blocked(e.target)||touch.target.closest('input,select,textarea'))return;
    const dx=touch.x-e.touches[0].clientX,dy=touch.y-e.touches[0].clientY;
    if(!touch.axis&&Math.max(Math.abs(dx),Math.abs(dy))>8)touch.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    if(touch.axis==='x')return;
    if(touch.turned||busy){if(e.cancelable)e.preventDefault();return;}
    if(touch.claimed)return;
    if(canScroll(touch.target,Math.sign(dy))){touch.claimed=true;return;}
    if(Math.abs(dy)>8&&e.cancelable)e.preventDefault();
    const direction=swipeDirection(dx,dy);
    if(direction){touch.turned=true;go(index+direction);}
  },{passive:false});
  document.addEventListener('touchend',()=>touch=null,{passive:true});
  document.addEventListener('touchcancel',()=>touch=null,{passive:true});
  dots.forEach((b,i)=>b.addEventListener('click',()=>go(i,{history:'push'})));
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href]');if(!link||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.target==='_blank')return;
    const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname!==location.pathname)return;
    if(url.hash==='#main'){e.preventDefault();const h=pages[index].querySelector('h1,h2');h.tabIndex=-1;h.focus({preventScroll:true});return;}
    const page=url.hash?document.getElementById(url.hash.slice(1))?.closest('.page-screen'):link.classList.contains('brand')?pages[0]:null;
    if(!page)return;e.preventDefault();go(pages.indexOf(page),{history:'push'});
  });
  addEventListener('hashchange',()=>go(pageForHash(),{history:'none'}));
  addEventListener('popstate',()=>go(pageForHash(),{history:'none'}));
  document.addEventListener('visibilitychange',()=>{root.toggleAttribute('data-document-hidden',document.hidden);if(document.hidden&&busy)finish();});
  motion.addEventListener('change',()=>{if(busy)finish();});
  phone.addEventListener('change',()=>{pages.forEach(p=>p.scrollTop=0);if(busy)finish();});
  root.classList.add('deck-enabled');history.scrollRestoration='manual';
  go(pageForHash(),{history:'none',initial:true});
}
