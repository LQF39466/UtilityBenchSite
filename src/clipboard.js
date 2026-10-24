// Keep the selection-based copy in the click's synchronous user gesture. This
// also works on HTTP/LAN previews and WebViews that deny Clipboard.writeText.
function copySelection(text) {
  if (typeof document.execCommand !== 'function') return false;
  const focused = document.activeElement;
  const selection = document.getSelection();
  const ranges = selection ? Array.from({length:selection.rangeCount}, (_,i)=>selection.getRangeAt(i).cloneRange()) : [];
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.tabIndex = -1;
  field.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none';
  document.body.append(field);
  try {
    field.focus({preventScroll:true});
    field.select();
    field.setSelectionRange(0,field.value.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
    if (focused instanceof HTMLElement && focused.isConnected) focused.focus({preventScroll:true});
    if (selection) {
      selection.removeAllRanges();
      ranges.forEach(range=>selection.addRange(range));
    }
  }
}

export function bindCopy(button, getText) {
  const original = button.innerHTML;
  const label = button.getAttribute('aria-label');
  let reset;
  button.addEventListener('click',async()=>{
    const text = getText();
    // Start both paths before yielding, so a denied async write cannot outlive
    // the user gesture required by WebKit's selection-based copy.
    let clipboardWrite;
    try { clipboardWrite = navigator.clipboard?.writeText(text); } catch {}
    let copied = copySelection(text);
    if (clipboardWrite) {
      try { await clipboardWrite; copied = true; } catch {}
    }
    if (!copied) { button.hidden = true; return; }
    clearTimeout(reset);
    button.textContent = 'Copied';
    button.dataset.copyState = 'copied';
    button.setAttribute('aria-label',`${label} — copied`);
    reset = setTimeout(()=>{
      button.innerHTML = original;
      button.removeAttribute('data-copy-state');
      button.setAttribute('aria-label',label);
    },1800);
  });
}
