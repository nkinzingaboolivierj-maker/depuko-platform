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
export function ThemeToggle(){const {theme,toggle}=useContext(ThemeContext);return <button className="theme-toggle" type="button" onClick={toggle} aria-label={theme==="light"?"Switch to dark mode":"Switch to light mode"} title={theme==="light"?"Dark mode":"Light mode"}>{theme==="light"?"◐":"☼"}</button>}
