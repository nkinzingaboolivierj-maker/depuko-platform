import "./globals.css";
import "./navy-refresh.css";
export const metadata={title:"DEPUKO Admin",description:"DEPUKO administrative workspace"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}