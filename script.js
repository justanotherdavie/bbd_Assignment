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

const fps = 70;
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
    guideSpan.style.display = "none";
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
