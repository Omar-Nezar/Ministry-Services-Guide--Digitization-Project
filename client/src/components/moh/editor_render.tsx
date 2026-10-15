import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Puck, usePuck } from "@puckeditor/core";
import { Header } from "@/components/general/header";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/settings/language-context";
import {
  arabicDictionary,
  config,
  getEditorConfig,
  getLocalizedPageViewports,
  getPageCanvasViewport,
  getPageContentCapacity,
  getPageContentCount,
  initialData,
} from "@/components/moh/editor_config";

type OutlineNode = {
  type: string;
  props: Record<string, unknown> & { id: string };
};

function getChildNodes(node: OutlineNode): OutlineNode[] {
  const content = Array.isArray(node.props.content)
    ? node.props.content.filter(isOutlineNode)
    : [];
  const columns = Array.isArray(node.props.columns) ? node.props.columns : [];
  const columnContent = columns.flatMap((column) =>
    column && typeof column === "object" && "content" in column &&
      Array.isArray(column.content)
      ? column.content.filter(isOutlineNode)
      : [],
  );

  return [...content, ...columnContent];
}

function isOutlineNode(value: unknown): value is OutlineNode {
  return (
    !!value &&
    typeof value === "object" &&
    "type" in value &&
    typeof value.type === "string" &&
    "props" in value &&
    !!value.props &&
    typeof value.props === "object" &&
    "id" in value.props &&
    typeof value.props.id === "string"
  );
}

function getComponentLabel(type: string, isArabic: boolean) {
  if (type === "A4Page") return isArabic ? "صفحة A4" : "A4 page";
  if (type === "A3Page") return isArabic ? "صفحة A3" : "A3 page";
  if (type === "DivBlock") return isArabic ? "حاوية تخطيط" : "Layout container";
  if (type === "HeadingBlock") return isArabic ? "نص" : "Text";
  return type;
}

function scrollToPage(pageId: string) {
  const pageElementId = `puck-page-${pageId}`;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      for (const frame of document.querySelectorAll("iframe")) {
        const pageElement = frame.contentDocument?.getElementById(pageElementId);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
    });
  });
}

