import axios from "axios";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "./base";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  departments: string[];
};

type AuthSession = {
  user: AuthUser;
  csrfToken: string;
  expiresAt: number;
};

type AuthState = {
  user: AuthUser | null;
  csrfToken: string | null;
  expiresAt: number | null;
  initialized: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  isRefreshingSession: boolean;
  sessionRefreshError: string | null;
  isCheckingSession: boolean;
  sessionCheckError: string | null;
  sessionExpired: boolean;
};

type LoginCredentials = {
  email: string;
  password: string;
};

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) return false;

  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "number" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    Array.isArray(user.roles) &&
    user.roles.every((role: unknown) => typeof role === "string") &&
    Array.isArray(user.departments) &&
    user.departments.every((department: unknown) => typeof department === "string")
  );
}

function isAuthSession(
  value: unknown,
): value is AuthUser & {
  csrfToken: string;
  expiresAt: string;
  expiresInMs: number;
} {
  if (typeof value !== "object" || value === null) return false;
  const session = value as Record<string, unknown>;
  return (
    isAuthUser(value) &&
    typeof session.csrfToken === "string" &&
    session.csrfToken !== "" &&
    typeof session.expiresAt === "string" &&
    Number.isFinite(Date.parse(session.expiresAt)) &&
    typeof session.expiresInMs === "number" &&
    Number.isFinite(session.expiresInMs) &&
    session.expiresInMs >= 0
  );
}

function getApiError(payload: unknown): string | null {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }
  return null;
}

function readSessionPayload(payload: unknown): AuthSession | null {
  if (!isAuthSession(payload)) return null;
  const { csrfToken, expiresInMs, ...user } = payload;
  return { user, csrfToken, expiresAt: Date.now() + expiresInMs };
}

export const loadCurrentUser = createAsyncThunk<
  AuthSession,
  void,
  { rejectValue: string; state: { auth: AuthState } }
>(
  "auth/loadCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me", { timeout: 10_000 });
      const session = readSessionPayload(response.data);
      if (!session) {
        console.error("Current-user API returned an invalid session response.", response.data);
        return rejectWithValue("The server returned an unexpected response.");
      }
      return session;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return rejectWithValue("");
      }
      console.error("Unable to restore the server session.", error);
      const errorData = axios.isAxiosError(error) ? error.response?.data : null;
      return rejectWithValue(
        getApiError(errorData) ?? "Unable to reach the server. Check that the API is running.",
      );
    }
  },
  {
    condition: (_, { getState }) =>
      !getState().auth.initialized && getState().auth.status !== "loading",
  },
);

export const loginUser = createAsyncThunk<
  AuthSession,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await api.post("/auth/login", credentials);
    const session = readSessionPayload(response.data);

    if (!session) {
      console.error("Login API returned an invalid session response.", response.data);
      return rejectWithValue("The server returned an unexpected response.");
    }

    return session;
  } catch (error: unknown) {
    console.error("Unable to reach the login service.", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;
    return rejectWithValue(
      getApiError(errorData) ?? "Unable to reach the server. Check that the API is running.",
    );
  }
});

export const checkCurrentSession = createAsyncThunk<
  AuthSession,
  void,
  { rejectValue: string }
>("auth/checkCurrentSession", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/auth/me", { timeout: 10_000 });
    const session = readSessionPayload(response.data);
    if (!session) {
      console.error("Session check returned an invalid response.", response.data);
      return rejectWithValue("The server returned an unexpected response.");
    }
    return session;
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      return rejectWithValue("");
    }
    console.error("Unable to verify the server session.", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;
    return rejectWithValue(
      getApiError(errorData) ?? "Unable to verify your session. Check your connection.",
    );
  }
});

export const refreshSession = createAsyncThunk<
  number,
  void,
  { rejectValue: string }
