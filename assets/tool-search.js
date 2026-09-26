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
  const params=new URLSearchParams(location.search);
  if(params.get('q')) input.value=params.get('q');
  input.addEventListener('input',()=>{
    filter();
    const url=new URL(location.href);
    if(input.value.trim()) url.searchParams.set('q',input.value.trim()); else url.searchParams.delete('q');
    history.replaceState(null,'',url.pathname+url.search+url.hash);
  });
  filter();
  document.addEventListener('keydown',e=>{
    if(e.key==='/' && document.activeElement!==input){e.preventDefault();input.focus();}
    if(e.key==='Escape' && document.activeElement===input){input.value='';filter();input.blur();}
  });
})();