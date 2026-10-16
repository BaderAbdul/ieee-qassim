export interface SessionState<U, P> { user: U | null; profile: P | null; loading: boolean; error: string | null }
export interface SessionAdapters<U, P> {
  observeUser: (next: (user: U | null) => void, fail: (error: unknown) => void) => () => void;
  observeProfile: (user: U, next: (profile: P | null, fromCache: boolean) => void, fail: (error: unknown) => void) => () => void;
  createProfile: (user: U) => Promise<P>;
  update: (state: SessionState<U, P>) => void;
  ready?: (user: U, profile: P) => void;
  timeoutMs?: number;
}

/** Session generations prevent late callbacks from signing out or overwriting a newer account. */
export function startSession<U extends { uid: string }, P>(adapters: SessionAdapters<U, P>) {
  let active = true;
  let generation = 0;
  let uid: string | null | undefined;
  let state: SessionState<U, P> = { user: null, profile: null, loading: true, error: null };
  let stopProfile: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const publish = (next: SessionState<U, P>) => { if (active) { state = next; adapters.update(next); } };
  const fail = (message: string) => { clearTimeout(timer); publish({ ...state, loading: false, error: message }); };
  const watch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => fail('تعذر إكمال تحميل الحساب. تحقق من الاتصال وأعد المحاولة. / Account loading timed out. Check your connection and retry.'), adapters.timeoutMs ?? 15000);
  };
  const acceptUser = (user: U | null, force = false) => {
    if (!active || (!force && uid === (user?.uid ?? null))) return;
    const version = ++generation;
    uid = user?.uid ?? null;
    stopProfile?.(); stopProfile = undefined;
    clearTimeout(timer);
    publish({ user, profile: null, loading: !!user, error: null });
    if (!user) return;
    watch();
    let creating = false;
    let notified = false;
    let observedProfile = false;
    const current = () => active && generation === version;
    const ready = (profile: P) => {
      if (!current()) return;
      clearTimeout(timer);
      publish({ user, profile, loading: false, error: null });
      if (!notified) { notified = true; adapters.ready?.(user, profile); }
    };
    stopProfile = adapters.observeProfile(user, (profile, fromCache) => {
      if (!current()) return;
      if (profile) { observedProfile = true; ready(profile); return; }
      // An empty local cache does not prove this is a new account.
      if (fromCache || creating) return;
      creating = true;
      void adapters.createProfile(user).then(profile => { if (!observedProfile) ready(profile); }).catch(() => {
        if (current() && !observedProfile) fail('تم تسجيل الدخول، لكن تعذر تحميل ملفك. أعد المحاولة. / You are signed in, but your profile could not load. Please retry.');
      });
    }, () => { if (current()) fail('تم تسجيل الدخول، لكن تعذر تحميل ملفك. أعد المحاولة. / You are signed in, but your profile could not load. Please retry.'); });
  };
  watch();
  const stopUser = adapters.observeUser(user => acceptUser(user), () => fail('تعذر استعادة جلسة الدخول. أعد المحاولة. / Could not restore your session. Please retry.'));
  return {
    acceptUser,
    retry: (user: U | null) => acceptUser(user, true),
    dispose: () => { active = false; generation++; clearTimeout(timer); stopProfile?.(); stopUser(); },
  };
}
