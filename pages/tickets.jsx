/* tickets.jsx — ticket tracker (current week) */

const TICKET_PRICE = 20;

function TicketsPage({ state, dispatch, setRoute, showToast }) {
  const [weekOffset, setWeekOffset] = React.useState(0);
  const friday = addWeeks(thisFriday(), weekOffset);
  const fridayISO = isoDate(friday);
  const tickets = state.tickets[fridayISO] || {};
  const host = hostAtFriday(state, friday);

  const total = Object.values(tickets).reduce((a, b) => a + b, 0);
  const totalKr = total * TICKET_PRICE;
  const buyers = Object.values(tickets).filter((c) => c > 0).length;
  const maxCount = state.people.length * 5;

  const setCount = (personId, count) => {
    dispatch({ type: "SET_TICKETS", week: fridayISO, personId, count });
  };

  // Stable display order. We sort "buyers first, then alphabetical" — but only
  // recompute when the week or roster changes, NOT on every ticket edit. If we
  // re-sorted on each change, clicking + on a 0-ticket row would instantly
  // promote that person to the top, making the count look like it landed on the
  // wrong row. Freezing the order keeps each row in place while you edit.
  const rosterKey = state.people.map((p) => p.id).join(",");
  const sorted = React.useMemo(() => {
    return [...state.people].sort((a, b) => {
      const ca = tickets[a.id] || 0;
      const cb = tickets[b.id] || 0;
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fridayISO, rosterKey]);

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={fmtDate(friday)}
        title="Ticket Tracker"
        subtitle={`Up to 5 tickets per person, ${TICKET_PRICE} kr each.`}
        right={
          <div style={{display:"flex", gap:8}}>
            <button className="btn ghost" onClick={() => setWeekOffset(weekOffset - 1)}>← Previous</button>
            <button className="btn ghost" disabled={weekOffset === 0} onClick={() => setWeekOffset(0)}>This week</button>
            <button className="btn ghost" onClick={() => setWeekOffset(weekOffset + 1)}>Next →</button>
          </div>
        }
      />

      {/* Pot */}
      <div className="pot-card">
        <div>
          <div className="eyebrow" style={{color:"color-mix(in oklab, var(--gold) 80%, white)"}}>Running total</div>
          <div style={{fontFamily:"var(--font-display)", fontSize: 24, marginTop: 6, opacity: 0.85}}>
            {host ? `${host.name} buys the wine` : "—"}
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <div className="muted" style={{fontSize:12, letterSpacing:".1em", textTransform:"uppercase", color:"color-mix(in oklab, var(--paper) 70%, transparent)"}}>Tickets</div>
          <div style={{fontFamily:"var(--font-display)", fontSize: 48, lineHeight: 1, fontWeight: 600, color:"color-mix(in oklab, var(--paper) 90%, white)"}}>{total}</div>
        </div>
        <div style={{textAlign:"right", borderLeft:"1px solid rgba(255,255,255,.15)", paddingLeft: 24}}>
          <div className="muted" style={{fontSize:12, letterSpacing:".1em", textTransform:"uppercase", color:"color-mix(in oklab, var(--paper) 70%, transparent)"}}>Pot</div>
          <div className="figure">{totalKr}<span className="unit">kr</span></div>
        </div>
      </div>

      {/* People list with steppers */}
      <div className="card" style={{marginTop:24}}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 12}}>
          <h3>Who's in this week</h3>
          <div style={{display:"flex", gap: 8}}>
            <span className="pill dim">{buyers} {buyers === 1 ? "buyer" : "buyers"}</span>
            {total > 0 && weekOffset === 0 && (
              <button className="btn ghost" onClick={() => setRoute("lottery")}>Run lottery →</button>
            )}
          </div>
        </div>

        {sorted.map((p) => {
          const count = tickets[p.id] || 0;
          const isHost = host && p.id === host.id;
          return (
            <div key={p.id} className="list-row">
              <Avatar person={p}/>
              <div className="grow" style={{display:"flex", alignItems:"center", gap: 10}}>
                <span className="name small">{p.name}</span>
                {isHost && <span className="pill gold">Host</span>}
                {count >= 5 && <span className="pill">Maxed</span>}
              </div>
              <div className="muted mono" style={{fontSize:12, minWidth: 60, textAlign:"right"}}>
                {count > 0 ? `${count * TICKET_PRICE} kr` : "—"}
              </div>
              <Stepper value={count} min={0} max={5} onChange={(v) => setCount(p.id, v)} />
            </div>
          );
        })}

        {total === 0 && (
          <div className="muted" style={{textAlign:"center", padding: 24, fontStyle:"italic"}}>
            No tickets yet. Tap + next to anyone to start.
          </div>
        )}
      </div>

      {state.tickets[fridayISO] && weekOffset === 0 && (
        <div style={{marginTop: 18, display:"flex", justifyContent:"flex-end"}}>
          <button className="btn ghost"
                  onClick={() => { if (confirm("Clear all tickets for this week?")) { dispatch({ type: "CLEAR_WEEK_TICKETS", week: fridayISO }); showToast("Tickets cleared"); }}}>
            Clear week
          </button>
        </div>
      )}
    </div>
  );
}

window.TicketsPage = TicketsPage;
