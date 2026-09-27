'use client';

import { useEffect, useState } from "react";
import { getStoredToken, getUserProfile } from "../utils/user";

export interface CurrentUser {
  /** Rôle de l'utilisateur connecté ("LC", "QC", ...) ou null s'il n'est pas connecté */
  role: string | null;
  profile: any | null;
  /** true tant que le profil n'a pas fini de charger */
  loading: boolean;
}

// Le profil est demandé une seule fois même si plusieurs composants utilisent le hook (Sidebar + page).
let cache: { token: string; promise: Promise<any> } | null = null;

function loadProfile(token: string): Promise<any> {
  if (!cache || cache.token !== token) {
    const promise = getUserProfile(token).then((p: any) => p.response ?? p);
    cache = { token, promise };
    promise.catch(() => {
      if (cache?.promise === promise) cache = null; // on pourra réessayer
    });
  }
  return cache.promise;
}

export function useCurrentUser(): CurrentUser {
  const [state, setState] = useState<CurrentUser>({ role: null, profile: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();

    if (!token) {
      setState({ role: null, profile: null, loading: false });
      return;
    }

    loadProfile(token)
      .then((profile) => {
        if (!cancelled) setState({ role: profile?.role ?? null, profile, loading: false });
      })
      .catch((err) => {
        console.error("Unable to load user profile:", err);
        if (!cancelled) setState({ role: null, profile: null, loading: false });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}