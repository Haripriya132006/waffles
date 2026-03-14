// src/components/GameCenter/games/RockPaperScissors.jsx
import React, { useState } from "react";

const OPTIONS = [
  { id: "rock",     emoji: "🪨", label: "Rock"     },
  { id: "paper",    emoji: "📄", label: "Paper"    },
  { id: "scissors", emoji: "✂️", label: "Scissors" },
];

export default function RockPaperScissors({ gameState, myRole, onMove }) {
  const { round, maxRounds, choices, scores, lastChoices, lastResult, ended, result } = gameState;
  const [picked, setPicked] = useState(null);

  const myChoice       = choices[myRole];
  const alreadyChose   = !!myChoice || !!lastChoices?.[myRole];
  const waitingForOpp  = alreadyChose && !lastChoices;

  const handlePick = (id) => {
    if (alreadyChose || ended) return;
    setPicked(id);
    onMove(id);
  };

  const getResultLabel = () => {
    if (!lastResult) return null;
    if (lastResult === "draw") return "Draw!";
    return lastResult === myRole ? "You won that round! 🎉" : "Opponent won that round";
  };

  return (
    <div className="gc-rps">
      {/* Score */}
      <div className="gc-rps__score">
        <div className="gc-rps__score-box">
          <span className="gc-rps__score-label">You</span>
          <span className="gc-rps__score-num">{scores[myRole]}</span>
        </div>
        <span className="gc-rps__round">Round {Math.min(round, maxRounds)}/{maxRounds}</span>
        <div className="gc-rps__score-box">
          <span className="gc-rps__score-label">Them</span>
          <span className="gc-rps__score-num">{scores[myRole === "inviter" ? "joiner" : "inviter"]}</span>
        </div>
      </div>

      {/* Last round result */}
      {lastChoices && (
        <div className="gc-rps__last">
          <span className="gc-rps__last-choice">
            {OPTIONS.find(o => o.id === lastChoices[myRole])?.emoji}
          </span>
          <span className="gc-rps__last-vs">vs</span>
          <span className="gc-rps__last-choice">
            {OPTIONS.find(o => o.id === lastChoices[myRole === "inviter" ? "joiner" : "inviter"])?.emoji}
          </span>
          <p className="gc-rps__last-result">{getResultLabel()}</p>
        </div>
      )}

      {/* Status */}
      <div className="gc-status">
        {ended
          ? <span className="gc-status--end">{result} {scores[myRole] > scores[myRole === "inviter" ? "joiner" : "inviter"] ? "🏆" : "😅"}</span>
          : waitingForOpp
            ? <span className="gc-status--wait">Waiting for opponent…</span>
            : alreadyChose
              ? <span className="gc-status--wait">You chose {OPTIONS.find(o => o.id === (picked || myChoice))?.emoji}</span>
              : <span className="gc-status--your-turn">Pick your move!</span>
        }
      </div>

      {/* Choices */}
      {!ended && (
        <div className="gc-rps__options">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              className={[
                "gc-rps__option",
                (picked === opt.id || myChoice === opt.id) ? "gc-rps__option--picked" : "",
              ].join(" ")}
              onClick={() => handlePick(opt.id)}
              disabled={alreadyChose}
            >
              <span className="gc-rps__option-emoji">{opt.emoji}</span>
              <span className="gc-rps__option-label">{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}