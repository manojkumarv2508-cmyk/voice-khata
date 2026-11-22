import fs from 'fs'; import WebSocket from 'ws';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split('=')));
async function tts(text,language){
  const r=await fetch('https://api.vachana.ai/api/v1/tts/inference',{method:'POST',headers:{'X-API-Key-ID':env.GNANI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({text,voice:'Avinash',model:'timbre-v3.0',language,audio_config:{sample_rate:16000,container:'raw'}})});
  return Buffer.from(await r.arrayBuffer());
}
function stt(pcm,hdr){return new Promise(res=>{
  const out=[];const t0=Date.now();let endSent=0;
  const ws=new WebSocket('wss://api.vachana.ai/stt/v3/stream',{headers:{'x-api-key-id':env.GNANI_API_KEY,'x-sample-rate':'16000','model':'prisma-v3.0',...hdr}});
  ws.on('message',m=>{const j=JSON.parse(m);if(j.type==='transcript'){out.push(j.text+'  ['+(Date.now()-endSent)+'ms after end, lat '+j.latency+']');} else if(j.type==='error') out.push('ERR '+j.message);});
  ws.on('error',e=>out.push('WSERR '+e.message));
  ws.on('open',async()=>{
    const sil=Buffer.alloc(1024*20);const all=Buffer.concat([sil,pcm,Buffer.alloc(1024*40)]);
    for(let i=0;i+1024<=all.length;i+=1024){ if(i===sil.length+pcm.length-(pcm.length%1024)) endSent=Date.now(); ws.send(all.subarray(i,i+1024)); await new Promise(r=>setTimeout(r,32)); }
    setTimeout(()=>{ws.close();res(out);},1500);
  });
});}
const phrases=[
 ['Ramesh ka teen sau chaalis rupaye udhaar','hi-en','hi-IN,en-IN'],
 ['रमेश का तीन सौ चालीस रुपये उधार, कल दो सौ दिया था','hi-IN','hi-IN,en-IN'],
 ['Suresh ne paanch sau diya','hi-en','hi-IN,en-IN'],
 ['ரமேஷ் முந்நூற்று நாற்பது ரூபாய் கடன்','ta-IN','ta-IN,en-IN'],
];
for(const [txt,tl,lc] of phrases){
  const pcm=await tts(txt,tl); console.log('\nSAID:',txt,'('+(pcm.length/32000).toFixed(1)+'s)');
  for(const [lang,fmt] of [['indic-auto','transliterate'],['indic-auto','codemix'],['indic-auto','transcribe'],[lc.split(',')[0],'transliterate'],[lc.split(',')[0],'transcribe']]){
    const r=await stt(pcm,{language_code:lang,format:fmt}); console.log(' ',(lang+'/'+fmt).padEnd(26),'=>',r.join(' | '));
  }
}