function PageOutline({ children }: { children: React.ReactNode }) {
  const { appState } = usePuck();
  const { isArabic } = useLanguage();

  useEffect(() => {
    const outlineRoot = document.querySelector('[class*="LayerTreeRoot"]');
    if (!outlineRoot) {
      return;
    }
    const layerTree = outlineRoot;

    function updateOutlineNames() {
      const names = new Map<string, OutlineNode>();
      function collect(nodes: OutlineNode[]) {
        for (const node of nodes) {
          names.set(node.props.id, node);
          collect(getChildNodes(node));
        }
      }
      collect(appState.data.content.filter(isOutlineNode));

      for (const row of layerTree.querySelectorAll<HTMLElement>(
        "[data-puck-layer-tree-id]",
      )) {
        const node = names.get(row.dataset.puckLayerTreeId ?? "");
        if (!node) {
          continue;
        }

        const nameElement = row.querySelector<HTMLElement>(
          '[class*="Layer-name"]',
        );
        if (nameElement) {
          const baseLabel = getComponentLabel(node.type, isArabic);
          const title =
            typeof node.props.title === "string" ? node.props.title.trim() : "";
          const label = title ? `${baseLabel} · ${title}` : baseLabel;
          if (nameElement.textContent !== label) {
            nameElement.textContent = label;
          }
        }

      }
    }

    updateOutlineNames();
    const observer = new MutationObserver(updateOutlineNames);
    observer.observe(layerTree, {
      attributes: true,
      attributeFilter: ["data-puck-layer-tree-id"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [appState.data, isArabic]);

  return (
    <div>{children}</div>
  );
}

export function Editor() {
  const { isArabic } = useLanguage();
  const [data, setData] = useState(initialData);
  const localizedConfig = useMemo(
    () => (isArabic ? getEditorConfig(true) : config),
    [isArabic],
  );
  const localizedViewports = useMemo(
    () => getLocalizedPageViewports(isArabic),
    [isArabic],
  );

  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-4.5rem)] bg-muted/40">
        <div dir="ltr" lang={isArabic ? "ar" : "en"}>
          <Puck
            config={localizedConfig}
            data={initialData}
            onChange={setData}
            dictionary={isArabic ? arabicDictionary : undefined}
            iframe={{ syncHostStyles: false }}
            overrides={{ outline: PageOutline }}
            viewports={localizedViewports}
            renderHeaderActions={({ state, dispatch }) => {
              const pages = state.data.content.flatMap((component, index) =>
                component.type === "A4Page" || component.type === "A3Page"
                  ? [{ component, index }]
                  : [],
              );
              const currentIndex =
                state.ui.itemSelector?.zone
                  ? -1
                  : (state.ui.itemSelector?.index ?? -1);

              function insertPage(type: "A4Page" | "A3Page") {
                const orientation = "portrait";
                const pageIndex = state.data.content.length;

                const pageId = crypto.randomUUID();
                dispatch({
                  type: "setData",
                  data: (currentData) => ({
                    content: [
                      ...currentData.content,
                      {
                        type,
                        props: {
                          id: pageId,
                          content: [],
                          orientation,
                        },
                      },
                    ],
                  }),
                });
                dispatch({
                  type: "setUi",
                  ui: (currentUi) => ({
                    itemSelector: { index: pageIndex },
                    viewports: {
                      ...currentUi.viewports,
                      current: getPageCanvasViewport(),
                    },
                  }),
                });
                scrollToPage(pageId);
              }

              function selectPage(index: number) {
                const page = pages.find((item) => item.index === index);
                if (!page) {
                  return;
                }

                dispatch({
                  type: "setUi",
                  ui: (currentUi) => ({
                    itemSelector: { index },
                    viewports: {
                      ...currentUi.viewports,
                      current: getPageCanvasViewport(),
                    },
                  }),
                });
                scrollToPage(page.component.props.id);
              }

              const currentPagePosition = pages.findIndex(
                ({ index }) => index === currentIndex,
              );
              const selectedPosition =
                currentPagePosition >= 0 ? currentPagePosition : 0;
              const selectedPage =
                currentPagePosition >= 0
                  ? pages[currentPagePosition].component
                  : undefined;
              const selectedPageCapacity = selectedPage
                ? getPageContentCapacity(
                  selectedPage.type as "A4Page" | "A3Page",
                  selectedPage.props.orientation,
                )
                : undefined;
              const selectedPageContentCount = selectedPage
                ? getPageContentCount(selectedPage.props.content)
                : 0;
              const isPageFull =
                selectedPageCapacity !== undefined &&
                selectedPageContentCount >= selectedPageCapacity;

              return (
                <div
                  dir="ltr"
                  className="flex flex-wrap items-center gap-2"
                >
                  {pages.length === 0 ? (
                    <span className="text-sm text-muted-foreground">
                      {isArabic
                        ? "أضف صفحة لبدء التحرير"
                        : "Insert a page to start editing"}
                    </span>
                  ) : (
                    <nav
                      aria-label={isArabic ? "التنقل بين الصفحات" : "Page navigation"}
                      className="flex items-center gap-1"
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={isArabic ? "الصفحة السابقة" : "Previous page"}
                        disabled={selectedPosition === 0}
                        onClick={() => selectPage(pages[selectedPosition - 1].index)}
                      >
                        <ChevronLeft aria-hidden="true" />
                      </Button>
                      <label className="flex items-center gap-2 px-2 text-sm">
                        <span className="sr-only">
                          {isArabic ? "الصفحة الحالية" : "Current page"}
                        </span>
                        <select
                          className="h-8 max-w-44 rounded-md border border-input bg-background px-2"
                          value={selectedPosition}
                          onChange={(event) =>
                            selectPage(Number(event.target.value))
                          }
                        >
                          {pages.map(({ component }, position) => {
                            const size =
                              component.type === "A4Page" ? "A4" : "A3";
                            const orientation =
                              component.props.orientation === "landscape"
                                ? isArabic
                                  ? "أفقي"
                                  : "Landscape"
                                : isArabic
                                  ? "عمودي"
                                  : "Portrait";

                            return (
                              <option key={component.props.id} value={position}>
                                {(typeof component.props.title === "string" &&
                                  component.props.title.trim()
                                  ? component.props.title
                                  : `${isArabic ? "صفحة" : "Page"} ${position + 1}`)}{" "}
                                · {size} {orientation}
                              </option>
                            );
                          })}
                        </select>
                        <span className="whitespace-nowrap text-muted-foreground">
                          {selectedPosition + 1} / {pages.length}
                        </span>
                      </label>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        aria-label={isArabic ? "الصفحة التالية" : "Next page"}
                        disabled={selectedPosition === pages.length - 1}
                        onClick={() => selectPage(pages[selectedPosition + 1].index)}
                      >
                        <ChevronRight aria-hidden="true" />
                      </Button>
                    </nav>
                  )}
                  <Button
                    type="button"
                    onClick={() => insertPage("A4Page")}
                  >
                    <Plus aria-hidden="true" />
                    {isArabic ? "A4 عمودي" : "A4 portrait"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => insertPage("A3Page")}
                  >
                    <Plus aria-hidden="true" />
                    {isArabic ? "A3 عمودي" : "A3 portrait"}
                  </Button>
                  {isPageFull && (
                    <span
                      role="status"
                      className="text-sm text-muted-foreground"
                    >
                      {isArabic
                        ? "امتلأت الصفحة؛ احذف عنوانًا أو أضف صفحة أخرى."
                        : "Page is full. Remove a heading or add another page."}
                    </span>
                  )}
                </div>
              );
            }}
          />
        </div>
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h2 className="mb-3 text-lg font-semibold">
            {isArabic ? "معاينة بيانات JSON" : "Generated JSON preview"}
          </h2>
          <pre
            dir="ltr"
            className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-4 text-left text-xs leading-5"
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </section>
      </main>
    </>
  );
}