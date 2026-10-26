import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/slices/auth.slice";
import { registerTokenGetter } from "@/lib/auth-token";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

registerTokenGetter(() => store.getState().auth.user?.token ?? null);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
