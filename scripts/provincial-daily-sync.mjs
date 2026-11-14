import { createPrivateKey, createSign } from 'node:crypto';

const LOCAL = { id: '1knIScHAUj052s0hpx58kpALJMTgG0VUGPx1kqG_fzbs', tab: 'ریاست ته ګزارش' };
const PROVINCE = { id: '1CQW-MelUxvRSGqbRMatozoVkrCZlhcgxluhBscsQM0Q', tab: 'مرکز دشت برچی' };
const MONTHS = ['حمل','ثور','جوزا','سرطان','اسد','سنبله','میزان','عقرب','قوس','جدي','دلو','حوت'];
const METRICS = {
  documents: /چک اسناد/, paper: /مطابق تذکره کاغذی/, age: /تع[یي]ن سن/,
  biometric: /بایو\s?متریک/, family: /تصدیق فامیلی/, demographic: /دیموگراف[یي]/,
  revenue: /^عواید(?!.*خدمات)/, quality: /کنتر[و]ل کیفیت/,
  archive: /آرشیف/, scan: /^سکن/, distribution: /توزیع (?:عادی|روند عادی)/,
  transfer: /تذکره های انتقال/, serviceDistribution: /توزیع (?:خدمات|تذکره های بخش خدمات)/,
  renewal: /خدمات بعد.*مثنی/, correction: /خدمات بعد.*اصلاح روی کارت/,
  serviceRevenue: /^عواید خدمات/, marriage: /ثبت ازدواج/, divorce: /ثبت طلاق/, death: /ثبت وفیات/
};
const digits = '۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩';
function clean(x) {
  return String(x ?? '').normalize('NFKC').replace(/[۰-۹٠-٩]/g, c => String(digits.indexOf(c) % 10))
    .replace(/[يى]/g,'ی').replace(/ك/g,'ک').replace(/[\u200c-\u200fـ]/g,'').replace(/\s+/g,' ').trim();
}
function number(x) {
  const s = clean(x);
  if (!s || /جمعه|رخصت|تعطیل|friday/i.test(s)) return null;
  const n = s.replace(/AFN|افغانۍ|افغانیه|افغانی|؋/gi,'').replace(/[,٬\s]/g,'').replace(/٫/g,'.');
  if (!/^\d+(?:\.\d+)?$/.test(n)) return null;
  const value = Number(n);
  return Number.isSafeInteger(value) || (Number.isFinite(value) && value >= 0) ? value : null;
}
function col(n) { let s=''; for (n++;n;n=Math.floor((n-1)/26)) s=String.fromCharCode(65+(n-1)%26)+s; return s; }
function dateAt(offset) {
  const date = new Date(Date.now() - offset*86400000);
  const fmt = new Intl.DateTimeFormat('en-u-ca-persian',{timeZone:'Asia/Kabul',year:'numeric',month:'numeric',day:'numeric'});
  const p = Object.fromEntries(fmt.formatToParts(date).map(x=>[x.type,x.value]));
  const weekday = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Kabul',weekday:'long'}).format(date);
  return { year:+p.year, month:+p.month, day:+p.day, weekday };
}
function block(grid, kind, date) {
  const headings = grid.flatMap((row,i)=>{
    const label=clean(row.join(' '));
    const isHeader=kind==='local' ? /بخشونه/.test(label) : /گزارش ماه/.test(label);
    const years=label.match(/1[34]\d{2}/g)??[];
    return isHeader && label.includes(MONTHS[date.month-1]) &&
      (years.length ? years.every(y=>+y===date.year) : true) ? [i] : [];
  });
  if (headings.length!==1) throw new Error(kind+': month missing or ambiguous');
  const start=headings[0];
  const next=grid.findIndex((r,i)=>i>start && /بخشونه|گزارش ماه/.test(clean(r.join(' '))));
  const end=next<0?grid.length:next;
  let dayRow=-1, days=new Map();
  for(let i=start;i<Math.min(start+5,end);i++){
    const found=new Map(), duplicates=new Set();
    (grid[i]??[]).forEach((cell,j)=>{
      const t=clean(cell); if(!/^\d{1,2}$/.test(t))return;
      const d=+t;if(d<1||d>31)return;
      if(found.has(d))duplicates.add(d);else found.set(d,j);
    });
    if(found.size>=28&&!duplicates.size){dayRow=i;days=found;break;}
  }
  if(dayRow<0||!days.has(date.day))throw new Error(kind+': day header missing');
  const first=Math.min(...days.values());
  const rows=new Map(), ambiguous=new Set();
  for(let i=dayRow+1;i<end;i++){
    const cells=grid[i]??[];
    const label=clean(kind==='local'?cells[0]:cells.slice(2,Math.min(5,first)).join(' '));
    const hits=Object.entries(METRICS).filter(([,re])=>re.test(label));
    if(hits.length!==1)continue;
    const key=hits[0][0];
    if(rows.has(key)){rows.delete(key);ambiguous.add(key);}
    else if(!ambiguous.has(key))rows.set(key,{ row:i+1,cells });
  }
  return { dayCol:days.get(date.day), rows, ambiguous };
}
function b64url(v){return Buffer.from(v).toString('base64url');}
async function token(credentials) {
  const now=Math.floor(Date.now()/1000);
  const payload={iss:credentials.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3000};
  const data=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+b64url(JSON.stringify(payload));
  const signer=createSign('RSA-SHA256');signer.update(data);signer.end();
  const assertion=data+'.'+signer.sign(createPrivateKey(credentials.private_key),'base64url');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion})});
  if(!response.ok)throw new Error('Google token request failed: '+response.status);
  const json=await response.json();return json.access_token;
}
async function api(token,url,options={}) {
  for(let i=0;i<3;i++){
    const response=await fetch(url,{...options,headers:{Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(20000)});
    if(response.ok)return response.json();
    if((response.status===429||response.status>=500)&&i<2){await new Promise(r=>setTimeout(r,1000*(i+1)));continue;}
    throw new Error('Google Sheets API failed: '+response.status);
  }
}
const base='https://sheets.googleapis.com/v4/spreadsheets/';
function range(tab,a1){return "'"+tab.replaceAll("'","''")+"'!"+a1;}
async function read(token,config,render='FORMATTED_VALUE'){
  const qs=new URLSearchParams({ranges:range(config.tab,'A1:AL800'),valueRenderOption:render});
  const result=await api(token,base+config.id+'/values:batchGet?'+qs);
  return result.valueRanges?.[0]?.values??[];
}
async function main(){
  const raw=process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const required=(process.env.REQUIRED_REPORT_METRICS??'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!raw||!required.length||required.some(k=>!METRICS[k]))throw new Error('Missing credentials or invalid required metric configuration');
  const creds=JSON.parse(raw);
  if(!creds.client_email||!creds.private_key)throw new Error('Invalid service account JSON');
  const access=await token(creds);
  const [source,destination,formulas]=await Promise.all([read(access,LOCAL),read(access,PROVINCE),read(access,PROVINCE,'FORMULA')]);
  for(const offset of [1,0]){
    const date=dateAt(offset);
    if(date.weekday==='Friday'){console.log('Friday: skipped',offset);continue;}
    let src,dst,formula;
    try{src=block(source,'local',date);dst=block(destination,'province',date);formula=block(formulas,'province',date);}
    catch(e){console.log('Not ready:',offset,e.message);continue;}
    const changes=[],missing=[],conflicts=[];
    for(const key of required){
      const s=src.rows.get(key),d=dst.rows.get(key),f=formula.rows.get(key);
      if(!s||!d||!f){missing.push(key);continue;}
      const value=number(s.cells[src.dayCol]);
      if(value===null){missing.push(key);continue;}
      const existing=d.cells[dst.dayCol];
      const current=number(existing);
      const rawFormula=String(f.cells[formula.dayCol]??'');
      if(rawFormula.startsWith('=')){conflicts.push(key+': formula');continue;}
      if(current!==null&&current!==value){conflicts.push(key+': different destination value');continue;}
      if(current===value)continue;
      if(clean(existing)){conflicts.push(key+': nonempty destination');continue;}
      changes.push({range:range(PROVINCE.tab,col(dst.dayCol)+d.row),values:[[value]],key});
    }
    if(missing.length||conflicts.length){
      console.log('Day not ready or requires human review',JSON.stringify({date,missing,conflicts}));
      continue;
    }
    if(!changes.length){console.log('Already synced',date);continue;}
    // One atomic values batch update, constrained to the exact matched destination cells.
    const body={valueInputOption:'RAW',data:changes.map(({range,values})=>({range,values}))};
    await api(access,base+PROVINCE.id+'/values:batchUpdate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const after=await read(access,PROVINCE);
    const check=block(after,'province',date);
    for(const c of changes){
      const cell=check.rows.get(c.key);
      if(!cell||number(cell.cells[check.dayCol])!==c.values[0][0])throw new Error('Read-back verification failed for '+c.key);
    }
    console.log('Verified daily report sync',JSON.stringify({date,count:changes.length}));
  }
}
main().catch(error=>{console.error('Provincial report sync failed:',error.message);process.exitCode=1;});
