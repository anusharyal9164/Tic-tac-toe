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
    ws.send(JSON.stringify({ type: "state", gameState }));

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            return;
        }

        // Handle login / joining the game
        if (data.type === "login") {
            let role = "spectator";
            if (players.length < 2) {
                role = players.length === 0 ? "X" : "O";
                players.push({ ws, name: data.name, role });
            } else {
                players.push({ ws, name: data.name, role: "spectator" });
            }

            // Send role assignment back to this client
            ws.send(JSON.stringify({
                type: "role",
                role: role,
                name: data.name
            }));
        }

        // Handle placing a piece ("place")
        if (data.type === "place") {
            const player = players.find(p => p.ws === ws);
            
            // Check if player has a valid role matching the current turn
            if (!player || player.role !== gameState.currentPlayer || gameState.winner || gameState.board[data.index] !== "") {
                ws.send(JSON.stringify({ type: "error", message: "Invalid move or not your turn!" }));
                return;
            }

            // Update board state
            gameState.board[data.index] = gameState.currentPlayer;
            
            // Check for winner
            gameState.winner = checkWinner();

            if (!gameState.winner && !gameState.board.includes("")) {
                gameState.winner = "Draw";
            } else if (!gameState.winner) {
                gameState.currentPlayer = gameState.currentPlayer === "X" ? "O" : "X";
            }

            // Broadcast updated state to all connected clients
            broadcast({ type: "state", gameState });
        }

        // Handle game reset
        if (data.type === "reset") {
            gameState = {
                board: Array(9).fill(""),
                currentPlayer: "X",
                winner: null
            };
            broadcast({ type: "state", gameState });
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        const index = players.findIndex(p => p.ws === ws);
        if (index !== -1) {
            players.splice(index, 1);
            
            // Reset board on player disconnect and reassign roles if needed
            gameState = {
                board: Array(9).fill(""),
                currentPlayer: "X",
                winner: null
            };
            players.forEach((p, idx) => {
                p.role = idx === 0 ? "X" : (idx === 1 ? "O" : "spectator");
                p.ws.send(JSON.stringify({ type: "role", role: p.role, name: p.name }));
            });
            broadcast({ type: "state", gameState });
        }
    });
});

// Helper function to broadcast messages to all connected clients
function broadcast(data) {
    const message = JSON.stringify(data);
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
    return null;
}

// Lab 4 requirement: dynamic port assignment and 0.0.0.0 binding for Render[cite: 7, 10]
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
