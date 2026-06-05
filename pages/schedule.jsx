/* schedule.jsx — full upcoming schedule */

function SchedulePage({ state, dispatch, setRoute, showToast }) {
  const [count, setCount] = React.useState(16);
  const today = thisFriday();
  const fridays = upcomingFridays(count);
  const [swapFrom, setSwapFrom] = React.useState(null);  // {personId, fridayISO}
  const [swapTo, setSwapTo] = React.useState(null);
  const [skipFor, setSkipFor] = React.useState(null);    // fridayISO being marked
  const [skipReason, setSkipReason] = React.useState("");
  const [draggingISO, setDraggingISO] = React.useState(null);
  const [dropTargetISO, setDropTargetISO] = React.useState(null);
  const [pastCount, setPastCount] = React.useState(6);   // how many past Fridays to list
  const [bringBackTarget, setBringBackTarget] = React.useState(null); // {personId, name, fromISO}
  const skipped = state.skippedFridays || {};

  // Drag a Friday row, drop above or below another row to slot the host into
  // that position in the rotation. Everyone else shifts — same data shape as
  // reordering People.
  const dragRef = React.useRef(null);  // { personId, fridayISO }
  const [hoverHalf, setHoverHalf] = React.useState(null); // 'top' | 'bottom'
  const onRowDragStart = (host, fISO) => (e) => {
    if (!host) return;
    dragRef.current = { personId: host.id, fridayISO: fISO };
    setDraggingISO(fISO);
    e.dataTransfer.effectAllowed = "move";
  };
  const onRowDragOver = (host, fISO) => (e) => {
    if (!dragRef.current || !host) return;
    if (dragRef.current.personId === host.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const half = (e.clientY - rect.top) < rect.height / 2 ? "top" : "bottom";
    setDropTargetISO(fISO);
    setHoverHalf(half);
  };
  const onRowDragLeave = (fISO) => () => {
    if (dropTargetISO === fISO) { setDropTargetISO(null); setHoverHalf(null); }
  };
  const onRowDrop = (host, fISO) => (e) => {
    e.preventDefault();
    if (!dragRef.current || !host) return;
    if (dragRef.current.personId === host.id) return;
    const people = state.people.slice();
    const fromIdx = people.findIndex(p => p.id === dragRef.current.personId);
    let toIdx = people.findIndex(p => p.id === host.id);
    if (fromIdx === -1 || toIdx === -1) return;
    if (hoverHalf === "bottom") toIdx++;
    const [moved] = people.splice(fromIdx, 1);
    if (fromIdx < toIdx) toIdx--;
    toIdx = Math.max(0, Math.min(people.length, toIdx));
    people.splice(toIdx, 0, moved);
    dispatch({ type: "REORDER_PEOPLE", people });
    showToast("Moved");
  };
  const onRowDragEnd = () => {
    dragRef.current = null;
    setDraggingISO(null);
    setDropTargetISO(null);
    setHoverHalf(null);
  };

  if (state.people.length === 0) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Schedule" title="Nothing scheduled yet" />
        <div className="card">
          <p className="muted">Add people first.</p>
        </div>
      </div>
    );
  }

  // ── History is a STORED, stable log ───────────────────────────────────
  // Past hosts used to be derived live from the rotation, which meant any
  // reorder rewrote the past. Instead we freeze each past Friday into
  // hostHistory once (backfilled on mount), so bringing someone back never
  // scrambles the history below it.
  React.useEffect(() => {
    const sk = state.skippedFridays || {};
    const epochISO = state.epochFriday;
    const entries = Array.from({ length: 18 }, (_, i) => {
      const f = addWeeks(thisFriday(), -(i + 1));
      const fISO = isoDate(f);
      // Only freeze Fridays that have actually elapsed SINCE this group started
      // using the app. Anything before the epoch is fictional rotation math, so
      // a freshly-cleared history stays empty and fills in week by week.
      if (epochISO && fISO < epochISO) return null;
      if (sk[fISO]) return { date: fISO, skipped: true, reason: sk[fISO].reason || "No meeting" };
      const h = hostAtFriday(state, f);
      return h ? { date: fISO, personId: h.id, name: h.name } : null;
    }).filter(Boolean);
    dispatch({ type: "SETTLE_HISTORY", entries });
    // eslint-disable-next-line
  }, []);

  const history = (state.hostHistory || []).slice(0, pastCount);
  const hasPast = history.length > 0;
  const todayISO = isoDate(today);
  const swapPerson = swapFrom ? state.people.find((p) => p.id === swapFrom.personId) : null;

  const doSwap = () => {
    if (!swapFrom || !swapTo) return;
    dispatch({ type: "SWAP_HOSTS", a: swapFrom.personId, b: swapTo, fridayISO: swapFrom.fridayISO });
    setSwapFrom(null); setSwapTo(null);
    showToast("Swapped");
  };

  // Bring a past host to the FRONT of the upcoming schedule. The reducer does
  // the clean insert (everyone slides back a week) and marks the brought-back
  // Friday as skipped in the stored history.
  const doBringBack = () => {
    if (!bringBackTarget) return;
    const first = bringBackTarget.name.split(" ")[0];
    dispatch({ type: "BRING_BACK", personId: bringBackTarget.personId, fromISO: bringBackTarget.fromISO });
    setBringBackTarget(null);
    showToast(`${first} is back up next`);
  };

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Looking ahead"
        title="The Full Schedule"
        subtitle="Each upcoming Friday and who is on the hook for wine. Drag a row up or down to reschedule — everyone else shifts."
        right={
          <div className="card flat tight" style={{padding:"6px 8px", display:"flex", gap: 6, alignItems:"center", background:"color-mix(in oklab, var(--paper) 60%, white)"}}>
            <span className="label" style={{margin:0, marginRight: 8}}>Show</span>
            {[8, 16, 32].map((n) => (
              <button key={n} className="btn ghost" style={{padding:"6px 12px", fontSize:11, ...(count === n ? { background: "var(--ink)", color: "var(--paper)" } : {})}} onClick={() => setCount(n)}>
                {n} weeks
              </button>
            ))}
          </div>
        }
      />

      <div style={{display: "grid", gridTemplateColumns: hasPast ? "1fr 340px" : "1fr", gap: 28, alignItems:"start"}}>
        <div className="card">
          <div className="timeline">
            {fridays.map((f, i) => {
              const fISO = isoDate(f);
              const isSkipped = !!skipped[fISO];
              const host = hostAtFriday(state, f);
              const isThis = fISO === todayISO;
              return (
                <div
                  key={fISO}
                  className={
                    "tl-item" +
                    (isThis ? " this" : "") +
                    (isSkipped ? " skipped" : "") +
                    (draggingISO === fISO ? " is-dragging" : "") +
                    (dropTargetISO === fISO ? ` is-drop drop-${hoverHalf}` : "")
                  }
                  draggable={!isSkipped && !!host}
                  onDragStart={onRowDragStart(host, fISO)}
                  onDragOver={onRowDragOver(host, fISO)}
                  onDragLeave={onRowDragLeave(fISO)}
                  onDrop={onRowDrop(host, fISO)}
                  onDragEnd={onRowDragEnd}
                >
                  <div>
                    <div className="date">
                      {fmtDate(f)}
                      {isThis ? " · This week" : ""}
                      {isSkipped ? ` · ${skipped[fISO].reason || "No meeting"}` : ""}
                    </div>
                    <div style={{display:"flex", alignItems:"center", gap:10, marginTop:4}}>
                      {isSkipped ? (
                        <>
                          <span className="avatar" style={{background:"transparent", color:"var(--ink)", boxShadow:"inset 0 0 0 1px var(--line-2)"}}>—</span>
                          <span className="host-name" style={{textDecoration:"line-through", opacity:0.5}}>No host</span>
                          <span className="pill dim">Skipped</span>
                        </>
                      ) : (
                        <>
                          <span className="drag-handle" aria-hidden title="Drag to swap">
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                              <circle cx="6" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/>
                              <circle cx="6" cy="8" r="1.2"/><circle cx="10" cy="8" r="1.2"/>
                              <circle cx="6" cy="13" r="1.2"/><circle cx="10" cy="13" r="1.2"/>
                            </svg>
                          </span>
                          <Avatar person={host}/>
                          <span className="host-name">{host?.name}</span>
                          {isThis && <span className="pill">On deck</span>}
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{display:"flex", gap:8}}>
                    {isSkipped ? (
                      <button
                        className="btn ghost"
                        style={{padding:"6px 12px", fontSize:11}}
                        onClick={() => { dispatch({ type: "UNSKIP_FRIDAY", fridayISO: fISO }); showToast("Friday restored"); }}
                      >↺ Restore</button>
                    ) : (
                      <>
                        <button
                          className="btn ghost"
                          style={{padding:"6px 12px", fontSize:11}}
                          onClick={() => setSwapFrom({ personId: host.id, fridayISO: fISO })}
                          title="Swap this Friday's host"
                        >↺ Swap</button>
                        <button
                          className="btn ghost"
                          style={{padding:"6px 12px", fontSize:11}}
                          onClick={() => { setSkipFor(fISO); setSkipReason(""); }}
                          title="Skip this Friday (holiday, no meeting)"
                        >⤬ Skip</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="divider" />
          <button className="btn ghost" onClick={() => setCount(count + 8)}>Load 8 more →</button>
        </div>

        {hasPast && (
          <div className="card">
            <h3>History</h3>
            <p className="muted" style={{fontSize:12, marginTop:4, marginBottom: 14, lineHeight:1.5}}>
              Fridays already past, newest first. If a host was skipped and missed
              their turn, reinstate them to the front of the schedule.
            </p>
            <div>
              {history.map((h) => {
                const person = state.people.find((p) => p.id === h.personId) || (h.personId ? { id: h.personId, name: h.name } : null);
                return (
                  <div key={h.date} className="list-row" style={{padding:"10px 4px", gap:10, alignItems:"center"}}>
                    <div className="grow" style={{display:"flex", flexDirection:"column", gap:6, minWidth:0}}>
                      <span className="mono muted" style={{fontSize:11}}>{fmtDate(h.date)}</span>
                      {h.skipped ? (
                        <span className="muted" style={{fontStyle:"italic", fontSize:13}}>
                          Skipped · {h.reason || "No meeting"}
                        </span>
                      ) : (
                        <span style={{display:"flex", alignItems:"center", gap:7, minWidth:0}}>
                          <Avatar person={person} style={{width:22, height:22, fontSize:9, flexShrink:0}}/>
                          <span style={{fontFamily:"var(--font-display)", fontSize:14, lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>{person?.name || h.name}</span>
                        </span>
                      )}
                    </div>
                    {!h.skipped && person && (
                      <button
                        className="btn ghost"
                        style={{padding:"5px 10px", fontSize:11, flexShrink:0, whiteSpace:"nowrap"}}
                        onClick={() => setBringBackTarget({ personId: person.id, name: person.name, fromISO: h.date })}
                        title="Reinstate this host to the front of the upcoming schedule"
                      >↩ Reinstate</button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="divider" />
            <button className="btn ghost" disabled={history.length < pastCount} onClick={() => setPastCount(pastCount + 6)}>← Show 6 earlier</button>
          </div>
        )}
      </div>

      <Modal open={!!swapFrom} onClose={() => { setSwapFrom(null); setSwapTo(null); }}>
        <div className="eyebrow">Swap host</div>
        <h2 style={{marginTop:6}}>Trade {swapPerson?.name.split(" ")[0]}'s turn</h2>
        <p className="muted" style={{marginTop: 4}}>
          They'll swap positions in the rotation — all future turns trade too.
        </p>
        <PersonPicker people={state.people} value={swapTo} onChange={setSwapTo} excludeId={swapPerson?.id}/>
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => { setSwapFrom(null); setSwapTo(null); }}>Cancel</button>
          <button className="btn" disabled={!swapTo} onClick={doSwap}>Swap</button>
        </div>
      </Modal>

      <Modal open={!!skipFor} onClose={() => setSkipFor(null)}>
        <div className="eyebrow">Skip this Friday</div>
        <h2 style={{marginTop:6}}>No lottery on {skipFor ? fmtDate(skipFor) : ""}</h2>
        <p className="muted" style={{marginTop:4, lineHeight:1.5}}>
          The host scheduled for this Friday will simply move to the next non-skipped Friday. The whole rotation slides forward by one week.
        </p>
        <div style={{marginTop:18}}>
          <label className="label">Reason (optional)</label>
          <div style={{display:"flex", gap: 6, flexWrap:"wrap", marginBottom: 10}}>
            {["Easter", "Christmas", "Public holiday", "No meeting", "Summer break"].map((r) => (
              <button key={r} className="btn ghost"
                      style={{padding:"6px 12px", fontSize:11, ...(skipReason === r ? {background:"var(--ink)", color:"var(--paper)"} : {})}}
                      onClick={() => setSkipReason(r)}>{r}</button>
            ))}
          </div>
          <input className="input" placeholder="Or type your own…" value={skipReason} onChange={(e) => setSkipReason(e.target.value)}/>
        </div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={() => setSkipFor(null)}>Cancel</button>
          <button className="btn" onClick={() => {
            dispatch({ type: "SKIP_FRIDAY", fridayISO: skipFor, reason: skipReason.trim() || "No meeting" });
            setSkipFor(null);
            showToast("Friday skipped");
          }}>Skip Friday</button>
        </div>
      </Modal>

      <Modal open={!!bringBackTarget} onClose={() => setBringBackTarget(null)}>
        {bringBackTarget && (() => {
          const nextFri = nextNonSkippedFriday(state);
          const curNext = hostAtFriday(state, nextFri);
          const first = bringBackTarget.name.split(" ")[0];
          const already = curNext && curNext.id === bringBackTarget.personId;
          return (
            <>
              <div className="eyebrow">Reinstate a host</div>
              <h2 style={{marginTop:6}}>Give {first} the next turn</h2>
              {already ? (
                <p className="muted" style={{marginTop:8, lineHeight:1.55}}>
                  {first} is already up next on {fmtDate(nextFri)} — there's nothing to reinstate.
                </p>
              ) : (
                <p className="muted" style={{marginTop:8, lineHeight:1.55}}>
                  {bringBackTarget.name} moves to the top of the schedule and hosts the
                  next Friday, <strong>{fmtDate(nextFri)}</strong>.
                  {curNext ? <> <strong>{curNext.name}</strong> moves to the week after,</> : null}
                  {" "}and everyone else slides back one week. That past Friday will be
                  marked <em>skipped</em> in the history.
                </p>
              )}
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setBringBackTarget(null)}>Cancel</button>
                <button className="btn" disabled={already} onClick={doBringBack}>Reinstate</button>
              </div>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}

window.SchedulePage = SchedulePage;
