/* sync.jsx — shared live state via Firebase Realtime Database.

   Drops in for useStore(). The whole app state is one JSON object, so we
   mirror that single object to one database path and let Firebase push
   changes to every connected browser in real time.

   If firebase-config.js still holds placeholder keys (or the SDK failed to
   load), we fall back to the original localStorage behaviour so the app —
   and this preview — keep working offline / before you go live.

   Concurrency model: last-write-wins on the whole object. Perfect for the
   "usually one host at a time" case; see GO-LIVE.md if that ever changes. */

const CFG = (typeof window !== "undefined" && window.FIREBASE_CONFIG) || {};
const ROOM = (typeof window !== "undefined" && window.LOTTERY_ROOM) || "main";

// Are we actually configured to talk to a real Firebase project?
function firebaseConfigured() {
  return typeof firebase !== "undefined"
    && !!CFG.databaseURL
    && !/PASTE/.test(CFG.databaseURL);
}

let _ref = null;
function lotteryRef() {
  if (_ref) return _ref;
  if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(CFG);
  _ref = firebase.database().ref("lotteries/" + ROOM);
  return _ref;
}

// Read local cache for instant first paint (before remote arrives).
function readCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...initialState(), ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return initialState();
}

function useSyncedStore() {
  const [state, dispatch] = React.useReducer(reducer, undefined, readCache);

  const online = firebaseConfigured();
  // The JSON we currently consider "in sync" with the server. Both inbound
  // (remote→us) and outbound (us→remote) paths compare against this to avoid
  // echo loops.
  const syncedJSON = React.useRef(null);
  // Don't push anything to the server until we've heard from it once —
  // otherwise stale local state could clobber the shared room on load.
  const ready = React.useRef(false);
  const [status, setStatus] = React.useState(online ? "connecting" : "local");

  // ── Subscribe: remote → local ──────────────────────────────────────────
  React.useEffect(() => {
    if (!online) return;
    let ref;
    try { ref = lotteryRef(); }
    catch (e) { console.error("[sync] init failed", e); setStatus("error"); return; }

    const onVal = (snap) => {
      const val = snap.val();

      if (val == null) {
        // Empty room — seed it with whatever we have locally.
        const seed = readCache();
        syncedJSON.current = JSON.stringify(seed);
        ready.current = true;
        try { ref.set(seed); } catch (e) { /* ignore */ }
        dispatch({ type: "HYDRATE", state: seed });
        setStatus("live");
        return;
      }

      const merged = { ...initialState(), ...val };
      const json = JSON.stringify(merged);
      ready.current = true;
      setStatus("live");
      if (json === syncedJSON.current) return; // our own echo / no change
      syncedJSON.current = json;
      dispatch({ type: "HYDRATE", state: merged });
    };

    const onErr = (e) => { console.error("[sync] subscribe error", e); setStatus("error"); };
    ref.on("value", onVal, onErr);
    return () => ref.off("value", onVal);
  }, [online]);

  // ── Push: local → remote (and always cache to localStorage) ────────────
  React.useEffect(() => {
    const json = JSON.stringify(state);
    try { localStorage.setItem(STORAGE_KEY, json); } catch (e) { /* ignore */ }

    if (!online || !ready.current) return;     // wait for first remote snapshot
    if (json === syncedJSON.current) return;    // change came from remote
    syncedJSON.current = json;
    try { lotteryRef().set(state); } catch (e) { console.error("[sync] write failed", e); }
  }, [state, online]);

  return [state, dispatch, status];
}

Object.assign(window, { useSyncedStore, firebaseConfigured });
