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
