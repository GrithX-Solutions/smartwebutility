import {execFile} from 'node:child_process';
import {promises as fs} from 'node:fs';
import path from 'node:path';

const JOB_DIR='/jobs';
const PROXY='http://lighthouse_proxy:8899';
const POLL_MS=400;
let running=false;

await fs.mkdir(JOB_DIR,{recursive:true});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function slimAudit(a,id){
  if(!a || typeof a!=='object') return null;
  const details=a.details && typeof a.details==='object' ? {
    type:a.details.type ?? null,
    overallSavingsMs:a.details.overallSavingsMs ?? null,
    overallSavingsBytes:a.details.overallSavingsBytes ?? null,
    ...(id==='resource-summary'?{items:a.details.items ?? []}:{})
  } : null;
  return {
    id,
    title:a.title ?? id,
    description:a.description ?? '',
    score:a.score ?? null,
    scoreDisplayMode:a.scoreDisplayMode ?? null,
    displayValue:a.displayValue ?? null,
    numericValue:a.numericValue ?? null,
    details
  };
}

function slimLhr(lhr){
  const audits={};
  for(const [id,a] of Object.entries(lhr.audits ?? {})){
    const slim=slimAudit(a,id);
    if(slim) audits[id]=slim;
  }
  const categories={};
  for(const [id,c] of Object.entries(lhr.categories ?? {})){
    categories[id]={
      id,
      title:c.title ?? id,
      score:c.score ?? null,
      auditRefs:(c.auditRefs ?? []).map(r=>({id:r.id,weight:r.weight ?? 0,group:r.group ?? null}))
    };
  }
  return {
    finalUrl:lhr.finalUrl ?? lhr.requestedUrl ?? null,
    requestedUrl:lhr.requestedUrl ?? null,
    fetchTime:lhr.fetchTime ?? new Date().toISOString(),
    lighthouseVersion:lhr.lighthouseVersion ?? null,
    categories,
    audits
  };
}

function runLighthouse(url,strategy){
  return new Promise((resolve,reject)=>{
    const chromeFlags=[
      '--headless',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-quic',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--proxy-server='+PROXY,
      '--proxy-bypass-list=<-loopback>'
    ].join(' ');
    const args=[
      url,
      '--output=json',
      '--output-path=stdout',
      '--quiet',
      '--only-categories=performance,accessibility,best-practices,seo',
      '--max-wait-for-load=45000',
      '--chrome-flags='+chromeFlags
    ];
    if(strategy==='desktop') args.push('--preset=desktop');

    execFile('lighthouse',args,{
      timeout:80000,
      maxBuffer:32*1024*1024,
      env:{...process.env,CHROME_PATH:'/usr/bin/chromium'}
    },(err,stdout,stderr)=>{
      if(err){
        reject(new Error((stderr||err.message||'Lighthouse failed').slice(0,1800)));
        return;
      }
      try{
        resolve(slimLhr(JSON.parse(stdout)));
      }catch(e){
        reject(new Error('Lighthouse returned invalid JSON: '+e.message));
      }
    });
  });
}

async function processOne(){
  if(running) return;
  const files=(await fs.readdir(JOB_DIR)).filter(f=>f.endsWith('.json') && !f.endsWith('.result.json')).sort();
  if(!files.length) return;
  const file=files[0];
  const id=file.slice(0,-5);
  const source=path.join(JOB_DIR,file);
  const claimed=path.join(JOB_DIR,id+'.work');
  try{ await fs.rename(source,claimed); }catch{return;}
  running=true;
  try{
    const job=JSON.parse(await fs.readFile(claimed,'utf8'));
    const parsed=new URL(job.url);
    if(!['http:','https:'].includes(parsed.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
    const strategy=job.strategy==='desktop'?'desktop':'mobile';
    const lhr=await runLighthouse(parsed.toString(),strategy);
    await fs.writeFile(path.join(JOB_DIR,id+'.result.json'),JSON.stringify({ok:true,lighthouseResult:lhr}));
  }catch(e){
    await fs.writeFile(path.join(JOB_DIR,id+'.result.json'),JSON.stringify({ok:false,error:String(e?.message||e).slice(0,2000)}));
  }finally{
    await fs.rm(claimed,{force:true}).catch(()=>{});
    running=false;
  }
}

for(;;){
  try{ await processOne(); }catch(e){ console.error(e); }
  await sleep(POLL_MS);
}
