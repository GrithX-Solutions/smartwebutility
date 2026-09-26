(() => {
  'use strict';
  const input=document.getElementById('toolSearch');
  if(!input)return;
  const cards=[...document.querySelectorAll('[data-search]')];
  const empty=document.getElementById('searchEmpty');
  const sections=[...document.querySelectorAll('.tool-category')];
  function filter(){
    const q=input.value.trim().toLowerCase();
    let shown=0;
    cards.forEach(card=>{
      const hay=(card.dataset.search||'').toLowerCase();
      const ok=!q||hay.includes(q);
      card.hidden=!ok;
      if(ok)shown++;
    });
    sections.forEach(section=>{
      const visible=[...section.querySelectorAll('[data-search]')].some(c=>!c.hidden);
      section.hidden=!visible;
    });
    if(empty)empty.classList.toggle('show',shown===0);
  }
  input.addEventListener('input',filter);
  document.addEventListener('keydown',e=>{
    if(e.key==='/' && document.activeElement!==input){e.preventDefault();input.focus();}
    if(e.key==='Escape' && document.activeElement===input){input.value='';filter();input.blur();}
  });
})();