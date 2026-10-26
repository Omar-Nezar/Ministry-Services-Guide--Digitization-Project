/** Where the public guide lives in the site. */
export const guidePaths = {
  home: "/recipient",
  division: (id: number) => `/recipient/categories/${id}`,
  service: (id: number) => `/recipient/services/${id}`,
};
