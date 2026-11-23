import { Brand } from "@/components/brand";
import { DesktopNav } from "@/components/shell/nav-links";
import { UserMenu } from "@/components/shell/user-menu";
import { ModeToggle } from "@/components/ui/mode-toggle";

/** The bar at the top of every page inside the app. */
export function AppHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
        <Brand href="/dashboard" />
        <DesktopNav />
        <div className="ml-auto flex items-center gap-1">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
