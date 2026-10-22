import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabView } from "@/components/dash/TabView";
import { JALALI_MONTHS } from "@/lib/jalali";
import { filterByDate, isTotalRow, normalizeGrid, sumColumn, type Cell, type NormalizedTable } from "@/lib/normalize";
import { SHEET_COLUMNS } from "@/lib/sheet-columns";

type Kind = "total" | "identity" | "control" | "services" | "bank" | "annual";
const format = (n: number) => n.toLocaleString("fa-AF", { maximumFractionDigits: 0 });
const SPECIAL = new Set<Kind>(["total", "identity", "control", "services", "bank", "annual"]);
export function isManagementReport(slug: string): slug is Kind { return SPECIAL.has(slug as Kind); }

function normalizeRows(grid: string[][], title: string, month: string) {
  const table = normalizeGrid(grid, title);
  const period = month === "all" || table.dateCol < 0
    ? { from: null, to: null }
    : { from: { y: 1405, m: Number(month), d: 1 }, to: { y: 1405, m: Number(month), d: 31 } };
  return {table, rows: filterByDate(table, period).rows.filter(r => !isTotalRow(r))};
}
export function valueOf(rows: Cell[][], index: number, enabled: boolean): number | null {
  if (!enabled || rows.length === 0 || !rows.some(row => typeof row[index] === "number")) return null;
  return sumColumn(rows, index);
}
function Stat({label,value,currency = false}: {label:string;value:number|null;currency?:boolean}) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-4 shadow-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums">{value === null ? "—" : format(value)}
        {currency && value !== null && <span className="ms-1 text-xs font-medium text-muted-foreground">AFN</span>}
      </p>
    </div>
  );
}
function MonthSelect({month,change}: {month:string;change:(s:string)=>void}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted-foreground">موده</span>
      <Select value={month} onValueChange={change}>
        <SelectTrigger aria-label="د راپور میاشت" className="w-40"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">ټول کال</SelectItem>
          {JALALI_MONTHS.map((label,i)=><SelectItem key={label} value={String(i+1)}>{label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
function TeamTable({table,rows,columns}: {table:NormalizedTable;rows: Cell[][];columns:number[]}) {
  const records=columns
    .filter(index => table.headers[index] && !/^ستون \d+$/.test(table.headers[index]))
    .map(index => ({label:table.headers[index], value:valueOf(rows,index,true)}))
    .filter(row=>row.value!==null);
  if (!records.length) return <p className="text-sm text-muted-foreground">د دې مودې د کارمندانو جلا شمېرې په شیټ کې نه دي ثبت شوې.</p>;
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-card">
      <h2 className="border-b px-4 py-3 font-bold">د کارمندانو او ټیمونو فعالیت</h2>
      <div className="divide-y">
        {records.map((row)=> (
          <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
            <span className="min-w-0">{row.label}</span>
            <strong className="shrink-0 tabular-nums">{format(row.value!)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ManagementReport({kind,title,grid}: {kind:Kind;title:string;grid:string[][]}) {
  const [month,setMonth]=useState("all");
  const parsed=useMemo(()=>{
    try {return {data:normalizeRows(grid,title,month), error:null};}
    catch {return {data:null,error:"د Google Sheet د کالمونو جوړښت له ثبت شوې نقشې سره برابر نه دی."};}
  },[grid,title,month]);
  if (parsed.error || !parsed.data) {
    return <p role="alert" className="rounded-xl border p-4 text-sm text-destructive"><AlertTriangle className="me-2 inline h-4 w-4"/>{parsed.error}</p>;
  }
  const {table,rows}=parsed.data;
  const metric=(index:number)=>valueOf(rows,index,table.numericCols.includes(index));
  const cards: {label:string;value:number|null;currency?:boolean}[]=[];
  if(kind==="total") cards.push(
    {label:"پاس شوې تذکرې",value:metric(3)},
    {label:"عواید",value:metric(2),currency:true},
    {label:"توزیع",value:metric(5)},
    {label:"تعرفې",value:metric(1)},
  );
  if(kind==="services") cards.push(
    {label:"مثنی",value:metric(1)},
    {label:"تجدید",value:metric(2)},
    {label:"ثبت تولد",value:metric(3)},
    {label:"ثبت ازدواج",value:metric(4)},
  );
  if(kind==="bank") cards.push(
    {label:"مجموعي بانکي عواید",value:metric(6),currency:true},
    {label:"جدید او ثبت تولد",value:metric(1),currency:true},
    {label:"مثنی او تجدید",value:metric(4),currency:true},
    {label:"انفرادي مراجعین",value:metric(5)},
  );
  if(kind==="identity" || kind==="control") cards.push(
    {label:kind==="identity"?"مجموعي تثبیت هویت":"د کنټرول مجموعه",value:metric(kind==="identity"?10:6)},
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
    <div className="space-y-4">
      {kind!=="annual" && <MonthSelect month={month} change={setMonth}/>}
      <div className={cards.length===1?"grid grid-cols-1 gap-3 sm:max-w-sm":"grid grid-cols-2 gap-3 lg:grid-cols-4"}>
        {cards.map(card=><Stat key={card.label} {...card}/>)}
      </div>
      {(kind==="identity"||kind==="control") && (
        <TeamTable table={table} rows={rows}
          columns={kind==="identity"?[2,4,5,6,7,8]:[1,2,3,4]}/>
      )}
      {kind==="services" && metric(5)!==null && (
        <p className="text-sm text-muted-foreground">د ټولو خدماتو مجموعه: <strong className="text-foreground">{format(metric(5)!)}</strong></p>
      )}
      {kind==="annual" && (
        <section className="overflow-hidden rounded-xl border bg-card shadow-card">
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
      {(kind==="total" || kind==="bank") && rows.length===0 && <p className="text-sm text-muted-foreground">د دې میاشتې لپاره راپور نشته.</p>}
      <TabView title={title} grid={grid} detailsOnly selectedMonth={month} onSelectedMonthChange={setMonth} />
    </div>
  );
}
