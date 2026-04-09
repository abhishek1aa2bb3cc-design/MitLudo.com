const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// Serve static files
app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const games = new Map();
const waitingPlayers = [];

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('createGame', (name) => {
        const gameId = uuidv4().slice(0, 8);
        const game = {
            id: gameId,
            players: {},
            pieces: {},
            turn: null,
            diceValue: 0,
            state: 'waiting'
        };
        
        game.players[socket.id] = {
            id: socket.id,
            name: name || 'Player 1',
            color: 0,
            piecesInHome: 4,
            pieces: Array(4).fill().map((_, i) => ({
                id: `${socket.id}_${i}`,
                playerId: socket.id,
                position: -1 // -1 = home
            }))
        };
        
        games.set(gameId, game);
        socket.join(gameId);
        socket.gameId = gameId;
        
        socket.emit('gameCreated', { gameId, playerId: socket.id });
        io.to(gameId).emit('gameStateUpdate', game);
    });

    socket.on('joinRandomGame', (name) => {
        if (waitingPlayers.length > 0) {
            const hostId = waitingPlayers.shift();
            const gameId = hostId.gameId;
            const game = games.get(gameId);
            
            game.players[socket.id] = {
                id: socket.id,
                name: name || 'Player 2',
                color: 1,
                piecesInHome: 4,
                pieces: Array(4).fill().map((_, i) => ({
                    id: `${socket.id}_${i}`,
                    playerId: socket.id,
                    position: -1
                }))
            };
            
            game.turn = Object.keys(game.players)[0];
            game.state = 'playing';
            
            socket.join(gameId);
            socket.gameId = gameId;
            
            io.to(gameId).emit('playerJoined', {
                gameId,
                playerId: socket.id,
                players: game.players
            });
            io.to(gameId).emit('gameStateUpdate', game);
            io.to(gameId).emit('yourTurn', game.turn);
            
        } else {
            waitingPlayers.push(socket);
            socket.emit('waitingForOpponent');
        }
    });

    socket.on('diceRolled', (data) => {
        const game = games.get(data.gameId);
        if (game && game.turn === data.playerId && game.state === 'playing') {
            game.diceValue = data.diceValue;
            io.to(data.gameId).emit('diceRolled', data);
            
            if (data.diceValue !== 6) {
                const players = Object.keys(game.players);
                const currentIndex = players.indexOf(data.playerId);
                game.turn = players[(currentIndex + 1) % players.length];
                io.to(data.gameId).emit('yourTurn', game.turn);
            }
        }
    });

    socket.on('movePiece', (data) => {
        const game = games.get(data.gameId);
        if (game && game.turn === data.playerId) {
            // Update piece position (simplified logic)
            const piece = Object.values(game.pieces).find(p => p.id === data.pieceId);
            if (piece) {
                piece.position = data.newPosition;
                io.to(data.gameId).emit('gameStateUpdate', game);
                io.to(data.gameId).emit('opponentMoved', data);
                
                // Switch turn
                const players = Object.keys(game.players);
                const currentIndex = players.indexOf(data.playerId);
                game.turn = players[(currentIndex + 1) % players.length];
                io.to(data.gameId).emit('yourTurn', game.turn);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        // Clean up games if host disconnects
        if (socket.gameId && games.has(socket.gameId)) {
            const game = games.get(socket.gameId);
            delete game.players[socket.id];
            if (Object.keys(game.players).length === 0) {
                games.delete(socket.gameId);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Ludo server running on port ${PORT}`);
});