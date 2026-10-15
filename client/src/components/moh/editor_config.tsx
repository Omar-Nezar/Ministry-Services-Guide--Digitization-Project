import type { ReactNode } from "react";
import type {
  Config,
  Data,
  Dictionary,
  PuckContext,
  Viewport,
} from "@puckeditor/core";
import { Info } from "lucide-react";
import { BackgroundColorField } from "@/components/moh/editor_background_color_field";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const millimetersToPixels = (millimeters: number) =>
  (millimeters / 25.4) * 96;

const paperSizes = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
} as const;

const pagePadding = 20;
const textLineHeight = 16 * 1.5;
const emptySlotMinHeight = 320;
const maximumColumns = 6;

type SlotContentProps = {
  minEmptyHeight?: number;
  collisionAxis?: "dynamic" | "x" | "y";
};

type SlotContent = (props?: SlotContentProps) => ReactNode;

type ContentNode = {
  id?: string;
  type: string;
  props: Record<string, unknown>;
};

type LayoutColumn = {
  width?: number;
  backgroundColor?: string;
  content: SlotContent;
};

type LayoutRenderProps = {
  id: string;
  puck: PuckContext;
  editMode?: boolean;
  columns?: LayoutColumn[];
};

function renderSlot(Content: SlotContent, props?: SlotContentProps) {
  return Content({
    minEmptyHeight: emptySlotMinHeight,
    ...props,
  });
}

function getChildNodes(node: ContentNode): ContentNode[] {
  const directChildren = Array.isArray(node.props.content)
    ? getContentNodes(node.props.content)
    : [];
  const columns = Array.isArray(node.props.columns) ? node.props.columns : [];
  const columnChildren = columns.flatMap((column) => {
    if (!column || typeof column !== "object" || !("content" in column)) {
      return [];
    }

    return getContentNodes(column.content);
  });

  return [...directChildren, ...columnChildren];
}

function getContentNodes(value: unknown): ContentNode[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is ContentNode =>
      !!item &&
      typeof item === "object" &&
      "type" in item &&
      typeof item.type === "string" &&
      "props" in item &&
      !!item.props &&
      typeof item.props === "object",
  );
}

function containsComponent(node: ContentNode, id: string): boolean {
  return (
    node.id === id ||
    getChildNodes(node).some((child) => containsComponent(child, id))
  );
}

function findPageContaining(
  nodes: ContentNode[],
  componentId: string,
): ContentNode | undefined {
  for (const node of nodes) {
    if (node.type === "A4Page" || node.type === "A3Page") {
      if (containsComponent(node, componentId)) {
        return node;
      }
      continue;
    }

    const nestedPage = findPageContaining(getChildNodes(node), componentId);
    if (nestedPage) {
      return nestedPage;
    }
  }

  return undefined;
}

function countComponentTree(node: ContentNode): number {
  return 1 + getChildNodes(node).reduce(
    (total, child) => total + countComponentTree(child),
    0,
  );
}

export function getPageContentCount(content: unknown): number {
  return getContentNodes(content).reduce(
    (total, node) => total + countComponentTree(node),
    0,
  );
}

export function getPageContentCapacity(
  type: "A4Page" | "A3Page",
  orientation: unknown,
) {
  const size = type === "A4Page" ? paperSizes.A4 : paperSizes.A3;
  const pageHeight = orientation === "landscape" ? size.width : size.height;
  const availableHeight = millimetersToPixels(pageHeight - pagePadding * 2);

  return Math.floor(availableHeight / textLineHeight);
}

function canInsertIntoPage(
  componentData: Record<string, unknown>,
  componentType: "DivBlock" | "HeadingBlock",
  parent: ContentNode | null,
  appState: { data: Data },
) {
  if (
    !parent ||
    (parent.type !== "A4Page" &&
      parent.type !== "A3Page" &&
      parent.type !== "DivBlock")
  ) {
    return false;
  }

  const page = findPageContaining(
    getContentNodes(appState.data.content),
    parent.id ?? "",
  );
  if (!page) {
    return false;
  }

  const candidate: ContentNode = {
    type: componentType,
    props: componentData,
  };
  const capacity = getPageContentCapacity(
    page.type as "A4Page" | "A3Page",
    page.props.orientation,
  );

  return (
    getPageContentCount(getChildNodes(page)) +
      countComponentTree(candidate) <=
    capacity
  );
}