>("auth/refreshSession", async (_, { rejectWithValue }) => {
  try {
    const response = await api.post("/auth/refresh", undefined, { timeout: 10_000 });
    const expiresInMs = response.data?.expiresInMs;
    if (
      typeof expiresInMs !== "number" ||
      !Number.isFinite(expiresInMs) ||
      expiresInMs <= 0
    ) {
      console.error("Session refresh API returned an invalid expiration.", response.data);
      return rejectWithValue("The server returned an unexpected response.");
    }
    return Date.now() + expiresInMs;
  } catch (error: unknown) {
    console.error("Unable to refresh the server session.", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;
    return rejectWithValue(
      getApiError(errorData) ?? "Unable to refresh your session. Please try again.",
    );
  }
});

export const logoutUser = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("auth/logout", async (_, { rejectWithValue }) => {
  try {
    await api.post("/auth/logout");
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response?.status === 401) return;

    console.error("Unable to end the server session.", error);
    const errorData = axios.isAxiosError(error) ? error.response?.data : null;
    return rejectWithValue(
      getApiError(errorData) ?? "Unable to sign out. Please try again.",
    );
  }
});

const initialState: AuthState = {
  user: null,
  csrfToken: null,
  expiresAt: null,
  initialized: false,
  status: "idle",
  error: null,
  isRefreshingSession: false,
  sessionRefreshError: null,
  isCheckingSession: false,
  sessionCheckError: null,
  sessionExpired: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionExpired(state) {
      if (!state.user) return;
      state.user = null;
      state.csrfToken = null;
      state.expiresAt = null;
      state.initialized = true;
      state.status = "idle";
      state.error = null;
      state.isRefreshingSession = false;
      state.sessionRefreshError = null;
      state.isCheckingSession = false;
      state.sessionCheckError = null;
      state.sessionExpired = true;
    },
    dismissSessionExpired(state) {
      state.sessionExpired = false;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loadCurrentUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.csrfToken = action.payload.csrfToken;
        state.expiresAt = action.payload.expiresAt;
        state.initialized = true;
        state.status = "succeeded";
        state.error = null;
        state.sessionExpired = false;
      })
      .addCase(loadCurrentUser.rejected, (state, action) => {
        state.user = null;
        state.csrfToken = null;
        state.expiresAt = null;
        state.initialized = true;
        state.status = action.payload ? "failed" : "idle";
        state.error = action.payload || null;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
        state.sessionRefreshError = null;
        state.sessionCheckError = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.csrfToken = action.payload.csrfToken;
        state.expiresAt = action.payload.expiresAt;
        state.initialized = true;
        state.status = "succeeded";
        state.error = null;
        state.isRefreshingSession = false;
        state.sessionRefreshError = null;
        state.isCheckingSession = false;
        state.sessionCheckError = null;
        state.sessionExpired = false;
      })
      .addCase(refreshSession.pending, (state) => {
        state.isRefreshingSession = true;
        state.sessionRefreshError = null;
      })
      .addCase(refreshSession.fulfilled, (state, action) => {
        state.expiresAt = action.payload;
        state.isRefreshingSession = false;
        state.sessionRefreshError = null;
      })
      .addCase(refreshSession.rejected, (state, action) => {
        state.isRefreshingSession = false;
        state.sessionRefreshError =
          action.payload ?? "Unable to refresh your session. Please try again.";
      })
      .addCase(checkCurrentSession.pending, (state) => {
        state.isCheckingSession = true;
        state.sessionCheckError = null;
      })
      .addCase(checkCurrentSession.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.csrfToken = action.payload.csrfToken;
        state.expiresAt = action.payload.expiresAt;
        state.isCheckingSession = false;
        state.sessionCheckError = null;
      })
      .addCase(checkCurrentSession.rejected, (state, action) => {
        state.isCheckingSession = false;
        state.sessionCheckError = action.payload || null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to sign in. Please try again.";
      })
      .addCase(logoutUser.pending, (state) => {
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.csrfToken = null;
        state.expiresAt = null;
        state.initialized = true;
        state.status = "idle";
        state.error = null;
        state.sessionRefreshError = null;
        state.isRefreshingSession = false;
        state.isCheckingSession = false;
        state.sessionCheckError = null;
        state.sessionExpired = false;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to sign out. Please try again.";
      });
  },
});

export const { dismissSessionExpired, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
