// src/components/GameCenter/index.jsx
import React, { useState, useCallback, forwardRef, useImperativeHandle } from "react";
import "./GameCenter.css";
import TicTacToe       from "./games/TicTacToe";
import RockPaperScissors from "./games/RockPaperScissors";
import WordGuess        from "./games/WordGuess";
import ConnectFour      from "./games/ConnectFour";

// ── Game registry ──
export const GAMES = {
  tictactoe: {
    id: "tictactoe",
    name: "Tic-Tac-Toe",
    emoji: "⭕",
    desc: "Classic 3×3 grid",
    component: TicTacToe,
  },
  rps: {
    id: "rps",
    name: "Rock Paper Scissors",
    emoji: "✊",
    desc: "Best of 3 rounds",
    component: RockPaperScissors,
  },
  wordguess: {
    id: "wordguess",
    name: "Word Guess",
    emoji: "🔤",
    desc: "Guess the 5-letter word",
    component: WordGuess,
  },
  connectfour: {
    id: "connectfour",
    name: "Connect Four",
    emoji: "🔴",
    desc: "Drop discs, connect 4",
    component: ConnectFour,
  },
};

// ── Game picker popup ──
export function GamePicker({ onSelect, onClose }) {
  return (
    <div className="gc-picker">
      <div className="gc-picker__header">
        <span className="gc-picker__title">🎮 Activities</span>
        <button className="gc-picker__close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="gc-picker__grid">
        {Object.values(GAMES).map(game => (
          <button key={game.id} className="gc-game-card" onClick={() => onSelect(game.id)}>
            <span className="gc-game-card__emoji">{game.emoji}</span>
            <span className="gc-game-card__name">{game.name}</span>
            <span className="gc-game-card__desc">{game.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Invite bubble (shown in chat) ──
export function GameInviteBubble({ msg, currentUser, onJoin }) {
  const { gameId, inviter, gameState } = msg.game_invite;
  const game = GAMES[gameId];
  const isInviter = inviter === currentUser;
  const ended = gameState?.ended;

  return (
    <div className="gc-invite-bubble">
      <span className="gc-invite-bubble__emoji">{game?.emoji}</span>
      <div className="gc-invite-bubble__info">
        <span className="gc-invite-bubble__name">{game?.name}</span>
        <span className="gc-invite-bubble__sub">
          {ended
            ? `Game over — ${gameState.result}`
            : isInviter
              ? "Waiting for opponent to join…"
              : `${inviter} challenged you!`}
        </span>
      </div>
      {!ended && !isInviter && (
        <button className="gc-invite-bubble__join" onClick={() => onJoin(msg)}>
          Join
        </button>
      )}
      {!ended && isInviter && (
        <button className="gc-invite-bubble__join gc-invite-bubble__join--open" onClick={() => onJoin(msg)}>
          Open
        </button>
      )}
    </div>
  );
}

// ── Game modal (hosts the active game) ──
export function GameModal({ session, currentUser, onMove, onClose }) {
  const { gameId, inviter, joiner, gameState, msgId } = session;
  const game = GAMES[gameId];
  if (!game) return null;
  const GameComponent = game.component;

  // Determine player roles
  const myRole   = currentUser === inviter ? "inviter" : "joiner";
  const opponent = currentUser === inviter ? joiner : inviter;

  return (
    <div className="gc-modal-overlay" onClick={onClose}>
      <div className="gc-modal" onClick={e => e.stopPropagation()}>
        <div className="gc-modal__header">
          <span className="gc-modal__title">{game.emoji} {game.name}</span>
          <span className="gc-modal__vs">vs <strong>{opponent || "?"}</strong></span>
          <button className="gc-modal__close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="gc-modal__body">
          <GameComponent
            gameState={gameState}
            myRole={myRole}
            currentUser={currentUser}
            inviter={inviter}
            joiner={joiner}
            onMove={(move) => onMove(msgId, gameId, move)}
          />
        </div>
      </div>
    </div>
  );
}

// ── Default export: manager that wires everything together ──
// Usage in ChatWindow:
//   import GameCenter from "./GameCenter";
//   <GameCenter ref={gcRef} currentUser={...} chatPartner={...} ws={ws} onGameMessage={...} />
//   gcRef.current.handleIncoming(raw)  ← call from ws.onmessage
//   gcRef.current.openPicker()         ← call from activity button

const GameCenter = forwardRef(function GameCenter(
  { currentUser, chatPartner, ws, onGameMessage },
  ref
) {
  const [pickerOpen,   setPickerOpen]   = useState(false);
  const [activeSession, setActiveSession] = useState(null); // { gameId, msgId, inviter, joiner, gameState }

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    openPicker:      () => setPickerOpen(true),
    handleIncoming:  (raw) => handleIncoming(raw),
  }));

  const handleIncoming = useCallback((raw) => {
    if (raw.type === "game_invite") {
      // Update or open active session if we're the joiner
      setActiveSession({
        msgId:     raw.msgId,
        gameId:    raw.gameId,
        inviter:   raw.inviter,
        joiner:    raw.joiner,
        gameState: raw.gameState,
      });
    }
    if (raw.type === "game_move") {
      setActiveSession(prev => {
        if (!prev || prev.msgId !== raw.msgId) return prev;
        return { ...prev, gameState: raw.gameState };
      });
    }
  }, []);

  const sendInvite = (gameId) => {
    setPickerOpen(false);
    const msgId = `game_${Date.now()}`;
    const initialState = getInitialState(gameId);
    const payload = {
      type:      "game_invite",
      msgId,
      gameId,
      inviter:   currentUser,
      joiner:    null,
      gameState: initialState,
      from:      currentUser,
      to:        chatPartner,
    };
    ws.current?.send(JSON.stringify(payload));
    onGameMessage(payload); // let ChatWindow add it to messages
    setActiveSession({ msgId, gameId, inviter: currentUser, joiner: null, gameState: initialState });
  };

  // eslint-disable-next-line no-unused-vars
  const joinGame = (msg) => {
    const { msgId, gameId, inviter, gameState } = msg.game_invite;
    const payload = {
      type:    "game_join",
      msgId,
      gameId,
      inviter,
      joiner:  currentUser,
      gameState,
      from:    currentUser,
      to:      chatPartner,
    };
    ws.current?.send(JSON.stringify(payload));
    setActiveSession({ msgId, gameId, inviter, joiner: currentUser, gameState });
  };

  const sendMove = (msgId, gameId, move) => {
    if (!activeSession) return;
    const newState = applyMove(gameId, activeSession.gameState, move, currentUser, activeSession.inviter, activeSession.joiner);
    const payload = {
      type:      "game_move",
      msgId,
      gameId,
      gameState: newState,
      from:      currentUser,
      to:        chatPartner,
    };
    ws.current?.send(JSON.stringify(payload));
    setActiveSession(prev => ({ ...prev, gameState: newState }));
    if (newState.ended) {
      onGameMessage({ ...payload, type: "game_end" });
    }
  };

  return (
    <>
      {pickerOpen && (
        <GamePicker onSelect={sendInvite} onClose={() => setPickerOpen(false)} />
      )}
      {activeSession && (
        <GameModal
          session={activeSession}
          currentUser={currentUser}
          onMove={sendMove}
          onClose={() => setActiveSession(null)}
        />
      )}
    </>
  );
});

export default GameCenter;

// ── Game logic helpers ──

export function getInitialState(gameId) {
  switch (gameId) {
    case "tictactoe":
      return { board: Array(9).fill(null), turn: "inviter", winner: null, ended: false };
    case "rps":
      return { round: 1, maxRounds: 3, choices: {}, scores: { inviter: 0, joiner: 0 }, ended: false, result: null };
    case "wordguess":
      return {
        word:    pickWord(),
        guesses: [],
        maxGuesses: 6,
        currentGuess: "",
        ended: false,
        result: null,
        turn: "inviter", // inviter picks, joiner guesses — or both guess same word
        guesserRole: "joiner",
      };
    case "connectfour":
      return {
        board:  Array(6).fill(null).map(() => Array(7).fill(null)),
        turn:   "inviter",
        winner: null,
        ended:  false,
      };
    default:
      return {};
  }
}

export function applyMove(gameId, state, move, currentUser, inviter, joiner) {
  const myRole = currentUser === inviter ? "inviter" : "joiner";
  switch (gameId) {
    case "tictactoe":  return applyTTT(state, move, myRole);
    case "rps":        return applyRPS(state, move, myRole);
    case "wordguess":  return applyWordGuess(state, move, myRole);
    case "connectfour":return applyC4(state, move, myRole);
    default: return state;
  }
}

// ── Tic-Tac-Toe ──
function applyTTT(state, move, myRole) {
  if (state.turn !== myRole || state.ended) return state;
  const board = [...state.board];
  if (board[move] !== null) return state;
  board[move] = myRole === "inviter" ? "X" : "O";
  const winner = checkTTTWinner(board);
  const draw   = !winner && board.every(c => c !== null);
  return {
    ...state,
    board,
    turn:   myRole === "inviter" ? "joiner" : "inviter",
    winner: winner ? myRole : null,
    ended:  !!winner || draw,
    result: winner ? `${myRole} wins!` : draw ? "It's a draw!" : null,
  };
}

function checkTTTWinner(board) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

// ── Rock Paper Scissors ──
function applyRPS(state, move, myRole) {
  const choices = { ...state.choices, [myRole]: move };
  if (!choices.inviter || !choices.joiner) {
    return { ...state, choices };
  }
  // Both chose — resolve
  const result = getRPSResult(choices.inviter, choices.joiner);
  const scores = { ...state.scores };
  if (result === "inviter") scores.inviter++;
  if (result === "joiner")  scores.joiner++;

  const round = state.round + 1;
  const ended = round > state.maxRounds || scores.inviter >= 2 || scores.joiner >= 2;
  const winner = scores.inviter > scores.joiner ? "inviter" : scores.joiner > scores.inviter ? "joiner" : null;

  return {
    ...state,
    choices: {},
    scores,
    round,
    lastChoices: choices,
    lastResult: result,
    ended,
    result: ended ? (winner ? `${winner} wins!` : "Draw!") : null,
  };
}

function getRPSResult(a, b) {
  if (a === b) return "draw";
  if ((a === "rock" && b === "scissors") || (a === "scissors" && b === "paper") || (a === "paper" && b === "rock")) return "inviter";
  return "joiner";
}

// ── Word Guess ──
const WORD_LIST = ["CRANE","SLATE","AUDIO","STARE","RAISE","FLUTE","GHOST","PLANT","SWORD","BRAVE","CHESS","DRINK","FLAME","GLOBE","HAPPY","IVORY","JUMPY","KNEEL","LEMON","MAGIC","NOVEL","OCHRE","PEARL","QUICK","RISKY","SNOWY","TOXIC","ULTRA","VIVID","WALTZ"];

function pickWord() {
  return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
}

function applyWordGuess(state, move, myRole) {
  // Only guesser can submit guesses
  if (myRole !== state.guesserRole) return state;
  if (state.ended) return state;

  const guess = move.toUpperCase();
  if (guess.length !== 5) return state;

  const guesses = [...state.guesses, guess];
  const won     = guess === state.word;
  const ended   = won || guesses.length >= state.maxGuesses;

  return {
    ...state,
    guesses,
    ended,
    result: won ? `${myRole} guessed it!` : ended ? `The word was ${state.word}` : null,
  };
}

// ── Connect Four ──
function applyC4(state, move, myRole) {
  if (state.turn !== myRole || state.ended) return state;
  const col   = move;
  const board = state.board.map(r => [...r]);
  // Find lowest empty row in column
  let row = -1;
  for (let r = 5; r >= 0; r--) {
    if (!board[r][col]) { row = r; break; }
  }
  if (row === -1) return state; // column full
  board[row][col] = myRole === "inviter" ? "R" : "Y";
  const winner = checkC4Winner(board);
  const draw   = !winner && board[0].every(c => c !== null);
  return {
    ...state,
    board,
    turn:   myRole === "inviter" ? "joiner" : "inviter",
    winner: winner ? myRole : null,
    ended:  !!winner || draw,
    result: winner ? `${myRole} wins!` : draw ? "Draw!" : null,
  };
}

function checkC4Winner(board) {
  const rows = 6, cols = 7;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = board[r][c];
      if (!cell) continue;
      for (const [dr,dc] of dirs) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
          const nr = r + dr*i, nc = c + dc*i;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr][nc] !== cell) break;
          count++;
        }
        if (count >= 4) return cell;
      }
    }
  }
  return null;
}