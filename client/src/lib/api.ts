import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Helper to add JWT token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  /**
   * Updates a specific entry's content within a column.
   */
  updateEntry: async (entryId: number, content: string) => {
    const response = await apiClient.patch(`/entries/${entryId}`, { content });
    return response.data;
  },

  /**
   * Saves the state of all columns for a page (widths, order, label widths).
   */
  saveColumns: async (pageId: number, columns: any[]) => {
    const response = await apiClient.put(`/pages/${pageId}/columns`, { columns });
    return response.data;
  },

  /**
   * Arranges entries across columns (handles DND reordering).
   */
  arrangeEntries: async (columns: any[]) => {
    const response = await apiClient.patch(`/pages/arrange-entries`, { columns });
    return response.data;
  },

  /**
   * Updates general page settings (title, type, etc.).
   */
  updatePage: async (pageId: number, data: any) => {
    const response = await apiClient.patch(`/pages/${pageId}`, data);
    return response.data;
  },

  /**
   * Uploads an image for a page.
   */
  uploadImage: async (pageId: number, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("pageId", pageId.toString());
    
    const response = await apiClient.post(`/pages/${pageId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  /**
   * Updates the layout of a page (e.g., from 'columns' to 'image').
   */
  setLayout: async (pageId: number, layoutType: string) => {
    const response = await apiClient.patch(`/pages/${pageId}/layout`, { layoutType });
    return response.data;
  },
};
