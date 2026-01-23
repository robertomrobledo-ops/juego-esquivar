const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");
const timeLabel = document.getElementById("time");
const speedLabel = document.getElementById("speed");
const difficultyLabel = document.getElementById("difficulty");

const gameState = {
  running: false,
  lastTimestamp: 0,
  elapsed: 0,
  speedMultiplier: 1,
  difficultyMultiplier: 1,
  players: [
    {
      width: 46,
      height: 60,
      lane: 1,
      side: 0,
      colors: { body: "#6ee7ff", accent: "#f6ff87" },
    },
    {
      width: 46,
      height: 60,
      lane: 1,
      side: 1,
      colors: { body: "#ffd86e", accent: "#8affd1" },
    },
  ],
  obstacles: [],
  spawnTimers: [0, 0],
  baseSpawnInterval: 820,
};

const laneGap = canvas.width * 0.12;
const lanesBySide = [
  [canvas.width * 0.25 - laneGap, canvas.width * 0.25, canvas.width * 0.25 + laneGap],
  [canvas.width * 0.75 - laneGap, canvas.width * 0.75, canvas.width * 0.75 + laneGap],
];

const obstacleColors = ["#ff6b6b", "#ffb347", "#b967ff", "#4ddcbf"];

function resetGame() {
  gameState.running = false;
  gameState.lastTimestamp = 0;
  gameState.elapsed = 0;
  gameState.speedMultiplier = 1;
  gameState.difficultyMultiplier = 1;
  gameState.players.forEach((player) => {
    player.lane = 1;
  });
  gameState.obstacles = [];
  gameState.spawnTimers = [0, 0];
  timeLabel.textContent = "0";
  speedLabel.textContent = gameState.speedMultiplier.toFixed(1);
  difficultyLabel.textContent = gameState.difficultyMultiplier.toFixed(1);
}

function startGame() {
  resetGame();
  gameState.running = true;
  overlay.classList.remove("active");
  window.requestAnimationFrame(update);
}

function endGame() {
  gameState.running = false;
  overlayTitle.textContent = "¡Choque!";
  overlayMessage.textContent = `Cooperación fallida. Sobrevivieron ${Math.floor(
    gameState.elapsed / 1000
  )} segundos.`;
  startButton.textContent = "Reintentar";
  overlay.classList.add("active");
}

function spawnObstacle(side, avoidLane = null) {
  const lanes = lanesBySide[side];
  let lane = Math.floor(Math.random() * lanes.length);
  if (avoidLane !== null && lanes.length > 1 && lane === avoidLane) {
    lane = (lane + 1) % lanes.length;
  }
  const size = 36 + Math.random() * 18;
  gameState.obstacles.push({
    side,
    lane,
    size,
    y: -size,
    speed: 140 + Math.random() * 80,
    color: obstacleColors[Math.floor(Math.random() * obstacleColors.length)],
  });
}

function update(timestamp) {
  if (!gameState.running) {
    return;
  }

  if (!gameState.lastTimestamp) {
    gameState.lastTimestamp = timestamp;
  }

  const delta = timestamp - gameState.lastTimestamp;
  gameState.lastTimestamp = timestamp;
  gameState.elapsed += delta;

  gameState.speedMultiplier = 1 + Math.min(gameState.elapsed / 18000, 2.4);
  gameState.difficultyMultiplier = 1 + Math.min(gameState.elapsed / 12000, 3);
  speedLabel.textContent = gameState.speedMultiplier.toFixed(1);
  timeLabel.textContent = Math.floor(gameState.elapsed / 1000);
  difficultyLabel.textContent = gameState.difficultyMultiplier.toFixed(1);

  const spawnInterval = gameState.baseSpawnInterval / gameState.speedMultiplier;

  gameState.spawnTimers.forEach((timer, sideIndex) => {
    const updatedTimer = timer + delta;
    if (updatedTimer >= spawnInterval) {
      spawnObstacle(sideIndex);
      const extraChance = Math.min(0.35, (gameState.difficultyMultiplier - 1) / 3);
      if (Math.random() < extraChance) {
        spawnObstacle(sideIndex, gameState.obstacles[gameState.obstacles.length - 1].lane);
      }
      gameState.spawnTimers[sideIndex] = 0;
      return;
    }
    gameState.spawnTimers[sideIndex] = updatedTimer;
  });

  gameState.obstacles.forEach((obstacle) => {
    obstacle.y += (obstacle.speed * gameState.speedMultiplier * delta) / 1000;
  });

  gameState.obstacles = gameState.obstacles.filter(
    (obstacle) => obstacle.y < canvas.height + obstacle.size
  );

  draw();

  if (checkCollision()) {
    endGame();
    return;
  }

  window.requestAnimationFrame(update);
}

