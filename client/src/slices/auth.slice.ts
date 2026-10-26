import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "./base";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  roles: string[];
  departments: string[];
  token: string;
};

type AuthState = {
  user: AuthUser | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
  roles: string[];
  serviceDivisions: string[];
  optionsStatus: "idle" | "loading" | "succeeded" | "failed";
  optionsError: string | null;
};

type LoginCredentials = {
  email: string;
  password: string;
  role?: string;
  department?: string;
};

const initialState: AuthState = {
  user: null,
  status: "idle",
  error: null,
  roles: [],
  serviceDivisions: [],
  optionsStatus: "idle",
  optionsError: null,
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
    typeof user.token === "string" &&
    user.token.length > 0 &&
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
    const response = await api.post("/auth/login", credentials);
    const payload = response.data;

    if (!isAuthUser(payload)) {
      console.error("Login API returned an invalid user response.", payload);
      return rejectWithValue("The server returned an unexpected response.");
    }

    return payload;
  } catch (error: any) {
    console.error("Unable to reach the login service.", error);
    const errorData = error.response?.data;
    return rejectWithValue(
      getApiError(errorData) ?? "Unable to reach the server. Check that the API is running.",
    );
  }
});

export const fetchAuthOptions = createAsyncThunk<
  { roles: string[]; serviceDivisions: string[] },
  void,
  { rejectValue: string }
>("auth/fetchOptions", async (_, { rejectWithValue }) => {
  try {
    const response = await api.get("/auth/options");
    const payload = response.data;

    if (
      typeof payload !== "object" ||
      payload === null ||
      !Array.isArray((payload as Record<string, unknown>).roles) ||
      !Array.isArray((payload as Record<string, unknown>).serviceDivisions)
    ) {
      return rejectWithValue("The server returned an unexpected response.");
    }

    return {
      roles: (payload as Record<string, unknown>).roles as string[],
      serviceDivisions: (payload as Record<string, unknown>)
        .serviceDivisions as string[],
    };
  } catch (error: any) {
    console.error("Unable to reach the options service.", error);
    const errorData = error.response?.data;
    return rejectWithValue(
      getApiError(errorData) ?? "Unable to reach the server. Check that the API is running.",
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
      })
      .addCase(fetchAuthOptions.pending, (state) => {
        state.optionsStatus = "loading";
        state.optionsError = null;
      })
      .addCase(fetchAuthOptions.fulfilled, (state, action) => {
        state.optionsStatus = "succeeded";
        state.roles = action.payload.roles;
        state.serviceDivisions = action.payload.serviceDivisions;
        state.optionsError = null;
      })
      .addCase(fetchAuthOptions.rejected, (state, action) => {
        state.optionsStatus = "failed";
        state.optionsError =
          action.payload ?? "Unable to load options right now.";
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;