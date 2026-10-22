import { useSyncExternalStore } from "react";
export type Todo = {id:string;title:string;done:boolean;createdAt:number};
export type WidgetId = "todo"|"advice";
type WorkspaceState = {todos:Todo[];order:WidgetId[]};
const KEY="barchi-workspace-v1";
const initial:WorkspaceState={todos:[],order:["todo","advice"]};
let snapshot:WorkspaceState=initial;let initialized=false;
const listeners=new Set<()=>void>();
function notify(){listeners.forEach(fn=>fn());}
function load(){
 if(initialized||typeof window==="undefined")return;
 initialized=true;
 try {
  const input=JSON.parse(window.localStorage.getItem(KEY)||"null") as Partial<WorkspaceState>|null;
  const todos=Array.isArray(input?.todos)?input.todos.filter(t=>typeof t.id==="string"&&typeof t.title==="string"&&typeof t.done==="boolean").slice(0,100):[];
  const order:WidgetId[]=input?.order?.[0]==="advice"?["advice","todo"]:["todo","advice"];
  snapshot={todos,order};
 }catch{snapshot=initial;}
}
function save(state:WorkspaceState){snapshot=state;initialized=true;try{window.localStorage.setItem(KEY,JSON.stringify(state));}catch{/*private storage disabled*/}notify();}
export function useWorkspace(){return useSyncExternalStore(fn=>{load();listeners.add(fn);return()=>{listeners.delete(fn);};},()=>{load();return snapshot;},()=>initial);}
export function addTodo(title:string){load();const trimmed=title.trim().slice(0,180);if(!trimmed||snapshot.todos.length>=100)return;save({...snapshot,todos:[{id:String(Date.now())+"-"+Math.random().toString(36).slice(2,8),title:trimmed,done:false,createdAt:Date.now()},...snapshot.todos]});}
export function toggleTodo(id:string){load();save({...snapshot,todos:snapshot.todos.map(t=>t.id===id?{...t,done:!t.done}:t)});}
export function removeTodo(id:string){load();save({...snapshot,todos:snapshot.todos.filter(t=>t.id!==id)});}
export function reorderWidgets(dragged:WidgetId,target:WidgetId){load();if(dragged===target)return;save({...snapshot,order:[target,dragged]});}
export function resetWidgetOrder(){load();save({...snapshot,order:["todo","advice"]});}
