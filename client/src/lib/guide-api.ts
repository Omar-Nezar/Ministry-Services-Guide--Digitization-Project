import api, { apiBaseUrl } from "@/slices/base";

// ---- what the public guide reads (GET /guide/...) ----

export interface TreeService {
  id: number;
  name: string;
}

export interface TreeDivision {
  id: number;
  name: string;
  nameAr: string | null;
  /** The category's colour for its labels */
  color: string | null;
  services: TreeService[];
}

export interface DivisionDetail extends Omit<TreeDivision, "services"> {
  services: { id: number; name: string; description: string; duration: string }[];
}

export interface GuideLabel {
  key: string;
  name: string;
  color: string | null;
  html: string;
  extra: boolean;
}

export interface GuideImage {
  id: number;
  imagePath: string;
  imageFit: "contain" | "cover";
  caption: string | null;
}

export interface ServiceDetail {
  id: number;
  name: string;
  serviceDivision: Omit<TreeDivision, "services">;
  labels: GuideLabel[];
  flowcharts: { id: number; title: string | null }[];
  images: GuideImage[];
}

// ---- what the editor reads and writes (/editor/..., needs a signed-in member of staff) ----

export interface EditorDivision extends TreeDivision {
  editable: boolean;
}

export interface EditorFlowchart {
  id: number;
  title: string | null;
  json: string;
}

export interface EditorService {
  id: number;
  name: string;
  serviceDivision: Omit<TreeDivision, "services">;
  editable: boolean;
  labels: GuideLabel[];
  flowcharts: EditorFlowchart[];
  images: GuideImage[];
}

export interface SectionLabel {
  id: number;
  key: string;
  name: string;
  order: number;
}

export interface LabelColor {
  serviceDivisionId: number;
  labelId: number;
  color: string;
}

const get = <T>(url: string, signal?: AbortSignal) => api.get<T>(url, signal ? { signal } : undefined).then((r) => r.data);

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

function pictureForm(file: File): FormData {
  const form = new FormData();
  form.append("image", file);
  return form;
}

export const guideApi = {
  tree: (signal?: AbortSignal) => get<TreeDivision[]>("/guide/tree", signal),
  division: (id: number, signal?: AbortSignal) => get<DivisionDetail>(`/guide/divisions/${id}`, signal),
  service: (id: number, signal?: AbortSignal) => get<ServiceDetail>(`/guide/services/${id}`, signal),
  flowchart: (id: number, signal?: AbortSignal) => get<unknown>(`/guide/flowcharts/${id}`, signal),
};

export const editorApi = {
  tree: () => get<EditorDivision[]>("/editor/tree"),
  setDivisionColor: (id: number, color: string | null) => api.patch(`/editor/divisions/${id}`, { color }),
  reorderDivisions: (ids: number[]) => api.put("/editor/divisions/order", ids),

  createService: (divisionId: number, name: string) =>
    api.post<TreeService>(`/editor/divisions/${divisionId}/services`, { name }).then((r) => r.data),
  arrangeServices: (items: { id: number; serviceDivisionId: number; order: number }[]) =>
    api.put("/editor/services/arrangement", items),
  service: (id: number) => get<EditorService>(`/editor/services/${id}`),
  renameService: (id: number, name: string) => api.patch(`/editor/services/${id}`, { name }),
  deleteService: (id: number) => api.delete(`/editor/services/${id}`),
  saveSection: (serviceId: number, key: string, html: string) =>
    api.put(`/editor/services/${serviceId}/sections/${key}`, { html }),

  createFlowchart: (serviceId: number, title: string, json: string) =>
    api.post<EditorFlowchart>(`/editor/services/${serviceId}/flowcharts`, { title, json }).then((r) => r.data),
  updateFlowchart: (id: number, data: { title?: string; json?: string }) => api.patch(`/editor/flowcharts/${id}`, data),
  deleteFlowchart: (id: number) => api.delete(`/editor/flowcharts/${id}`),
  reorderFlowcharts: (serviceId: number, ids: number[]) => api.put(`/editor/services/${serviceId}/flowcharts/order`, ids),

  uploadImage: (serviceId: number, file: File) =>
    api.post<GuideImage>(`/editor/services/${serviceId}/images`, pictureForm(file), multipart).then((r) => r.data),
  replaceImage: (id: number, file: File) =>
    api.post<GuideImage>(`/editor/images/${id}/file`, pictureForm(file), multipart).then((r) => r.data),
  updateImage: (id: number, data: { caption?: string; imageFit?: "contain" | "cover" }) =>
    api.patch<GuideImage>(`/editor/images/${id}`, data).then((r) => r.data),
  deleteImage: (id: number) => api.delete(`/editor/images/${id}`),
  reorderImages: (serviceId: number, ids: number[]) => api.put(`/editor/services/${serviceId}/images/order`, ids),

  labels: () => get<SectionLabel[]>("/editor/labels"),
  createLabel: (name: string) => api.post<SectionLabel>("/editor/labels", { name }).then((r) => r.data),
  renameLabel: (id: number, name: string) => api.patch(`/editor/labels/${id}`, { name }),
  deleteLabel: (id: number) => api.delete(`/editor/labels/${id}`),
  reorderLabels: (ids: number[]) => api.put("/editor/labels/order", ids),
  labelColors: () => get<LabelColor[]>("/editor/label-colors"),
  setLabelColor: (serviceDivisionId: number, labelId: number, color: string | null) =>
    api.put("/editor/label-colors", { serviceDivisionId, labelId, color }),
  clearLabelColors: (serviceDivisionId: number) => api.delete(`/editor/label-colors/${serviceDivisionId}`),
};

/** URL of an uploaded picture ("uploads/…" as the API stores it). */
export const uploadUrl = (imagePath: string) => `${apiBaseUrl}/${imagePath}`;

/** The message of a failed API call, if the server sent one. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof data?.error === "string" ? data.error : fallback;
}

/** Category name for the reader: Arabic when the page is Arabic. */
export const divisionTitle = (d: { name: string; nameAr: string | null }, isArabic: boolean) =>
  isArabic ? (d.nameAr ?? d.name) : d.name;

/** Service names from the Word files sometimes end with ":" */
export const serviceTitle = (name: string) => name.replace(/\s*:\s*$/, "");

/** A flowchart's title is its Excel sheet name: trim it, and drop a ")" left without its "(". */
export const flowchartTitle = (f: { title: string | null }, fallback: string) => {
  const t = f.title?.trim() ?? "";
  return (t.includes("(") ? t : t.replace(/\s*\)$/, "")) || fallback;
};

/** The colour of a category's labels when it has none set (the ministry's sea blue). */
export const DEFAULT_LABEL_COLOR = "#074169";
