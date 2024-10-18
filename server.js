// setting up the server
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let users = [];
// Define the balls with unique initial positions and colors
const balls = [
  { x: 10, y: 10, radius: 5, color: "blue", dx: 0, dy: 0 },
  { x: 290, y: 10, radius: 5, color: "red", dx: 0, dy: 0 },
  { x: 10, y: 290, radius: 5, color: "purple", dx: 0, dy: 0 },
  { x: 150, y: 10, radius: 5, color: "green", dx: 0, dy: 0 },
];

const hole = {
  x: 290,
  y: 290,
  radius: 7,
  color: "black",
};

app.use(express.static(__dirname));

const PORT = 3000;


app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "game.html"));
});

const cellSize = 20;
const cols = Math.floor(300 / cellSize); // Adjust based on canvas width
const rows = Math.floor(300 / cellSize); // Adjust based on canvas height
let cells = [];
let isGameOver = false;
let isGameStarted = false;

class Cell {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.visited = false;
    this.walls = { top: true, right: true, bottom: true, left: true };
  }
}

function setup() {
  for (let x = 0; x < cols; x++) {
    cells[x] = [];
    for (let y = 0; y < rows; y++) {
      cells[x][y] = new Cell(x, y);
    }
  }
  genMaze(0, 0);
}

function genMaze(x, y) {
  const stack = [];

  const directions = ["top", "right", "bottom", "left"];
  const getNewCoords = (x, y, dir) => {
    switch (dir) {
      case "top":
        return [x, y - 1];
      case "right":
        return [x + 1, y];
      case "bottom":
        return [x, y + 1];
      case "left":
        return [x - 1, y];
    }
  };

  const removeWalls = (current, next, dir) => {
    current.walls[dir] = false;
    const opposite = {
      top: "bottom",
      right: "left",
      bottom: "top",
      left: "right",
    };
    next.walls[opposite[dir]] = false;
  };

  const startCell = cells[x][y];
  startCell.visited = true;
  stack.push(startCell);

  while (stack.length) {
    const current = stack[stack.length - 1];
    const [cx, cy] = [current.x, current.y];
    const unvisitedNeighbors = directions
      .map((dir) => {
        const [nx, ny] = getNewCoords(cx, cy, dir);
        return nx >= 0 &&
          ny >= 0 &&
          nx < cols &&
          ny < rows &&
          !cells[nx][ny].visited
          ? { dir, cell: cells[nx][ny] }
          : null;
      })
      .filter(Boolean);

    if (unvisitedNeighbors.length) {
      const { dir, cell } =
        unvisitedNeighbors[
          Math.floor(Math.random() * unvisitedNeighbors.length)
        ];
      removeWalls(current, cell, dir);
      cell.visited = true;
      stack.push(cell);
    } else {
      stack.pop();
    }
  }
}

// Initialize the maze
setup();

const dampingFactor = 0.5;

const updateBallsPosition = (xTilt, yTilt) => {
  users.forEach((ball, idx) => {
    // Update velocity based on tilt
    ball.dx += xTilt;
    ball.dy += yTilt;

    // Apply damping factor to velocity
    ball.dx *= dampingFactor;
    ball.dy *= dampingFactor;

    let nextX = ball.x + ball.dx;
    let nextY = ball.y + ball.dy;

    // Prevent ball from moving out of canvas
    if (nextX < ball.radius) nextX = ball.radius;
    if (nextX > 300 - ball.radius) nextX = 300 - ball.radius;
    if (nextY < ball.radius) nextY = ball.radius;
    if (nextY > 300 - ball.radius) nextY = 300 - ball.radius;

    // Check for collision with walls
    const col = Math.floor(nextX / cellSize);
    const row = Math.floor(nextY / cellSize);

    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      const cell = cells[col][row];

      if (cell) {
        // Collision with top wall
        if (
          ball.dy < 0 &&
          cell.walls.top &&
          nextY - ball.radius < row * cellSize
        ) {
          nextY = row * cellSize + ball.radius;
          ball.dy = -ball.dy;
        }

        // Collision with bottom wall
        if (
          ball.dy > 0 &&
          cell.walls.bottom &&
          nextY + ball.radius > (row + 1) * cellSize
        ) {
          nextY = (row + 1) * cellSize - ball.radius;
          ball.dy = -ball.dy;
        }

        // Collision with left wall
        if (
          ball.dx < 0 &&
          cell.walls.left &&
          nextX - ball.radius < col * cellSize
        ) {
          nextX = col * cellSize + ball.radius;
          ball.dx = -ball.dx;
        }

        // Collision with right wall
        if (
          ball.dx > 0 &&
          cell.walls.right &&
          nextX + ball.radius > (col + 1) * cellSize
        ) {
          nextX = (col + 1) * cellSize - ball.radius;
          ball.dx = -ball.dx;
        }
      }
    }

    //Check for collision with other balls
    for (let j = 0; j < users.length; j++) {
      if (j !== idx) {
        const otherBall = users[j];
        const dx = otherBall.x - nextX;
        const dy = otherBall.y - nextY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Collision detected
        if (distance < ball.radius + otherBall.radius) {
          // Resolve collision by adjusting positions
          const angle = Math.atan2(dy, dx);
          const sin = Math.sin(angle);
          const cos = Math.cos(angle);

          // Separate the balls to prevent overlap
          const overlap = 0.5 * (ball.radius + otherBall.radius - distance);
          nextX -= overlap * cos;
          nextY -= overlap * sin;
          otherBall.x += overlap * cos;
          otherBall.y += overlap * sin;

          // Simple elastic collision response (swap velocities)
          [ball.dx, otherBall.dx] = [otherBall.dx, ball.dx];
          [ball.dy, otherBall.dy] = [otherBall.dy, ball.dy];
        }
      }
    }

    ball.x = nextX;
    ball.y = nextY;
    users[idx] = ball;
  });
};