function draw() {
  context.clearRect(0, 0, canvas.width, canvas.height);

  drawLaneMarkers();
  drawDivider();
  gameState.players.forEach(drawPlayer);
  gameState.obstacles.forEach(drawObstacle);
}

function drawLaneMarkers() {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 2;

  lanesBySide.flat().forEach((laneX) => {
    context.beginPath();
    context.moveTo(laneX, 0);
    context.lineTo(laneX, canvas.height);
    context.stroke();
  });

  context.restore();
}

function drawDivider() {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.18)";
  context.lineWidth = 3;
  context.setLineDash([8, 10]);
  context.beginPath();
  context.moveTo(canvas.width / 2, 0);
  context.lineTo(canvas.width / 2, canvas.height);
  context.stroke();
  context.restore();
}

function drawPlayer(player) {
  const lanes = lanesBySide[player.side];
  const x = lanes[player.lane];
  const y = canvas.height - player.height - 24;
  const width = player.width;
  const height = player.height;

  context.save();
  context.translate(x - width / 2, y);

  context.fillStyle = player.colors.body;
  context.fillRect(0, 10, width, height - 10);

  context.fillStyle = player.colors.accent;
  context.fillRect(width * 0.2, 0, width * 0.6, 18);

  context.restore();
}

function drawObstacle(obstacle) {
  const x = lanesBySide[obstacle.side][obstacle.lane];
  const y = obstacle.y;
  const size = obstacle.size;

  context.save();
  context.translate(x - size / 2, y);
  context.fillStyle = obstacle.color;
  context.beginPath();
  context.roundRect(0, 0, size, size, 8);
  context.fill();
  context.restore();
}

function checkCollision() {
  return gameState.players.some((player) => {
    const lanes = lanesBySide[player.side];
    const playerX = lanes[player.lane];
    const playerY = canvas.height - player.height - 24;
    const playerWidth = player.width;
    const playerHeight = player.height;

    return gameState.obstacles.some((obstacle) => {
      if (obstacle.side !== player.side) {
        return false;
      }
      const obstacleX = lanes[obstacle.lane] - obstacle.size / 2;
      const obstacleY = obstacle.y;
      return (
        playerX - playerWidth / 2 < obstacleX + obstacle.size &&
        playerX + playerWidth / 2 > obstacleX &&
        playerY < obstacleY + obstacle.size &&
        playerY + playerHeight > obstacleY
      );
    });
  });
}

function movePlayer(playerIndex, direction) {
  if (!gameState.running) {
    return;
  }

  const player = gameState.players[playerIndex];
  const lanes = lanesBySide[player.side];

  if (direction === "left") {
    player.lane = Math.max(0, player.lane - 1);
  }

  if (direction === "right") {
    player.lane = Math.min(lanes.length - 1, player.lane + 1);
  }
}

function handleTouch(event) {
  if (!gameState.running) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const touchX = event.clientX - rect.left;
  const touchY = event.clientY - rect.top;
  const isLeftSide = touchX < rect.width / 2;
  const playerIndex = isLeftSide ? 0 : 1;
  const halfWidth = rect.width / 2;
  const localX = isLeftSide ? touchX : touchX - halfWidth;
  const direction = localX < halfWidth / 2 ? "left" : "right";

  if (touchY < rect.height * 0.15) {
    return;
  }

  movePlayer(playerIndex, direction);
}

function handleKeyboard(event) {
  if (event.key === "a" || event.key === "A") {
    movePlayer(0, "left");
  }
  if (event.key === "d" || event.key === "D") {
    movePlayer(0, "right");
  }
  if (event.key === "ArrowLeft") {
    movePlayer(1, "left");
  }
  if (event.key === "ArrowRight") {
    movePlayer(1, "right");
  }
}

canvas.addEventListener("pointerdown", (event) => {
  handleTouch(event);
});

canvas.addEventListener("pointermove", (event) => {
  if (event.buttons) {
    handleTouch(event);
  }
});

window.addEventListener("keydown", (event) => {
  handleKeyboard(event);
});

startButton.addEventListener("click", () => {
  overlayTitle.textContent = "¡Listos!";
  overlayMessage.textContent =
    "P1 usa A/D o la mitad izquierda. P2 usa ←/→ o la mitad derecha.";
  startButton.textContent = "Jugar";
  startGame();
});

resetGame();
overlay.classList.add("active");
