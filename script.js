/**
 * Gomoku v1.0.0 Final.
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
    }),
    v3: Object.freeze({
      aiOpponent: null,
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
    elements.startGameButton = document.getElementById("startGameButton");
    elements.rulesButton = document.getElementById("rulesButton");
    elements.aboutButton = document.getElementById("aboutButton");
    elements.homeButton = document.getElementById("homeButton");
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
    elements.startGameButton.addEventListener("click", handleStartGame);
    elements.rulesButton.addEventListener("click", showRulesModal);
    elements.aboutButton.addEventListener("click", showAboutModal);
    elements.homeButton.addEventListener("click", handleHomeRequest);
    elements.soundToggleButton.addEventListener("click", toggleSound);
    elements.intersections.addEventListener("click", handleBoardClick);
    elements.undoButton.addEventListener("click", undoMove);
    elements.resetButton.addEventListener("click", requestRestart);
    elements.modal.addEventListener("click", handleModalBackdropClick);
    window.addEventListener("keydown", handleWindowKeydown);
  }

  /**
   * 创建新对局状态。
   * @returns {object} 对局状态。
   */
  function createInitialGameState() {
    return {
      board: createEmptyBoard(),
      currentPlayer: PLAYERS.BLACK,
      lastMove: null,
      moveHistory: [],
      moveCount: 0,
      elapsedSeconds: 0,
      winner: null,
      isDraw: false,
      isGameOver: false,
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
  function handleStartGame() {
    initializeAudioContext();
    startNewMatch();
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
  function startNewMatch() {
    gameState = createInitialGameState();
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
    const cell = event.target.closest(".cell");

    if (!cell || gameState.isGameOver) {
      return;
    }

    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);

    if (!isValidMove(row, col)) {
      return;
    }

    playMove(row, col);
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
  }

  /**
   * 悔棋一步，恢复到上一位玩家的回合。
   */
  function undoMove() {
    if (gameState.moveHistory.length === 0 || gameState.isGameOver) {
      return;
    }

    const lastMove = gameState.moveHistory.pop();
    gameState.board[lastMove.row][lastMove.col] = EMPTY_CELL;
    gameState.currentPlayer = lastMove.player;
    gameState.lastMove = gameState.moveHistory[gameState.moveHistory.length - 1] || null;
    gameState.moveCount -= 1;
    playSound("undo");
    renderGame();
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
        { label: "重新开始", style: "primary", handler: startNewMatch },
      ],
    });
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
        { label: "再来一局", style: "primary", handler: startNewMatch },
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
        { label: "再来一局", style: "primary", handler: startNewMatch },
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
    version.textContent = "Version 1.0.0";
    description.textContent = "A lightweight Gomoku game built with HTML, CSS and JavaScript.";
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
      cell.disabled = gameState.isGameOver || isOccupied;
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

    return PLAYER_META[gameState.currentPlayer].turnText;
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
    for (let index = 0; index < DIRECTIONS.length; index += 1) {
      const direction = DIRECTIONS[index];
      const total =
        1 +
        countContinuousStones(row, col, direction.row, direction.col, player) +
        countContinuousStones(row, col, -direction.row, -direction.col, player);

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
  function countContinuousStones(row, col, rowStep, colStep, player) {
    let count = 0;
    let nextRow = row + rowStep;
    let nextCol = col + colStep;

    while (isInsideBoard(nextRow, nextCol) && gameState.board[nextRow][nextCol] === player) {
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
