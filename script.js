/**
 * Gomoku v2.1.1.
 * 使用原生 JavaScript 管理页面导航、对局状态、弹窗、计时和音效。
 */
(function bootstrapGomokuApp() {
  "use strict";

  const BOARD_SIZE = 15;
  const WIN_LENGTH = 5;
  const EMPTY_CELL = null;
  const MODAL_TRANSITION_MS = 190;
  const COORDINATE_LABELS = Object.freeze("ABCDEFGHIJKLMNO".split(""));

  const PLAYERS = Object.freeze({
    BLACK: "black",
    WHITE: "white",
  });

  const GAME_MODES = Object.freeze({
    LOCAL: "local",
    AI: "ai",
  });

  const AI_CONFIG = Object.freeze({
    minDelayMs: 300,
    maxDelayMs: 600,
    player: "white",
    human: "black",
  });

  const PLAYER_META = Object.freeze({
    black: {
      name: "黑棋",
      stoneClass: "is-black",
      turnText: "黑棋",
      winText: "黑棋获胜",
    },
    white: {
      name: "白棋",
      stoneClass: "is-white",
      turnText: "白棋",
      winText: "白棋获胜",
    },
  });

  const DIRECTIONS = Object.freeze([
    Object.freeze({ row: 0, col: 1 }),
    Object.freeze({ row: 1, col: 0 }),
    Object.freeze({ row: 1, col: 1 }),
    Object.freeze({ row: 1, col: -1 }),
  ]);

  const STAR_POINTS = Object.freeze([
    Object.freeze({ row: 3, col: 3 }),
    Object.freeze({ row: 3, col: 11 }),
    Object.freeze({ row: 7, col: 7 }),
    Object.freeze({ row: 11, col: 3 }),
    Object.freeze({ row: 11, col: 11 }),
  ]);

  const MODAL_TYPES = Object.freeze({
    ABOUT: "about",
    INFO: "info",
    CONFIRM: "confirm",
    RESULT: "result",
    RULES: "rules",
  });

  const EXTENSION_POINTS = Object.freeze({
    v2: Object.freeze({
      recordStorage: null,
      advancedMoveAnimation: null,
      strongerAiEngine: null,
    }),
    v3: Object.freeze({
      difficultyStrategy: null,
    }),
    v4: Object.freeze({
      onlineMatchClient: null,
      roomService: null,
      leaderboardService: null,
    }),
  });

  const elements = {};
  const scoreState = {
    black: 0,
    white: 0,
  };
  const audioState = {
    enabled: true,
    context: null,
  };

  let gameState = createInitialGameState();
  let activeScreen = "home";
  let modalCloseTimer = 0;
  let aiMoveTimer = 0;
  let timerId = 0;
  let clockStartedAt = 0;

  window.GomokuExtensionPoints = EXTENSION_POINTS;

  document.addEventListener("DOMContentLoaded", init);

  /**
   * 初始化页面节点、棋盘和事件。
   */
  function init() {
    cacheDomElements();
    createBoardLines();
    createStarPoints();
    createBoardCells();
    bindEvents();
    renderGame();
    showScreen("home");
  }

  /**
   * 缓存页面中会被频繁访问的 DOM 元素。
   */
  function cacheDomElements() {
    elements.homeScreen = document.getElementById("homeScreen");
    elements.gameScreen = document.getElementById("gameScreen");
    elements.localGameButton = document.getElementById("localGameButton");
    elements.aiGameButton = document.getElementById("aiGameButton");
    elements.rulesButton = document.getElementById("rulesButton");
    elements.aboutButton = document.getElementById("aboutButton");
    elements.homeButton = document.getElementById("homeButton");
    elements.modeLabel = document.getElementById("modeLabel");
    elements.soundToggleButton = document.getElementById("soundToggleButton");
    elements.board = document.getElementById("board");
    elements.boardLines = elements.board.querySelector(".board-lines");
    elements.starPoints = document.getElementById("starPoints");
    elements.intersections = document.getElementById("intersections");
    elements.turnCard = document.getElementById("turnCard");
    elements.turnStone = document.getElementById("turnStone");
    elements.turnText = document.getElementById("turnText");
    elements.gameStatus = document.getElementById("gameStatus");
    elements.blackWins = document.getElementById("blackWins");
    elements.whiteWins = document.getElementById("whiteWins");
    elements.moveCount = document.getElementById("moveCount");
    elements.sideMoveCount = document.getElementById("sideMoveCount");
    elements.timerText = document.getElementById("timerText");
    elements.sideTimerText = document.getElementById("sideTimerText");
    elements.lastMove = document.getElementById("lastMove");
    elements.undoButton = document.getElementById("undoButton");
    elements.resetButton = document.getElementById("resetButton");
    elements.modal = document.getElementById("appModal");
    elements.modalKicker = document.getElementById("modalKicker");
    elements.modalTitle = document.getElementById("modalTitle");
    elements.modalBody = document.getElementById("modalBody");
    elements.modalActions = document.getElementById("modalActions");
  }

  /**
   * 创建 15 条横线和 15 条竖线，线条坐标与交叉点坐标完全一致。
   */
  function createBoardLines() {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < BOARD_SIZE; index += 1) {
      const verticalLine = document.createElement("span");
      const horizontalLine = document.createElement("span");

      verticalLine.className = "grid-line is-vertical";
      horizontalLine.className = "grid-line is-horizontal";
      verticalLine.style.setProperty("--x", formatIntersectionPercent(index));
      horizontalLine.style.setProperty("--y", formatIntersectionPercent(index));
      fragment.appendChild(verticalLine);
      fragment.appendChild(horizontalLine);
    }

    elements.boardLines.appendChild(fragment);
  }

  /**
   * 创建棋盘上的五个星位。
   */
  function createStarPoints() {
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < STAR_POINTS.length; index += 1) {
      const point = STAR_POINTS[index];
      const star = document.createElement("span");
      star.className = "star-point";
      setIntersectionPosition(star, point.row, point.col);
      fragment.appendChild(star);
    }

    elements.starPoints.appendChild(fragment);
  }

  /**
   * 创建 15×15 棋盘交点按钮。
   */
  function createBoardCells() {
    const fragment = document.createDocumentFragment();

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        const cell = document.createElement("button");
        const stone = document.createElement("span");

        cell.type = "button";
        cell.className = "cell is-empty";
        cell.dataset.row = String(row);
        cell.dataset.col = String(col);
        setIntersectionPosition(cell, row, col);
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", `${formatMove(row, col)} 空位`);

        stone.className = "stone";
        stone.setAttribute("aria-hidden", "true");
        cell.appendChild(stone);
        fragment.appendChild(cell);
      }
    }

    elements.intersections.appendChild(fragment);
  }

  /**
   * 将棋盘 DOM 元素定位到指定交叉点。
   * @param {HTMLElement} element 需要定位的元素。
   * @param {number} row 行索引，范围 0-14。
   * @param {number} col 列索引，范围 0-14。
   */
  function setIntersectionPosition(element, row, col) {
    element.style.setProperty("--x", formatIntersectionPercent(col));
    element.style.setProperty("--y", formatIntersectionPercent(row));
  }

  /**
   * 将 0-14 的交叉点索引转换为棋盘坐标百分比。
   * @param {number} index 交叉点索引。
   * @returns {string} 百分比坐标。
   */
  function formatIntersectionPercent(index) {
    return `${(index / (BOARD_SIZE - 1)) * 100}%`;
  }

  /**
   * 绑定所有用户交互事件。
   */
  function bindEvents() {
    elements.localGameButton.addEventListener("click", handleStartLocalGame);
    elements.aiGameButton.addEventListener("click", handleStartAiGame);
    elements.rulesButton.addEventListener("click", showRulesModal);
    elements.aboutButton.addEventListener("click", showAboutModal);
    elements.homeButton.addEventListener("click", handleHomeRequest);
    elements.soundToggleButton.addEventListener("click", toggleSound);
    elements.board.addEventListener("click", handleBoardClick);
    elements.board.addEventListener("contextmenu", preventBoardContextMenu);
    elements.undoButton.addEventListener("click", undoMove);
    elements.resetButton.addEventListener("click", requestRestart);
    elements.modal.addEventListener("click", handleModalBackdropClick);
    window.addEventListener("keydown", handleWindowKeydown);
  }

  /**
   * 创建新对局状态。
   * @returns {object} 对局状态。
   */
  function createInitialGameState(mode = GAME_MODES.LOCAL) {
    return {
      board: createEmptyBoard(),
      mode,
      currentPlayer: PLAYERS.BLACK,
      lastMove: null,
      moveHistory: [],
      moveCount: 0,
      elapsedSeconds: 0,
      winner: null,
      isDraw: false,
      isGameOver: false,
      isAiThinking: false,
    };
  }

  /**
   * 创建空棋盘矩阵。
   * @returns {Array<Array<null|string>>} 棋盘数据。
   */
  function createEmptyBoard() {
    const board = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      board.push(Array(BOARD_SIZE).fill(EMPTY_CELL));
    }

    return board;
  }

  /**
   * 首页开始按钮入口。
   */
  function handleStartLocalGame() {
    initializeAudioContext();
    startNewMatch(GAME_MODES.LOCAL);
    showScreen("game");
  }

  /**
   * 首页 AI 对战入口，玩家执黑，AI 执白。
   */
  function handleStartAiGame() {
    initializeAudioContext();
    startNewMatch(GAME_MODES.AI);
    showScreen("game");
  }

  /**
   * 处理返回首页请求，避免误丢正在进行的对局。
   */
  function handleHomeRequest() {
    if (hasActiveMatch()) {
      openModal({
        type: MODAL_TYPES.CONFIRM,
        kicker: "返回首页",
        title: "离开当前对局？",
        body: ["当前棋局尚未结束，返回首页会结束本局。"],
        actions: [
          { label: "继续对局", style: "secondary", handler: closeModal },
          { label: "返回首页", style: "primary", handler: confirmGoHome },
        ],
      });
      return;
    }

    confirmGoHome();
  }

  /**
   * 确认回到首页并停止计时。
   */
  function confirmGoHome() {
    cancelAiMove();
    stopTimer();
    closeModal();
    showScreen("home");
  }

  /**
   * 切换当前显示的页面。
   * @param {string} screenName 页面名称。
   */
  function showScreen(screenName) {
    activeScreen = screenName;
    elements.homeScreen.hidden = screenName !== "home";
    elements.gameScreen.hidden = screenName !== "game";
    elements.homeScreen.classList.toggle("is-active", screenName === "home");
    elements.gameScreen.classList.toggle("is-active", screenName === "game");
  }

  /**
   * 开始一局新棋，并重置计时器。
   */
  function startNewMatch(mode = gameState.mode || GAME_MODES.LOCAL) {
    cancelAiMove();
    gameState = createInitialGameState(mode);
    closeModal();
    startTimer();
    renderGame();
  }

  /**
   * 判断当前是否有未结束的对局。
   * @returns {boolean} 是否存在进行中的棋局。
   */
  function hasActiveMatch() {
    return activeScreen === "game" && gameState.moveCount > 0 && !gameState.isGameOver;
  }

  /**
   * 处理玩家点击棋盘落子。
   * @param {MouseEvent} event 点击事件。
   */
  function handleBoardClick(event) {
    if (gameState.isGameOver || isHumanInputLocked()) {
      return;
    }

    const movePoint = getMovePointFromEvent(event);

    if (!movePoint || !isValidMove(movePoint.row, movePoint.col)) {
      return;
    }

    playMove(movePoint.row, movePoint.col);
  }

  /**
   * Resolve a board interaction to the nearest playable intersection.
   * @param {MouseEvent} event Board click event.
   * @returns {{row: number, col: number}|null} Board point or null.
   */
  function getMovePointFromEvent(event) {
    const pointFromPointer = getNearestIntersectionFromPointer(event);

    if (pointFromPointer) {
      return pointFromPointer;
    }

    const cell = event.target.closest(".cell");

    if (!cell) {
      return null;
    }

    return {
      row: Number(cell.dataset.row),
      col: Number(cell.dataset.col),
    };
  }

  /**
   * Convert a pointer position to the nearest 15 x 15 board coordinate.
   * @param {MouseEvent} event Board click event.
   * @returns {{row: number, col: number}|null} Nearest board point.
   */
  function getNearestIntersectionFromPointer(event) {
    if (typeof event.clientX !== "number" || typeof event.clientY !== "number") {
      return null;
    }

    if (event.clientX === 0 && event.clientY === 0) {
      return null;
    }

    const rect = elements.intersections.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const colRatio = (event.clientX - rect.left) / rect.width;
    const rowRatio = (event.clientY - rect.top) / rect.height;

    return {
      row: clampBoardIndex(Math.round(rowRatio * (BOARD_SIZE - 1))),
      col: clampBoardIndex(Math.round(colRatio * (BOARD_SIZE - 1))),
    };
  }

  /**
   * Clamp a board index into the valid 0-14 range.
   * @param {number} index Raw board index.
   * @returns {number} Valid board index.
   */
  function clampBoardIndex(index) {
    return Math.min(BOARD_SIZE - 1, Math.max(0, index));
  }

  /**
   * Prevent the native long-press menu while playing on touch devices.
   * @param {Event} event Context menu event.
   */
  function preventBoardContextMenu(event) {
    event.preventDefault();
  }

  /**
   * 判断当前位置能否落子。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {boolean} 是否合法。
   */
  function isValidMove(row, col) {
    return isInsideBoard(row, col) && gameState.board[row][col] === EMPTY_CELL;
  }

  /**
   * 执行落子、记录历史、判断胜负并切换回合。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   */
  function playMove(row, col) {
    const player = gameState.currentPlayer;
    const move = { row, col, player };

    gameState.board[row][col] = player;
    gameState.moveHistory.push(move);
    gameState.lastMove = move;
    gameState.moveCount += 1;
    playSound("place");

    if (hasFiveInRow(row, col, player)) {
      finishWithWinner(player);
      return;
    }

    if (gameState.moveCount === BOARD_SIZE * BOARD_SIZE) {
      finishWithDraw();
      return;
    }

    gameState.currentPlayer = getNextPlayer(player);
    renderGame();
    scheduleAiMoveIfNeeded();
  }

  /**
   * 悔棋一步，恢复到上一位玩家的回合。
   */
  function undoMove() {
    if (gameState.moveHistory.length === 0 || gameState.isGameOver) {
      return;
    }

    cancelAiMove();
    undoRecentMoves(getUndoStepCount());
    gameState.lastMove = gameState.moveHistory[gameState.moveHistory.length - 1] || null;
    gameState.currentPlayer = gameState.mode === GAME_MODES.AI ? PLAYERS.BLACK : getUndoTurnPlayer();
    gameState.isAiThinking = false;
    playSound("undo");
    renderGame();
  }

  /**
   * 根据当前模式获取悔棋步数。
   * @returns {number} 需要撤销的步数。
   */
  function getUndoStepCount() {
    if (gameState.mode !== GAME_MODES.AI) {
      return 1;
    }

    return Math.min(2, gameState.moveHistory.length);
  }

  /**
   * 从棋盘和历史中撤销最近若干步。
   * @param {number} stepCount 撤销步数。
   */
  function undoRecentMoves(stepCount) {
    for (let index = 0; index < stepCount; index += 1) {
      const move = gameState.moveHistory.pop();

      if (!move) {
        return;
      }

      gameState.board[move.row][move.col] = EMPTY_CELL;
      gameState.moveCount -= 1;
    }
  }

  /**
   * 本地双人悔棋后轮到被撤销的一方继续下。
   * @returns {string} 下一手玩家。
   */
  function getUndoTurnPlayer() {
    const lastMove = gameState.moveHistory[gameState.moveHistory.length - 1];
    return lastMove ? getNextPlayer(lastMove.player) : PLAYERS.BLACK;
  }

  /**
   * 判断当前是否应阻止人工点击棋盘。
   * @returns {boolean} 是否锁定人工输入。
   */
  function isHumanInputLocked() {
    return gameState.isAiThinking || (gameState.mode === GAME_MODES.AI && gameState.currentPlayer === AI_CONFIG.player);
  }

  /**
   * 如果当前是 AI 回合，延迟调度 AI 落子。
   */
  function scheduleAiMoveIfNeeded() {
    if (gameState.mode !== GAME_MODES.AI || gameState.currentPlayer !== AI_CONFIG.player || gameState.isGameOver) {
      return;
    }

    gameState.isAiThinking = true;
    renderGame();
    aiMoveTimer = window.setTimeout(playAiMove, getAiDelay());
  }

  /**
   * 清除待执行的 AI 落子。
   */
  function cancelAiMove() {
    if (aiMoveTimer) {
      window.clearTimeout(aiMoveTimer);
      aiMoveTimer = 0;
    }

    if (gameState) {
      gameState.isAiThinking = false;
    }
  }

  /**
   * 执行 AI 落子。
   */
  function playAiMove() {
    aiMoveTimer = 0;

    if (gameState.mode !== GAME_MODES.AI || gameState.currentPlayer !== AI_CONFIG.player || gameState.isGameOver) {
      gameState.isAiThinking = false;
      renderGame();
      return;
    }

    const move = chooseAiMove(gameState.board);
    gameState.isAiThinking = false;

    if (move) {
      playMove(move.row, move.col);
      return;
    }

    renderGame();
  }

  /**
   * 获取 AI 思考延迟。
   * @returns {number} 延迟毫秒数。
   */
  function getAiDelay() {
    const range = AI_CONFIG.maxDelayMs - AI_CONFIG.minDelayMs;
    return AI_CONFIG.minDelayMs + Math.round(Math.random() * range);
  }

  /**
   * AI Engine：根据当前棋盘选择白棋落点。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @returns {{row: number, col: number}|null} AI 落点。
   */
  function chooseAiMove(board) {
    const candidates = getCandidateMoves(board);

    if (candidates.length === 0) {
      return null;
    }

    const winningMove = findImmediateWinningMove(board, AI_CONFIG.player, candidates);

    if (winningMove) {
      return winningMove;
    }

    const blockingMove = findImmediateWinningMove(board, AI_CONFIG.human, candidates);

    if (blockingMove) {
      return blockingMove;
    }

    return candidates
      .map((move) => ({
        ...move,
        score: scoreAiMove(board, move.row, move.col),
      }))
      .sort(compareAiMoves)[0];
  }

  /**
   * 生成靠近已有棋子的候选落点，避免 AI 无意义地下到远处边角。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @returns {Array<{row: number, col: number}>} 候选落点。
   */
  function getCandidateMoves(board) {
    const candidates = [];
    const candidateKeys = new Set();
    const center = Math.floor(BOARD_SIZE / 2);

    if (isBoardEmpty(board)) {
      return [{ row: center, col: center }];
    }

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] !== EMPTY_CELL) {
          addNearbyCandidates(board, row, col, candidateKeys, candidates);
        }
      }
    }

    return candidates.length ? candidates : [{ row: center, col: center }];
  }

  /**
   * 添加某个已有棋子周围两格范围内的空位。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {number} originRow 原始行。
   * @param {number} originCol 原始列。
   * @param {Set<string>} candidateKeys 去重集合。
   * @param {Array<{row: number, col: number}>} candidates 候选数组。
   */
  function addNearbyCandidates(board, originRow, originCol, candidateKeys, candidates) {
    for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
      for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
        const row = originRow + rowOffset;
        const col = originCol + colOffset;
        const key = `${row}:${col}`;

        if (!isInsideBoard(row, col) || board[row][col] !== EMPTY_CELL || candidateKeys.has(key)) {
          continue;
        }

        candidateKeys.add(key);
        candidates.push({ row, col });
      }
    }
  }

  /**
   * 判断棋盘是否为空。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @returns {boolean} 是否没有任何棋子。
   */
  function isBoardEmpty(board) {
    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let col = 0; col < BOARD_SIZE; col += 1) {
        if (board[row][col] !== EMPTY_CELL) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 查找某一方的一步取胜落点。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {string} player 玩家。
   * @param {Array<{row: number, col: number}>} candidates 候选落点。
   * @returns {{row: number, col: number}|null} 取胜落点。
   */
  function findImmediateWinningMove(board, player, candidates) {
    for (let index = 0; index < candidates.length; index += 1) {
      const move = candidates[index];

      board[move.row][move.col] = player;

      if (hasFiveInRowOnBoard(board, move.row, move.col, player)) {
        board[move.row][move.col] = EMPTY_CELL;
        return move;
      }

      board[move.row][move.col] = EMPTY_CELL;
    }

    return null;
  }

  /**
   * 给 AI 候选点打分。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {number} 评分。
   */
  function scoreAiMove(board, row, col) {
    const aiScore = scoreMoveForPlayer(board, row, col, AI_CONFIG.player);
    const humanScore = scoreMoveForPlayer(board, row, col, AI_CONFIG.human);
    const centerScore = scoreCenterDistance(row, col);
    const neighborScore = scoreNeighborDensity(board, row, col);

    return aiScore * 1.12 + humanScore + centerScore + neighborScore;
  }

  /**
   * 对某个玩家在指定位置的连线潜力评分。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @param {string} player 玩家。
   * @returns {number} 评分。
   */
  function scoreMoveForPlayer(board, row, col, player) {
    let score = 0;

    board[row][col] = player;

    for (let index = 0; index < DIRECTIONS.length; index += 1) {
      const direction = DIRECTIONS[index];
      const pattern = analyzeLinePattern(board, row, col, direction.row, direction.col, player);
      score += scoreLinePattern(pattern);
    }

    board[row][col] = EMPTY_CELL;
    return score;
  }

  /**
   * 分析某方向的连续棋子与开放端。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @param {number} rowStep 行步长。
   * @param {number} colStep 列步长。
   * @param {string} player 玩家。
   * @returns {{count: number, openEnds: number}} 线形。
   */
  function analyzeLinePattern(board, row, col, rowStep, colStep, player) {
    const forward = countDirectionalPattern(board, row, col, rowStep, colStep, player);
    const backward = countDirectionalPattern(board, row, col, -rowStep, -colStep, player);

    return {
      count: 1 + forward.count + backward.count,
      openEnds: forward.isOpen + backward.isOpen,
    };
  }

  /**
   * 统计单方向连续棋子和末端是否开放。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @param {number} rowStep 行步长。
   * @param {number} colStep 列步长。
   * @param {string} player 玩家。
   * @returns {{count: number, isOpen: number}} 方向线形。
   */
  function countDirectionalPattern(board, row, col, rowStep, colStep, player) {
    let count = 0;
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol) && board[nextRow][nextCol] === player) {
      count += 1;
      nextRow += rowStep;
      nextCol += colStep;
    }

    return {
      count,
      isOpen: Number(isInsideBoard(nextRow, nextCol) && board[nextRow][nextCol] === EMPTY_CELL),
    };
  }

  /**
   * 根据线形返回战术分。
   * @param {{count: number, openEnds: number}} pattern 线形。
   * @returns {number} 评分。
   */
  function scoreLinePattern(pattern) {
    if (pattern.count >= 5) {
      return 1_000_000;
    }

    if (pattern.count === 4 && pattern.openEnds === 2) {
      return 140_000;
    }

    if (pattern.count === 4 && pattern.openEnds === 1) {
      return 70_000;
    }

    if (pattern.count === 3 && pattern.openEnds === 2) {
      return 16_000;
    }

    if (pattern.count === 3 && pattern.openEnds === 1) {
      return 4_000;
    }

    if (pattern.count === 2 && pattern.openEnds === 2) {
      return 900;
    }

    if (pattern.count === 2 && pattern.openEnds === 1) {
      return 240;
    }

    return pattern.openEnds === 2 ? 70 : 10;
  }

  /**
   * 中心区域加分，避免无意义边角落子。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {number} 中心分。
   */
  function scoreCenterDistance(row, col) {
    const center = (BOARD_SIZE - 1) / 2;
    const distance = Math.abs(row - center) + Math.abs(col - center);
    return Math.max(0, 32 - distance * 2);
  }

  /**
   * 周围已有棋子越多，候选点价值越高。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {number} 邻近分。
   */
  function scoreNeighborDensity(board, row, col) {
    let score = 0;

    for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
      for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
        const nextRow = row + rowOffset;
        const nextCol = col + colOffset;

        if (!isInsideBoard(nextRow, nextCol) || board[nextRow][nextCol] === EMPTY_CELL) {
          continue;
        }

        score += Math.max(1, 4 - Math.abs(rowOffset) - Math.abs(colOffset));
      }
    }

    return score * 6;
  }

  /**
   * 比较 AI 候选点，分数相同则更靠近中心者优先。
   * @param {object} first 第一个候选。
   * @param {object} second 第二个候选。
   * @returns {number} 排序结果。
   */
  function compareAiMoves(first, second) {
    if (second.score !== first.score) {
      return second.score - first.score;
    }

    return getCenterDistance(first.row, first.col) - getCenterDistance(second.row, second.col);
  }

  /**
   * 获取曼哈顿中心距离。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {number} 中心距离。
   */
  function getCenterDistance(row, col) {
    const center = (BOARD_SIZE - 1) / 2;
    return Math.abs(row - center) + Math.abs(col - center);
  }

  /**
   * 打开重新开始确认弹窗。
   */
  function requestRestart() {
    openModal({
      type: MODAL_TYPES.CONFIRM,
      kicker: "重新开始",
      title: "确认重新开始？",
      body: ["当前棋局会被清空，胜场统计将保留。"],
      actions: [
        { label: "取消", style: "secondary", handler: closeModal },
        { label: "重新开始", style: "primary", handler: restartCurrentMode },
      ],
    });
  }

  /**
   * 保留当前模式重新开始一局。
   */
  function restartCurrentMode() {
    startNewMatch(gameState.mode || GAME_MODES.LOCAL);
  }

  /**
   * 结束对局并记录胜场。
   * @param {string} player 获胜玩家。
   */
  function finishWithWinner(player) {
    gameState.winner = player;
    gameState.isGameOver = true;
    scoreState[player] += 1;
    refreshElapsedTime();
    stopTimer();
    renderGame();
    playSound("win");
    showWinnerModal(player);
  }

  /**
   * 结束对局为平局。
   */
  function finishWithDraw() {
    gameState.isDraw = true;
    gameState.isGameOver = true;
    refreshElapsedTime();
    stopTimer();
    renderGame();
    openModal({
      type: MODAL_TYPES.RESULT,
      kicker: "对局结束",
      title: "平局",
      body: ["棋盘已满，双方未形成五子连珠。"],
      actions: [
        { label: "查看棋局", style: "secondary", handler: closeModal },
        { label: "再来一局", style: "primary", handler: restartCurrentMode },
      ],
    });
  }

  /**
   * 展示胜利弹窗。
   * @param {string} player 获胜玩家。
   */
  function showWinnerModal(player) {
    const meta = PLAYER_META[player];
    const lastMove = formatMove(gameState.lastMove.row, gameState.lastMove.col);

    openModal({
      type: MODAL_TYPES.RESULT,
      kicker: "胜利",
      title: meta.winText,
      body: [`第 ${gameState.moveCount} 手，${lastMove} 完成五子连珠。`],
      actions: [
        { label: "查看棋局", style: "secondary", handler: closeModal },
        { label: "再来一局", style: "primary", handler: restartCurrentMode },
      ],
    });
  }

  /**
   * 展示规则说明弹窗。
   */
  function showRulesModal() {
    openModal({
      type: MODAL_TYPES.RULES,
      kicker: "Rules",
      title: "五子连珠即可获胜",
      renderContent: renderRulesContent,
      actions: [{ label: "知道了", style: "primary", handler: closeModal }],
    });
  }

  /**
   * 展示项目信息弹窗。
   */
  function showAboutModal() {
    openModal({
      type: MODAL_TYPES.ABOUT,
      kicker: "About",
      title: "GOMOKU",
      renderContent: renderAboutContent,
      actions: [{ label: "关闭", style: "primary", handler: closeModal }],
    });
  }

  /**
   * 渲染 Rules 弹窗的小棋盘示意图和规则说明。
   */
  function renderRulesContent() {
    const wrapper = document.createElement("div");
    const demoBoard = document.createElement("div");
    const caption = document.createElement("p");
    const stones = [
      { row: 3, col: 1 },
      { row: 3, col: 2 },
      { row: 3, col: 3 },
      { row: 3, col: 4 },
      { row: 3, col: 5 },
    ];

    wrapper.className = "rules-content";
    demoBoard.className = "rules-demo-board";
    caption.className = "rules-caption";
    caption.textContent = "横向、竖向或斜向连成五颗同色棋子，就赢了。";

    for (let index = 0; index < stones.length; index += 1) {
      const stone = document.createElement("span");
      stone.className = "demo-point";
      stone.style.setProperty("--row", stones[index].row);
      stone.style.setProperty("--col", stones[index].col);
      demoBoard.appendChild(stone);
    }

    demoBoard.appendChild(createElementWithClass("span", "demo-win-line"));
    wrapper.appendChild(demoBoard);
    wrapper.appendChild(caption);
    appendModalBody([
      "黑棋先手，双方轮流在棋盘交点落子。",
      "已有棋子的位置不能再次落子。",
    ]);
    elements.modalBody.prepend(wrapper);
  }

  /**
   * 渲染 About 弹窗中的正式项目信息。
   */
  function renderAboutContent() {
    const wrapper = document.createElement("div");
    const logo = document.createElement("div");
    const stones = document.createElement("span");
    const blackStone = createElementWithClass("span", "logo-stone logo-stone-black");
    const whiteStone = createElementWithClass("span", "logo-stone logo-stone-white");
    const logoWord = createElementWithClass("span", "logo-word");
    const version = createElementWithClass("p", "about-version");
    const description = createElementWithClass("p", "about-line");
    const creator = createElementWithClass("p", "about-line");
    const collaboration = createElementWithClass("p", "about-line");

    wrapper.className = "about-content";
    logo.className = "product-logo";
    stones.className = "logo-stones";
    logoWord.textContent = "GOMOKU";
    version.textContent = "Version 2.0.0";
    description.textContent = "A lightweight Gomoku game with local two-player and AI modes.";
    creator.textContent = "Created by Binbin.";
    collaboration.textContent = "Built with AI collaboration.";

    stones.setAttribute("aria-hidden", "true");
    stones.appendChild(blackStone);
    stones.appendChild(whiteStone);
    logo.appendChild(stones);
    logo.appendChild(logoWord);
    wrapper.appendChild(logo);
    wrapper.appendChild(version);
    wrapper.appendChild(description);
    wrapper.appendChild(creator);
    wrapper.appendChild(collaboration);
    elements.modalBody.appendChild(wrapper);
  }

  /**
   * 渲染棋盘、侧栏和顶部状态。
   */
  function renderGame() {
    renderBoardState();
    renderMatchState();
    renderControlState();
  }

  /**
   * 刷新棋盘每个交点的视觉状态。
   */
  function renderBoardState() {
    const cells = elements.intersections.querySelectorAll(".cell");

    elements.board.classList.toggle("is-black-turn", gameState.currentPlayer === PLAYERS.BLACK && !gameState.isGameOver);
    elements.board.classList.toggle("is-white-turn", gameState.currentPlayer === PLAYERS.WHITE && !gameState.isGameOver);
    elements.board.classList.toggle("game-over", gameState.isGameOver);

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      const row = Number(cell.dataset.row);
      const col = Number(cell.dataset.col);
      const player = gameState.board[row][col];
      const isOccupied = player !== EMPTY_CELL;
      const isLastMove = isLastMoveCell(row, col);

      cell.className = createCellClassName(player, isOccupied, isLastMove);
      cell.disabled = gameState.isGameOver || isOccupied || isHumanInputLocked();
      cell.setAttribute("aria-label", createCellAriaLabel(row, col, player, isLastMove));
    }
  }

  /**
   * 刷新顶部胜场、步数、计时和当前回合。
   */
  function renderMatchState() {
    const activePlayer = gameState.winner || gameState.currentPlayer;
    const activeMeta = PLAYER_META[activePlayer];

    elements.blackWins.textContent = String(scoreState.black);
    elements.whiteWins.textContent = String(scoreState.white);
    elements.moveCount.textContent = String(gameState.moveCount);
    elements.timerText.textContent = formatTime(gameState.elapsedSeconds);
    elements.sideTimerText.textContent = formatTime(gameState.elapsedSeconds);
    elements.turnStone.className = `mini-stone ${activeMeta.stoneClass}`;
    elements.turnText.textContent = getTurnDisplayText();
    elements.modeLabel.textContent = getModeLabelText();
    elements.turnCard.classList.toggle("is-ended", gameState.isGameOver);
  }

  /**
   * 刷新侧边控制面板。
   */
  function renderControlState() {
    elements.sideMoveCount.textContent = String(gameState.moveCount);
    elements.lastMove.textContent = getLastMoveText();
    elements.gameStatus.textContent = getGameStatusText();
    elements.undoButton.disabled = gameState.moveHistory.length === 0 || gameState.isGameOver;
  }

  /**
   * 创建棋盘交点的 className。
   * @param {string|null} player 棋子归属。
   * @param {boolean} isOccupied 是否已有棋子。
   * @param {boolean} isLastMove 是否最后一步。
   * @returns {string} className。
   */
  function createCellClassName(player, isOccupied, isLastMove) {
    const classNames = ["cell"];

    classNames.push(isOccupied ? "has-stone" : "is-empty");

    if (player) {
      classNames.push(PLAYER_META[player].stoneClass);
    }

    if (isLastMove) {
      classNames.push("is-last");
    }

    return classNames.join(" ");
  }

  /**
   * 创建棋盘交点的无障碍文本。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @param {string|null} player 棋子归属。
   * @param {boolean} isLastMove 是否最后一步。
   * @returns {string} aria-label。
   */
  function createCellAriaLabel(row, col, player, isLastMove) {
    const coordinate = formatMove(row, col);

    if (!player) {
      return `${coordinate} 空位`;
    }

    return `${coordinate} ${PLAYER_META[player].name}${isLastMove ? "，最后一步" : ""}`;
  }

  /**
   * 判断坐标是否是最后一步。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {boolean} 是否最后一步。
   */
  function isLastMoveCell(row, col) {
    return Boolean(gameState.lastMove && gameState.lastMove.row === row && gameState.lastMove.col === col);
  }

  /**
   * 获取当前回合展示文案。
   * @returns {string} 当前回合文案。
   */
  function getTurnDisplayText() {
    if (gameState.winner) {
      return PLAYER_META[gameState.winner].winText;
    }

    if (gameState.isDraw) {
      return "平局";
    }

    if (gameState.isAiThinking) {
      return "AI 思考中";
    }

    return PLAYER_META[gameState.currentPlayer].turnText;
  }

  /**
   * 获取顶部模式标签文案。
   * @returns {string} 模式文案。
   */
  function getModeLabelText() {
    return gameState.mode === GAME_MODES.AI ? "v2.1.1 · Play with AI" : "v2.1.1 · Local Two Player";
  }

  /**
   * 获取侧边栏状态文案。
   * @returns {string} 状态文案。
   */
  function getGameStatusText() {
    if (gameState.winner) {
      return `${PLAYER_META[gameState.winner].name}获胜`;
    }

    if (gameState.isDraw) {
      return "平局";
    }

    if (gameState.isAiThinking) {
      return "AI 正在思考";
    }

    if (gameState.mode === GAME_MODES.AI) {
      return gameState.currentPlayer === PLAYERS.BLACK ? "玩家回合" : "AI 回合";
    }

    return "对局进行中";
  }

  /**
   * 获取最后一步展示文案。
   * @returns {string} 最后一步文案。
   */
  function getLastMoveText() {
    if (!gameState.lastMove) {
      return "暂无";
    }

    const meta = PLAYER_META[gameState.lastMove.player];
    return `${meta.name} ${formatMove(gameState.lastMove.row, gameState.lastMove.col)}`;
  }

  /**
   * 检查指定落子是否形成五子连珠。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @param {string} player 玩家标识。
   * @returns {boolean} 是否获胜。
   */
  function hasFiveInRow(row, col, player) {
    return hasFiveInRowOnBoard(gameState.board, row, col, player);
  }

  /**
   * 在指定棋盘上检查某次落子是否形成五子连珠。
   * @param {Array<Array<null|string>>} board 棋盘数据。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @param {string} player 玩家标识。
   * @returns {boolean} 是否获胜。
   */
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

  /**
   * 沿指定方向统计连续同色棋子数量。
   * @param {number} row 起点行。
   * @param {number} col 起点列。
   * @param {number} rowStep 行步长。
   * @param {number} colStep 列步长。
   * @param {string} player 玩家标识。
   * @returns {number} 连续棋子数量。
   */
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

  /**
   * 判断坐标是否位于棋盘范围内。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {boolean} 是否在棋盘内。
   */
  function isInsideBoard(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  /**
   * 获取下一位玩家。
   * @param {string} player 当前玩家。
   * @returns {string} 下一位玩家。
   */
  function getNextPlayer(player) {
    return player === PLAYERS.BLACK ? PLAYERS.WHITE : PLAYERS.BLACK;
  }

  /**
   * 启动本局计时器。
   */
  function startTimer() {
    stopTimer();
    gameState.elapsedSeconds = 0;
    clockStartedAt = Date.now();
    renderTimer();
    timerId = window.setInterval(handleTimerTick, 1000);
  }

  /**
   * 停止本局计时器。
   */
  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = 0;
    }
  }

  /**
   * 计时器每秒刷新。
   */
  function handleTimerTick() {
    refreshElapsedTime();
    renderTimer();
  }

  /**
   * 从系统时间刷新已用秒数。
   */
  function refreshElapsedTime() {
    if (!clockStartedAt) {
      return;
    }

    gameState.elapsedSeconds = Math.max(0, Math.floor((Date.now() - clockStartedAt) / 1000));
  }

  /**
   * 单独刷新计时显示，避免每秒重绘棋盘。
   */
  function renderTimer() {
    const timeText = formatTime(gameState.elapsedSeconds);
    elements.timerText.textContent = timeText;
    elements.sideTimerText.textContent = timeText;
  }

  /**
   * 格式化秒数为 MM:SS。
   * @param {number} totalSeconds 总秒数。
   * @returns {string} 格式化时间。
   */
  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${padTwoDigits(minutes)}:${padTwoDigits(seconds)}`;
  }

  /**
   * 数字补齐两位。
   * @param {number} value 数字。
   * @returns {string} 两位字符串。
   */
  function padTwoDigits(value) {
    return String(value).padStart(2, "0");
  }

  /**
   * 切换声音开关。
   */
  function toggleSound() {
    audioState.enabled = !audioState.enabled;
    initializeAudioContext();
    renderSoundState();

    if (audioState.enabled) {
      playSound("toggle");
    }
  }

  /**
   * 刷新声音按钮状态。
   */
  function renderSoundState() {
    elements.soundToggleButton.textContent = audioState.enabled ? "声音 开" : "声音 关";
    elements.soundToggleButton.classList.toggle("is-on", audioState.enabled);
    elements.soundToggleButton.classList.toggle("is-off", !audioState.enabled);
    elements.soundToggleButton.setAttribute("aria-pressed", String(audioState.enabled));
  }

  /**
   * 初始化 Web Audio，所有声音均由本地振荡器生成。
   */
  function initializeAudioContext() {
    if (audioState.context || !window.AudioContext && !window.webkitAudioContext) {
      return;
    }

    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    audioState.context = new AudioContextConstructor();
  }

  /**
   * 播放短促的本地合成音效。
   * @param {string} type 音效类型。
   */
  function playSound(type) {
    if (!audioState.enabled) {
      return;
    }

    initializeAudioContext();

    if (!audioState.context) {
      return;
    }

    if (audioState.context.state === "suspended") {
      audioState.context.resume();
    }

    if (type === "win") {
      playToneSequence([523.25, 659.25, 783.99], 0.09, 0.05);
      return;
    }

    if (type === "undo") {
      playToneSequence([220], 0.08, 0.04);
      return;
    }

    if (type === "toggle") {
      playToneSequence([440], 0.06, 0.035);
      return;
    }

    playToneSequence([330], 0.07, 0.045);
  }

  /**
   * 播放一组音符。
   * @param {number[]} frequencies 频率列表。
   * @param {number} duration 单音持续时间。
   * @param {number} volume 音量。
   */
  function playToneSequence(frequencies, duration, volume) {
    const context = audioState.context;
    const startAt = context.currentTime;

    for (let index = 0; index < frequencies.length; index += 1) {
      playTone(frequencies[index], startAt + index * duration, duration, volume);
    }
  }

  /**
   * 播放单个振荡器音符。
   * @param {number} frequency 频率。
   * @param {number} startAt 开始时间。
   * @param {number} duration 持续时间。
   * @param {number} volume 音量。
   */
  function playTone(frequency, startAt, duration, volume) {
    const context = audioState.context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(startAt + duration + 0.02);
  }

  /**
   * 打开通用弹窗。
   * @param {object} config 弹窗配置。
   */
  function openModal(config) {
    window.clearTimeout(modalCloseTimer);
    elements.modalKicker.textContent = config.kicker;
    elements.modalTitle.textContent = config.title;
    elements.modalBody.replaceChildren();
    elements.modalActions.replaceChildren();

    appendModalContent(config);
    appendModalActions(config.actions);

    elements.modal.dataset.type = config.type;
    elements.modal.hidden = false;
    window.requestAnimationFrame(handleModalOpenFrame);
  }

  /**
   * 根据弹窗配置渲染正文内容。
   * @param {object} config 弹窗配置。
   */
  function appendModalContent(config) {
    if (typeof config.renderContent === "function") {
      config.renderContent();
      return;
    }

    appendModalBody(config.body || []);
  }

  /**
   * 填充弹窗正文。
   * @param {string[]} bodyLines 正文段落。
   */
  function appendModalBody(bodyLines) {
    for (let index = 0; index < bodyLines.length; index += 1) {
      const paragraph = document.createElement("p");
      paragraph.textContent = bodyLines[index];
      elements.modalBody.appendChild(paragraph);
    }
  }

  /**
   * 填充弹窗按钮。
   * @param {Array<object>} actions 按钮配置。
   */
  function appendModalActions(actions) {
    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];
      const button = document.createElement("button");

      button.type = "button";
      button.className = action.style === "primary" ? "primary-action" : "secondary-action";
      button.textContent = action.label;
      button.addEventListener("click", action.handler);
      elements.modalActions.appendChild(button);
    }
  }

  /**
   * 创建带 className 的元素。
   * @param {string} tagName 标签名。
   * @param {string} className 类名。
   * @returns {HTMLElement} 创建好的元素。
   */
  function createElementWithClass(tagName, className) {
    const element = document.createElement(tagName);
    element.className = className;
    return element;
  }

  /**
   * 下一帧添加弹窗入场状态，保证过渡动画生效。
   */
  function handleModalOpenFrame() {
    const firstButton = elements.modalActions.querySelector("button");

    elements.modal.classList.add("is-open");

    if (firstButton) {
      firstButton.focus({ preventScroll: true });
    }
  }

  /**
   * 关闭弹窗。
   */
  function closeModal() {
    elements.modal.classList.remove("is-open");
    modalCloseTimer = window.setTimeout(hideModalAfterTransition, MODAL_TRANSITION_MS);
  }

  /**
   * 弹窗退场后隐藏元素。
   */
  function hideModalAfterTransition() {
    if (!elements.modal.classList.contains("is-open")) {
      elements.modal.hidden = true;
      elements.modal.dataset.type = "";
    }
  }

  /**
   * 点击弹窗遮罩时关闭非结果弹窗，结果弹窗也允许查看棋局。
   * @param {MouseEvent} event 点击事件。
   */
  function handleModalBackdropClick(event) {
    if (event.target === elements.modal) {
      closeModal();
    }
  }

  /**
   * Escape 关闭当前弹窗。
   * @param {KeyboardEvent} event 键盘事件。
   */
  function handleWindowKeydown(event) {
    if (event.key === "Escape" && !elements.modal.hidden) {
      closeModal();
    }
  }

  /**
   * 将数组坐标转换为棋盘坐标。
   * @param {number} row 行索引。
   * @param {number} col 列索引。
   * @returns {string} 棋盘坐标。
   */
  function formatMove(row, col) {
    return `${COORDINATE_LABELS[col]}${row + 1}`;
  }
}());
