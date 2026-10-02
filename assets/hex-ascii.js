(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const direction=$('hexAsciiDirection');
  const encoding=$('hexAsciiEncoding');
  const format=$('hexAsciiFormat');
  const letterCase=$('hexAsciiCase');
  const input=$('hexAsciiInput');
  const output=$('hexAsciiOutput');
  const status=$('hexAsciiStatus');
  const error=$('hexAsciiError');
  const stats=$('hexAsciiStats');
  if(!direction||!input||!output)return;

  function setStatus(message){status.textContent=message;}
  function clearError(){error.textContent='';error.hidden=true;}
  function showError(message){error.textContent=message;error.hidden=false;}

  function parseHex(raw){
    const trimmed=String(raw).trim();
    if(!trimmed) return [];
    const normalized=trimmed.replace(/0x/gi,'');
    const tokens=normalized.split(/[\s,:;_-]+/).filter(Boolean);
    if(!tokens.length) throw new Error('No hexadecimal bytes were found.');
    let joined='';
    for(const token of tokens){
      if(!/^[0-9a-fA-F]+$/.test(token)) throw new Error('Invalid hexadecimal token: '+token.slice(0,30));
      joined+=token;
    }
    if(joined.length%2) throw new Error('Hex input has an odd number of digits. Each byte needs two hexadecimal digits.');
    const bytes=[];
    for(let i=0;i<joined.length;i+=2) bytes.push(parseInt(joined.slice(i,i+2),16));
    return bytes;
  }

  function asciiFromBytes(bytes){
    const invalid=bytes.find(byte=>byte>0x7f);
    if(invalid!=null) throw new Error('Byte 0x'+invalid.toString(16).padStart(2,'0').toUpperCase()+' is outside 7-bit ASCII. Switch encoding to UTF-8 if the bytes are UTF-8 text.');
    return bytes.map(byte=>{
      if(byte===9)return '\t';
      if(byte===10)return '\n';
      if(byte===13)return '\r';
      if(byte>=32&&byte<=126)return String.fromCharCode(byte);
      return '\\x'+byte.toString(16).padStart(2,'0').toUpperCase();
    }).join('');
  }

  function utf8FromBytes(bytes){
    try{
      return new TextDecoder('utf-8',{fatal:true}).decode(new Uint8Array(bytes));
    }catch{
      throw new Error('The byte sequence is not valid UTF-8. Use ASCII for 7-bit data or correct the hex bytes.');
    }
  }

  function bytesFromText(text){
    if(encoding.value==='utf8') return [...new TextEncoder().encode(text)];
    const bytes=[];
    const invalid=new Set();
    for(const ch of [...text]){
      const code=ch.codePointAt(0);
      if(code>0x7f){invalid.add(ch);continue;}
      bytes.push(code);
    }
    if(invalid.size) throw new Error('Non-ASCII character'+(invalid.size>1?'s':'')+': '+[...invalid].slice(0,10).join(' ') + '. Switch encoding to UTF-8 to encode them.');
    return bytes;
  }

  function formatHex(bytes){
    const upper=letterCase.value==='upper';
    const values=bytes.map(byte=>{
      const value=byte.toString(16).padStart(2,'0');
      return upper?value.toUpperCase():value.toLowerCase();
    });
    if(format.value==='continuous') return values.join('');
    if(format.value==='0x') return values.map(value=>'0x'+value).join(' ');
    return values.join(' ');
  }

  function convert(){
    clearError();
    const raw=input.value;
    if(!raw){output.value='';stats.hidden=true;setStatus('Add input');return false;}
    try{
      let result,bytes;
      if(direction.value==='hex-to-text'){
        bytes=parseHex(raw);
        result=encoding.value==='utf8'?utf8FromBytes(bytes):asciiFromBytes(bytes);
      }else{
        bytes=bytesFromText(raw);
        result=formatHex(bytes);
      }
      output.value=result;
      stats.hidden=false;
      stats.innerHTML='<span><b>'+bytes.length.toLocaleString()+'</b> bytes</span><span><b>'+result.length.toLocaleString()+'</b> output characters</span><span><b>'+(encoding.value==='utf8'?'UTF-8':'ASCII')+'</b> mode</span>';
      setStatus('Converted');
      return true;
    }catch(e){
      output.value='';stats.hidden=true;showError(e&&e.message?e.message:String(e));setStatus('Fix input');return false;
    }
  }

  function sync(){
    output.value='';stats.hidden=true;clearError();
    const toText=direction.value==='hex-to-text';
    input.placeholder=toText?'48 65 6C 6C 6F 20 57 6F 72 6C 64':'Hello World';
    output.placeholder=toText?'Hello World':'48 65 6C 6C 6F';
    format.disabled=toText;
    letterCase.disabled=toText;
    setStatus(toText?'Hex → text':'Text → hex');
  }

  $('hexAsciiConvert')?.addEventListener('click',convert);
  direction.addEventListener('change',sync);
  encoding.addEventListener('change',()=>{if(input.value)convert();});
  format.addEventListener('change',()=>{if(direction.value==='text-to-hex'&&input.value)convert();});
  letterCase.addEventListener('change',()=>{if(direction.value==='text-to-hex'&&input.value)convert();});
  $('hexAsciiExample')?.addEventListener('click',()=>{
    if(direction.value==='hex-to-text') input.value='48 65 6C 6C 6F 20 57 6F 72 6C 64';
    else input.value='Hello World';
    convert();
  });
  $('hexAsciiClear')?.addEventListener('click',()=>{input.value='';output.value='';stats.hidden=true;clearError();setStatus('Ready');input.focus();});
  $('hexAsciiCopy')?.addEventListener('click',async()=>{
    if(!output.value)return;
    try{await navigator.clipboard.writeText(output.value);}catch{output.select();document.execCommand('copy');}
    setStatus('Copied');
  });
  input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();convert();}});
  sync();
})();