export const pageViewports: Viewport[] = [
  {
    ...getPageCanvasViewport("A4Page", "portrait"),
    label: "A4 portrait",
  },
  {
    ...getPageCanvasViewport("A3Page", "portrait"),
    label: "A3 portrait / A4 landscape",
  },
  {
    ...getPageCanvasViewport("A3Page", "landscape"),
    label: "A3 landscape",
  },
];

export const arabicDictionary: Dictionary = {
  "header-publish": "نشر",
  "header-undo": "تراجع",
  "header-redo": "إعادة",
  "header-toggle-leftsidebar": "إظهار أو إخفاء الشريط الجانبي الأيسر",
  "header-toggle-rightsidebar": "إظهار أو إخفاء الشريط الجانبي الأيمن",
  "header-toggle-menubar": "إظهار أو إخفاء شريط القوائم",
  "action-selectparent": "تحديد العنصر الأصل",
  "action-duplicate": "إنشاء نسخة",
  "action-delete": "حذف",
  "label-page": "صفحة",
  "label-component": "مكوّن",
  "outline-empty": "لا توجد عناصر",
  "outline-item-collapse": "طي",
  "outline-item-expand": "توسيع",
  "outline-header-title": "المخطط",
  "outline-header-collapseall": "طي الكل",
  "outline-item-duplicate": "إنشاء نسخة",
  "outline-item-delete": "حذف",
  "drawer-category-collapse": "طي {title}",
  "drawer-category-expand": "توسيع {title}",
  "drawer-category-other": "أخرى",
  "canvas-noconfig": "لا يوجد إعداد للعنصر {type}",
  "field-readonly": "للقراءة فقط",
  "field-arrayitem-summary": "العنصر رقم {index}",
  "field-arrayitem-duplicate": "إنشاء نسخة",
  "field-arrayitem-delete": "حذف",
  "field-external-selectdata": "اختيار البيانات",
  "field-external-search": "بحث",
  "field-external-togglefilters": "إظهار أو إخفاء عوامل التصفية",
  "field-external-item": "عنصر خارجي",
  "field-external-result-singular": "نتيجة واحدة",
  "field-external-result-plural": "{count} نتائج",
  "field-richtext-bold": "عريض",
  "field-richtext-italic": "مائل",
  "field-richtext-underline": "تحته خط",
  "field-richtext-strikethrough": "يتوسطه خط",
  "field-richtext-blockquote": "اقتباس",
  "field-richtext-code-inline": "تعليمة برمجية ضمن النص",
  "field-richtext-code-block": "كتلة تعليمات برمجية",
  "field-richtext-list-bullet": "قائمة نقطية",
  "field-richtext-list-ordered": "قائمة مرقمة",
  "field-richtext-horizontalrule": "خط أفقي",
  "field-richtext-align-left": "محاذاة لليسار",
  "field-richtext-align-center": "توسيط",
  "field-richtext-align-right": "محاذاة لليمين",
  "field-richtext-align-justify": "ضبط النص",
  "field-richtext-select": "تحديد",
  "field-richtext-headingselect-1": "عنوان 1",
  "field-richtext-headingselect-2": "عنوان 2",
  "field-richtext-headingselect-3": "عنوان 3",
  "field-richtext-headingselect-4": "عنوان 4",
  "field-richtext-headingselect-5": "عنوان 5",
  "field-richtext-headingselect-6": "عنوان 6",
  "field-richtext-alignselect-left": "يسار",
  "field-richtext-alignselect-center": "وسط",
  "field-richtext-alignselect-right": "يمين",
  "field-richtext-alignselect-justify": "ضبط",
  "field-richtext-listselect-bullet": "قائمة نقطية",
  "field-richtext-listselect-ordered": "قائمة مرقمة",
  "viewport-zoom-in": "تكبير المعاينة",
  "viewport-zoom-out": "تصغير المعاينة",
  "viewport-zoom-auto": "{zoom}% (تلقائي)",
  "viewport-toggle-menu": "إظهار أو إخفاء قائمة أحجام المعاينة",
  "viewport-switch": "التبديل إلى معاينة {label}",
  "viewport-switch-default": "تغيير حجم المعاينة",
  "plugin-blocks": "الكتل",
  "plugin-outline": "المخطط",
  "plugin-fields": "الحقول",
  "plugin-components": "المكوّنات",
  "layout-maximize": "تكبير",
  "layout-minimize": "تصغير",
  "loader-loading": "جارٍ التحميل",
};

