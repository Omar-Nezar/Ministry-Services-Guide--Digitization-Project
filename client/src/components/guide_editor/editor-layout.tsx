import { Suspense, useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { useDispatch, useSelector } from "react-redux";
import { LogOut, Menu, X } from "lucide-react";
import { Header } from "@/components/general/header";
import { useLanguage } from "@/components/settings/language-context";
import { Button } from "@/components/ui/button";
import { editorApi, type EditorDivision } from "@/lib/guide-api";
import { cn } from "@/lib/utils";
import { logout } from "@/slices/auth.slice";
import type { AppDispatch, RootState } from "@/store/store";
import { EditorTree } from "./editor-tree";

/** What the editor pages get from the layout (useOutletContext). */
export interface EditorContext {
  tree: EditorDivision[] | undefined;
  setTree: (update: (tree: EditorDivision[]) => EditorDivision[]) => void;
  reloadTree: () => Promise<void>;
  isAdmin: boolean;
  /** The open page tells the layout it has unsaved changes, so leaving asks first */
  setDirty: (dirty: boolean) => void;
}

export const editorPaths = {
  home: "/moh/editor",
  service: (id: number) => `/moh/editor/service/${id}`,
  labels: "/moh/editor/labels",
  staff: "/moh/editor/staff",
};

/** The services editor: the site header, the category/service tree, and the open page. */
export function EditorLayout() {
  const { isArabic } = useLanguage();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((state: RootState) => state.auth.user);
  const [tree, setTreeState] = useState<EditorDivision[] | undefined>();
  const [error, setError] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const { pathname } = useLocation();
  const menuOpen = menuFor === pathname;
  const isAdmin = user?.roles.includes("admin") ?? false;
  const dirty = useRef(false);
  const setDirty = useCallback((value: boolean) => {
    dirty.current = value;
  }, []);

  const leaveConfirmed = () =>
    !dirty.current || confirm(isArabic ? "لديك تغييرات غير محفوظة ستُفقد. هل تريد المغادرة؟" : "You have unsaved changes that will be lost. Leave anyway?");

  // Any link to another page asks first while there are unsaved changes
  const guardLinks = (e: MouseEvent) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[href]");
    if (!link || link.getAttribute("target") === "_blank") return;
    if (new URL(link.href, location.href).pathname === location.pathname) return;
    if (!leaveConfirmed()) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const reloadTree = useCallback(async () => {
    try {
      setTreeState(await editorApi.tree());
      setError(false);
    } catch (e) {
      // An expired token: back to the sign-in page
      if ((e as { response?: { status?: number } }).response?.status === 401) dispatch(logout());
      else setError(true);
    }
  }, [dispatch]);

  useEffect(() => {
    void reloadTree();
  }, [reloadTree]);

  const setTree = useCallback((update: (tree: EditorDivision[]) => EditorDivision[]) => {
    setTreeState((current) => (current ? update(current) : current));
  }, []);

  const context: EditorContext = { tree, setTree, reloadTree, isAdmin, setDirty };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
    );

  return (
    <div className="min-h-screen text-foreground" onClickCapture={guardLinks}>
      <Header />
      <div className="border-b bg-card">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-2 px-4 py-2 lg:px-6">
          <span className="me-2 text-sm font-semibold">{isArabic ? "محرر دليل الخدمات" : "Services catalogue editor"}</span>
          <nav className="flex items-center gap-1" aria-label={isArabic ? "المحرر" : "Editor"}>
            <NavLink to={editorPaths.home} end className={navClass}>
              {isAdmin ? (isArabic ? "لوحة التحكم" : "Dashboard") : isArabic ? "الخدمات" : "Services"}
            </NavLink>
            <NavLink to={editorPaths.labels} className={navClass}>
              {isArabic ? "العناوين والألوان" : "Labels & colours"}
            </NavLink>
            {isAdmin && (
              <NavLink to={editorPaths.staff} className={navClass}>
                {isArabic ? "الموظفون" : "Staff"}
              </NavLink>
            )}
          </nav>
          <div className="ms-auto flex items-center gap-2 text-sm text-muted-foreground">
            <span className="max-sm:hidden">{user?.name}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => leaveConfirmed() && dispatch(logout())}>
              <LogOut aria-hidden="true" /> {isArabic ? "تسجيل الخروج" : "Sign out"}
            </Button>
          </div>
        </div>
      </div>

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
          <div className="py-4 max-lg:max-h-[70svh] max-lg:overflow-y-auto lg:sticky lg:top-4 lg:max-h-[calc(100svh-2rem)] lg:overflow-y-auto">
            <EditorTree
              tree={tree}
              error={error}
              setTree={setTree}
              reloadTree={reloadTree}
              isAdmin={isAdmin}
              onNavigate={() => setMenuFor(null)}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1 py-6 lg:py-8">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
            <Outlet context={context} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
