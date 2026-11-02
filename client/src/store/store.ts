import { configureStore } from "@reduxjs/toolkit";
import authReducer, { sessionExpired } from "@/slices/auth.slice";
import {
  registerCsrfTokenGetter,
  registerSessionExpiredHandler,
} from "@/lib/auth-session";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
});

registerCsrfTokenGetter(() => store.getState().auth.csrfToken);
registerSessionExpiredHandler(() => {
  store.dispatch(sessionExpired());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