export function getLocalizedPageViewports(isArabic: boolean) {
  const arabicLabels: Record<string, string> = {
    "A4 portrait": "A4 عمودي",
    "A3 portrait / A4 landscape": "A3 عمودي / A4 أفقي",
    "A3 landscape": "A3 أفقي",
  };

  return pageViewports.map((viewport) => ({
    ...viewport,
    label: isArabic
      ? arabicLabels[viewport.label ?? ""] ?? viewport.label
      : viewport.label,
  }));
}

export function getPageCanvasViewport(
  type: "A4Page" | "A3Page",
  orientation: unknown,
) {
  const size = type === "A4Page" ? paperSizes.A4 : paperSizes.A3;
  const isLandscape = orientation === "landscape";

  return {
    width: millimetersToPixels(isLandscape ? size.height : size.width),
    height: "auto" as const,
  };
}

function renderPaper(
  children: ReactNode,
  width: number,
  height: number,
  orientation: "portrait" | "landscape",
  pageId: string,
) {
  const isLandscape = orientation === "landscape";

  return (
    <article
      id={`puck-page-${pageId}`}
      style={{
        boxSizing: "border-box",
        width: `${isLandscape ? height : width}mm`,
        height: `${isLandscape ? width : height}mm`,
        margin: "0 auto 24px",
        scrollMargin: "24px",
        padding: `${pagePadding}mm`,
        overflow: "hidden",
        backgroundColor: "#fff",
        color: "#171717",
        boxShadow: "0 2px 12px rgb(0 0 0 / 15%)",
      }}
    >
      {children}
    </article>
  );
}

function nameInOutlineField(isArabic: boolean) {
  const label = isArabic ? "الاسم في المخطط" : "Name in outline";
  const description = isArabic
    ? "يُستخدم هذا الاسم لتمييز العنصر في المخطط فقط."
    : "This name labels the element in the outline only.";

  return {
    type: "text" as const,
    label,
    labelIcon: (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={description}
                className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            }
          >
            <Info aria-hidden="true" className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  };
}

