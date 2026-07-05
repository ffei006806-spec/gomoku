/**
 * Gomoku v3.0.12 online room manager.
 */
(function createGomokuRoomManager(global) {
  "use strict";

  const STORAGE_KEYS = Object.freeze({
    CLIENT_ID: "gomokuClientId",
    ROOM_ID: "gomokuOnlineRoomId",
    ROLE: "gomokuOnlineRole",
    JOINED_AT: "gomokuOnlineJoinedAt",
  });
  const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const ROOM_CODE_LENGTH = 5;
  const MAX_CREATE_ATTEMPTS = 10;

  function getService() {
    if (!global.GomokuOnlineService) {
      throw new Error("Online service is not loaded.");
    }

    return global.GomokuOnlineService;
  }

  function getClientId() {
    const existingClientId = localStorage.getItem(STORAGE_KEYS.CLIENT_ID);

    if (existingClientId) {
      return existingClientId;
    }

    const clientId = crypto.randomUUID ? crypto.randomUUID() : createFallbackClientId();
    localStorage.setItem(STORAGE_KEYS.CLIENT_ID, clientId);
    return clientId;
  }

  function createFallbackClientId() {
    return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function getSession() {
    const roomId = localStorage.getItem(STORAGE_KEYS.ROOM_ID);
    const role = localStorage.getItem(STORAGE_KEYS.ROLE);

    if (!roomId || !role) {
      return null;
    }

    return {
      roomId,
      role,
      clientId: getClientId(),
      joinedAt: localStorage.getItem(STORAGE_KEYS.JOINED_AT),
    };
  }

  function saveSession(roomId, role) {
    localStorage.setItem(STORAGE_KEYS.ROOM_ID, roomId);
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
    localStorage.setItem(STORAGE_KEYS.JOINED_AT, String(Date.now()));
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.ROOM_ID);
    localStorage.removeItem(STORAGE_KEYS.ROLE);
    localStorage.removeItem(STORAGE_KEYS.JOINED_AT);
  }

  function generateRoomId() {
    let roomId = "";

    for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
      roomId += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
    }

    return roomId;
  }

  async function createRoom() {
    const service = getService();
    const clientId = getClientId();

    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
      const roomId = generateRoomId();
      const room = await service.createRoom(roomId, clientId);

      if (room) {
        saveSession(roomId, service.PLAYERS.BLACK);
        return {
          room,
          roomId,
          role: service.PLAYERS.BLACK,
          clientId,
        };
      }
    }

    throw new Error("Could not create a unique room. Please try again.");
  }

  async function joinRoom(roomCode) {
    const service = getService();
    const clientId = getClientId();
    const roomId = service.normalizeRoomId(roomCode);

    console.log("[Gomoku Online] Join Room raw input room code:", roomCode);
    console.log("[Gomoku Online] Join Room normalized room code:", roomId);

    const room = await service.joinRoom(roomId, clientId, roomCode);
    const role = service.getRoleForClient(room, clientId);
    const databaseRoomId = service.normalizeRoomId(room.databaseRoomId || room.roomId || roomId);

    if (!role) {
      throw new Error("Could not join this room.");
    }

    saveSession(databaseRoomId, role);
    return {
      room,
      roomId: databaseRoomId,
      role,
      clientId,
    };
  }

  async function reconnectSession() {
    const session = getSession();

    if (!session) {
      return null;
    }

    const room = await getService().reconnectRoom(session.roomId, session.role, session.clientId);

    return {
      ...session,
      room,
    };
  }

  async function leaveSession(session) {
    if (!session) {
      clearSession();
      return null;
    }

    const room = await getService().leaveRoom(session.roomId, session.role, session.clientId);
    clearSession();
    return room;
  }

  function watchRoom(roomId, onRoom, onError) {
    return getService().watchRoom(roomId, onRoom, onError);
  }

  function placeMove(session, row, col) {
    return getService().placeMove(session.roomId, session.role, session.clientId, row, col);
  }

  function voteRestart(session) {
    return getService().voteRestart(session.roomId, session.role, session.clientId);
  }

  global.GomokuRoomManager = Object.freeze({
    getClientId,
    getSession,
    clearSession,
    createRoom,
    joinRoom,
    reconnectSession,
    leaveSession,
    watchRoom,
    placeMove,
    voteRestart,
  });
}(window));
