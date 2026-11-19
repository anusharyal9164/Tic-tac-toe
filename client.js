// Author: Anush Aryal
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const ws = new WebSocket(`${protocol}//${window.location.host}`);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("status");
const loginStatus = document.getElementById("loginStatus");
const joinBtn = document.getElementById("joinBtn");
const resetBtn = document.getElementById("resetBtn");
const usernameInput = document.getElementById("username");

const CELL_SIZE = 200;
let myRole = null;
let currentBoard = Array(9).fill("");
let currentTurn = "X";
let gameWinner = null;

joinBtn.addEventListener("click", () => {
    const username = usernameInput.value.trim();
    if (!username) {
        alert("Please enter a username.");
        return;
    }
    ws.send(JSON.stringify({ type: 'joinGame', username }));
});

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'assignedRole') {
        myRole = data.role;
        loginStatus.textContent = `Logged in as ${data.username} (${myRole})`;
        document.getElementById("login-container").style.display = "none";
    }

    if (data.type === 'gameState') {
        currentBoard = data.board;
        currentTurn = data.currentPlayer;
        gameWinner = data.winner;

        if (gameWinner) {
            if (gameWinner === "Draw") {
                statusText.textContent = "It's a Draw!";
            } else {
                statusText.textContent = `Winner: ${gameWinner}`;
            }
        } else {
            statusText.textContent = `Current Turn: Player ${currentTurn}`;
        }
        drawBoard();
    }
};

canvas.addEventListener("click", (event) => {
    if (!myRole || myRole === "Spectator" || gameWinner || currentTurn !== myRole) {
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const col = Math.floor(mouseX / CELL_SIZE);
    const row = Math.floor(mouseY / CELL_SIZE);
    const index = row * 3 + col;

    if (currentBoard[index] !== "") {
        return;
    }

    ws.send(JSON.stringify({ type: 'makeMove', index }));
});

resetBtn.addEventListener("click", () => {
    ws.send(JSON.stringify({ type: 'resetGame' }));
});

function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawPieces();
}

function drawGrid() {
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(200, 0); ctx.lineTo(200, 600);
    ctx.moveTo(400, 0); ctx.lineTo(400, 600);
    ctx.moveTo(0, 200); ctx.lineTo(600, 200);
    ctx.moveTo(0, 400); ctx.lineTo(600, 400);
    ctx.stroke();
}

function drawPieces() {
    for (let i = 0; i < currentBoard.length; i++) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = col * CELL_SIZE;
        const y = row * CELL_SIZE;
        if (currentBoard[i] === "X") {
            drawX(x, y);
        } else if (currentBoard[i] === "O") {
            drawO(x, y);
        }
    }
}

function drawX(x, y) {
    ctx.beginPath();
    ctx.moveTo(x + 30, y + 30);
    ctx.lineTo(x + 170, y + 170);
    ctx.moveTo(x + 170, y + 30);
    ctx.lineTo(x + 30, y + 170);
    ctx.stroke();
}

function drawO(x, y) {
    ctx.beginPath();
    ctx.arc(x + 100, y + 100, 70, 0, Math.PI * 2);
    ctx.stroke();
}

drawBoard();
