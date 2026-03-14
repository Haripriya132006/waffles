// src/components/GameCenter/games/WordGuess.jsx
import React, { useState, useEffect, useRef } from "react";

function getTileState(word, guess, pos) {
  if (guess[pos] === word[pos]) return "correct";
  if (word.includes(guess[pos])) return "present";
  return "absent";
}

export default function WordGuess({ gameState, myRole, onMove }) {
  const { word, guesses, maxGuesses, guesserRole, ended, result } = gameState;
  const isGuesser = myRole === guesserRole;
  const [current, setCurrent] = useState("");
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = () => {
    if (current.length !== 5 || !isGuesser || ended) return;
    onMove(current.toUpperCase());
    setCurrent("");
  };

  const rows = Array(maxGuesses).fill(null).map((_, i) => guesses[i] || null);

  return (
    <div className="gc-wg">
      {/* Role label */}
      <div className="gc-status">
        {ended
          ? <span className="gc-status--end">{result}</span>
          : isGuesser
            ? <span className="gc-status--your-turn">You're guessing!</span>
            : <span className="gc-status--wait">Opponent is guessing…</span>
        }
      </div>

      {/* Grid */}
      <div className="gc-wg__grid">
        {rows.map((guess, ri) => (
          <div key={ri} className="gc-wg__row">
            {Array(5).fill(null).map((_, ci) => {
              const isActive = !ended && ri === guesses.length && isGuesser;
              const letter = guess ? guess[ci] : (isActive ? current[ci] : "");
              const state  = guess ? getTileState(word, guess, ci) : "empty";
              return (
                <div
                  key={ci}
                  className={[
                    "gc-wg__tile",
                    `gc-wg__tile--${state}`,
                    guess ? "gc-wg__tile--filled" : "",
                  ].join(" ")}
                >
                  {letter}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Keyboard hint */}
      {isGuesser && !ended && (
        <div className="gc-wg__input-row">
          <input
            ref={inputRef}
            className="gc-wg__input"
            maxLength={5}
            value={current}
            onChange={e => setCurrent(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Type 5 letters…"
          />
          <button
            className="gc-wg__submit"
            onClick={submit}
            disabled={current.length !== 5}
          >
            Guess
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="gc-wg__legend">
        <span className="gc-wg__legend-item gc-wg__tile--correct">Correct</span>
        <span className="gc-wg__legend-item gc-wg__tile--present">Wrong spot</span>
        <span className="gc-wg__legend-item gc-wg__tile--absent">Not in word</span>
      </div>
    </div>
  );
}