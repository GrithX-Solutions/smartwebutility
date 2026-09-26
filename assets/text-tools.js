(() => {
'use strict';
const tool=document.body.dataset.tool;
const $=id=>document.getElementById(id);
const year=$('year'); if(year) year.textContent=new Date().getFullYear();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function copyText(value,btn){if(!value)return;try{await navigator.clipboard.writeText(value);const o=btn.textContent;btn.textContent='Copied';setTimeout(()=>btn.textContent=o,1200)}catch{}}

if(tool==='word-counter'||tool==='character-counter'){
 const input=$('textInput'), stats=$('textStats');
 function count(){
  const text=input.value;
  const chars=text.length, charsNoSpace=text.replace(/\s/g,'').length;
  const words=(text.trim().match(/\S+/g)||[]).length;
  const sentences=(text.match(/[.!?]+(?=\s|$)/g)||[]).length;
  const paragraphs=text.trim()?text.trim().split(/\n\s*\n/).length:0;
  const lines=text?text.split(/\n/).length:0;
  stats.innerHTML=[
   ['Words',words],['Characters',chars],['Without spaces',charsNoSpace],['Sentences',sentences],['Paragraphs',paragraphs],['Lines',lines]
  ].map(([k,v])=>'<div><b>'+v+'</b><span>'+k+'</span></div>').join('');
 }
 input.addEventListener('input',count); count();
}

if(tool==='case-converter'){
 const input=$('caseInput'), output=$('caseOutput');
 const words=s=>s.trim().split(/\s+/).filter(Boolean);
 const title=s=>words(s).map(w=>w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
 const camel=s=>{const w=words(s.toLowerCase().replace(/[_-]+/g,' '));return w.map((x,i)=>i?x.charAt(0).toUpperCase()+x.slice(1):x).join('')};
 const pascal=s=>{const c=camel(s);return c.charAt(0).toUpperCase()+c.slice(1)};
 const snake=s=>words(s.toLowerCase().replace(/[_-]+/g,' ')).join('_');
 const kebab=s=>words(s.toLowerCase().replace(/[_-]+/g,' ')).join('-');
 const sentence=s=>{const t=s.trim().toLowerCase();return t?t.charAt(0).toUpperCase()+t.slice(1):''};
 const map={upper:s=>s.toUpperCase(),lower:s=>s.toLowerCase(),title,camel,pascal,snake,kebab,sentence};
 document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{output.value=map[b.dataset.case](input.value)}));
 $('copyCase').addEventListener('click',e=>copyText(output.value,e.currentTarget));
 $('clearCase').addEventListener('click',()=>{input.value='';output.value='';input.focus()});
}

if(tool==='slug-generator'){
 const input=$('slugInput'), output=$('slugOutput'), sep=$('slugSeparator');
 function slugify(){
  let s=input.value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  s=s.replace(/[^a-z0-9]+/g,sep.value).replace(new RegExp('^'+sep.value+'+|'+sep.value+'+$','g'),'');
  output.value=s;
 }
 [input,sep].forEach(el=>el.addEventListener('input',slugify));
 $('copySlug').addEventListener('click',e=>copyText(output.value,e.currentTarget));
 $('clearSlug').addEventListener('click',()=>{input.value='';output.value='';input.focus()});
 slugify();
}

if(tool==='lorem-ipsum'){
 const paras=$('loremParagraphs'), sentences=$('loremSentences'), output=$('loremOutput');
 const pool=[
 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
 'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
 ];
 function generate(){
  const p=Math.max(1,Math.min(20,Number(paras.value)||1)), s=Math.max(1,Math.min(12,Number(sentences.value)||3));
  const out=[];
  for(let i=0;i<p;i++){const arr=[];for(let j=0;j<s;j++)arr.push(pool[(i+j)%pool.length]);out.push(arr.join(' '))}
  output.value=out.join('\n\n');
 }
 $('generateLorem').addEventListener('click',generate);
 $('copyLorem').addEventListener('click',e=>copyText(output.value,e.currentTarget));
 generate();
}

if(tool==='password-generator'||tool==='random-string-generator'){
 const length=$('genLength'), upper=$('genUpper'), lower=$('genLower'), nums=$('genNumbers'), symbols=$('genSymbols'), count=$('genCount'), output=$('genOutput'), status=$('genStatus');
 function securePick(chars,n){
  if(!chars) return '';
  const out=[]; const max=256-(256%chars.length); const buf=new Uint8Array(Math.max(32,n*2));
  while(out.length<n){crypto.getRandomValues(buf);for(const b of buf){if(b<max){out.push(chars[b%chars.length]);if(out.length===n)break}}}
  return out.join('');
 }
 function generate(){
  let chars='';
  if(upper.checked)chars+='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if(lower.checked)chars+='abcdefghijklmnopqrstuvwxyz';
  if(nums.checked)chars+='0123456789';
  if(symbols.checked)chars+=tool==='password-generator'?'!@#$%^&*()-_=+[]{};:,.?':'-_';
  if(!chars){status.textContent='Select at least one character set';status.dataset.kind='error';output.value='';return}
  const len=Math.max(4,Math.min(256,Number(length.value)||16)), n=Math.max(1,Math.min(100,Number(count.value)||1));
  output.value=Array.from({length:n},()=>securePick(chars,len)).join('\n');
  status.textContent=n+' generated';status.dataset.kind='success';
 }
 $('generateStrings').addEventListener('click',generate);
 $('copyStrings').addEventListener('click',e=>copyText(output.value,e.currentTarget));
 [length,count,upper,lower,nums,symbols].forEach(el=>el.addEventListener('change',generate));
 generate();
}
})();