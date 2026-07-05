/**
 * Gomoku v3.0.9 Firebase Realtime Database service.
 */
(function createGomokuOnlineService(global) {
  "use strict";

  const BOARD_SIZE = 15;
  const WIN_LENGTH = 5;
  const EMPTY_CELL = null;
  const ROOM_ID_PATTERN = /^[A-Z0-9]{5,8}$/;
  const PLAYERS = Object.freeze({
    BLACK: "black",
    WHITE: "white",
  });
  const ROOM_STATUS = Object.freeze({
    WAITING: "waiting",
    PLAYING: "playing",
    FINISHED: "finished",
    ABANDONED: "abandoned",
  });
  const DIRECTIONS = Object.freeze([
    Object.freeze({ row: 0, col: 1 }),
    Object.freeze({ row: 1, col: 0 }),
    Object.freeze({ row: 1, col: 1 }),
    Object.freeze({ row: 1, col: -1 }),
  ]);

  function getDatabase() {
    if (!global.GomokuFirebase) {
      throw new Error("Firebase config is not loaded.");
    }

    const database = global.GomokuFirebase.getDatabase();

    if (!database) {
      throw new Error("Firebase SDK is not available.");
    }

    return database;
  }

  function timestamp() {
    return global.GomokuFirebase.serverTimestamp();
  }

  function createEmptyBoard() {
    const board = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      board.push(Array(BOARD_SIZE).fill(EMPTY_CELL));
    }

    return board;
  }

  function createRoomPayload(roomId, clientId) {
    const now = timestamp();

    return {
      roomId,
      status: ROOM_STATUS.WAITING,
      players: {
        black: createPlayerPayload(clientId, PLAYERS.BLACK, now),
        white: null,
      },
      board: createEmptyBoard(),
      currentPlayer: PLAYERS.BLACK,
      moveHistory: [],
      lastMove: null,
      winner: null,
      restartVotes: {
        black: false,
        white: false,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  function createPlayerPayload(clientId, role, now) {
    return {
      clientId,
      role,
      joinedAt: now,
      online: true,
      lastSeen: now,
    };
  }

  function normalizeRoomId(roomId) {
    return String(roomId || "").replace(/\s+/g, "").toUpperCase();
  }

  function assertRoomId(roomId) {
    if (!ROOM_ID_PATTERN.test(roomId)) {
      throw new Error("Room code must be 5-8 uppercase letters or numbers.");
    }
  }

  function getRoomRef(roomId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    assertRoomId(normalizedRoomId);
    return getDatabase().ref(getRoomPath(normalizedRoomId));
  }

  function getRoomPath(roomId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    assertRoomId(normalizedRoomId);
    return `rooms/${normalizedRoomId}`;
  }

  async function createRoom(roomId, clientId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    assertRoomId(normalizedRoomId);

    const result = await getRoomRef(normalizedRoomId).transaction((currentRoom) => {
      if (currentRoom) {
        return;
      }

      return createRoomPayload(normalizedRoomId, clientId);
    });

    if (!result.committed) {
      return null;
    }

    await connectPresence(normalizedRoomId, PLAYERS.BLACK, clientId);

    return result.snapshot.val();
  }

  function getRoomCandidateCodes(childSnapshot) {
    const value = childSnapshot.val() || {};

    return [
      childSnapshot.key,
      value.roomId,
      value.roomCode,
      value.code,
      value.id,
    ].filter(Boolean).map(normalizeRoomId);
  }

  function describeRoomCandidates(roomsSnapshot) {
    const candidates = [];

    if (!roomsSnapshot || !roomsSnapshot.exists()) {
      return "none";
    }

    roomsSnapshot.forEach((childSnapshot) => {
      const value = childSnapshot.val() || {};
      const label = value.roomId || value.roomCode || value.code || childSnapshot.key;

      if (label) {
        candidates.push(`${childSnapshot.key}:${label}`);
      }

      return candidates.length >= 12;
    });

    return candidates.length ? candidates.join(", ") : "none";
  }

  async function locateRoom(normalizedRoomId) {
    const database = getDatabase();
    const directPath = getRoomPath(normalizedRoomId);
    const directRef = database.ref(directPath);
    const directSnapshot = await directRef.once("value");

    if (directSnapshot.exists()) {
      return {
        ref: directRef,
        path: directPath,
        snapshot: directSnapshot,
        roomId: normalizedRoomId,
        candidates: "direct match",
      };
    }

    const roomsSnapshot = await database.ref("rooms").once("value");

    if (roomsSnapshot.exists()) {
      let matchedKey = "";

      roomsSnapshot.forEach((childSnapshot) => {
        const candidateCodes = getRoomCandidateCodes(childSnapshot);

        if (!matchedKey && candidateCodes.includes(normalizedRoomId)) {
          matchedKey = childSnapshot.key;
        }

        return Boolean(matchedKey);
      });

      if (matchedKey) {
        const matchedPath = `rooms/${matchedKey}`;
        const matchedRef = database.ref(matchedPath);
        const matchedSnapshot = await matchedRef.once("value");
        return {
          ref: matchedRef,
          path: matchedPath,
          snapshot: matchedSnapshot,
          roomId: matchedKey,
          candidates: describeRoomCandidates(roomsSnapshot),
        };
      }
    }

    return {
      ref: directRef,
      path: directPath,
      snapshot: directSnapshot,
      roomId: normalizedRoomId,
      candidates: describeRoomCandidates(roomsSnapshot),
    };
  }

  async function joinRoom(roomId, clientId, rawRoomId = roomId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const now = timestamp();
    let joinError = "";

    assertRoomId(normalizedRoomId);

    console.log("[Gomoku Online] Join Room raw input room code:", rawRoomId);
    console.log("[Gomoku Online] Join Room normalized room code:", normalizedRoomId);

    let locatedRoom;

    try {
      locatedRoom = await locateRoom(normalizedRoomId);
      console.log("[Gomoku Online] Join Room Firebase room path:", locatedRoom.path);
      console.log("[Gomoku Online] Join Room snapshot.exists():", locatedRoom.snapshot.exists());
      console.log("[Gomoku Online] Join Room snapshot.val():", locatedRoom.snapshot.val());
      console.log("[Gomoku Online] Join Room available candidates:", locatedRoom.candidates);
    } catch (error) {
      console.error("[Gomoku Online] Join Room Firebase error:", {
        code: error && error.code,
        message: error && error.message,
      });

      if (isPermissionDenied(error)) {
        throw new Error("Permission denied. Please check Firebase rules.");
      }

      throw error;
    }

    if (!locatedRoom.snapshot.exists()) {
      throw new Error(`Room not found. Checked Firebase path: ${locatedRoom.path}. Available rooms seen by this browser: ${locatedRoom.candidates}`);
    }

    const roomRef = locatedRoom.ref;
    const initialRoom = locatedRoom.snapshot.val();
    const initialBlack = initialRoom.players && initialRoom.players.black;
    const initialWhite = initialRoom.players && initialRoom.players.white;

    if (initialBlack && initialBlack.clientId === clientId || initialWhite && initialWhite.clientId === clientId) {
      initialRoom.databaseRoomId = locatedRoom.roomId;
      return initialRoom;
    }

    if (initialRoom.status !== ROOM_STATUS.WAITING || initialWhite) {
      throw new Error("Room is not available.");
    }

    let room;

    try {
      // Avoid a false "Room not found" caused by Firebase transaction's first
      // local callback receiving null before the server value is loaded.
      const latestSnapshot = await roomRef.once("value");

      if (!latestSnapshot.exists()) {
        throw new Error(`Room not found. Checked Firebase path: ${locatedRoom.path}.`);
      }

      const latestRoom = latestSnapshot.val();
      const latestBlack = latestRoom.players && latestRoom.players.black;
      const latestWhite = latestRoom.players && latestRoom.players.white;

      if (latestBlack && latestBlack.clientId === clientId || latestWhite && latestWhite.clientId === clientId) {
        room = latestRoom;
      } else {
        if (latestRoom.status !== ROOM_STATUS.WAITING || latestWhite) {
          throw new Error("Room is not available.");
        }

        await roomRef.update({
          "players/white": createPlayerPayload(clientId, PLAYERS.WHITE, now),
          status: ROOM_STATUS.PLAYING,
          updatedAt: now,
        });

        const joinedSnapshot = await roomRef.once("value");
        room = joinedSnapshot.val();
      }
    } catch (error) {
      console.error("[Gomoku Online] Join Room Firebase error:", {
        code: error && error.code,
        message: error && error.message,
      });

      if (isPermissionDenied(error)) {
        throw new Error("Permission denied. Please check Firebase rules.");
      }

      throw error;
    }

    const role = getRoleForClient(room, clientId);

    if (!role) {
      throw new Error(joinError || "Could not claim a player slot.");
    }

    room.databaseRoomId = locatedRoom.roomId;
    await connectPresence(locatedRoom.roomId, role, clientId);

    return room;
  }

  function isPermissionDenied(error) {
    const code = String(error && error.code || "").toLowerCase();
    const message = String(error && error.message || "").toLowerCase();

    return code === "permission_denied" || code === "permission-denied" || message.includes("permission_denied") || message.includes("permission denied");
  }

  async function reconnectRoom(roomId, role, clientId) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const normalizedRole = normalizeRole(role);
    const now = timestamp();
    let reconnectError = "";

    assertRoomId(normalizedRoomId);

    const result = await getRoomRef(normalizedRoomId).transaction((room) => {
      if (!room) {
        reconnectError = "Room no longer exists.";
        return;
      }

      const player = room.players && room.players[normalizedRole];

      if (!player || player.clientId !== clientId) {
        reconnectError = "This browser no longer owns that room slot.";
        return;
      }

      player.online = true;
      player.lastSeen = now;
      room.updatedAt = now;
      return room;
    });

    if (!result.committed) {
      throw new Error(reconnectError || "Could not reconnect to room.");
    }

    await connectPresence(normalizedRoomId, normalizedRole, clientId);

    return result.snapshot.val();
  }

  async function connectPresence(roomId, role, clientId) {
    const normalizedRole = normalizeRole(role);
    const playerRef = getRoomRef(roomId).child(`players/${normalizedRole}`);

    await playerRef.update({
      online: true,
      lastSeen: timestamp(),
      clientId,
      role: normalizedRole,
    });

    await playerRef.onDisconnect().update({
      online: false,
      lastSeen: timestamp(),
    });
  }

  async function leaveRoom(roomId, role, clientId) {
    const normalizedRole = normalizeRole(role);
    const now = timestamp();

    const result = await getRoomRef(roomId).transaction((room) => {
      if (!room) {
        return room;
      }

      const player = room.players && room.players[normalizedRole];

      if (!player || player.clientId !== clientId) {
        return room;
      }

      player.online = false;
      player.lastSeen = now;
      room.status = ROOM_STATUS.ABANDONED;
      room.updatedAt = now;
      return room;
    });

    await getRoomRef(roomId).child(`players/${normalizedRole}`).onDisconnect().cancel();

    return result.snapshot.val();
  }

  function watchRoom(roomId, onRoom, onError) {
    const roomRef = getRoomRef(roomId);
    const handleValue = (snapshot) => onRoom(snapshot.val());
    const handleError = (error) => {
      if (typeof onError === "function") {
        onError(error);
      }
    };

    roomRef.on("value", handleValue, handleError);

    return () => roomRef.off("value", handleValue);
  }

  async function placeMove(roomId, role, clientId, row, col) {
    const normalizedRole = normalizeRole(role);
    const moveRow = Number(row);
    const moveCol = Number(col);
    const now = timestamp();

    // Firebase transaction() may call the update function once with a local
    // null value before the server value is available. If we treat that null as
    // "room not found", valid online moves are rejected. For this browser game,
    // use an explicit server read followed by a validated update instead.
    const roomRef = getRoomRef(roomId);
    let snapshot;

    try {
      snapshot = await roomRef.once("value");
    } catch (error) {
      if (isPermissionDenied(error)) {
        throw new Error("Permission denied. Please check Firebase rules.");
      }

      throw error;
    }

    if (!snapshot.exists()) {
      throw new Error("Room not found.");
    }

    const room = snapshot.val();

    if (room.status !== ROOM_STATUS.PLAYING) {
      throw new Error("Room is not playing.");
    }

    if (room.currentPlayer !== normalizedRole) {
      throw new Error("It is not your turn.");
    }

    const player = room.players && room.players[normalizedRole];

    if (!player || player.clientId !== clientId) {
      throw new Error("Player identity does not match this room.");
    }

    if (!isInsideBoard(moveRow, moveCol)) {
      throw new Error("Move is outside the board.");
    }

    const board = normalizeBoard(room.board);

    if (board[moveRow][moveCol] !== EMPTY_CELL) {
      throw new Error("That point is already occupied.");
    }

    const moveHistory = normalizeMoveHistory(room.moveHistory);
    const move = {
      row: moveRow,
      col: moveCol,
      player: normalizedRole,
      moveNumber: moveHistory.length + 1,
      clientId,
      createdAt: now,
    };

    board[moveRow][moveCol] = normalizedRole;
    moveHistory.push(move);

    const winner = getWinnerForMove(board, moveRow, moveCol, normalizedRole, moveHistory.length);
    const nextPlayer = winner ? normalizedRole : getNextPlayer(normalizedRole);
    const nextStatus = winner ? ROOM_STATUS.FINISHED : ROOM_STATUS.PLAYING;

    try {
      await roomRef.update({
        board,
        moveHistory,
        lastMove: {
          row: move.row,
          col: move.col,
          player: move.player,
        },
        winner,
        status: nextStatus,
        currentPlayer: nextPlayer,
        restartVotes: {
          black: false,
          white: false,
        },
        updatedAt: now,
      });

      const updatedSnapshot = await roomRef.once("value");
      return updatedSnapshot.val();
    } catch (error) {
      if (isPermissionDenied(error)) {
        throw new Error("Permission denied. Please check Firebase rules.");
      }

      throw error;
    }
  }

  async function voteRestart(roomId, role, clientId) {
    const normalizedRole = normalizeRole(role);
    const now = timestamp();
    let voteError = "";

    const result = await getRoomRef(roomId).transaction((room) => {
      if (!room) {
        voteError = "Room not found.";
        return;
      }

      if (room.status === ROOM_STATUS.ABANDONED || room.status === ROOM_STATUS.WAITING) {
        voteError = "Restart is not available for this room.";
        return;
      }

      const player = room.players && room.players[normalizedRole];

      if (!player || player.clientId !== clientId) {
        voteError = "Player identity does not match this room.";
        return;
      }

      room.restartVotes = room.restartVotes || {};
      room.restartVotes[normalizedRole] = true;

      if (room.restartVotes.black && room.restartVotes.white) {
        room.board = createEmptyBoard();
        room.currentPlayer = PLAYERS.BLACK;
        room.moveHistory = [];
        room.lastMove = null;
        room.winner = null;
        room.status = ROOM_STATUS.PLAYING;
        room.restartVotes = {
          black: false,
          white: false,
        };
      }

      room.updatedAt = now;
      return room;
    });

    if (!result.committed) {
      throw new Error(voteError || "Restart vote was not accepted.");
    }

    return result.snapshot.val();
  }

  function normalizeRole(role) {
    if (role !== PLAYERS.BLACK && role !== PLAYERS.WHITE) {
      throw new Error("Invalid player role.");
    }

    return role;
  }

  function getRoleForClient(room, clientId) {
    if (!room || !room.players) {
      return null;
    }

    if (room.players.black && room.players.black.clientId === clientId) {
      return PLAYERS.BLACK;
    }

    if (room.players.white && room.players.white.clientId === clientId) {
      return PLAYERS.WHITE;
    }

    return null;
  }

  function normalizeBoard(board) {
    const normalizedBoard = createEmptyBoard();

    if (!board || typeof board !== "object") {
      return normalizedBoard;
    }

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      const sourceRow = board[row] || board[String(row)];

      if (!sourceRow || typeof sourceRow !== "object") {
        continue;
      }

      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const value = sourceRow[col] ?? sourceRow[String(col)];
        normalizedBoard[row][col] = value === PLAYERS.BLACK || value === PLAYERS.WHITE
          ? value
          : EMPTY_CELL;
      }
    }

    return normalizedBoard;
  }

  function normalizeMoveHistory(moveHistory) {
    if (Array.isArray(moveHistory)) {
      return moveHistory.filter(Boolean);
    }

    if (moveHistory && typeof moveHistory === "object") {
      return Object.keys(moveHistory)
        .sort((first, second) => Number(first) - Number(second))
        .map((key) => moveHistory[key])
        .filter(Boolean);
    }

    return [];
  }

  function getWinnerForMove(board, row, col, player, moveCount) {
    if (hasFiveInRowOnBoard(board, row, col, player)) {
      return player;
    }

    if (moveCount >= BOARD_SIZE * BOARD_SIZE) {
      return "draw";
    }

    return null;
  }

  function hasFiveInRowOnBoard(board, row, col, player) {
    for (let index = 0; index < DIRECTIONS.length; index += 1) {
      const direction = DIRECTIONS[index];
      const total =
        1 +
        countContinuousStones(board, row, col, direction.row, direction.col, player) +
        countContinuousStones(board, row, col, -direction.row, -direction.col, player);

      if (total >= WIN_LENGTH) {
        return true;
      }
    }

    return false;
  }

  function countContinuousStones(board, row, col, rowStep, colStep, player) {
    let count = 0;
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol) && board[nextRow][nextCol] === player) {
      count += 1;
      nextRow += rowStep;
      nextCol += colStep;
    }

    return count;
  }

  function isInsideBoard(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function getNextPlayer(player) {
    return player === PLAYERS.BLACK ? PLAYERS.WHITE : PLAYERS.BLACK;
  }

  global.GomokuOnlineService = Object.freeze({
    ROOM_ID_PATTERN,
    ROOM_STATUS,
    PLAYERS,
    createEmptyBoard,
    normalizeRoomId,
    normalizeBoard,
    normalizeMoveHistory,
    createRoom,
    joinRoom,
    reconnectRoom,
    leaveRoom,
    watchRoom,
    placeMove,
    voteRestart,
    getRoleForClient,
  });
}(window));
