import { config } from './config.js';

export function toast(message) {
  const node = document.querySelector('.toast');
  if (!node) return;
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => node.classList.remove('visible'), 3200);
}

const githubIcon = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M12 .8a11.2 11.2 0 0 0-3.54 21.82c.56.1.76-.24.76-.54v-2.1c-3.12.68-3.78-1.33-3.78-1.33-.5-1.3-1.24-1.64-1.24-1.64-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 1.72 2.63 1.22 3.27.94.1-.73.4-1.22.71-1.5-2.49-.28-5.11-1.24-5.11-5.54 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.11-2.96 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.6 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.54.23 2.68.11 2.96.72.78 1.15 1.78 1.15 3.01 0 4.31-2.62 5.25-5.12 5.53.4.35.76 1.03.76 2.08v3.08c0 .3.2.65.77.54A11.2 11.2 0 0 0 12 .8Z"/></svg>';
const resources = [['arxiv', 'arXiv', '<img src="./assets/icons/arxiv.svg" alt="" width="22" height="22">'], ['github', 'GitHub', githubIcon], ['huggingface', 'Hugging Face', '<span class="huggingface-icon">🤗</span>']];
export function initCommon() {
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  function closeDialog(dialog){
    if(!dialog.open||dialog.dataset.closing)return;
    if(reduceMotion.matches){dialog.close();return;}
    dialog.dataset.closing='true';
    dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(6px)'}],{duration:150,easing:'ease-in'}).finished.then(()=>dialog.close()).finally(()=>delete dialog.dataset.closing);
  }
  document.querySelectorAll('[data-resources]').forEach(container => {
    resources.forEach(([key, label, icon]) => {
      const node = document.createElement(config[key] ? 'a' : 'button');
      node.className = 'resource-button';
      node.innerHTML = `<span class="resource-icon" aria-hidden="true">${icon}</span>${label}`;
      if (config[key]) { node.href = config[key]; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
      else { node.setAttribute('aria-label', `${label} — coming soon`); node.title = 'Coming soon'; node.addEventListener('click', () => toast(`${label} — link coming soon.`)); }
      container.append(node);
    });
  });
  document.querySelectorAll('[data-icon="github"]').forEach(node => { node.innerHTML = githubIcon; });
  document.querySelectorAll('[data-resource]').forEach(node => {
    const key = node.dataset.resource;
    if (config[key]) { node.href = config[key]; node.target = '_blank'; node.rel = 'noopener noreferrer'; }
    else { node.href = '#usage'; node.setAttribute('aria-label', 'Evaluation code — coming soon'); node.addEventListener('click', e => { e.preventDefault(); toast('Evaluation code — link coming soon.'); }); }
  });

  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-dialog]');
    if(!button)return;
    const dialog=document.getElementById(button.dataset.dialog);
    if(!dialog)return;
    if(dialog.open)return;
    dialog.showModal();document.body.classList.add('dialog-open');
    if(!reduceMotion.matches)dialog.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:230,easing:'cubic-bezier(.22,1,.36,1)'});
  });
  document.querySelectorAll('dialog').forEach(dialog=>{
    dialog.querySelector('[data-close]')?.addEventListener('click',()=>closeDialog(dialog));
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);});
    dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog(dialog);});
  });
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window&&!document.documentElement.classList.contains('deck-enabled')) {
    document.documentElement.classList.add('js');
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    reveals.forEach(node => observer.observe(node));
  }

  if(document.documentElement.classList.contains('deck-enabled'))return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const layers = [...document.querySelectorAll('[data-parallax]')];
  const progress = document.querySelector('.scroll-progress');
  let pending = false;
  function update() {
    const y = window.scrollY;
    if (progress) progress.style.transform = `scaleX(${y / Math.max(1, document.documentElement.scrollHeight - innerHeight)})`;
    for (const el of layers) {
      const rect = el.getBoundingClientRect();
      if (!motion.matches && rect.bottom > -200 && rect.top < innerHeight + 200) {
        const offset = el.closest('.hero') ? y : (innerHeight / 2 - rect.top - rect.height / 2);
        el.style.setProperty('--parallax-y', `${Math.max(-140, Math.min(140, offset * Number(el.dataset.parallax)))}px`);
      } else if (motion.matches) el.style.removeProperty('--parallax-y');
    }
    pending = false;
  }
  addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  motion.addEventListener('change', update);
  update();
}

export function highlight(code) {
  return code.split('\n').map(line => {
    if (line.trim().startsWith('#')) return `<span class="code-comment">${escapeHTML(line)}</span>`;
    return line.split(/("[^"\n]*"|'[^'\n]*')/g).map((part, i) => i % 2 ? `<span class="code-string">${escapeHTML(part)}</span>` : escapeHTML(part).replace(/\b(from|import|as|print|None|True|False)\b/g, '<span class="code-keyword">$1</span>')).join('');
  }).join('\n');
}
export function escapeHTML(value) { return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
export function downloadCSV(rows, filename) {
  const csv = rows.map(row => row.map(v => `"${String(v).replaceAll('"','""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8;'}));
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
