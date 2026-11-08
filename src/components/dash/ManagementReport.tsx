import { AnimatedNumber } from "@/components/dash/AnimatedNumber";
import {Link} from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabView } from "@/components/dash/TabView";
import { JALALI_MONTHS } from "@/lib/jalali";
import { filterByDate, isTotalRow, normalizeGrid, sumColumn, type Cell, type NormalizedTable, type DateFilter } from "@/lib/normalize";
import { SHEET_COLUMNS } from "@/lib/sheet-columns";
import { resolveMappedGrid, COLUMN_ALIAS_KEY } from "@/lib/sheet-mapping-preferences";
import { latestActivitySignal } from "@/lib/management-insight";
import { ARCHIVE_PERIOD_OPTIONS, archivePeriodRange, archivePeriodCaption, type ArchivePeriod } from "@/lib/archive-period";

type Kind = "total" | "identity" | "control" | "services" | "bank" | "annual" | "archive-scan";
const format = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 0 });
const SPECIAL = new Set<Kind>(["total", "identity", "control", "services", "bank", "annual", "archive-scan"]);
export function isManagementReport(slug: string): slug is Kind { return SPECIAL.has(slug as Kind); }

function normalizeRows(grid: string[][], title: string, month: string, dateRange?: DateFilter) {
  const table = normalizeGrid(resolveMappedGrid(grid,title), title);
  const period = dateRange ?? (month === "all" || table.dateCol < 0
    ? { from: null, to: null }
    : { from: { y: 1405, m: Number(month), d: 1 }, to: { y: 1405, m: Number(month), d: 31 } });
  return {table, rows: filterByDate(table, period).rows.filter(r => !isTotalRow(r))};
}
export function valueOf(rows: Cell[][], index: number, enabled: boolean): number | null {
  if (!enabled || rows.length === 0 || !rows.some(row => typeof row[index] === "number")) return null;
  return sumColumn(rows, index);
}
function Stat({label,value,currency = false,tone = "default"}: {label:string;value:number|null;currency?:boolean;tone?:"default"|"teal"|"amber"|"blue"}) {
  const accent = {default:"border-s-border",teal:"border-s-primary",amber:"border-s-amber-500",blue:"border-s-sky-500"}[tone];
  const numberTone = {default:"text-foreground",teal:"text-primary",amber:"text-amber-700",blue:"text-sky-700"}[tone];
  return (
    <div className={"dashboard-kpi border-s-4 "+accent}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={"mt-2 text-2xl font-extrabold tabular-nums "+numberTone}>{value === null ? "—" : <AnimatedNumber value={value}/>}
        {currency && value !== null && <span className="ms-1 text-xs font-medium text-muted-foreground">AFN</span>}
      </p>
    </div>
  );
}
function MonthSelect({month,change}: {month:string;change:(s:string)=>void}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-card">
      <span className="text-sm text-muted-foreground">موده</span>
      <Select value={month} onValueChange={change}>
        <SelectTrigger aria-label="د راپور میاشت" className="min-h-11 w-44 rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ټول کال</SelectItem>
          {JALALI_MONTHS.map((label,i)=><SelectItem key={label} value={String(i+1)}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
function ArchivePeriodSelect({period,change,range}: {period:ArchivePeriod;change:(period:ArchivePeriod)=>void;range:DateFilter}) {
 return <section className="dashboard-panel p-3 sm:p-4" aria-label="د آرشیف د راپور موده">
  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
   <span className="text-sm font-bold">د راپور موده</span>
   <span className="text-xs text-muted-foreground" aria-live="polite">{archivePeriodCaption(range)}</span>
  </div>
  <div className="flex flex-wrap gap-2" role="group" aria-label="د آرشیف وخت وټاکئ">
   {ARCHIVE_PERIOD_OPTIONS.map(option=><button key={option.value} type="button"
    aria-pressed={period===option.value} onClick={()=>change(option.value)}
    className="dashboard-period-button">{option.label}</button>)}
  </div>
 </section>;
}
function TeamTable({table,rows,columns,identity}: {table:NormalizedTable;rows:Cell[][];columns:number[];identity:boolean}) {
  // Do not hide staff merely because the original Google Sheet left their cells blank.
  const records=columns
    .filter(index => table.headers[index] && !/^ستون \\d+$/.test(table.headers[index]))
    .map(index => ({
      label:table.headers[index],
      value:valueOf(rows,index,table.numericCols.includes(index)),
    }));
  if (!records.length) return <p className="text-sm text-muted-foreground">په سرچینه کې د کارمندانو کالمونه نه دي پېژندل شوي.</p>;
  const reported=records.filter(r=>r.value!==null);
  const max=Math.max(1,...reported.map(r=>r.value??0));
  return (
    <section className="dashboard-panel overflow-hidden" aria-label={identity?"د تثبیت هویت د کارمندانو فعالیت":"د کنټرول د ټیمونو فعالیت"}>
      <div className="border-b px-4 py-3">
        <h2 className="font-bold">{identity?"د هر کارمند فعالیت":"د هر ټیم فعالیت"}</h2>
        <p className="mt-1 text-xs text-muted-foreground">د ټاکلې مودې ثبت شوې شمېرې · تش کالمونه صفر نه ګڼل کېږي</p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {records.map(row=> (
          <div key={row.label} className="min-w-0 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words text-sm font-medium">{row.label}</span>
              <strong className={"shrink-0 tabular-nums "+(row.value===null?"text-muted-foreground":"text-primary")}>{row.value===null?"—":format(row.value)}</strong>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary/75 transition-all" style={{width:row.value===null?"0%":`${Math.min(100,(row.value/max)*100)}%`}} />
            </div>
            {row.value===null&&<p className="mt-1 text-xs text-muted-foreground">جلا معلومات نشته</p>}
          </div>
        ))}
      </div>
      {!reported.length&&<p className="border-t px-4 py-3 text-sm text-amber-700">په Google Sheets کې د کارمندانو نومونه شته، خو د ټاکلې مودې جلا شمېرې تشې دي. د مجموعي شمېر پر اساس یې پر کارمندانو نه وېشو.</p>}
    </section>
  );
}

export function ManagementReport({kind,title,grid,dateRange}: {kind:Kind;title:string;grid:string[][];dateRange?:DateFilter}) {
  const [month,setMonth]=useState("all");
  const [archivePeriod,setArchivePeriod]=useState<ArchivePeriod>("thisMonth");
  const archiveRange=dateRange??(kind==="archive-scan"?archivePeriodRange(archivePeriod):undefined);
  const parsed=useMemo(()=>{
    try {return {data:normalizeRows(grid,title,month,archiveRange), error:null};}
    catch (e) {return {data:null,error:e instanceof Error?e.message:"د Google Sheet د کالمونو جوړښت له ثبت شوې نقشې سره برابر نه دی."};}
  },[grid,title,month,kind,archivePeriod]);
  if (parsed.error || !parsed.data) {
    return <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
      <AlertTriangle className="me-2 inline h-4 w-4"/>{parsed.error}
      <div className="mt-3 flex flex-wrap gap-2">
       <Link to="/dashboard/$slug" params={{slug:"settings"}} className="rounded-lg bg-primary px-3 py-2 font-bold text-primary-foreground">د Google Sheets تنظیمات</Link>
       {kind==="archive-scan"&&<button type="button" className="rounded-lg border px-3 py-2 font-bold" onClick={()=>{
         try{const all=JSON.parse(localStorage.getItem(COLUMN_ALIAS_KEY)||"{}") as Record<string,unknown>;delete all[title];localStorage.setItem(COLUMN_ALIAS_KEY,JSON.stringify(all));}catch{localStorage.removeItem(COLUMN_ALIAS_KEY);}
         window.location.reload();
       }}>د آرشیف کالمونه بېرته اصلي کړئ</button>}
      </div>
    </div>;
  }
  const {table,rows}=parsed.data;
  const metric=(index:number)=>valueOf(rows,index,table.numericCols.includes(index));
  const activity = kind === "total" ? latestActivitySignal(table, 3) : null;
  const cards: {label:string;value:number|null;currency?:boolean;tone?:"default"|"teal"|"amber"|"blue"}[]=[];
  if(kind==="total") cards.push(
    {label:"پاس شوې تذکرې",value:metric(3),tone:"teal"},
    {label:"عواید",value:metric(2),currency:true,tone:"amber"},
    {label:"توزیع",value:metric(5),tone:"blue"},
    {label:"تعرفې",value:metric(1)},
  );
  if(kind==="services") cards.push(
    {label:"مثنی",value:metric(1)},
    {label:"تجدید",value:metric(2)},
    {label:"ثبت تولد",value:metric(3)},
    {label:"ثبت ازدواج",value:metric(4)},
  );
  if(kind==="bank") cards.push(
    {label:"مجموعي بانکي عواید",value:metric(6),currency:true,tone:"teal"},
    {label:"جدید او ثبت تولد",value:metric(1),currency:true},
    {label:"مثنی او تجدید",value:metric(4),currency:true},
    {label:"انفرادي مراجعین",value:metric(5)},
  );
  if(kind==="identity") cards.push(
    {label:"کاغذي تذکرې مطابق",value:metric(8),tone:"blue"},
    {label:"تعین سن",value:metric(9)},
    {label:"مجموعي تثبیت هویت",value:metric(10),tone:"teal"},
  );
  if(kind==="control") cards.push({label:"د کیفیت کنټرول پاس دوسیې",value:metric(6),tone:"teal"});
  if(kind==="archive-scan") cards.push(
    {label:"سکن شوې ورقې",value:metric(3),tone:"teal"},
    {label:"کنټرول شوې ورقې",value:metric(6),tone:"blue"},
    {label:"نا کنټرول شوې ورقې",value:metric(7),tone:"amber"},
  );
  if(kind==="annual") cards.push(
    {label:"مجموعي عواید",value:metric(14),currency:true},
    {label:"تثبیت هویت",value:metric(2)},
    {label:"جدید او ثبت تولد",value:metric(4)},
    {label:"توزیع",value:metric(11)},
  );

  // Yearly source is month-oriented. Show one concise month comparison, not a raw wide matrix.
  const yearly = kind==="annual"
    ? rows.map(row=>({
        month:String(row[table.labelCol]??""),
        revenue:typeof row[14]==="number"?row[14] as number:null,
        passed:typeof row[4]==="number"?row[4] as number:null,
        distributed:typeof row[11]==="number"?row[11] as number:null,
      })).filter(row=>row.month) : [];

  return (
    <div className="space-y-5">
      {kind==="archive-scan" ? <ArchivePeriodSelect period={archivePeriod} change={setArchivePeriod} range={archiveRange!}/> : kind!=="annual" && <MonthSelect month={month} change={setMonth}/>}
      <div className={cards.length===1?"grid grid-cols-1 gap-3 sm:max-w-sm":"grid grid-cols-2 gap-3 lg:grid-cols-4"}>
        {cards.map(card=><Stat key={card.label} {...card}/>)}
      </div>
      {kind==="total" && activity && (
        <div className="rounded-xl border bg-card px-4 py-3 text-sm">
          <p className="text-muted-foreground">وروستی ثبت شوی راپور: <strong className="text-foreground">{activity.lastDate}</strong></p>
          {activity.message && <p className="mt-1">{activity.message}</p>}
        </div>
      )}
      {kind==="identity" && <p className="dashboard-subtle-note">د کارمندانو انفرادي شمېرې لا په شیټ کې نه دي ثبت شوې. پورته شاخصونه د «کاغذي تذکرې مطابق» او «تعین سن» رسمي ارقام دي.</p>}
      {kind==="control" && <TeamTable table={table} rows={rows} columns={[1,2,3,4]} identity={false}/> }
      {kind==="archive-scan" && (
        <section className="dashboard-panel space-y-3 p-4 sm:p-5">
          <h2 className="font-bold">د کارمندانو ثبت شوی فعالیت</h2>
          <p className="text-xs text-muted-foreground">د سکن او کنټرول جلا کالمونه؛ تش کالمونه صفر نه ګڼل کېږي.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([1,2,4,5] as const).map(col=><div key={col} className="rounded-xl border bg-muted/25 p-3">
              <p className="text-sm text-muted-foreground">{col<3?"سکن":"کنټرول"} · {table.headers[col]}</p>
              <p className="mt-2 text-2xl font-extrabold tabular-nums text-primary">{metric(col)===null?"—":format(metric(col)!)}</p>
            </div>)}
          </div>
        </section>
      )}
      {kind==="services" && metric(5)!==null && (
        <p className="text-sm text-muted-foreground">د ټولو خدماتو مجموعه: <strong className="text-foreground">{format(metric(5)!)}</strong></p>
      )}
      {kind==="annual" && (
        <section className="dashboard-panel overflow-hidden">
          <h2 className="border-b px-4 py-3 font-bold">د میاشتو لنډیز</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-sm">
              <thead className="bg-muted/60 text-muted-foreground"><tr>
                <th className="px-3 py-2 text-right">میاشت</th>
                <th className="px-3 py-2 text-right">جدید او تولد</th>
                <th className="px-3 py-2 text-right">توزیع</th>
                <th className="px-3 py-2 text-right">عواید</th>
              </tr></thead>
              <tbody className="divide-y">{yearly.map(row=><tr key={row.month}>
                <td className="px-3 py-2 font-medium">{row.month}</td>
                <td className="px-3 py-2 tabular-nums">{row.passed===null?"—":format(row.passed)}</td>
                <td className="px-3 py-2 tabular-nums">{row.distributed===null?"—":format(row.distributed)}</td>
                <td className="px-3 py-2 tabular-nums">{row.revenue===null?"—":format(row.revenue)}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
      {(kind==="total" || kind==="bank" || kind==="archive-scan") && rows.length===0 && <p className="dashboard-subtle-note">د دې میاشتې لپاره راپور نشته.</p>}
      <TabView title={title} grid={grid} detailsOnly selectedMonth={month} onSelectedMonthChange={setMonth} dateRange={archiveRange} />
    </div>
  );
}
