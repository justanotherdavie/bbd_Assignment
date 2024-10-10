const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startButton = document.getElementById("startButton");
const joinButton = document.getElementById("joinButton");
const genMazeButton = document.getElementById("genMaze");
const guideSpan = document.getElementById("guide");
const playerColor = document.getElementById("playerColor");

const socket = io();

let deviceId;
let color;
let isHost = false;
let userName = localStorage.getItem("userName");

// Define the balls with unique initial positions and colors
let balls = [];
const currentPlayer = "";

const hole = {
  x: 290,
  y: 290,
  radius: 7,
  color: "black",
};

const cellSize = 20;
const cols = Math.floor(300 / cellSize);
const rows = Math.floor(300 / cellSize);
let cells = [];
const pen = canvas.getContext("2d");

class Cell {
  constructor(x, y, walls) {
    this.x = x;
    this.y = y;
    this.walls = walls;
  }

  show() {
    if (this.walls) {
      const x = this.x * cellSize;
      const y = this.y * cellSize;
      pen.beginPath();
      if (this.walls.top) pen.moveTo(x, y), pen.lineTo(x + cellSize, y);
      if (this.walls.right)
        pen.moveTo(x + cellSize, y), pen.lineTo(x + cellSize, y + cellSize);
      if (this.walls.bottom)
        pen.moveTo(x + cellSize, y + cellSize), pen.lineTo(x, y + cellSize);
      if (this.walls.left) pen.moveTo(x, y + cellSize), pen.lineTo(x, y);
      pen.strokeStyle = "black";
      pen.lineWidth = 2;
      pen.lineCap = "round";
      pen.stroke();
    }
  }
}

function setup() {
  for (let x = 0; x < cols; x++) {
    cells[x] = [];
    for (let y = 0; y < rows; y++) {
      cells[x][y] = new Cell(x, y);
    }
  }
}

const drawBall = (ball) => {
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = ball.color;
  ctx.fill();
  ctx.closePath();
};

const drawHole = () => {
  ctx.beginPath();
  ctx.arc(hole.x, hole.y, hole.radius, 0, Math.PI * 2);
  ctx.fillStyle = hole.color;
  ctx.fill();
  ctx.closePath();
};

const plotGrid = () => {
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      cells[x][y].show();
    }
  }
};

const fps = 60;
const draw = () => {
  ctx.clearRect(0, 0, 300, 300);
  plotGrid();
  drawHole();

  balls.forEach((ball) => drawBall(ball));

  setTimeout(() => {
    requestAnimationFrame(draw);
  }, 1000 / fps);
};

const speedFactor = 3;
const handleOrientation = (event) => {
  const maxTilt = 30; // Maximum tilt angle to avoid too much speed
  const mazeTiltX = (event.gamma / maxTilt) * speedFactor; // gamma is the left-to-right tilt
  const mazeTiltY = (event.beta / maxTilt) * speedFactor; // beta is the front-to-back tilt

  socket.emit("tilt", {
    xTilt: mazeTiltX,
    yTilt: mazeTiltY,
    beta: event.beta,
    gamma: event.gamma,
    playerId: deviceId,
  });
};

const getDeviceOrientation = () => {
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    // Handle iOS 13+ devices.
    DeviceOrientationEvent.requestPermission()
      .then((state) => {
        if (state === "granted") {
          window.addEventListener("deviceorientation", handleOrientation);
        } else {
          console.error("Request to access the orientation was rejected");
        }
      })
      .catch(console.error);
  } else {
    // Handle regular non iOS 13+ devices.
    window.addEventListener("deviceorientation", handleOrientation);
  }
};

startButton.addEventListener("click", () => {
  socket.emit("startGame");
});

genMazeButton.addEventListener("click", () => {
  socket.emit("genMaze");
});

socket.on("assignID", (data) => {
  deviceId = data;
});

socket.on("assignColor", (data) => {
  color = data;
  playerColor.textContent = `You are ` + data;
  playerColor.style.display = "flex";
});

socket.on("announceWinner", (data) => {
  alert(`${data.userName ?? data.color} (${data.color}) wins!`);
  localStorage.clear();
  location.reload();
});

socket.on("reloadTab", () => {
  location.reload();
})

socket.on("joinDenied", () => {
  alert("Game is full");
});

joinButton.addEventListener("click", () => {
  getDeviceOrientation();
  joinButton.style.display = "none";
  if (!isHost) {
    guideSpan.textContent = "Waiting for host to start game";
  }
  socket.emit("join", userName);
});

socket.on("assignHost", (data) => {
  isHost = data;
  if (!isHost) {
    startButton.style.display = "none";
    genMazeButton.style.display = "none";
    // guideSpan.style.display = "none";
    guideSpan.textContent = "Join and wait for host to start game";
  }
});

socket.on("plotPlayers", (data) => {
  balls = data;
  data.forEach((ball) => drawBall(ball));
});

socket.on("gameStarted", () => {
  startButton.style.display = "none";
  genMazeButton.style.display = "none";
  joinButton.style.display = "none";
  guideSpan.style.display = "none";
  playerColor.style.display = "flex";
});

socket.on("grid", (data) => {
  data.forEach((cell, colNum) => {
    cell.map((entry, rowNum) => {
      cells[colNum][rowNum] = new Cell(entry.x, entry.y, entry.walls);
    });
  });
});

