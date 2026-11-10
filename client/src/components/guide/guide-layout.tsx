import { useState } from "react";
import { Outlet, useLocation } from "react-router";
import { Menu, X } from "lucide-react";
import { Header } from "@/components/general/header";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { guideApi, type TreeDivision } from "@/lib/guide-api";
import { useFetch } from "@/lib/use-fetch";
import { cn } from "@/lib/utils";
import { GuideSidebar } from "./guide-sidebar";

/** What the guide pages get from the layout (useOutletContext). */
export interface GuideContext {
  tree: TreeDivision[] | undefined;
  treeError: string | undefined;
}

/** The public guide: the site header, the search + category sidebar, and the open page. */
export function GuideLayout() {
  const { isArabic } = useLanguage();
  const { data: tree, error: treeError } = useFetch("tree", (signal) => guideApi.tree(signal));
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const { pathname } = useLocation();
  // On small screens the sidebar opens above the page; following a link (a new pathname) closes it
  const menuOpen = menuFor === pathname;

  const context: GuideContext = { tree, treeError };

  return (
    <div className="min-h-screen text-foreground">
      <Header />
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:gap-8">
        <Button
          type="button"
          variant="outline"
          className="mt-5 h-10 w-fit gap-2 rounded-xl bg-card px-4 shadow-card lg:hidden"
          aria-expanded={menuOpen}
          onClick={() => setMenuFor(menuOpen ? null : pathname)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          {isArabic ? "الخدمات" : "Services"}
        </Button>

        <aside className={cn("shrink-0 lg:block lg:w-80", menuOpen ? "animate-in fade-in-0 slide-in-from-top-2 duration-300" : "hidden")}>
          <div className="max-lg:h-[70svh] lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:my-8 lg:h-[calc(100svh-var(--header-h)-3rem)]">
            <GuideSidebar tree={tree} error={treeError} onNavigate={() => setMenuFor(null)} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 pt-4 pb-14 lg:pt-8 lg:pb-16">
          {/* keyed by the page, so every page arrives with the same short rise */}
          <div key={pathname} className="enter">
            <Outlet context={context} />
          </div>
        </main>
      </div>
    </div>
  );
}
