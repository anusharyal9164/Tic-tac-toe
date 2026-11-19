// Author: Anush Aryal
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files from the 'public' folder
app.use(express.static('public'));

let players = []; // Stores connected players (Max 2 players, rest spectators)
let gameState = {
    board: Array(9).fill(""),
    currentPlayer: "X",
    winner: null
};

wss.on('connection', (ws) => {
    console.log('Client connected');

    // Send initial game state to newly connected client
    ws.send(JSON.stringify({ type: "gameState", board: gameState.board, currentPlayer: gameState.currentPlayer, winner: gameState.winner }));

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        // Handle user joining the game
        if (data.type === "joinGame") {
            let role = "Spectator";
            if (players.length < 2) {
                role = players.length === 0 ? "X" : "O";
                players.push({ ws, name: data.username, role });
            } else {
                players.push({ ws, name: data.username, role: "Spectator" });
            }

            // Send assigned role back to client
            ws.send(JSON.stringify({
                type: "assignedRole",
                role: role,
                username: data.username
            }));
            
            broadcastState();
        }

        // Handle player moves
        if (data.type === "makeMove") {
            const player = players.find(p => p.ws === ws);
            if (!player || player.role !== gameState.currentPlayer || gameState.winner || gameState.board[data.index] !== "") {
                return;
            }

            gameState.board[data.index] = gameState.currentPlayer;
            gameState.winner = checkWinner();

            if (!gameState.winner && gameState.board.includes("")) {
                gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X";
            }

            broadcastState();
        }

        // Handle game reset
        if (data.type === "resetGame") {
            gameState = {
                board: Array(9).fill(""),
                currentPlayer: "X",
                winner: null
            };
            broadcastState();
        }
    });

    ws.on('close', () => {
        console.log('Client connected');
        const index = players.findIndex(p => p.ws === ws);
        if (index !== -1) {
            players.splice(index, 1);
            gameState = {
                board: Array(9).fill(""),
                currentPlayer: "X",
                winner: null
            };
            players.forEach((p, idx) => {
                p.role = idx === 0 ? "X" : (idx === 1 ? "O" : "Spectator");
                p.ws.send(JSON.stringify({ type: "assignedRole", role: p.role, username: p.name }));
            });
            broadcastState();
        }
    });
});

function broadcastState() {
    const message = JSON.stringify({
        type: "gameState",
        board: gameState.board,
        currentPlayer: gameState.currentPlayer,
        winner: gameState.winner
    });
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

function checkWinner() {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const line of lines) {
        const [a, b, c] = line;
        if (gameState.board[a] && gameState.board[a] === gameState.board[b] && gameState.board[a] === gameState.board[c]) {
            return gameState.board[a];
        }
    }
    if (!gameState.board.includes("")) return "Draw";
    return null;
}

// Lab 4 requirement: dynamic port assignment and 0.0.0.0 binding for Render[cite: 7, 10]
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
