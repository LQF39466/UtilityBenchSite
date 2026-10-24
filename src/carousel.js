// Only the active, visible story owns a clock. Manual selection stays paused.
export function createStory({section,selector,panel,durations,render}){
  const tabs=[...section.querySelectorAll(selector)],play=section.querySelector('[data-story-play]');
  const root=document.documentElement,motion=matchMedia('(prefers-reduced-motion: reduce)');
  let index=-1,elapsed=0,visible=false,userPaused=motion.matches,last=0,frame=0,lastPaint=0,cleanup;
  const duration=()=>Array.isArray(durations)?durations[index]:durations;
  const canPlay=()=>!userPaused&&!document.hidden&&!document.body.classList.contains('dialog-open')&&!root.dataset.pageTransitioning&&(root.classList.contains('deck-enabled')?section.dataset.pageActive==='true':visible);
  function control(){
    play.setAttribute('aria-pressed',String(userPaused));play.setAttribute('aria-label',`${userPaused?'Play':'Pause'} ${section.id} autoplay`);
    play.querySelector('span').textContent=userPaused?'Play':'Pause';
    play.querySelector('svg').innerHTML=userPaused?'<path d="m8 5 11 7-11 7Z" fill="currentColor"/>':'<path d="M8 5v14M16 5v14" fill="none" stroke="currentColor" stroke-width="2"/>';
  }
  function progress(){tabs[index].style.setProperty('--story-progress',Math.min(1,elapsed/duration()));}
  function select(next){
    const target=(next+tabs.length)%tabs.length;if(target===index)return;
    cleanup?.();index=target;elapsed=0;
    tabs.forEach((t,i)=>{const active=i===index;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;t.style.setProperty('--story-progress',0);});
    panel.setAttribute('aria-labelledby',tabs[index].id);section.dataset.storyScene=tabs[index].dataset.method||tabs[index].dataset.finding;cleanup=render(tabs[index]);progress();
  }
  function tick(now){
    frame=0;if(!canPlay())return;
    elapsed+=Math.min(100,now-last);last=now;
    if(elapsed>=duration())select(index+1);
    if(now-lastPaint>=50){progress();lastPaint=now;}
    frame=requestAnimationFrame(tick);
  }
  function clock(){
    if(canPlay()){if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}}
    else if(frame){cancelAnimationFrame(frame);frame=0;}
  }
  function pause(){if(userPaused)return;userPaused=true;control();clock();}
  tabs.forEach((t,i)=>{
    t.addEventListener('click',()=>{pause();select(i);});
    t.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();pause();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:index+(e.key==='ArrowRight'?1:-1);select(next);tabs[(next+tabs.length)%tabs.length].focus({preventScroll:true});}});
  });
  play.addEventListener('click',()=>{userPaused=!userPaused;control();clock();});
  section.addEventListener('click',e=>{if(e.target.closest('[data-dialog],[data-component]'))pause();});
  section.addEventListener('pointerdown',e=>{if(e.target.closest('input,select'))pause();});
  ['input','change'].forEach(type=>section.addEventListener(type,e=>{if(e.target.matches('input,select'))pause();}));
  section.addEventListener('scroll',e=>{if(e.target===section||e.target.matches('.thinking-run-list,#finding-description'))pause();},{capture:true,passive:true});
  if(!root.classList.contains('deck-enabled'))new IntersectionObserver(entries=>{visible=entries[0].intersectionRatio>=.25;clock();},{threshold:[0,.25,.5]}).observe(section);
  document.addEventListener('utility:pagechange',clock);
  document.addEventListener('visibilitychange',clock);
  motion.addEventListener('change',()=>{if(motion.matches)pause();});
  control();select(0);clock();
  return {select,pause};
}
