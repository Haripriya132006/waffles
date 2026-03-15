// src/components/GameCenter/games/TicTacToe.jsx
import React from "react";

export default function TicTacToe({ gameState, myRole, onMove }) {
  const { board, turn, ended, result } = gameState;
  const myMark    = myRole === "inviter" ? "X" : "O";
  const isMyTurn  = turn === myRole && !ended;

  const winLines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winningLine = winLines.find(([a,b,c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
  const winSet = new Set(winningLine || []);

  return (
    <div className="gc-ttt">
      <div className="gc-status">
        {ended
          ? <span className="gc-status--end">{result}</span>
          : isMyTurn
            ? <span className="gc-status--your-turn">Your turn ({myMark})</span>
            : <span className="gc-status--wait">Opponent's turn…</span>
        }
      </div>
      <div className="gc-ttt__board">
        {board.map((cell, i) => (
          <button
            key={i}
            className={[
              "gc-ttt__cell",
              cell === "X" ? "gc-ttt__cell--x" : cell === "O" ? "gc-ttt__cell--o" : "",
              winSet.has(i) ? "gc-ttt__cell--win" : "",
              !cell && isMyTurn ? "gc-ttt__cell--hover" : "",
            ].join(" ")}
            onClick={() => !cell && isMyTurn && onMove(i)}
            disabled={!!cell || !isMyTurn}
          >
            {cell === "X" && (
              <svg viewBox="0 0 40 40" fill="none">
                <line x1="8" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                <line x1="32" y1="8" x2="8" y2="32" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
            )}
            {cell === "O" && (
              <svg viewBox="0 0 40 40" fill="none">
                <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="4"/>
              </svg>
            )}
          </button>
        ))}
      </div>
      <div className="gc-ttt__legend">
        <span>You: <strong>{myMark}</strong></span>
        <span>Opponent: <strong>{myMark === "X" ? "O" : "X"}</strong></span>
      </div>
    </div>
  );
}