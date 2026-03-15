// src/components/GameCenter/games/ConnectFour.jsx
import React, { useState } from "react";

export default function ConnectFour({ gameState, myRole, onMove }) {
  const { board, turn, ended, result } = gameState;
  const myColor   = myRole === "inviter" ? "R" : "Y";
  const isMyTurn  = turn === myRole && !ended;
  const [hoverCol, setHoverCol] = useState(null);

  const colorClass = c => c === "R" ? "gc-c4__cell--red" : c === "Y" ? "gc-c4__cell--yellow" : "";

  return (
    <div className="gc-c4">
      <div className="gc-status">
        {ended
          ? <span className="gc-status--end">{result}</span>
          : isMyTurn
            ? <span className="gc-status--your-turn">Your turn ({myColor === "R" ? "🔴" : "🟡"})</span>
            : <span className="gc-status--wait">Opponent's turn…</span>
        }
      </div>

      {/* Drop indicators */}
      <div className="gc-c4__indicators">
        {Array(7).fill(null).map((_, c) => (
          <div key={c} className="gc-c4__indicator-cell">
            {isMyTurn && hoverCol === c && (
              <div className={`gc-c4__drop-indicator ${myColor === "R" ? "gc-c4__cell--red" : "gc-c4__cell--yellow"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="gc-c4__board">
        {board.map((row, ri) => (
          <div key={ri} className="gc-c4__row">
            {row.map((cell, ci) => (
              <button
                key={ci}
                className={["gc-c4__cell", colorClass(cell)].join(" ")}
                onClick={() => isMyTurn && onMove(ci)}
                onMouseEnter={() => setHoverCol(ci)}
                onMouseLeave={() => setHoverCol(null)}
                disabled={!isMyTurn || !!board[0][ci]}
              >
                <div className="gc-c4__disc" />
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="gc-c4__legend">
        <span>🔴 Inviter &nbsp; 🟡 Joiner</span>
        <span>You are <strong>{myColor === "R" ? "🔴" : "🟡"}</strong></span>
      </div>
    </div>
  );
}