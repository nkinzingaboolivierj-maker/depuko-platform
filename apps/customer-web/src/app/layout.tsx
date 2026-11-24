import { SessionProvider } from "../lib/session";
import "./globals.css";
import "./navy-refresh.css";
import "./workspace.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { WorkspaceFrame } from "../components/WorkspaceFrame";

export const metadata = {
  title: "DEPUKO | Find people who make it happen",
  description: "Find the right people to bring your ideas to life. Discover services on DEPUKO.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <SessionProvider>
            <WorkspaceFrame>{children}</WorkspaceFrame>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
