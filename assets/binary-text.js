(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const direction=$('binaryTextDirection');
  const encoding=$('binaryTextEncoding');
  const format=$('binaryTextFormat');
  const input=$('binaryTextInput');
  const output=$('binaryTextOutput');
  const status=$('binaryTextStatus');
  const error=$('binaryTextError');
  const stats=$('binaryTextStats');
  if(!direction||!input||!output)return;

  function setStatus(message){status.textContent=message;}
  function clearError(){error.textContent='';error.hidden=true;}
  function showError(message){error.textContent=message;error.hidden=false;}

  function parseBinary(raw){
    const trimmed=String(raw).trim();
    if(!trimmed)return [];
    const normalized=trimmed.replace(/0b/gi,'');
    const tokens=normalized.split(/[\s,:;_-]+/).filter(Boolean);
    if(!tokens.length)throw new Error('No binary digits were found.');
    let joined='';
    for(const token of tokens){
      if(!/^[01]+$/.test(token))throw new Error('Invalid binary token: '+token.slice(0,32));
      joined+=token;
    }
    if(joined.length%8)throw new Error('Binary input must contain complete 8-bit bytes. Current bit count: '+joined.length+'.');
    const bytes=[];
    for(let i=0;i<joined.length;i+=8)bytes.push(parseInt(joined.slice(i,i+8),2));
    return bytes;
  }

  function asciiFromBytes(bytes){
    const invalid=bytes.find(byte=>byte>0x7f);
    if(invalid!=null)throw new Error('Byte '+invalid.toString(2).padStart(8,'0')+' is outside 7-bit ASCII. Switch to UTF-8 if the bytes are UTF-8 text.');
    return bytes.map(byte=>{
      if(byte===9)return '\t';
      if(byte===10)return '\n';
      if(byte===13)return '\r';
      if(byte>=32&&byte<=126)return String.fromCharCode(byte);
      return '\\x'+byte.toString(16).padStart(2,'0').toUpperCase();
    }).join('');
  }

  function utf8FromBytes(bytes){
    try{return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes));}
    catch{throw new Error('The binary byte sequence is not valid UTF-8.');}
  }

  function bytesFromText(text){
    if(encoding.value==='utf8')return [...new TextEncoder().encode(text)];
    const bytes=[],invalid=new Set();
    for(const ch of [...text]){
      const code=ch.codePointAt(0);
      if(code>0x7f){invalid.add(ch);continue;}
      bytes.push(code);
    }
    if(invalid.size)throw new Error('Non-ASCII character'+(invalid.size>1?'s':'')+': '+[...invalid].slice(0,10).join(' ')+'. Switch to UTF-8 to encode them.');
    return bytes;
  }

  function formatBinary(bytes){
    const values=bytes.map(byte=>byte.toString(2).padStart(8,'0'));
    if(format.value==='continuous')return values.join('');
    if(format.value==='0b')return values.map(value=>'0b'+value).join(' ');
    return values.join(' ');
  }

  function convert(){
    clearError();
    const raw=input.value;
    if(!raw){output.value='';stats.hidden=true;setStatus('Add input');return false;}
    try{
      let bytes,result;
      if(direction.value==='binary-to-text'){
        bytes=parseBinary(raw);
        result=encoding.value==='utf8'?utf8FromBytes(bytes):asciiFromBytes(bytes);
      }else{
        bytes=bytesFromText(raw);
        result=formatBinary(bytes);
      }
      output.value=result;
      stats.hidden=false;
      stats.innerHTML='<span><b>'+bytes.length.toLocaleString()+'</b> bytes</span><span><b>'+(bytes.length*8).toLocaleString()+'</b> bits</span><span><b>'+(encoding.value==='utf8'?'UTF-8':'ASCII')+'</b> mode</span>';
      setStatus('Converted');
      return true;
    }catch(e){
      output.value='';stats.hidden=true;showError(e&&e.message?e.message:String(e));setStatus('Fix input');return false;
    }
  }

  function sync(){
    output.value='';stats.hidden=true;clearError();
    const toText=direction.value==='binary-to-text';
    input.placeholder=toText?'01001000 01100101 01101100 01101100 01101111':'Hello';
    output.placeholder=toText?'Hello':'01001000 01100101 01101100 01101100 01101111';
    format.disabled=toText;
    setStatus(toText?'Binary → text':'Text → binary');
  }

  $('binaryTextConvert')?.addEventListener('click',convert);
  direction.addEventListener('change',sync);
  encoding.addEventListener('change',()=>{if(input.value)convert();});
  format.addEventListener('change',()=>{if(direction.value==='text-to-binary'&&input.value)convert();});
  $('binaryTextExample')?.addEventListener('click',()=>{
    if(direction.value==='binary-to-text')input.value='01001000 01100101 01101100 01101100 01101111';
    else input.value='Hello';
    convert();
  });
  $('binaryTextClear')?.addEventListener('click',()=>{input.value='';output.value='';stats.hidden=true;clearError();setStatus('Ready');input.focus();});
  $('binaryTextCopy')?.addEventListener('click',async()=>{
    if(!output.value)return;
    try{await navigator.clipboard.writeText(output.value);}catch{output.select();document.execCommand('copy');}
    setStatus('Copied');
  });
  input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();convert();}});
  sync();
})();