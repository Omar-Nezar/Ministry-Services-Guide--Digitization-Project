import { useEffect, useState } from "react";
import { apiErrorMessage } from "@/lib/guide-api";

type State<T> = { data?: T; error?: string; loading: boolean };

/** Loads `load(signal)` again whenever `key` changes; keeps the previous data until the new one arrives. */
export function useFetch<T>(key: string | null, load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<State<T>>({ loading: key !== null });

  useEffect(() => {
    if (key === null) return;
    const ctrl = new AbortController();
    setState((s) => ({ data: s.data, loading: true }));
    load(ctrl.signal)
      .then((data) => setState({ data, loading: false }))
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) setState({ error: apiErrorMessage(e, "Unable to reach the server."), loading: false });
      });
    return () => ctrl.abort();
    // `load` is a new closure on every render; `key` says when to fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
