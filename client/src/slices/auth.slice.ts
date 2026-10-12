import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiBaseUrl } from "./base";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  departments: string[];
};

type AuthState = {
  user: AuthUser | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

type LoginCredentials = {
  email: string;
  password: string;
};

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
};

function isAuthUser(value: unknown): value is AuthUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }

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

export const loginUser = createAsyncThunk<
  AuthUser,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async (credentials, { rejectWithValue }) => {
  try {
    const response = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    const payload: unknown = await response.json();

    if (!response.ok) {
      return rejectWithValue(
        getApiError(payload) ?? "Unable to sign in. Please try again.",
      );
    }

    if (!isAuthUser(payload)) {
      console.error("Login API returned an invalid user response.", payload);
      return rejectWithValue("The server returned an unexpected response.");
    }

    return payload;
  } catch (error: unknown) {
    console.error("Unable to reach the login service.", error);
    return rejectWithValue(
      "Unable to reach the server. Check that the API is running.",
    );
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
    },
  },
  extraReducers(builder) {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ?? "Unable to sign in. Please try again.";
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;