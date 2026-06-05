/* auth.jsx — shared-password login backed by Firebase Authentication.

   The whole group shares ONE account (email in firebase-config.js, password
   set in the Firebase console). The user only ever types the password; we
   sign them in with the shared email behind the scenes. Once signed in,
   Firebase keeps them signed in across refreshes, and the Realtime Database
   rules (auth != null) let them read/write. People without the password
   can't read or write the data at all — it's enforced on Google's servers,
   not just hidden in the page.

   If Firebase isn't configured yet (placeholder keys), there's nothing to
   protect and nowhere to sign in, so we skip the gate and run locally — that
   keeps this preview and offline use working. */

const MEMBER_EMAIL =
typeof window !== "undefined" && window.MEMBER_EMAIL || "members@vinlotteri.app";

function AuthGate({ children }) {
  // Not wired to a real Firebase project yet → no auth needed, run locally.
  if (!firebaseConfigured()) return children;

  const [user, setUser] = React.useState(undefined); // undefined = still checking
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef(null);

  // Track sign-in state.
  React.useEffect(() => {
    let unsub = () => {};
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      unsub = firebase.auth().onAuthStateChanged((u) => setUser(u || null));
    } catch (e) {
      console.error("[auth] init failed", e);
      setUser(null);
    }
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (user === null && inputRef.current) inputRef.current.focus();
  }, [user]);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await firebase.auth().signInWithEmailAndPassword(MEMBER_EMAIL, password);
      // onAuthStateChanged will flip us to the app.
    } catch (err) {
      const code = err && err.code || "";
      setError(
        code === "auth/wrong-password" || code === "auth/invalid-credential" ?
        "That\u2019s not the password \u2014 try again." :
        code === "auth/too-many-requests" ?
        "Too many tries. Wait a moment and retry." :
        "Couldn\u2019t sign in. Check your connection and try again."
      );
      setPassword("");
      setBusy(false);
      if (inputRef.current) inputRef.current.focus();
    }
  }

  // Still resolving whether we're signed in — brief, avoid a flash of the form.
  if (user === undefined) {
    return (
      <div className="gate-screen">
        <div className="gate-loading mono muted">Connecting…</div>
      </div>);

  }

  // Signed in → the real app.
  if (user) return children;

  // Signed out → password screen.
  return (
    <div className="gate-screen">
      <div className={"gate-card" + (error ? " is-wrong" : "")}>
        <div className="eyebrow gate-eyebrow">Drammen</div>
        <h1 className="script gate-title">Vinlotteri</h1>
        <p className="gate-sub muted" style={{ padding: "0px" }}>What's the name of your workplace?</p>

        <form onSubmit={submit} className="gate-form">
          <input
            ref={inputRef}
            type="password"
            className="input gate-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            spellCheck="false"
            disabled={busy} />
          
          <button type="submit" className="btn big gate-btn" disabled={busy || !password}>
            {busy ? "Unlocking\u2026" : "Unlock"}
          </button>
        </form>

        <div className="gate-error mono" aria-live="polite">{error || "\u00a0"}</div>
      </div>
      <div className="gate-foot script">Skål.</div>
    </div>);

}

Object.assign(window, { AuthGate });