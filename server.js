const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const WORLD_WIDTH = 1600; // 800px per user
const WORLD_HEIGHT = 800;
const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 120;
const BALL_SIZE = 20;
const WIN_SCORE = 15;

let gameState = {
    status: 'waiting', // waiting, playing, paused, gameover
    mode: 'normal', // normal, endless
    players: { left: null, right: null },
    score: { left: 0, right: 0 },
    highScore: 0,
    ball: { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2, dx: 0, dy: 0, speed: 8 },
    paddles: {
        left: { x: 50, y: WORLD_HEIGHT / 2 - PADDLE_HEIGHT / 2 },
        right: { x: WORLD_WIDTH - 50 - PADDLE_WIDTH, y: WORLD_HEIGHT / 2 - PADDLE_HEIGHT / 2 }
    },
    eckbertMode: false
};

function resetBall() {
    gameState.ball.x = WORLD_WIDTH / 2;
    gameState.ball.y = WORLD_HEIGHT / 2;
    gameState.ball.speed = 8;
    const dirX = Math.random() > 0.5 ? 1 : -1;
    const dirY = (Math.random() * 2 - 1);
    gameState.ball.dx = dirX * gameState.ball.speed;
    gameState.ball.dy = dirY * gameState.ball.speed;
}

function resetGame() {
    gameState.score = { left: 0, right: 0 };
    gameState.status = (gameState.players.left && gameState.players.right) ? 'playing' : 'waiting';
    resetBall();
}

io.on('connection', (socket) => {
    console.log('Neuer Client verbunden:', socket.id);
    socket.emit('gameState', gameState);

    socket.on('join', (side) => {
        if (gameState.players[side] === null) {
            gameState.players[side] = socket.id;
            socket.side = side;
            console.log(`Spieler ${socket.id} ist beigetreten als ${side}`);

            if (gameState.status === 'paused' || gameState.status === 'gameover') {
                resetGame();
            } else if (gameState.players.left && gameState.players.right) {
                gameState.status = 'playing';
                resetBall();
            }
            io.emit('gameState', gameState);
        }
    });

    socket.on('move', (data) => {
        if (socket.side && gameState.status === 'playing') {
            gameState.paddles[socket.side].y = data.y;
            gameState.paddles[socket.side].y = Math.max(0, Math.min(WORLD_HEIGHT - PADDLE_HEIGHT, gameState.paddles[socket.side].y));
        }
    });

    socket.on('toggleMode', (mode) => {
        gameState.mode = mode;
        resetGame();
        io.emit('gameState', gameState);
    });

    socket.on('triggerEasterEgg', () => {
        gameState.eckbertMode = !gameState.eckbertMode;
        io.emit('playSound', 'quack');
        io.emit('gameState', gameState);
    });

    socket.on('disconnect', () => {
        console.log('Client getrennt:', socket.id);
        if (socket.side) {
            gameState.players[socket.side] = null;
            gameState.status = 'paused';
            io.emit('gameState', gameState);
        }
    });
});

// Game Loop
setInterval(() => {
    if (gameState.status === 'playing') {
        let b = gameState.ball;
        b.x += b.dx;
        b.y += b.dy;

        // Oben/Unten Kollision
        if (b.y <= 0 || b.y + BALL_SIZE >= WORLD_HEIGHT) {
            b.dy *= -1;
        }

        // Paddle Kollision
        let pLeft = gameState.paddles.left;
        let pRight = gameState.paddles.right;

        if (b.dx < 0 && b.x <= pLeft.x + PADDLE_WIDTH && b.x + BALL_SIZE >= pLeft.x && b.y + BALL_SIZE >= pLeft.y && b.y <= pLeft.y + PADDLE_HEIGHT) {
            b.dx *= -1;
            b.x = pLeft.x + PADDLE_WIDTH;
            b.speed += 0.5; // SPEEED!
            b.dx = b.speed;
        }

        if (b.dx > 0 && b.x + BALL_SIZE >= pRight.x && b.x <= pRight.x + PADDLE_WIDTH && b.y + BALL_SIZE >= pRight.y && b.y <= pRight.y + PADDLE_HEIGHT) {
            b.dx *= -1;
            b.x = pRight.x - BALL_SIZE;
            b.speed += 0.5;
            b.dx = -b.speed;
        }


        if (b.x < 0) {
            gameState.score.right++;
            checkWin('right');
        } else if (b.x > WORLD_WIDTH) {
            gameState.score.left++;
            checkWin('left');
        }

        io.emit('gameState', gameState);
    }
}, 1000 / 60);

function checkWin(scorer) {
    if (gameState.mode === 'endless') {
        if (gameState.score[scorer] > gameState.highScore) {
            gameState.highScore = gameState.score[scorer];
        }
        resetBall();
    } else {
        if (gameState.score[scorer] >= WIN_SCORE) {
            gameState.status = 'gameover';
        } else {
            resetBall();
        }
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT} 🦆`);
});