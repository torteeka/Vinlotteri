/* app.jsx — root component, routing, tweaks */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "pastel",
  "layout": "contained",
  "font": "geometric",
  "confettiStyle": "classic",
  "sound": true,
  "accentTone": "default"
}/*EDITMODE-END*/;

const THEMES = [
  { id: "pastel",    label: "Pastel Cloud" },
  { id: "classic",   label: "Classic Burgundy" },
  { id: "oxblood",   label: "Oxblood Reserve" },
  { id: "rose",      label: "Rosé" },
  { id: "cream",     label: "Cream Forward" },
  { id: "easter",    label: "Easter · Sage" },
  { id: "christmas", label: "Christmas · Pine" },
  { id: "valentine", label: "Valentine's · Crimson" },
  { id: "nye",       label: "New Year's · Midnight" },
];

// Small live-connection indicator. Hidden in local-only mode so it doesn't
// nag before you've gone live.
function SyncPill({ status }) {
  if (!status || status === "local") return null;
  const map = {
    connecting: { cls: "is-connecting", label: "Connecting\u2026" },
    live:       { cls: "is-live",       label: "Live \u00b7 shared" },
    error:      { cls: "is-error",      label: "Offline \u2014 not syncing" },
  };
  const m = map[status] || map.connecting;
  return (
    <div className={"sync-pill " + m.cls} title="Shared live data via Firebase">
      <span className="sync-dot"></span>
      <span className="mono">{m.label}</span>
    </div>
  );
}

function App() {
  const [state, dispatch, syncStatus] = useSyncedStore();
  // Theme / font / layout are LOCAL visual preferences — deliberately NOT
  // seeded from the synced store, so a stale value saved in the shared
  // Firebase room can never override the design default below.
  const [t, setTweak] = useTweaks({
    ...TWEAK_DEFAULTS,
    confettiStyle: state.confettiStyle || "classic",
    sound: state.sound ?? true,
  });

  // Mirror tweak → store (so it persists in app's own storage).
  // NOTE: theme/layout/font are intentionally NOT mirrored to the shared
  // store — keeping them out means they stay per-viewer and the default wins.
  React.useEffect(() => { dispatch({ type: "SET_PREF", key: "confettiStyle", value: t.confettiStyle }); }, [t.confettiStyle]);
  React.useEffect(() => { dispatch({ type: "SET_PREF", key: "sound", value: t.sound }); }, [t.sound]);

  // Apply theme + layout + font attributes
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme || "pastel");
  }, [t.theme]);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-layout", t.layout || "contained");
  }, [t.layout]);
  React.useEffect(() => {
    document.documentElement.setAttribute("data-font", t.font || "geometric");
  }, [t.font]);

  const [route, setRoute] = React.useState(() => {
    return localStorage.getItem("vinlotteri.route") || "host";
  });
  React.useEffect(() => {
    localStorage.setItem("vinlotteri.route", route);
  }, [route]);

  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem("vinlotteri.collapsed") === "1");
  React.useEffect(() => {
    localStorage.setItem("vinlotteri.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const [Toast, showToast] = useToast();

  // Sync sound prefs with helper
  React.useEffect(() => { Sound.set(state.sound); }, [state.sound]);

  let page;
  if (route === "host")     page = <HostPage     state={state} dispatch={dispatch} setRoute={setRoute} showToast={showToast}/>;
  else if (route === "people")   page = <PeoplePage   state={state} dispatch={dispatch} showToast={showToast}/>;
  else if (route === "schedule") page = <SchedulePage state={state} dispatch={dispatch} setRoute={setRoute} showToast={showToast}/>;
  else if (route === "tickets")  page = <TicketsPage  state={state} dispatch={dispatch} setRoute={setRoute} showToast={showToast}/>;
  else if (route === "lottery")  page = <LotteryPage  state={state} dispatch={dispatch} setRoute={setRoute} showToast={showToast}/>;
  else if (route === "history")  page = <HistoryPage  state={state} dispatch={dispatch} showToast={showToast}/>;
  else page = <HostPage state={state} dispatch={dispatch} setRoute={setRoute} showToast={showToast}/>;

  return (
    <div className={"app" + (collapsed ? " collapsed" : "")}>
      <Sidebar route={route} setRoute={setRoute} collapsed={collapsed} setCollapsed={setCollapsed} />
      <main>{page}</main>
      {Toast}
      <SyncPill status={syncStatus} />
      <TweaksPanel title="Vinlotteri · Tweaks">
        <TweakSection label="Theme">
          <TweakSelect label="Palette" value={t.theme} options={THEMES.map(x => ({value: x.id, label: x.label}))} onChange={(v) => setTweak("theme", v)} />
          <TweakRadio label="Layout" value={t.layout}
                      options={[{value:"contained", label:"Contained"}, {value:"classic", label:"Classic"}]}
                      onChange={(v) => setTweak("layout", v)} />
          <TweakSelect label="Type" value={t.font}
                       options={[
                         {value:"serif",     label:"Serif · Cormorant"},
                         {value:"sans",      label:"Sans · Bricolage"},
                         {value:"geometric", label:"Geometric · Space Grotesk"},
                       ]}
                       onChange={(v) => setTweak("font", v)} />
        </TweakSection>
        <TweakSection label="Lottery">
          <TweakRadio label="Confetti" value={t.confettiStyle}
                      options={[{value:"classic", label:"Classic"}, {value:"wine", label:"Wine"}, {value:"gold", label:"Stars"}]}
                      onChange={(v) => setTweak("confettiStyle", v)} />
          <TweakToggle label="Sound effects" value={t.sound} onChange={(v) => setTweak("sound", v)} />
        </TweakSection>
        <TweakSection label="Data">
          <TweakButton label="Reset all data" secondary onClick={() => {
            if (confirm("Wipe all people, tickets, winners and reset the seed list?")) {
              dispatch({ type: "RESET_ALL" });
              localStorage.removeItem("vinlotteri.route");
              setRoute("host");
              showToast("Reset to seed data");
            }
          }} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthGate><App /></AuthGate>
);