socket.on("tiltCanvas", (data) => {
  const { avgGamma, avgBeta } = data;
  canvas.style.transform = `rotateY(${avgGamma}deg) rotateX(${-avgBeta}deg)`;
});

// Initial setup
setup();
draw();
// document.addEventListener('DOMContentLoaded', () => {
//   const canvas = document.getElementById('gameCanvas');
//   const ctx = canvas.getContext('2d');
//   const rows = 20;
//   const cols = 20;
//   const cellSize = canvas.width / cols;

//   const grid = [];
//   const stack = [];
//   let ball = { x: 0, y: 0, radius: cellSize / 4, speed: 0.05, dx: 0, dy: 0 };

//   class Cell {
//     constructor(row, col) {
//       this.row = row;
//       this.col = col;
//       this.visited = false;
//       this.walls = [true, true, true, true]; // top, right, bottom, left
//     }

//     draw() {
//       const x = this.col * cellSize;
//       const y = this.row * cellSize;
//       ctx.strokeStyle = 'black';
//       ctx.lineWidth = 2;

//       if (this.walls[0]) ctx.strokeRect(x, y, cellSize, 0); // top
//       if (this.walls[1]) ctx.strokeRect(x + cellSize, y, 0, cellSize); // right
//       if (this.walls[2]) ctx.strokeRect(x, y + cellSize, cellSize, 0); // bottom
//       if (this.walls[3]) ctx.strokeRect(x, y, 0, cellSize); // left

//       if (this.visited) {
//         ctx.fillStyle = 'white';
//         ctx.fillRect(x, y, cellSize, cellSize);
//       }
//     }

//     checkNeighbors() {
//       const neighbors = [];

//       const top = grid[this.index(this.row - 1, this.col)];
//       const right = grid[this.index(this.row, this.col + 1)];
//       const bottom = grid[this.index(this.row + 1, this.col)];
//       const left = grid[this.index(this.row, this.col - 1)];

//       if (top && !top.visited) neighbors.push(top);
//       if (right && !right.visited) neighbors.push(right);
//       if (bottom && !bottom.visited) neighbors.push(bottom);
//       if (left && !left.visited) neighbors.push(left);

//       if (neighbors.length > 0) {
//         const randomIndex = Math.floor(Math.random() * neighbors.length);
//         return neighbors[randomIndex];
//       } else {
//         return undefined;
//       }
//     }

//     index(row, col) {
//       if (row < 0 || col < 0 || row >= rows || col >= cols) {
//         return -1;
//       }
//       return row * cols + col;
//     }
//   }

//   function setup() {
//     for (let row = 0; row < rows; row++) {
//       for (let col = 0; col < cols; col++) {
//         const cell = new Cell(row, col);
//         grid.push(cell);
//       }
//     }

//     const start = grid[0];
//     start.visited = true;
//     stack.push(start);
//   }

//   function draw() {
//     ctx.clearRect(0, 0, canvas.width, canvas.height);

//     for (const cell of grid) {
//       cell.draw();
//     }

//     if (stack.length > 0) {
//       const current = stack[stack.length - 1];
//       const next = current.checkNeighbors();

//       if (next) {
//         next.visited = true;
//         stack.push(next);

//         removeWalls(current, next);
//       } else {
//         stack.pop();
//       }
//     }

//     updateBallPosition();
//     drawBall();
//     requestAnimationFrame(draw);
//   }

//   function removeWalls(a, b) {
//     const x = a.col - b.col;
//     if (x === 1) {
//       a.walls[3] = false;
//       b.walls[1] = false;
//     } else if (x === -1) {
//       a.walls[1] = false;
//       b.walls[3] = false;
//     }

//     const y = a.row - b.row;
//     if (y === 1) {
//       a.walls[0] = false;
//       b.walls[2] = false;
//     } else if (y === -1) {
//       a.walls[2] = false;
//       b.walls[0] = false;
//     }
//   }

//   function drawBall() {
//     ctx.beginPath();
//     ctx.arc(ball.x * cellSize + cellSize / 2, ball.y * cellSize + cellSize / 2, ball.radius, 0, Math.PI * 2);
//     ctx.fillStyle = 'red';
//     ctx.fill();
//     ctx.closePath();
//   }

//   function updateBallPosition() {
//     let newX = ball.x + ball.dx;
//     let newY = ball.y + ball.dy;

//     if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
//       const currentCell = grid[ball.y * cols + ball.x];
//       if (ball.dx > 0 && !currentCell.walls[1]) ball.x = newX;
//       if (ball.dx < 0 && !currentCell.walls[3]) ball.x = newX;
//       if (ball.dy > 0 && !currentCell.walls[2]) ball.y = newY;
//       if (ball.dy < 0 && !currentCell.walls[0]) ball.y = newY;
//     }
//   }

//   function handleOrientation(event) {
//     const gamma = event.gamma; // left to right tilt in degrees
//     const beta = event.beta; // front to back tilt in degrees

//     ball.dx = gamma * ball.speed;
//     ball.dy = beta * ball.speed;
//   }

//   window.addEventListener('deviceorientation', handleOrientation);

//   setup();
//   draw();
// })