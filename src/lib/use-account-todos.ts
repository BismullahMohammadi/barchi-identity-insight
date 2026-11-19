import { useContext } from 'react';
import { DashboardAccessContext } from './dashboard-access-context';
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changeTodo, getTodos } from "./todos.functions";
import type { StoredTodo } from "./todos.functions";

const LEGACY_KEY="barchi-workspace-v1";
const migratedFor="barchi-todo-migrated-v2";
function getLegacyItems():{legacyKey:string;title:string;done:boolean;createdAt:number}[]{
 if(typeof window==="undefined")return [];
 try{
  const state=JSON.parse(window.localStorage.getItem(LEGACY_KEY)||"null") as {todos?:unknown[]}|null;
  if(!Array.isArray(state?.todos))return [];
  return state.todos.filter((item):item is {id:string;title:string;done:boolean;createdAt:number}=>{
   if(!item||typeof item!=="object")return false;
   const v=item as Record<string,unknown>;
   return typeof v['id']==="string"&&typeof v['title']==="string"&&typeof v['done']==="boolean"&&typeof v['createdAt']==="number";
  }).slice(0,100).map(x=>({legacyKey:x.id,title:x.title.slice(0,180),done:x.done,createdAt:x.createdAt})).filter(x=>x.title.trim());
 }catch{return [];}
}
export function useAccountTodos(){
 const owner=useContext(DashboardAccessContext)?.owner===true;
 const client=useQueryClient();
 const todos=useQuery({queryKey:["owner-todos"],queryFn:()=>getTodos(),staleTime:5000,retry:1});
 const change=useMutation({mutationFn:changeTodo,onSuccess:()=>client.invalidateQueries({queryKey:["owner-todos"]})});
 const [migrationError,setMigrationError]=useState(false);
 const underway=useRef(false);
 useEffect(()=>{
  if(!owner||!todos.isSuccess||underway.current||typeof window==="undefined")return;
  const items=getLegacyItems();
  if(!items.length||window.localStorage.getItem(migratedFor)==="complete")return;
  underway.current=true;
  changeTodo({data:{action:"import",items}}).then(()=>{
   window.localStorage.setItem(migratedFor,"complete");
   // Keep the old browser data as a recovery backup; never delete it on migration.
   client.invalidateQueries({queryKey:["owner-todos"]});
  }).catch(()=>setMigrationError(true)).finally(()=>{underway.current=false;});
 },[owner,todos.isSuccess,client]);
 return {
  todos:(todos.data??[]) as StoredTodo[],
  loading:todos.isLoading,loadError:todos.error,writeError:change.error,migrationError,
  saving:change.isPending,
  add:(title:string)=>change.mutateAsync({data:{action:"add",title}}),
  toggle:(id:string,done:boolean)=>change.mutateAsync({data:{action:"toggle",id,done}}),
  remove:(id:string)=>change.mutateAsync({data:{action:"delete",id}}),
  refresh:()=>client.invalidateQueries({queryKey:["owner-todos"]}),
 };
}
