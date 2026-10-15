/* history.jsx — winner + host history */

function HistoryPage({ state, dispatch, showToast }) {
  const winners = state.winnerHistory || [];
  const swaps = state.swapLog || [];
  const hosts = state.hostHistory || [];

  const hasAny = winners.length || swaps.length || hosts.length;
  const clearAll = () => {
    if (!dispatch) return;
    if (confirm("Clear the entire history — every winner, swap and past host? Your people and settings stay. This can't be undone.")) {
      dispatch({ type: "CLEAR_HISTORY" });
      showToast && showToast("History cleared — starting fresh");
    }
  };

  // Group winners by date
  const byDate = {};
  winners.forEach((w) => { (byDate[w.date] ||= []).push(w); });
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  // End-of-year leaderboard
  const years = Array.from(new Set([
    ...Object.keys(state.tickets || {}), ...winners.map((w) => w.date)
  ].map((d) => d.slice(0, 4)))).sort((a, b) => b.localeCompare(a));
  const [year, setYear] = React.useState(years[0] || String(new Date().getFullYear()));
  const board = {};
  const row = (pid, name) => (board[pid] ||= { pid, name, tickets: 0, bottles: 0, won: 0 });
  Object.entries(state.tickets || {}).forEach(([week, t]) => {
    if (!week.startsWith(year)) return;
    const weekWinners = winners.filter((w) => w.date === week);
    const pot = Object.values(t).reduce((a, b) => a + b, 0) * 20;
    const perBottle = weekWinners.length ? pot / weekWinners.length : 0;
    Object.entries(t).forEach(([pid, n]) => {
      const p = state.people.find((x) => x.id === pid);
      row(pid, p?.name || "Unknown").tickets += n;
    });
    weekWinners.forEach((w) => { const r = row(w.personId, w.name); r.bottles += 1; r.won += perBottle; });
  });
  const leaders = Object.values(board).map((r) => ({ ...r, spent: r.tickets * 20, net: Math.round(r.won - r.tickets * 20) }))
    .sort((a, b) => b.bottles - a.bottles || b.net - a.net);
  const krFmt = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)} kr`;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="The Annals"
        title="Lottery History"
        subtitle="Every winner, every swap. A record of Fridays past."
        right={hasAny ? (
          <button className="btn ghost" onClick={clearAll}>Clear history</button>
        ) : null}
      />

      <div className="card" style={{marginBottom: 28}}>
        <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between", gap: 12, flexWrap:"wrap", marginBottom: 14}}>
          <div>
            <h3 style={{marginBottom: 4}}>Leaderboard {year}</h3>
            <p className="muted" style={{fontSize: 13}}>Most bottles first. Net is bottle value (pot ÷ bottles that week) minus ticket spend.</p>
          </div>
          {years.length > 1 && (
            <div style={{display:"flex", gap: 6}}>
              {years.map((y) => (
                <button key={y} className={y === year ? "btn" : "btn ghost"} style={{padding:"6px 12px"}} onClick={() => setYear(y)}>{y}</button>
              ))}
            </div>
          )}
        </div>
        {leaders.length === 0 ? (
          <div className="muted" style={{padding: 20, textAlign:"center", fontStyle:"italic"}}>No tickets bought in {year} yet.</div>
        ) : (
          <div>
            <div className="muted mono" style={{display:"grid", gridTemplateColumns:"30px minmax(0,1fr) 70px 80px 90px", gap: 12, fontSize: 10, letterSpacing:".12em", textTransform:"uppercase", padding:"0 4px 6px"}}>
              <span>#</span><span>Name</span><span style={{textAlign:"right"}}>Bottles</span><span style={{textAlign:"right"}}>Spent</span><span style={{textAlign:"right"}}>Net</span>
            </div>
            {leaders.map((r, i) => (
              <div key={r.pid} style={{display:"grid", gridTemplateColumns:"30px minmax(0,1fr) 70px 80px 90px", gap: 12, alignItems:"center", padding:"10px 4px", borderTop:"0.5px solid var(--line)"}}>
                <span className="kr-num" style={{fontSize: 20, color: i === 0 ? "var(--gold)" : "var(--ink)"}}>{i + 1}</span>
                <div style={{display:"flex", alignItems:"center", gap: 10, minWidth: 0}}>
                  <Avatar person={state.people.find((p) => p.id === r.pid) || {id: r.pid, name: r.name}}/>
                  <span className="name small" style={{overflow:"hidden", textOverflow:"ellipsis"}}>{r.name}</span>
                </div>
                <span className="kr-num" style={{textAlign:"right", fontSize: 18}}>{r.bottles}</span>
                <span className="muted" style={{textAlign:"right", fontSize: 13}}>{r.spent} kr</span>
                <span style={{textAlign:"right", fontSize: 14, fontWeight: 600, color: r.net < 0 ? "var(--accent)" : "var(--ink)"}}>{krFmt(r.net)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1.4fr 1fr", gap: 28, alignItems:"start"}}>
        <div className="card">
          <h3 style={{marginBottom: 6}}>Winners</h3>
          <p className="muted" style={{fontSize: 13, marginBottom: 18}}>Newest first.</p>
          {dates.length === 0 && (
            <div className="muted" style={{padding: 30, textAlign:"center", fontStyle: "italic"}}>
              No bottles yet. Roll the lottery to start the chronicle.
            </div>
          )}
          {dates.map((d) => (
            <div key={d} style={{marginBottom: 18}}>
              <div className="eyebrow" style={{marginBottom: 8}}>{fmtDate(d)}</div>
              {byDate[d].map((w, i) => (
                <div key={i} className="list-row" style={{padding:"10px 4px"}}>
                  <span className="kr-num" style={{fontSize:22, color:"var(--gold)", width:30}}>{byDate[d].length - i}</span>
                  <Avatar person={state.people.find(p => p.id === w.personId) || {id: w.personId, name: w.name}}/>
                  <span className="name small grow">{w.name}</span>
                  <span className="pill gold">1 bottle</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div>
          <div className="card">
            <h3>Swap log</h3>
            <p className="muted" style={{fontSize:13, marginTop:4, marginBottom: 14}}>The last few host swaps.</p>
            {swaps.length === 0 && (
              <div className="muted" style={{padding: 14, fontStyle: "italic", fontSize: 13}}>No swaps yet.</div>
            )}
            {swaps.slice(0, 10).map((s, i) => (
              <div key={i} style={{padding: "8px 0", borderTop: i ? "0.5px solid var(--line)" : "none"}}>
                <div className="muted mono" style={{fontSize: 10, letterSpacing:".12em", textTransform:"uppercase"}}>
                  {new Date(s.date).toLocaleDateString()} {s.fridayISO ? `· ${fmtDate(s.fridayISO)}` : ""}
                </div>
                <div style={{fontFamily:"var(--font-display)", fontSize: 16, marginTop: 2}}>
                  {s.fromName} <span className="muted" style={{fontStyle:"italic", margin:"0 4px"}}>traded with</span> {s.toName}
                </div>
              </div>
            ))}
          </div>

          {hosts.length > 0 && (
            <div className="card" style={{marginTop: 18}}>
              <h3>Hosted before</h3>
              <p className="muted" style={{fontSize: 13, marginTop: 4, marginBottom: 12}}>Past Fridays archived.</p>
              {hosts.slice(0, 8).map((h, i) => (
                <div key={i} className="list-row" style={{padding: "10px 4px"}}>
                  <span className="mono muted" style={{fontSize:11}}>{fmtDate(h.date)}</span>
                  <span className="grow" style={{textAlign:"right", fontFamily:"var(--font-display)", fontSize: 17}}>
                    {h.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.HistoryPage = HistoryPage;
