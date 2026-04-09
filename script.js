const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

const games = new Map();
const waitingRoom = [];

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);

    socket.on('createGame', (name) => {
        const gameId = uuidv4().slice(0, 8);
        games.set(gameId, {
            id: gameId,
            players: { [socket.id]: { id: socket.id, name, color: 0, pieces: [] } },
            turn: socket.id,
            state: 'waiting'
        });
        
        socket.playerName = name;
        socket.gameId = gameId;
        socket.emit('gameCreated', { gameId, playerId: socket.id });
    });

    socket.on('joinRandomGame', (name) => {
        if (waitingRoom.length > 0) {
            const targetSocketId = waitingRoom.shift();
            const game = games.get(targetSocketId.gameId);
            game.players[socket.id] = {
                id: socket.id,
                name,
                color: Object.keys(game.players).length,
                pieces: []
            };
            game.state = 'playing';
            game.turn = Object.keys(game.players)[0];
            
            socket.join(targetSocketId.gameId);
            io.to(targetSocketId.gameId).emit('playerJoined', {
                gameId: targetSocketId.gameId,
                playerId: socket.id,
                color: Object.keys(game.players).length - 1,
                players: game.players
            });
            
            socket.gameId = targetSocketId.gameId;
            socket.playerName = name;
        } else {
            waitingRoom.push(socket);
            socket.emit('waitingForOpponent');
        }
    });

    socket.on('diceRolled', (data) => {
        const game = games.get(data.gameId);
        if (game && game.turn === data.playerId) {
            game.diceValue = data.diceValue;
            io.to(data.gameId).emit('diceRolled', data);
            
            if (data.diceValue !== 6) {
                // Switch turn
                const players = Object.keys(game.players);
                const currentIndex = players.indexOf(data.playerId);
                game.turn = players[(currentIndex + 1) % players.length];
                io.to(data.gameId).emit('yourTurn', game.turn);
            }
        }
    });

    socket.on('movePiece', (data) => {
        // Validate and process move
        const game = games.get(data.gameId);
        if (game && game.turn === data.playerId) {
            // Update piece position (simplified)
            io.to(data.gameId).emit('opponentMoved', data);
            
            // Check win condition
            // if (checkWinCondition(game, data.playerId)) {
            //     io.to(data.gameId).emit('playerWon', game.players[data.playerId]);
            // }
            
            const players = Object.keys(game.players);
            const currentIndex = players.indexOf(data.playerId);
            game.turn = players[(currentIndex + 1) % players.length];
            io.to(data.gameId).emit('yourTurn', game.turn);
        }
   