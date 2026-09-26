(() => {
'use strict';
const type=document.getElementById('schemaType'), name=document.getElementById('schemaName'), url=document.getElementById('schemaUrl'), desc=document.getElementById('schemaDescription'), image=document.getElementById('schemaImage'), output=document.getElementById('schemaOutput'), year=document.getElementById('year');
if(year)year.textContent=new Date().getFullYear();
function build(){
 const obj={"@context":"https://schema.org","@type":type.value};
 if(name.value.trim())obj.name=name.value.trim();
 if(url.value.trim())obj.url=url.value.trim();
 if(desc.value.trim())obj.description=desc.value.trim();
 if(image.value.trim())obj.image=image.value.trim();
 output.value='<script type="application/ld+json">\\n'+JSON.stringify(obj,null,2)+'\\n<\\/script>';
}
document.querySelectorAll('#schemaType,#schemaName,#schemaUrl,#schemaDescription,#schemaImage').forEach(el=>el.addEventListener('input',build));
document.getElementById('copySchema').addEventListener('click',async e=>{await navigator.clipboard.writeText(output.value);const b=e.currentTarget,o=b.textContent;b.textContent='Copied';setTimeout(()=>b.textContent=o,1200)});
document.getElementById('exampleSchema').addEventListener('click',()=>{type.value='SoftwareApplication';name.value='Smart Web Utility';url.value='https://smartwebutility.com/';desc.value='Fast, free online web tools.';image.value='';build()});
document.getElementById('clearSchema').addEventListener('click',()=>{type.value='Organization';name.value='';url.value='';desc.value='';image.value='';build()});
build();
})();