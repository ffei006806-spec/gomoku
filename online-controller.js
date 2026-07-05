/**
 * Gomoku v3.0.12 small online UI helpers.
 */
(function createGomokuOnlineController(global) {
  "use strict";

  const ROOM_CODE_PATTERN = /^[A-Z0-9]{5,8}$/;

  function normalizeRoomCode(value) {
    return String(value || "").trim().toUpperCase();
  }

  function isValidRoomCode(value) {
    return ROOM_CODE_PATTERN.test(normalizeRoomCode(value));
  }

  function setBusy(elements, isBusy) {
    for (let index = 0; index < elements.length; index += 1) {
      if (elements[index]) {
        elements[index].disabled = isBusy;
      }
    }
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    return false;
  }

  global.GomokuOnlineController = Object.freeze({
    normalizeRoomCode,
    isValidRoomCode,
    setBusy,
    copyText,
  });
}(window));
