const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const startButton = document.getElementById("startButton");
const timeLabel = document.getElementById("time");
const speedLabel = document.getElementById("speed");

const gameState = {
  running: false,
  lastTimestamp: 0,
  elapsed: 0,
  speedMultiplier: 1,
  player: {
    width: 46,
    height: 60,
    lane: 1,
  },
  obstacles: [],
  spawnTimer: 0,
  baseSpawnInterval: 900,
};

const lanes = [canvas.width * 0.2, canvas.width * 0.5, canvas.width * 0.8];

const playerColors = {
  body: "#6ee7ff",
  accent: "#f6ff87",
};

const obstacleColors = ["#ff6b6b", "#ffb347", "#b967ff", "#4ddcbf"];

function resetGame() {
  gameState.running = false;
  gameState.lastTimestamp = 0;
  gameState.elapsed = 0;
  gameState.speedMultiplier = 1;
  gameState.player.lane = 1;
  gameState.obstacles = [];
  gameState.spawnTimer = 0;
  timeLabel.textContent = "0";
  speedLabel.textContent = gameState.speedMultiplier.toFixed(1);
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
  overlayMessage.textContent = `Sobreviviste ${Math.floor(
    gameState.elapsed / 1000
  )} segundos.`;
  startButton.textContent = "Reintentar";
  overlay.classList.add("active");
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * lanes.length);
  const size = 36 + Math.random() * 18;
  gameState.obstacles.push({
    lane,
    size,
    y: -size,
    speed: 120 + Math.random() * 60,
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

  gameState.speedMultiplier = 1 + Math.min(gameState.elapsed / 20000, 2.2);
  speedLabel.textContent = gameState.speedMultiplier.toFixed(1);
  timeLabel.textContent = Math.floor(gameState.elapsed / 1000);

  gameState.spawnTimer += delta;
  const spawnInterval = gameState.baseSpawnInterval / gameState.speedMultiplier;

  if (gameState.spawnTimer >= spawnInterval) {
    spawnObstacle();
    gameState.spawnTimer = 0;
  }

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
  drawPlayer();
  gameState.obstacles.forEach(drawObstacle);
}

function drawLaneMarkers() {
  context.save();
  context.strokeStyle = "rgba(255, 255, 255, 0.08)";
  context.lineWidth = 2;

  lanes.forEach((laneX) => {
    context.beginPath();
    context.moveTo(laneX, 0);
    context.lineTo(laneX, canvas.height);
    context.stroke();
  });

  context.restore();
}

function drawPlayer() {
  const x = lanes[gameState.player.lane];
  const y = canvas.height - gameState.player.height - 24;
  const width = gameState.player.width;
  const height = gameState.player.height;

  context.save();
  context.translate(x - width / 2, y);

  context.fillStyle = playerColors.body;
  context.fillRect(0, 10, width, height - 10);

  context.fillStyle = playerColors.accent;
  context.fillRect(width * 0.2, 0, width * 0.6, 18);

  context.restore();
}

function drawObstacle(obstacle) {
  const x = lanes[obstacle.lane];
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
  const playerX = lanes[gameState.player.lane];
  const playerY = canvas.height - gameState.player.height - 24;
  const playerWidth = gameState.player.width;
  const playerHeight = gameState.player.height;

  return gameState.obstacles.some((obstacle) => {
    const obstacleX = lanes[obstacle.lane] - obstacle.size / 2;
    const obstacleY = obstacle.y;
    return (
      playerX - playerWidth / 2 < obstacleX + obstacle.size &&
      playerX + playerWidth / 2 > obstacleX &&
      playerY < obstacleY + obstacle.size &&
      playerY + playerHeight > obstacleY
    );
  });
}

function movePlayer(direction) {
  if (!gameState.running) {
    return;
  }

  if (direction === "left") {
    gameState.player.lane = Math.max(0, gameState.player.lane - 1);
  }

  if (direction === "right") {
    gameState.player.lane = Math.min(lanes.length - 1, gameState.player.lane + 1);
  }
}

function handleTouch(event) {
  if (!gameState.running) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const touchX = event.clientX - rect.left;
  if (touchX < rect.width / 2) {
    movePlayer("left");
  } else {
    movePlayer("right");
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
  if (event.key === "ArrowLeft") {
    movePlayer("left");
  }
  if (event.key === "ArrowRight") {
    movePlayer("right");
  }
});

startButton.addEventListener("click", () => {
  overlayTitle.textContent = "¡Listo!";
  overlayMessage.textContent = "Toca izquierda o derecha para esquivar.";
  startButton.textContent = "Jugar";
  startGame();
});

resetGame();
overlay.classList.add("active");
