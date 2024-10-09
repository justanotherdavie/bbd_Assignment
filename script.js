document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const rows = 20;
  const cols = 20;
  const cellSize = canvas.width / cols;

  const grid = [];
  const stack = [];
  let ball = { x: 0, y: 0, radius: cellSize / 4, speed: 0.05, dx: 0, dy: 0 };

  class Cell {
    constructor(row, col) {
      this.row = row;
      this.col = col;
      this.visited = false;
      this.walls = [true, true, true, true]; // top, right, bottom, left
    }

    draw() {
      const x = this.col * cellSize;
      const y = this.row * cellSize;
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;

      if (this.walls[0]) ctx.strokeRect(x, y, cellSize, 0); // top
      if (this.walls[1]) ctx.strokeRect(x + cellSize, y, 0, cellSize); // right
      if (this.walls[2]) ctx.strokeRect(x, y + cellSize, cellSize, 0); // bottom
      if (this.walls[3]) ctx.strokeRect(x, y, 0, cellSize); // left

      if (this.visited) {
        ctx.fillStyle = 'white';
        ctx.fillRect(x, y, cellSize, cellSize);
      }
    }

    checkNeighbors() {
      const neighbors = [];

      const top = grid[this.index(this.row - 1, this.col)];
      const right = grid[this.index(this.row, this.col + 1)];
      const bottom = grid[this.index(this.row + 1, this.col)];
      const left = grid[this.index(this.row, this.col - 1)];

      if (top && !top.visited) neighbors.push(top);
      if (right && !right.visited) neighbors.push(right);
      if (bottom && !bottom.visited) neighbors.push(bottom);
      if (left && !left.visited) neighbors.push(left);

      if (neighbors.length > 0) {
        const randomIndex = Math.floor(Math.random() * neighbors.length);
        return neighbors[randomIndex];
      } else {
        return undefined;
      }
    }

    index(row, col) {
      if (row < 0 || col < 0 || row >= rows || col >= cols) {
        return -1;
      }
      return row * cols + col;
    }
  }

  function setup() {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cell = new Cell(row, col);
        grid.push(cell);
      }
    }

    const start = grid[0];
    start.visited = true;
    stack.push(start);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const cell of grid) {
      cell.draw();
    }

    if (stack.length > 0) {
      const current = stack[stack.length - 1];
      const next = current.checkNeighbors();

      if (next) {
        next.visited = true;
        stack.push(next);

        removeWalls(current, next);
      } else {
        stack.pop();
      }
    }

    updateBallPosition();
    drawBall();
    requestAnimationFrame(draw);
  }

  function removeWalls(a, b) {
    const x = a.col - b.col;
    if (x === 1) {
      a.walls[3] = false;
      b.walls[1] = false;
    } else if (x === -1) {
      a.walls[1] = false;
      b.walls[3] = false;
    }

    const y = a.row - b.row;
    if (y === 1) {
      a.walls[0] = false;
      b.walls[2] = false;
    } else if (y === -1) {
      a.walls[2] = false;
      b.walls[0] = false;
    }
  }

  function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x * cellSize + cellSize / 2, ball.y * cellSize + cellSize / 2, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.closePath();
  }

  function updateBallPosition() {
    let newX = ball.x + ball.dx;
    let newY = ball.y + ball.dy;

    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows) {
      const currentCell = grid[ball.y * cols + ball.x];
      if (ball.dx > 0 && !currentCell.walls[1]) ball.x = newX;
      if (ball.dx < 0 && !currentCell.walls[3]) ball.x = newX;
      if (ball.dy > 0 && !currentCell.walls[2]) ball.y = newY;
      if (ball.dy < 0 && !currentCell.walls[0]) ball.y = newY;
    }
  }

  function handleOrientation(event) {
    const gamma = event.gamma; // left to right tilt in degrees
    const beta = event.beta; // front to back tilt in degrees

    ball.dx = gamma * ball.speed;
    ball.dy = beta * ball.speed;
  }

  window.addEventListener('deviceorientation', handleOrientation);

  setup();
  draw();
})