const isBallInHole = (ball) => {
  const dx = ball.x - hole.x;
  const dy = ball.y - hole.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  isGameOver = true;
  return distance < hole.radius + ball.radius - 5;
};

const getAvailableBall = () => {
  const availableBalls = [];
  balls.forEach((ball, idx) => {
    if (!users.find((user) => user.color === ball.color)) {
      availableBalls.push(ball);
    }
  });
  return availableBalls[0];
};

const checkWin = () => {
  users.forEach((user) => {
    if (isBallInHole(user)) {
      isGameStarted = false;
      io.emit("announceWinner", user);
      io.disconnectSockets();
    }
  });
};

const tiltValues = {};

io.on("connection", (socket) => {
  console.log("User connected: ", socket.id);
  socket.emit("assignID", socket.id);

  console.log(io.engine.clientsCount);
  socket.emit("assignHost", io.engine.clientsCount === 1 ? true : false);

  socket.on("genMaze", () => {
    setup();
    io.emit("grid", cells);
  });

  io.emit("grid", cells);

  socket.on("startGame", () => {
    isGameStarted = true;
    io.emit("gameStarted");
  });

  socket.on("join", (data) => {
    if (users.length === 4) {
      socket.emit("joinDenied");
      return;
    }

    const availableBall = getAvailableBall();
    users.push({
      ...availableBall,
      id: socket.id,
      userName: data,
    });

    socket.emit("assignColor", availableBall.color);
    console.log("Users: ", users);
    io.emit("plotPlayers", users);
  });

  socket.on("tilt", (data) => {
    if (isGameStarted) {
      const { playerId, xTilt, yTilt, beta, gamma } = data;
      tiltValues[playerId] = { xTilt, yTilt, beta, gamma };

      let totalXTilt = 0;
      let totalYTilt = 0;
      let totalGamma = 0;
      let totalBeta = 0;
      let numPlayers = 0;

      let maxXTilt = 0;
      let maxYTilt = 0;
      let maxGamma = 0;
      let maxBeta = 0;

      for (let id in tiltValues) {
        if (maxXTilt < tiltValues[id].xTilt) {
          maxXTilt = tiltValues[id].xTilt;
        }
        if (maxYTilt < tiltValues[id].yTilt) {
          maxYTilt = tiltValues[id].yTilt;
        }

        if (maxGamma < tiltValues[id].gamma) {
          maxGamma = tiltValues[id].gamma;
        }

        if (maxBeta < tiltValues[id].beta) {
          maxBeta = tiltValues[id].beta;
        }

        totalXTilt += tiltValues[id].xTilt;
        totalYTilt += tiltValues[id].yTilt;
        totalGamma += tiltValues[id].gamma;
        totalBeta += tiltValues[id].beta;
        numPlayers++;
      }

      let avgXTilt;
      let avgYTilt;
      let avgGamma;
      let avgBeta;

      if (numPlayers === 4) {
        avgXTilt = maxXTilt;
        avgYTilt = maxYTilt; // Corrected here
        avgGamma = maxGamma;
        avgBeta = maxBeta;
      } else if (numPlayers > 0) {
        // Check to avoid division by zero
        avgXTilt = totalXTilt / numPlayers;
        avgYTilt = totalYTilt / numPlayers;
        avgGamma = totalGamma / numPlayers;
        avgBeta = totalBeta / numPlayers;
      } else {
        avgXTilt = avgYTilt = avgGamma = avgBeta = 0;
      }

      updateBallsPosition(avgXTilt, avgYTilt);
      checkWin();
      io.emit("tiltCanvas", { avgGamma, avgBeta });
      io.emit("plotPlayers", users);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    users = users.filter((user) => user.id !== socket.id);
    console.log("Users: ", users);
    if (users.length === 0) {
      isGameStarted = false;
      isGameOver = true;
      io.emit("reloadTab");
      io.disconnectSockets();
    }
    socket.broadcast.emit("plotPlayers", users);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
