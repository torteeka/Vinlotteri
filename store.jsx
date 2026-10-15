/* store.jsx — state, reducers, localStorage, date helpers
   Exposed via window so other Babel scripts can use them. */

const STORAGE_KEY = "vinlotteri.v1";

// ── Date helpers (local time) ────────────────────────────────────────────
const ONE_DAY = 86400000;

function dateOnly(d) {
  const x = (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d))
    ? new Date(+d.slice(0,4), +d.slice(5,7) - 1, +d.slice(8,10))
    : new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
// Friday = 5 (Sun=0 … Sat=6). Return upcoming Friday including today.
function thisFriday(from = new Date()) {
  const d = dateOnly(from);
  const offset = (5 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + offset);
  return d;
}
function addWeeks(d, n) {
  const x = dateOnly(d);
  x.setDate(x.getDate() + n * 7);
  return x;
}
function isoDate(d) {
  const x = dateOnly(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function weeksBetween(a, b) {
  return Math.round((dateOnly(b) - dateOnly(a)) / (7 * ONE_DAY));
}
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_LONG = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function fmtDate(d) {
  const x = dateOnly(d);
  return `${x.getDate()} ${MONTHS[x.getMonth()]} ${x.getFullYear()}`;
}
function fmtDateLong(d) {
  const x = dateOnly(d);
  return `${DAYS_LONG[x.getDay()]}, ${x.getDate()} ${MONTHS_LONG[x.getMonth()]}`;
}

// ── Seed data ────────────────────────────────────────────────────────────
const SEED_PEOPLE = [
  "Astrid Lindqvist",
  "Henrik Solberg",
  "Sofie Madsen",
  "Mikkel Bergstrøm",
  "Ingrid Halvorsen",
  "Jonas Eriksen",
  "Linnea Dahl",
  "Magnus Holm",
  "Freja Aasen",
  "Oskar Vinter",
];

function makeId(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

function initialState() {
  const epoch = thisFriday(new Date());
  const people = SEED_PEOPLE.map((n) => ({ id: makeId(n), name: n }));
  return {
    epochFriday: isoDate(epoch),     // person[0] hosts on this Friday
    people,
    tickets: {},                      // { "2026-05-15": { personId: count } }
    winners: {},                      // { "2026-05-15": [{personId, cardIndex}] }
    hostInfo: {},                     // { "2026-05-15": { vipps, deadline, note } }
    hostHistory: [],                  // immutable past log: [{date, personId, name}]
    winnerHistory: [],                // [{date, personId, name, cardIndex, ticketCount}]
    swapLog: [],                      // [{date, fromName, toName, fridayISO}]
    skippedFridays: {},               // { "2026-05-15": { reason: "Easter" } }
    theme: "pastel",
    font: "geometric",
    layout: "contained",
    lotteryStyle: "grid",             // grid | wheel | reel
    confettiStyle: "classic",         // classic | wine | petals | gold
    sound: true,
  };
}

// ── Schedule computation ─────────────────────────────────────────────────
// Host for a given Friday, accounting for skipped Fridays in the rotation.
// Walks from epoch counting only non-skipped Fridays — that count - 1 is the
// zero-indexed rotation slot. If the requested Friday itself is skipped,
// returns null (no host).
function hostAtFriday(state, friday) {
  const N = state.people.length;
  if (!N) return null;
  const fISO = isoDate(friday);
  const skipped = state.skippedFridays || {};
  if (skipped[fISO]) return null;
  const totalWeeks = weeksBetween(state.epochFriday, friday);
  if (totalWeeks < 0) {
    // Before epoch — fall back to simple modular index (rare path).
    const idx = ((totalWeeks % N) + N) % N;
    return state.people[idx];
  }
  let nonSkipped = 0;
  for (let w = 0; w <= totalWeeks; w++) {
    const isoW = isoDate(addWeeks(state.epochFriday, w));
    if (!skipped[isoW]) nonSkipped++;
  }
  if (nonSkipped <= 0) return null;
  const idx = (((nonSkipped - 1) % N) + N) % N;
  return state.people[idx];
}

// Build N upcoming Fridays starting from "this Friday" (inclusive).
function upcomingFridays(count = 16, from = new Date()) {
  const start = thisFriday(from);
  return Array.from({ length: count }, (_, i) => addWeeks(start, i));
}

// Next non-skipped Friday on or after `from`.
function nextNonSkippedFriday(state, from = new Date()) {
  const skipped = state.skippedFridays || {};
  let f = thisFriday(from);
  for (let i = 0; i < 520; i++) {
    if (!skipped[isoDate(f)]) return f;
    f = addWeeks(f, 1);
  }
  return f;
}

// Next Friday this person will host. Searches forward up to ~2 years.
function nextHostingFridayForPerson(state, person, from = new Date()) {
  if (!person) return null;
  let f = thisFriday(from);
  for (let i = 0; i < 200; i++) {
    const h = hostAtFriday(state, f);
    if (h && h.id === person.id) return f;
    f = addWeeks(f, 1);
  }
  return null;
}

// ── Reducer ──────────────────────────────────────────────────────────────
function reducer(state, action) {
  switch (action.type) {
    case "ADD_PERSON": {
      const name = action.name.trim();
      if (!name) return state;
      return { ...state, people: [...state.people, { id: makeId(name), name }] };
    }
    case "RENAME_PERSON": {
      return {
        ...state,
        people: state.people.map((p) => (p.id === action.id ? { ...p, name: action.name } : p)),
      };
    }
    case "REMOVE_PERSON": {
      const people = state.people.filter((p) => p.id !== action.id);
      // Tickets keyed by personId remain harmless (just ignored), but clean up.
      const tickets = Object.fromEntries(
        Object.entries(state.tickets).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).filter(([pid]) => pid !== action.id))])
      );
      return { ...state, people, tickets };
    }
    case "REORDER_PEOPLE": {
      return { ...state, people: action.people };
    }
    case "SWAP_HOSTS": {
      // Swap two people's positions in rotation. Trades all future turns.
      const i = state.people.findIndex((p) => p.id === action.a);
      const j = state.people.findIndex((p) => p.id === action.b);
      if (i < 0 || j < 0 || i === j) return state;
      const people = state.people.slice();
      [people[i], people[j]] = [people[j], people[i]];
      const swapLog = [
        { date: new Date().toISOString(), fromName: state.people[i].name, toName: state.people[j].name, fridayISO: action.fridayISO || null },
        ...state.swapLog,
      ].slice(0, 50);
      return { ...state, people, swapLog };
    }
    case "SET_TICKETS": {
      const week = action.week;
      const next = { ...state.tickets, [week]: { ...(state.tickets[week] || {}), [action.personId]: action.count } };
      // Clean zeros.
      if (action.count <= 0) delete next[week][action.personId];
      return { ...state, tickets: next };
    }
    case "CLEAR_WEEK_TICKETS": {
      const next = { ...state.tickets };
      delete next[action.week];
      return { ...state, tickets: next };
    }
    case "SET_HOST_INFO": {
      return {
        ...state,
        hostInfo: { ...state.hostInfo, [action.week]: { ...(state.hostInfo[action.week] || {}), ...action.info } },
      };
    }
    case "ADD_WINNER": {
      const week = action.week;
      const prev = state.winners[week] || [];
      const next = { ...state.winners, [week]: [...prev, { personId: action.personId, cardIndex: action.cardIndex }] };
      const history = [
        { date: week, personId: action.personId, name: action.name, cardIndex: action.cardIndex },
        ...state.winnerHistory,
      ].slice(0, 200);
      return { ...state, winners: next, winnerHistory: history };
    }
    case "RESET_WINNERS": {
      const next = { ...state.winners };
      delete next[action.week];
      const history = state.winnerHistory.filter((w) => w.date !== action.week);
      return { ...state, winners: next, winnerHistory: history };
    }
    case "LOG_PAST_HOST": {
      // Move a Friday into immutable history once it's been "completed".
      const existing = state.hostHistory.find((h) => h.date === action.date);
      if (existing) return state;
      return {
        ...state,
        hostHistory: [{ date: action.date, personId: action.personId, name: action.name }, ...state.hostHistory].slice(0, 200),
      };
    }
    case "SETTLE_HISTORY": {
      // Backfill the immutable past-host log from a set of derived entries,
      // only adding dates we haven't recorded yet. Once a Friday is logged its
      // host is frozen here, so future rotation edits never rewrite the past.
      const have = new Set(state.hostHistory.map((h) => h.date));
      const additions = (action.entries || []).filter((e) => e && e.date && !have.has(e.date));
      if (!additions.length) return state;
      const hostHistory = [...state.hostHistory, ...additions]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)) // newest first
        .slice(0, 200);
      return { ...state, hostHistory };
    }
    case "BRING_BACK": {
      // Pull a past host to the FRONT of the upcoming rotation. They take the
      // next non-skipped Friday; the person who held it slides to the week
      // after, and everyone else shifts back one week too (a clean insert, not
      // a swap). The Friday they were brought back from is marked skipped in
      // the stored history, since they didn't actually host that day.
      const N = state.people.length;
      const markSkipped = (hh) =>
        hh.map((h) =>
          h.date === action.fromISO
            ? { ...h, skipped: true, reason: action.reason || "Host away — brought back" }
            : h
        );
      if (!N) return { ...state, hostHistory: markSkipped(state.hostHistory) };
      const people = state.people.slice();
      const nextFri = nextNonSkippedFriday(state);
      const curNext = hostAtFriday(state, nextFri);
      const k = curNext ? people.findIndex((p) => p.id === curNext.id) : 0;
      const slot = k < 0 ? 0 : k;
      // Cyclic upcoming order starting at the next slot: U[0] hosts next Friday.
      const U = Array.from({ length: N }, (_, i) => people[(slot + i) % N]);
      const j = U.findIndex((p) => p.id === action.personId);
      // j === 0 → already up next; j < 0 → not found. Either way just record skip.
      if (j <= 0) return { ...state, hostHistory: markSkipped(state.hostHistory) };
      const newU = [U[j], ...U.slice(0, j), ...U.slice(j + 1)];
      const newPeople = people.slice();
      for (let i = 0; i < N; i++) newPeople[(slot + i) % N] = newU[i];
      return { ...state, people: newPeople, hostHistory: markSkipped(state.hostHistory) };
    }
    case "SET_PREF": {
      return { ...state, [action.key]: action.value };
    }
    case "SKIP_FRIDAY": {
      // action: { fridayISO, reason }
      const skippedFridays = { ...(state.skippedFridays || {}), [action.fridayISO]: { reason: action.reason || "No meeting" } };
      return { ...state, skippedFridays };
    }
    case "UNSKIP_FRIDAY": {
      const skippedFridays = { ...(state.skippedFridays || {}) };
      delete skippedFridays[action.fridayISO];
      return { ...state, skippedFridays };
    }
    case "CLEAR_HISTORY":
      // Wipe every past record but KEEP the current people & settings, so the
      // app starts fresh from this Friday without resurrecting the seed list.
      return {
        ...state,
        winners: {},
        winnerHistory: [],
        swapLog: [],
        hostHistory: [],
        skippedFridays: {},
        epochFriday: isoDate(thisFriday(new Date())),
      };
    case "RESET_ALL":
      return initialState();
    case "HYDRATE":
      return { ...initialState(), ...action.state };
    default:
      return state;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────
function useStore() {
  const [state, dispatch] = React.useReducer(reducer, undefined, () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...initialState(), ...JSON.parse(raw) };
    } catch (e) { /* ignore */ }
    return initialState();
  });

  React.useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { /* ignore */ }
  }, [state]);

  return [state, dispatch];
}

// ── Toast (simple) ───────────────────────────────────────────────────────
function useToast() {
  const [msg, setMsg] = React.useState(null);
  React.useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2400);
    return () => clearTimeout(t);
  }, [msg]);
  const Toast = msg ? <div className="toast">{msg}</div> : null;
  return [Toast, setMsg];
}

// ── Initials helper ──────────────────────────────────────────────────────
function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

// Avatar hue per person — derived deterministically from id.
function avatarHue(id) {
  let h = 0;
  for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

Object.assign(window, {
  useStore, useToast, reducer, initialState,
  thisFriday, addWeeks, isoDate, weeksBetween, dateOnly,
  fmtDate, fmtDateLong, MONTHS, MONTHS_LONG, DAYS_LONG,
  hostAtFriday, upcomingFridays, nextNonSkippedFriday, nextHostingFridayForPerson,
  initials, avatarHue, makeId,
  STORAGE_KEY, SEED_PEOPLE,
});
