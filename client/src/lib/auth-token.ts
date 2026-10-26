let getToken: (() => string | null) | null = null;

export function registerTokenGetter(
    getter: () => string | null,
) {
    getToken = getter;
}

export function getAuthToken(): string | null {
    return getToken?.() ?? localStorage.getItem("token");
}
