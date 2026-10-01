(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const direction = $('morseDirection');
  const input = $('morseInput');
  const output = $('morseOutput');
  const status = $('morseStatus');
  const errorBox = $('morseError');
  const stats = $('morseStats');
  const wpm = $('morseWpm');
  const frequency = $('morseFrequency');
  const wpmValue = $('morseWpmValue');
  const frequencyValue = $('morseFrequencyValue');

  if (!direction || !input || !output) return;

  const MORSE = {
    A:'.-', B:'-...', C:'-.-.', D:'-..', E:'.', F:'..-.', G:'--.', H:'....', I:'..', J:'.---',
    K:'-.-', L:'.-..', M:'--', N:'-.', O:'---', P:'.--.', Q:'--.-', R:'.-.', S:'...', T:'-',
    U:'..-', V:'...-', W:'.--', X:'-..-', Y:'-.--', Z:'--..',
    '0':'-----','1':'.----','2':'..---','3':'...--','4':'....-','5':'.....',
    '6':'-....','7':'--...','8':'---..','9':'----.',
    '.':'.-.-.-', ',':'--..--', '?':'..--..', "'":'.----.', '!':'-.-.--', '/':'-..-.',
    '(':'-.--.', ')':'-.--.-', '&':'.-...', ':':'---...', ';':'-.-.-.', '=':'-...-',
    '+':'.-.-.', '-':'-....-', '_':'..--.-', '"':'.-..-.', '$':'...-..-', '@':'.--.-.'
  };
  const TEXT = Object.fromEntries(Object.entries(MORSE).map(([key,value]) => [value,key]));

  let audioContext = null;
  let audioTimer = null;

  function setStatus(message) { if (status) status.textContent = message; }
  function clearError() { if (errorBox) { errorBox.textContent=''; errorBox.hidden=true; } }
  function showError(message) { if (errorBox) { errorBox.textContent=message; errorBox.hidden=false; } }

  function normalizeMorse(value) {
    return String(value)
      .replace(/[·•]/g,'.')
      .replace(/[−–—]/g,'-')
      .replace(/[|]/g,'/')
      .trim();
  }

  function textToMorse(value) {
    const words=String(value).trim().toUpperCase().split(/\s+/).filter(Boolean);
    const unsupported=new Set();
    const encoded=words.map(word => [...word].map(ch => {
      if (MORSE[ch]) return MORSE[ch];
      unsupported.add(ch);
      return null;
    }).filter(Boolean).join(' '));
    if (unsupported.size) {
      throw new Error('Unsupported characters: ' + [...unsupported].slice(0,12).join(' ') + '. Use A–Z, 0–9 and supported punctuation.');
    }
    return encoded.join(' / ');
  }

  function morseToText(value) {
    const normalized=normalizeMorse(value);
    if (!normalized) return '';
    const words=normalized.split(/\s*\/\s*|\s{3,}/).filter(Boolean);
    const invalid=new Set();
    const decoded=words.map(word => word.trim().split(/\s+/).filter(Boolean).map(token => {
      if (TEXT[token]) return TEXT[token];
      invalid.add(token);
      return '�';
    }).join('')).join(' ');
    if (invalid.size) {
      throw new Error('Unknown Morse sequence' + (invalid.size>1?'s':'') + ': ' + [...invalid].slice(0,8).join(', '));
    }
    return decoded;
  }

  function convert() {
    clearError();
    const raw=input.value;
    if(!raw.trim()){output.value='';stats.hidden=true;setStatus('Add input');return false;}
    try{
      const result=direction.value==='text-to-morse' ? textToMorse(raw) : morseToText(raw);
      output.value=result;
      stats.hidden=false;
      if(direction.value==='text-to-morse'){
        const tokens=result.split(/\s+/).filter(t=>t!== '/' && t);
        const signals=(result.match(/[.-]/g)||[]).length;
        stats.innerHTML='<span><b>'+tokens.length.toLocaleString()+'</b> Morse characters</span><span><b>'+signals.toLocaleString()+'</b> dots/dashes</span><span><b>'+result.length.toLocaleString()+'</b> output characters</span>';
      }else{
        stats.innerHTML='<span><b>'+result.length.toLocaleString()+'</b> text characters</span><span><b>'+result.trim().split(/\s+/).filter(Boolean).length.toLocaleString()+'</b> words</span>';
      }
      setStatus('Translated');
      return true;
    }catch(e){
      output.value='';stats.hidden=true;showError(e&&e.message?e.message:String(e));setStatus('Fix input');return false;
    }
  }

  function morseForPlayback() {
    if(direction.value==='text-to-morse'){
      if(!output.value && !convert()) return '';
      return normalizeMorse(output.value);
    }
    return normalizeMorse(input.value);
  }

  async function stopAudio(update=true) {
    if(audioTimer){clearTimeout(audioTimer);audioTimer=null;}
    if(audioContext){
      try{await audioContext.close();}catch{}
      audioContext=null;
    }
    if(update) setStatus('Playback stopped');
  }

  async function playAudio() {
    clearError();
    await stopAudio(false);
    const morse=morseForPlayback();
    if(!morse) return;
    const words=morse.split(/\s*\/\s*|\s{3,}/).filter(Boolean);
    const parsed=[];
    for(const word of words){
      const letters=word.trim().split(/\s+/).filter(Boolean);
      for(const token of letters){
        if(!TEXT[token]){showError('Cannot play unknown Morse sequence: '+token);setStatus('Fix Morse input');return;}
      }
      parsed.push(letters);
    }

    const WPM=Math.max(5,Math.min(40,Number(wpm.value)||18));
    const hz=Math.max(300,Math.min(1000,Number(frequency.value)||650));
    const unit=1200/WPM/1000;
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx){showError('Web Audio playback is not supported in this browser.');return;}

    const ctx=new AudioCtx();
    audioContext=ctx;
    await ctx.resume();
    const oscillator=ctx.createOscillator();
    const gain=ctx.createGain();
    oscillator.type='sine';
    oscillator.frequency.value=hz;
    gain.gain.setValueAtTime(0,ctx.currentTime);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();

    let t=ctx.currentTime+0.06;
    for(let wi=0;wi<parsed.length;wi++){
      const letters=parsed[wi];
      for(let li=0;li<letters.length;li++){
        const token=letters[li];
        for(let si=0;si<token.length;si++){
          const duration=(token[si]==='-'?3:1)*unit;
          gain.gain.setValueAtTime(0.22,t);
          gain.gain.setValueAtTime(0,t+duration);
          t+=duration;
          if(si<token.length-1)t+=unit;
        }
        if(li<letters.length-1)t+=3*unit;
      }
      if(wi<parsed.length-1)t+=7*unit;
    }
    const seconds=t-ctx.currentTime;
    if(seconds>120){
      await stopAudio(false);
      showError('Playback would exceed 120 seconds. Shorten the message or increase WPM.');
      setStatus('Message too long for audio');
      return;
    }
    oscillator.stop(t+0.05);
    setStatus('Playing Morse audio · '+WPM+' WPM · '+hz+' Hz');
    audioTimer=setTimeout(()=>{
      if(audioContext===ctx){audioContext.close().catch(()=>{});audioContext=null;setStatus('Playback complete');}
      audioTimer=null;
    },Math.ceil((seconds+0.15)*1000));
  }

  function syncDirection() {
    stopAudio(false);
    output.value='';
    stats.hidden=true;
    clearError();
    if(direction.value==='text-to-morse'){
      input.placeholder='SOS from Smart Web Utility';
      output.placeholder='... --- ... / ..-. .-. --- -- / ... -- .- .-. - / .-- . -... / ..- - .. .-.. .. - -.--';
      setStatus('Text → Morse');
    }else{
      input.placeholder='... --- ... / .... . .-.. .--.';
      output.placeholder='SOS HELP';
      setStatus('Morse → Text');
    }
  }

  $('morseConvert')?.addEventListener('click',convert);
  direction.addEventListener('change',syncDirection);
  $('morseExample')?.addEventListener('click',()=>{
    if(direction.value==='text-to-morse') input.value='SOS HELP 2026';
    else input.value='... --- ... / .... . .-.. .--. / ..--- ----- ..--- -....';
    convert();
  });
  $('morseClear')?.addEventListener('click',()=>{
    stopAudio(false);input.value='';output.value='';stats.hidden=true;clearError();setStatus('Ready');input.focus();
  });
  $('morseCopy')?.addEventListener('click',async()=>{
    if(!output.value)return;
    try{await navigator.clipboard.writeText(output.value);}catch{output.select();document.execCommand('copy');}
    setStatus('Copied');
  });
  $('morsePlay')?.addEventListener('click',playAudio);
  $('morseStop')?.addEventListener('click',()=>stopAudio(true));

  function syncAudioLabels(){
    wpmValue.value=wpm.value+' WPM';
    frequencyValue.value=frequency.value+' Hz';
  }
  [wpm,frequency].forEach(control=>control?.addEventListener('input',syncAudioLabels));
  input.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();convert();}});
  window.addEventListener('pagehide',()=>stopAudio(false),{once:true});
  syncAudioLabels();
  syncDirection();
})();