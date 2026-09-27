import http from 'node:http';
import net from 'node:net';
import dns from 'node:dns/promises';

const PORT=8899;
const ALLOWED_PORTS=new Set([80,443,8080,8443]);

function publicIPv4(ip){
  const p=ip.split('.').map(Number);
  if(p.length!==4 || p.some(n=>!Number.isInteger(n)||n<0||n>255)) return false;
  const [a,b,c]=p;
  if(a===0||a===10||a===127||a>=224) return false;
  if(a===100 && b>=64 && b<=127) return false;
  if(a===169 && b===254) return false;
  if(a===172 && b>=16 && b<=31) return false;
  if(a===192 && b===168) return false;
  if(a===192 && b===0) return false;
  if(a===192 && b===0 && c===2) return false;
  if(a===198 && (b===18||b===19)) return false;
  if(a===198 && b===51 && c===100) return false;
  if(a===203 && b===0 && c===113) return false;
  return true;
}

function publicIPv6(raw){
  const ip=raw.toLowerCase();
  if(ip==='::'||ip==='::1') return false;
  if(ip.startsWith('::ffff:')){
    const tail=ip.slice(7);
    return net.isIP(tail)===4 ? publicIPv4(tail) : false;
  }
  if(ip.startsWith('fc')||ip.startsWith('fd')) return false;
  if(/^fe[89ab]/.test(ip)) return false;
  if(ip.startsWith('ff')) return false;
  if(ip.startsWith('2001:db8')) return false;
  return true;
}

function isPublic(ip){
  const family=net.isIP(ip);
  return family===4?publicIPv4(ip):family===6?publicIPv6(ip):false;
}

async function resolvePublic(hostname){
  if(net.isIP(hostname)){
    if(!isPublic(hostname)) throw new Error('Private or reserved address blocked');
    return hostname;
  }
  const answers=await dns.lookup(hostname,{all:true,verbatim:true});
  if(!answers.length) throw new Error('Hostname did not resolve');
  if(answers.some(a=>!isPublic(a.address))) throw new Error('Hostname resolves to a private or reserved address');
  return answers[0].address;
}

function allowedPort(port){
  return ALLOWED_PORTS.has(Number(port));
}

const server=http.createServer(async(req,res)=>{
  try{
    const target=new URL(req.url);
    if(target.protocol!=='http:') throw new Error('Only HTTP proxy requests are supported here');
    const port=Number(target.port||80);
    if(!allowedPort(port)) throw new Error('Port blocked');
    const ip=await resolvePublic(target.hostname);
    const headers={...req.headers,host:target.host};
    delete headers['proxy-connection'];
    const upstream=http.request({
      host:ip,
      port,
      method:req.method,
      path:target.pathname+target.search,
      headers
    },up=>{
      res.writeHead(up.statusCode||502,up.headers);
      up.pipe(res);
    });
    upstream.on('error',()=>{ if(!res.headersSent) res.writeHead(502); res.end(); });
    req.pipe(upstream);
  }catch(e){
    res.writeHead(403,{'content-type':'text/plain'});
    res.end('Blocked by safe performance-test proxy');
  }
});

server.on('connect',async(req,client,head)=>{
  try{
    const target=new URL('http://'+req.url);
    const port=Number(target.port||443);
    if(!allowedPort(port)) throw new Error('Port blocked');
    const ip=await resolvePublic(target.hostname);
    const upstream=net.connect({host:ip,port},()=>{
      client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
      if(head?.length) upstream.write(head);
      upstream.pipe(client);
      client.pipe(upstream);
    });
    upstream.setTimeout(60000,()=>upstream.destroy());
    upstream.on('error',()=>client.destroy());
    client.on('error',()=>upstream.destroy());
  }catch(e){
    client.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
    client.destroy();
  }
});

server.listen(PORT,'0.0.0.0',()=>console.log('Safe Lighthouse proxy listening on '+PORT));
