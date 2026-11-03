/** Finds the daily "newly referred" aggregate even when spreadsheet columns move. */
export const REFERRAL_CELL_KEY="barchi-intake-total-cell-v1";
export type ReferralTotalLocation={cell:string;value:string};
export function normalizeReferralCell(raw:string):string{
 const cell=String(raw||"").trim().toUpperCase();
 if(!cell)return "";
 if(!/^[A-Z]{1,2}(?:[1-9]|1[0-9]|20)$/.test(cell))throw new Error("INVALID_REFERRAL_CELL");
 const match=cell.match(/^([A-Z]+)([0-9]+)$/)!;
 let n=0;for(const letter of match[1]!)n=n*26+letter.charCodeAt(0)-64;
 if(n>52)throw new Error("INVALID_REFERRAL_CELL");
 return cell;
}
export function cellIndex(cell:string):{row:number;column:number}{
 const name=normalizeReferralCell(cell);if(!name)throw new Error("INVALID_REFERRAL_CELL");
 const m=name.match(/^([A-Z]+)([0-9]+)$/)!;
 let col=0;for(const letter of m[1]!)col=col*26+letter.charCodeAt(0)-64;
 return {row:Number(m[2])-1,column:col-1};
}
function colName(index:number):string{let n=index+1,out="";while(n>0){n--;out=String.fromCharCode(65+n%26)+out;n=Math.floor(n/26);}return out;}
function digits(text:string):string{return text.replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[٬,\s]/g,"");}
function numeric(value:unknown):boolean{return /^\d+(?:[.٫]\d+)?$/.test(digits(String(value??"")).trim());}
/** Explicit coordinate always takes precedence; auto follows source label on its own row. */
export function findReferralTotal(grid:unknown[][],override=""):ReferralTotalLocation|null{
 if(override){const {row,column}=cellIndex(override);const value=String(grid[row]?.[column]??"").trim();return value?{cell:normalizeReferralCell(override),value}:null;}
 for(let row=0;row<Math.min(grid.length,10);row++){
  const cells=grid[row]??[];
  for(let col=0;col<cells.length;col++){
   const label=String(cells[col]??"").replace(/\s+/g," ").trim();
   if(!/مجموع\s*فورم\s*های\s*معرفی\s*شده|مجموع\s*فورم\s*ها?ی\s*معرفی/i.test(label))continue;
   for(let next=col+1;next<Math.min(cells.length,col+13);next++){
    const value=String(cells[next]??"").trim();
    if(numeric(value))return {cell:colName(next)+String(row+1),value};
   }
  }
 }
 return null;
}