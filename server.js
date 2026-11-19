// Author: Anush Aryal
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'public' folder
app.use(express.static('public'));

let players = []; // Stores connected players (Max 2 players, rest spectators)
let board = Array(9).fill("");
let currentPlayer = "X";
let winner = null;

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial game state to newly connected client
    socket.emit('gameState', {
        board,
        currentPlayer,
        winner,
        playersCount: players.length
    });

    // Handle user joining the game
    socket.on('joinGame', (data) => {
        let role = "Spectator";
        if (players.length < 2) {
            role = players.length === 0 ? "X" : "O";
            players.push({ id: socket.id, name: data.username, role });
        } else {
            players.push({ id: socket.id, name: data.username, role: "Spectator" });
        }

        socket.emit('assignedRole', { role, username: data.username });
        io.emit('updatePlayers', players);
    });

    // Handle player moves
    socket.on('makeMove', (index) => {
        const player = players.find(p => p.id === socket.id);
        if (!player || player.role !== currentPlayer || winner || board[index] !== "") {
            return;
        }

        board[index] = currentPlayer;
        winner = checkWinner();

        if (!winner && board.includes("")) {
            currentPlayer = currentPlayer === "X" ? "O" : "X";
        }

        io.emit('gameState', {
            board,
            currentPlayer,
            winner,
            playersCount: players.length
        });
    });

    // Handle game reset
    socket.on('resetGame', () => {
        board = Array(9).fill("");
        currentPlayer = "X";
        winner = null;
        io.emit('gameState', {
            board,
            currentPlayer,
            winner,
            playersCount: players.length
        });
    });

    // Handle client disconnection
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        const index = players.findIndex(p => p.id === socket.id);
        if (index !== -1) {
            players.splice(index, 1);
            // Reset game state on player disconnect
            board = Array(9).fill("");
            currentPlayer = "X";
            winner = null;
            players.forEach((p, idx) => {
                p.role = idx === 0 ? "X" : (idx === 1 ? "O" : "Spectator");
            });
            io.emit('gameState', { board, currentPlayer, winner, playersCount: players.length });
        }
    });
});

function checkWinner() {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];
    for (const line of lines) {
        const [a, b, c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    if (!board.includes("")) return "Draw";
    return null;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
