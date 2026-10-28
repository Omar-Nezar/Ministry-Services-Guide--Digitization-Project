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
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 lg:flex-row lg:gap-8 lg:px-6">
        <Button
          type="button"
          variant="outline"
          className="mt-4 w-fit lg:hidden"
          aria-expanded={menuOpen}
          onClick={() => setMenuFor(menuOpen ? null : pathname)}
        >
          {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          {isArabic ? "الخدمات" : "Services"}
        </Button>

        <aside className={cn("shrink-0 lg:block lg:w-80", !menuOpen && "hidden")}>
          <div className="max-lg:h-[70svh] lg:sticky lg:top-4 lg:h-[calc(100svh-2rem)]">
            <GuideSidebar tree={tree} error={treeError} onNavigate={() => setMenuFor(null)} />
          </div>
        </aside>

        <main className="min-w-0 flex-1 py-6 lg:py-8">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  );
}
