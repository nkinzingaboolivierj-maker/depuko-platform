"use client";
import {createContext,useContext,useEffect,useState,ReactNode} from "react";
type Theme="light"|"dark";
const ThemeContext=createContext<{theme:Theme;toggle:()=>void}>({theme:"light",toggle:()=>{}});
export function ThemeProvider({children}:{children:ReactNode}){
 const [theme,setTheme]=useState<Theme>("light");
 useEffect(()=>{const saved=localStorage.getItem("depuko-theme");const next=saved==="dark"?"dark":"light";setTheme(next);document.documentElement.dataset.theme=next},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("depuko-theme",theme)},[theme]);
 return <ThemeContext.Provider value={{theme,toggle:()=>setTheme(v=>v==="light"?"dark":"light")}}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle(){
 const {theme,toggle}=useContext(ThemeContext);
 return <button className="theme-toggle" type="button" onClick={toggle} aria-label={theme==="light"?"Switch to dark mode":"Switch to light mode"} title={theme==="light"?"Dark mode":"Light mode"}>
   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
     {theme==="light"?<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/>:<><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>}
   </svg>
 </button>;
}