export function getEditorConfig(isArabic: boolean): Config {
  const orientationOptions = [
    {
      label: isArabic ? "عمودي" : "Portrait",
      value: "portrait",
    },
    {
      label: isArabic ? "أفقي" : "Landscape",
      value: "landscape",
    },
  ];

  return {
    components: {
      A4Page: {
        label: isArabic ? "صفحة A4" : "A4 page",
        defaultProps: {
          content: [],
          orientation: "portrait",
          title: "",
        },
        fields: {
          title: nameInOutlineField(isArabic),
          orientation: {
            type: "select",
            label: isArabic ? "اتجاه الصفحة" : "Orientation",
            options: orientationOptions,
          },
          content: {
            type: "slot",
            allow: ["HeadingBlock", "DivBlock"],
          },
        },
        render: ({ id, content: Content, orientation }) =>
          renderPaper(
            renderSlot(Content),
            paperSizes.A4.width,
            paperSizes.A4.height,
            orientation,
            id,
          ),
      },
      A3Page: {
        label: isArabic ? "صفحة A3" : "A3 page",
        defaultProps: {
          content: [],
          orientation: "portrait",
          title: "",
        },
        fields: {
          title: nameInOutlineField(isArabic),
          orientation: {
            type: "select",
            label: isArabic ? "اتجاه الصفحة" : "Orientation",
            options: orientationOptions,
          },
          content: {
            type: "slot",
            allow: ["HeadingBlock", "DivBlock"],
          },
        },
        render: ({ id, content: Content, orientation }) =>
          renderPaper(
            renderSlot(Content),
            paperSizes.A3.width,
            paperSizes.A3.height,
            orientation,
            id,
          ),
      },
      DivBlock: {
        label: isArabic ? "حاوية تخطيط" : "Layout container",
        defaultProps: {
          title: "",
          columns: [
            { width: 1, backgroundColor: "transparent", content: [] },
            { width: 1, backgroundColor: "transparent", content: [] },
          ],
        },
        fields: {
          title: nameInOutlineField(isArabic),
          columns: {
            type: "array",
            label: isArabic ? "الأعمدة" : "Columns",
            min: 1,
            max: maximumColumns,
            defaultItemProps: {
              width: 1,
              backgroundColor: "transparent",
              content: [],
            },
            getItemSummary: (_column, index) =>
              `${isArabic ? "عمود" : "Column"} ${(index ?? 0) + 1}`,
            arrayFields: {
              width: {
                type: "number",
                label: isArabic ? "العرض النسبي" : "Relative width",
                min: 1,
                max: 10,
                step: 1,
              },
              backgroundColor: {
                type: "custom",
                label: isArabic ? "لون خلفية العمود" : "Column background",
                render: ({ value, onChange }) => (
                  <BackgroundColorField
                    value={typeof value === "string" ? value : "transparent"}
                    onChange={onChange}
                    isArabic={isArabic}
                  />
                ),
              },
              content: {
                type: "slot",
                allow: ["HeadingBlock", "DivBlock"],
              },
            },
          },
        },
        resolvePermissions: (data, { parent, appState }) => {
          const hasRoom = canInsertIntoPage(data, "DivBlock", parent, appState);
          return { insert: hasRoom, duplicate: hasRoom };
        },
        render: ({ columns }: LayoutRenderProps) => {
          const visibleColumns = (columns ?? []).slice(0, maximumColumns);
          const gridTemplateColumns = visibleColumns
            .map(({ width }) => `minmax(0, ${Math.max(1, width ?? 1)}fr)`)
            .join(" ");

          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns,
                gap: "8px",
                minWidth: 0,
              }}
            >
              {visibleColumns.map(
                ({ backgroundColor, content: Content }, index) => (
                  <div
                    key={index}
                    style={{
                      boxSizing: "border-box",
                      minWidth: 0,
                      minHeight: "48px",
                      backgroundColor: backgroundColor ?? "transparent",
                    }}
                  >
                    {renderSlot(Content, { collisionAxis: "x" })}
                  </div>
                ),
              )}
            </div>
          );
        },
      },
      HeadingBlock: {
        label: isArabic ? "نص" : "Text",
        defaultProps: { title: "", children: "" },
        fields: {
          title: nameInOutlineField(isArabic),
          children: {
            type: "richtext",
            label: isArabic ? "النص" : "Text",
            contentEditable: true,
          },
        },
        resolvePermissions: (data, { parent, appState }) => {
          const hasRoom = canInsertIntoPage(
            data,
            "HeadingBlock",
            parent,
            appState,
          );
          return { insert: hasRoom, duplicate: hasRoom };
        },
        render: ({ children }) => (
          <div
            style={{
              boxSizing: "border-box",
              width: "100%",
              margin: 0,
              minWidth: 0,
              overflowWrap: "anywhere",
              whiteSpace: "pre-wrap",
              fontSize: "16px",
              lineHeight: 1.5,
            }}
          >
            {children}
          </div>
        ),
      },
    },
  };
}

export const config = getEditorConfig(false);

export const initialData: Data = {
  content: [],
  root: {
    props: {},
  },
};
