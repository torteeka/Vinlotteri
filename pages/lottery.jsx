/* lottery.jsx — Run the Lottery. Card-grid animation, sound, confetti, reveal. */

const LOTTERY_WHEEL_KEY = "vinlotteri.cards.v1";

// Deterministic shuffle of card positions, persisted per week so the
// layout doesn't shift between rolls on the same Friday.
function buildCards(state, fridayISO) {
  const tickets = state.tickets[fridayISO] || {};
  const cards = [];
  state.people.forEach((p) => {
    const n = Math.min(5, Math.max(0, tickets[p.id] || 0));
    for (let i = 0; i < n; i++) {
      cards.push({
        id: `${p.id}#${i}`,
        personId: p.id,
        name: p.name,
        ticketIdx: i + 1,
        ticketsTotal: n
      });
    }
  });
  // Shuffle (Fisher-Yates) — use a stable seed from the week so layout persists across reloads.
  let seed = 0;
  for (let i = 0; i < fridayISO.length; i++) seed = seed * 31 + fridayISO.charCodeAt(i) | 0;
  const rng = () => {
    seed = seed * 1664525 + 1013904223 | 0;
    return (seed >>> 0) % 1e9 / 1e9;
  };
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function gridDimsFor(total) {
  if (total === 0) return { cols: 1, rows: 1 };
  // Slightly wider than tall.
  const cols = Math.min(10, Math.max(4, Math.ceil(Math.sqrt(total * 1.6))));
  const rows = Math.ceil(total / cols);
  return { cols, rows };
}

function LotteryPage({ state, dispatch, setRoute, showToast }) {
  const friday = thisFriday();
  const fridayISO = isoDate(friday);
  const host = hostAtFriday(state, friday);

  const cards = React.useMemo(() => buildCards(state, fridayISO), [state.tickets, state.people, fridayISO]);
  const dims = React.useMemo(() => gridDimsFor(cards.length), [cards.length]);
  const consumedIds = (state.winners[fridayISO] || []).map((w) => `${w.personId}#${w.cardIndex}`);
  const consumedSet = React.useMemo(() => new Set(consumedIds), [consumedIds.join("|")]);
  const winnersDrawn = (state.winners[fridayISO] || []).length;

  const hostInfo = state.hostInfo[fridayISO] || {};
  // Bottles host plans to give out tonight. Default suggestion based on pot;
  // host can adjust live from the lottery page.
  const potTickets = cards.length;
  const potKrSuggest = potTickets * 20;
  const suggestedBottles = Math.max(1, Math.min(potTickets, Math.floor(potKrSuggest / 175)));
  const bottlesTonight = hostInfo.bottles ?? suggestedBottles;
  const setBottles = (n) => dispatch({ type: "SET_HOST_INFO", week: fridayISO, info: { bottles: Math.max(1, Math.min(potTickets, n)) } });

  const [phase, setPhase] = React.useState("idle"); // idle | rowScan | cellScan | reveal
  const [hotRow, setHotRow] = React.useState(null);
  const [hotCell, setHotCell] = React.useState(null); // card.id
  const [winnerCard, setWinnerCard] = React.useState(null);
  const [heldCell, setHeldCell] = React.useState(null); // winning cell during pre-reveal pause
  const [showConfetti, setShowConfetti] = React.useState(false);
  const animTokenRef = React.useRef(0);

  React.useEffect(() => {Sound.set(state.sound);}, [state.sound]);

  const pool = cards.filter((c) => !consumedSet.has(c.id));
  const allDone = cards.length > 0 && (winnersDrawn >= bottlesTonight || pool.length === 0);

  const ticketCount = cards.length;
  const potKr = ticketCount * 20;

  const startRoll = () => {
    if (phase !== "idle" || pool.length === 0) return;
    // Pick winner uniformly from pool.
    const winner = pool[Math.floor(Math.random() * pool.length)];
    const winnerIdx = cards.findIndex((c) => c.id === winner.id);
    const winnerRow = Math.floor(winnerIdx / dims.cols);
    const winnerCol = winnerIdx % dims.cols;

    // ── 30% last-second jump fake-out ───────────────────────────────
    // Normally the swept row IS the winner's row and the sweep lands right
    // on the winner. 30% of the time the swept row is a *decoy* row next to
    // the winner: the sweep slows and settles on a decoy cell (one of the
    // eight neighbours of the winner — before/after in the same row, or any
    // of the six in the rows above/below), holds as if it's done, then at
    // the very last second jumps to the real winner cell and STAYS there.
    // When that winner cell is on another row, only that one cell lights —
    // never the whole row.
    let scanRow = winnerRow;
    let settleCol = winnerCol;
    let fake = false;
    if (Math.random() < 0.30) {
      const decoys = [];
      [winnerRow - 1, winnerRow, winnerRow + 1].forEach((r) => {
        if (r < 0 || r >= dims.rows) return;
        [winnerCol - 1, winnerCol, winnerCol + 1].forEach((cc) => {
          if (cc < 0 || cc >= dims.cols) return;
          if (r === winnerRow && cc === winnerCol) return; // skip the winner itself
          const dc = cards[r * dims.cols + cc];
          if (!dc) return;                                  // empty trailing slot
          if (consumedSet.has(dc.id)) return;               // already won
          decoys.push({ r, cc });
        });
      });
      if (decoys.length) {
        const d = decoys[Math.floor(Math.random() * decoys.length)];
        scanRow = d.r;       // sweep runs along the decoy's row
        settleCol = d.cc;    // and rests on the decoy cell
        fake = true;
      }
    }
    const myToken = ++animTokenRef.current;

    setPhase("rowScan");
    setHotRow(null);
    setHotCell(null);
    setWinnerCard(null);

    // ── Phase 1: row scanning ───────────────────────────────────────
    const rowPhaseDuration = 3200;
    let rowElapsed = 0;
    let rowLast = performance.now();
    let nextRowTick = 0;
    let currentRow = Math.floor(Math.random() * dims.rows);
    setHotRow(currentRow);

    const rowFrame = (now) => {
      if (myToken !== animTokenRef.current) return;
      const dt = now - rowLast;
      rowLast = now;
      rowElapsed += dt;
      if (rowElapsed >= rowPhaseDuration) {
        // Settle on the scan row (winner row, or a decoy row when faking)
        setHotRow(scanRow);
        Sound.rowSettle();
        setTimeout(() => beginCellPhase(myToken, scanRow, settleCol, winnerIdx, fake), 540);
        return;
      }
      if (rowElapsed >= nextRowTick) {
        const t = rowElapsed / rowPhaseDuration;
        // Interval: 70ms early → ~420ms late
        const interval = 70 + Math.pow(t, 2.6) * 420;
        nextRowTick = rowElapsed + interval;
        // Step to a nearby row, avoiding immediate repeat
        let next;
        if (t > 0.7) {
          // bias toward winner row as it slows
          const wantWinner = Math.random() < (t - 0.5) * 1.5;
          next = wantWinner ? scanRow : (currentRow + 1 + Math.floor(Math.random() * (dims.rows - 1))) % dims.rows;
        } else {
          next = (currentRow + 1 + Math.floor(Math.random() * (dims.rows - 1))) % dims.rows;
        }
        currentRow = next;
        setHotRow(currentRow);
        Sound.tick();
      }
      requestAnimationFrame(rowFrame);
    };

    if (dims.rows <= 1) {
      // No row phase needed
      setHotRow(0);
      setTimeout(() => beginCellPhase(myToken, scanRow, settleCol, winnerIdx, fake), 300);
    } else {
      requestAnimationFrame(rowFrame);
    }
  };

  const beginCellPhase = (token, targetRow, settleCol, winnerIdx, fake) => {
    if (token !== animTokenRef.current) return;
    setPhase("cellScan");
    const winnerRow = Math.floor(winnerIdx / dims.cols);
    // Light the swept row's lane (the winner's row normally, a decoy row on a fake).
    setHotRow(targetRow);

    // Valid cell columns within the swept row: skip empty trailing slots and
    // cells that have already won (so the sweep hops past them).
    const validCols = [];
    for (let col = 0; col < dims.cols; col++) {
      const cc = cards[targetRow * dims.cols + col];
      if (cc && !consumedSet.has(cc.id)) validCols.push(col);
    }

    // The sweep comes to rest on the settle cell — the winner itself when not
    // faking, or a decoy neighbour when faking. On a fake, hold there a beat,
    // then jump to the real winner and STAY (don't return to the swept row).
    const land = () => {
      if (token !== animTokenRef.current) return;
      const settleCard = cards[targetRow * dims.cols + settleCol];
      setHotCell(settleCard ? settleCard.id : cards[winnerIdx].id);
      Sound.rowSettle();
      if (fake) {
        setTimeout(() => {
          if (token !== animTokenRef.current) return;
          // Only keep the row lane lit when the winner is on the swept row;
          // when it's on another row, light just the single winner cell.
          setHotRow(winnerRow === targetRow ? winnerRow : null);
          setHotCell(cards[winnerIdx].id);
          Sound.rowSettle();
          setTimeout(() => finishReveal(token, winnerIdx), 460);
        }, 720);
      } else {
        setTimeout(() => finishReveal(token, winnerIdx), 420);
      }
    };

    if (validCols.length <= 1) {
      // Only one card in the row — settle immediately.
      setTimeout(land, 220);
      return;
    }

    // ── Left→right decelerating sweep ───────────────────────────────
    // Highlight cells one at a time, left to right, wrapping back to the
    // leftmost cell — never skipping (won cells excluded), never random.
    // Each step takes a little longer (ease-out), so the sweep visibly
    // slows and comes to rest on the settle cell.
    const n = validCols.length;
    const startPos = 0;                       // begin at the left edge
    const settlePos = validCols.indexOf(settleCol);
    const laps = 3;                           // full passes before resting
    const totalSteps = laps * n + ((settlePos - startPos + n) % n);

    const fastMs = 70;                        // first (quick) step
    const slowMs = 460;                       // final (slow) step
    let step = 0;

    const doStep = () => {
      if (token !== animTokenRef.current) return;

      if (step >= totalSteps) {
        // End of the sweep — land (reveal, or fake-then-reveal).
        land();
        return;
      }
      const pos = (startPos + step) % n;
      setHotCell(cards[targetRow * dims.cols + validCols[pos]].id);
      Sound.cellTick();
      // Ease-out: interval grows as we approach the end of the sweep.
      const p = step / totalSteps;
      const interval = fastMs + (slowMs - fastMs) * Math.pow(p, 2.4);
      step++;
      setTimeout(doStep, interval);
    };
    doStep();
  };

  const finishReveal = (token, winnerIdx) => {
    if (token !== animTokenRef.current) return;
    const winner = cards[winnerIdx];
    // Hold on the winning cell in a dark (ink) state a beat before the
    // reveal page, so the eye lands on the chosen card before the overlay.
    setHotCell(null);
    setHeldCell(winner.id);
    Sound.rowSettle();
    setTimeout(() => {
      if (token !== animTokenRef.current) return;
      setHeldCell(null);
      setWinnerCard(winner);
      setPhase("reveal");
      setShowConfetti(true);
      Sound.fanfare();
      // Persist winner
      dispatch({
        type: "ADD_WINNER",
        week: fridayISO,
        personId: winner.personId,
        name: winner.name,
        cardIndex: winner.id.split("#")[1] ? parseInt(winner.id.split("#")[1], 10) : 0
      });
      setTimeout(() => setShowConfetti(false), 4200);
    }, 850);
  };

  const closeReveal = () => {
    setPhase("idle");
    setWinnerCard(null);
    setHeldCell(null);
    setHotRow(null);
    setHotCell(null);
  };

  const startRollRef = React.useRef(startRoll);
  startRollRef.current = startRoll;
  const rollAgain = () => {
    closeReveal();
    setTimeout(() => startRollRef.current(), 350);
  };

  const resetWeek = () => {
    if (!confirm("Reset all rolls for this week?")) return;
    dispatch({ type: "RESET_WINNERS", week: fridayISO });
    closeReveal();
    showToast("Rolls reset");
  };

  // Palette for confetti based on theme
  const themeColors = React.useMemo(() => {
    const root = getComputedStyle(document.documentElement);
    return [
    root.getPropertyValue("--accent").trim(),
    root.getPropertyValue("--gold").trim(),
    root.getPropertyValue("--paper").trim(),
    root.getPropertyValue("--rose").trim() || "#c97a76",
    root.getPropertyValue("--ink").trim()].
    filter(Boolean);
  }, [state.theme]);

  if (state.people.length === 0) {
    return (
      <div className="page-shell">
        <PageHeader eyebrow="Lottery" title="Nothing to roll yet" />
        <div className="card">
          <p className="muted">Add people in Manage People first, then have them buy tickets.</p>
        </div>
      </div>);

  }

  if (!host) {
    // Friday is skipped.
    const skipInfo = state.skippedFridays?.[fridayISO];
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={`Friday · ${fmtDate(friday)}`}
          title="No lottery this week"
          subtitle={skipInfo?.reason ? `This Friday is marked: ${skipInfo.reason}.` : "This Friday is skipped."}
          right={<button className="btn ghost" onClick={() => dispatch({ type: "UNSKIP_FRIDAY", fridayISO })}>↺ Restore Friday</button>} />
        
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div className="script" style={{ fontSize: 72, color: "var(--accent)", lineHeight: 1 }}>Bonne fête.</div>
          <div className="muted" style={{ marginTop: 12, fontSize: 16 }}>See you next Friday.</div>
        </div>
      </div>);

  }

  if (cards.length === 0) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow={fmtDate(friday)}
          title="No tickets yet"
          subtitle="Once someone buys a ticket, their card lands on the table."
          right={<button className="btn" onClick={() => setRoute("tickets")}>Add tickets →</button>} />
        
      </div>);

  }

  // Winners summary for this week
  const wonForPerson = {};
  (state.winners[fridayISO] || []).forEach((w) => {
    wonForPerson[w.personId] = (wonForPerson[w.personId] || 0) + 1;
  });
  const winnersList = Object.entries(wonForPerson).map(([pid, count]) => {
    const p = state.people.find((x) => x.id === pid);
    return { person: p, count };
  });

  // Roll control — phase-aware. Lives next to the heading now.
  const rollControl =
  phase === "idle" && !allDone ?
  <button className="btn huge" onClick={startRoll}>
        {winnersDrawn > 0 ?
    `Roll bottle №${winnersDrawn + 1} of ${bottlesTonight}` :
    `Roll the bottle — 1 of ${bottlesTonight}`}
      </button> :
  phase !== "idle" && phase !== "reveal" ?
  <button className="btn huge" disabled>Rolling…</button> :
  allDone && phase !== "reveal" ?
  <div className="card" style={{ padding: "10px 22px", textAlign: "center" }}>
        <div className="eyebrow">All {bottlesTonight} drawn</div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, marginTop: 2 }}>That's the night. <span className="script" style={{ fontSize: 28, color: "var(--accent)", marginLeft: 4 }}>Skål!</span></div>
      </div> :
  null;

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow={`${fmtDate(friday)} · ${cards.length} card${cards.length === 1 ? "" : "s"} on the table`}
        title="Run the Lottery"
        subtitle={`Pot: ${potKr} kr. Each ticket is one card — more tickets, more chances.`}
        right={
        <div className="lottery-head-controls" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "stretch" }}>
              {rollControl}
              <div className="card" style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 18px" }}>
                <div>
                  <div className="eyebrow" style={{ marginBottom: 2 }}>Bottles tonight</div>
                  <div className="muted" style={{ fontSize: 12 }}>Drawn {winnersDrawn} / {bottlesTonight}</div>
                </div>
                <Stepper value={bottlesTonight} min={Math.max(1, winnersDrawn)} max={Math.min(potTickets, 20)} onChange={setBottles} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button className="icon-btn" onClick={() => dispatch({ type: "SET_PREF", key: "sound", value: !state.sound })} title="Toggle sound" aria-label="Toggle sound">
                {state.sound ?
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M16 8a5 5 0 0 1 0 8" /><path d="M19 5a9 9 0 0 1 0 14" /></svg> :
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5L6 9H3v6h3l5 4z" /><path d="M22 9l-6 6M16 9l6 6" /></svg>}
              </button>
              {(state.winners[fridayISO] || []).length > 0 &&
            <button className="btn ghost" onClick={resetWeek}>Reset rolls</button>
            }
            </div>
          </div>
        } />
      

      {/* Card grid */}
      <div className="lottery-stage" style={{ position: "relative" }}>
        <div className="lot-grid" style={{ gridTemplateColumns: `repeat(${dims.cols}, 1fr)` }}>
          {Array.from({ length: dims.rows * dims.cols }).map((_, i) => {
            const c = cards[i];
            if (!c) {
              // empty trailing slot — render decorative empty card
              return <div key={`e${i}`} style={{ visibility: "hidden", aspectRatio: "1.4 / 1" }} />;
            }
            const row = Math.floor(i / dims.cols);
            const consumed = consumedSet.has(c.id);
            const isWinnerNow = winnerCard?.id === c.id;
            const rowHot = (phase === "rowScan" || phase === "cellScan") && hotRow === row && !consumed;
            const cellHot = hotCell === c.id && !consumed;
            const cellHeld = heldCell === c.id && !consumed;
            const cls = [
            "lot-card",
            consumed && "consumed",
            rowHot && "row-hot",
            cellHot && "cell-hot",
            cellHeld && "cell-held",
            isWinnerNow && "won"].
            filter(Boolean).join(" ");
            const first = c.name.split(" ")[0];
            return (
              <div key={c.id} className={cls}>
                <span className="corner tl">№ {String(i + 1).padStart(2, "0")}</span>
                <span style={{ height: "16px", fontSize: "24px" }}>{first}</span>
                <span className="corner br">T{c.ticketIdx}/{c.ticketsTotal}</span>
              </div>);

          })}
        </div>
      </div>

      {/* Winners summary */}
      {winnersList.length > 0 &&
      <div className="card" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", flexWrap: "wrap", background: "color-mix(in oklab, var(--gold) 8%, var(--paper))" }}>
          <span className="eyebrow" style={{ fontSize: 10, color: "color-mix(in oklab, var(--gold) 60%, var(--ink))" }}>Winners so far</span>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {winnersList.map(({ person, count }) =>
          <div key={person?.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14 }}>{person?.name}</span>
                <span className="muted" style={{ fontSize: 11 }}>×{count}</span>
              </div>
          )}
          </div>
        </div>
      }

      {/* Reveal overlay */}
      {phase === "reveal" && winnerCard &&
      <div className="reveal">
          <div className="eyebrow">The winner is</div>
          <div style={{ display: "flex", alignItems: "center", gap: 30, marginTop: 8 }}>
            <div className="who">{winnerCard.name}</div>
          </div>
          <div className="sub">Skål — bottle №{winnersDrawn} of {bottlesTonight}</div>
          <div className="actions">
            <button className="btn ghost" onClick={closeReveal} style={{ background: "transparent", color: "var(--paper)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.4)" }}>Close</button>
            {pool.length > 0 && winnersDrawn < bottlesTonight &&
          <button className="btn big" onClick={rollAgain}>Roll bottle №{winnersDrawn + 1} →</button>
          }
          </div>
        </div>
      }

      <Confetti running={showConfetti} style={state.confettiStyle} palette={themeColors} />
    </div>);

}

window.LotteryPage = LotteryPage;