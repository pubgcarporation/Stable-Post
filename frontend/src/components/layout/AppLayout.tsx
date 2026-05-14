import type { ReactNode } from "react";
import { AppHeader } from "./AppHeader";
import { SiteFooter } from "./SiteFooter";

type Props = {
  children: ReactNode;
};

export function AppLayout({ children }: Props) {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">{children}</main>
      <SiteFooter />
    </div>
  );
}
