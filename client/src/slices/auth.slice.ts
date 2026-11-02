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
};

type AuthState = {
  user: AuthUser | null;
  csrfToken: string | null;
  initialized: boolean;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
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

function isAuthSession(value: unknown): value is AuthUser & { csrfToken: string } {
  return (
    isAuthUser(value) &&
    typeof (value as Record<string, unknown>).csrfToken === "string" &&
    (value as Record<string, unknown>).csrfToken !== ""
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
  const { csrfToken, ...user } = payload;
  return { user, csrfToken };
}

export const loadCurrentUser = createAsyncThunk<
  AuthSession,
  void,
  { rejectValue: string; state: { auth: AuthState } }
>(
  "auth/loadCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me");
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
  initialized: false,
  status: "idle",
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionExpired(state) {
      state.user = null;
      state.csrfToken = null;
      state.initialized = true;
      state.status = "idle";
      state.error = null;
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
        state.initialized = true;
        state.status = "succeeded";
        state.error = null;
      })
      .addCase(loadCurrentUser.rejected, (state, action) => {
        state.user = null;
        state.csrfToken = null;
        state.initialized = true;
        state.status = action.payload ? "failed" : "idle";
        state.error = action.payload || null;
      })
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.csrfToken = action.payload.csrfToken;
        state.initialized = true;
        state.status = "succeeded";
        state.error = null;
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
        state.initialized = true;
        state.status = "idle";
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload ?? "Unable to sign out. Please try again.";
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;
