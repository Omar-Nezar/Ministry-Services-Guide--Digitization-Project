export type PaperSize = "A4" | "A3";
export type Orientation = "portrait" | "landscape";

export type DocumentSettings = {
  paperSize: PaperSize;
  orientation: Orientation;
};