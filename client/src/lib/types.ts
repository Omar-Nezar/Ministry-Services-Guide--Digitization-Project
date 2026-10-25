export type Service = {
  id: number;
  name: string;
  parentId: number | null;
  order: number;
};

export type Label = {
  id: number;
  name: string;
  order: number;
  color: string | null;
};

export type Entry = {
  id: number;
  columnId: number;
  labelId: number;
  order: number;
  content: string;
  label: Label;
};

export type Column = {
  id: number;
  pageId: number;
  order: number;
  /** % of the page row */
  width: number;
  /** % of this column taken by the label cell (the rest is the info cell) */
  labelWidth: number;
  entries: Entry[];
};

export type PageType = "columns" | "image";

export type Page = {
  id: number;
  serviceId: number;
  title: string;
  order: number;
  type: PageType;
  imagePath: string | null;
  imageFit: "contain" | "cover" | null;
  caption: string | null;
  columns: Column[];
};
