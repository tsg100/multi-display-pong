const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let mySide = null;
let currentState = null;

let secretCode = ['e', 'n', 't', 'e'];
let keyPresses = [];

document.addEventListener('keydown', (e) => {
    keyPresses.push(e.key.toLowerCase());
    if (keyPresses.length > secretCode.length) keyPresses.shift();
    if (keyPresses.join('') === secretCode.join('')) {
        socket.emit('triggerEasterEgg');
        keyPresses = [];
    }
});

socket.on('gameState', (state) => {
    currentState = state;
    updateUI();
});

socket.on('playSound', (sound) => {
    if (sound === 'quack') {
        //TODO: add sound to res
        console.log('🦆 QUAAAACK!');
    }
});

function join(side) {
    mySide = side;
    socket.emit('join', side);
    document.getElementById('connection-screen').style.display = 'none';
}

function toggleMode() {
    const isEndless = document.getElementById('endless-toggle').checked;
    socket.emit('toggleMode', isEndless ? 'endless' : 'normal');
}

function updateUI() {
    const statusMsg = document.getElementById('status-message');
    if (!currentState) return;

    if (currentState.status === 'waiting') {
        statusMsg.style.display = 'block';
        statusMsg.innerText = "Warte auf 2. Spieler...";
    } else if (currentState.status === 'paused') {
        statusMsg.style.display = 'block';
        statusMsg.innerText = "Spiel pausiert (Verbindungsabbruch)";
    } else if (currentState.status === 'gameover') {
        statusMsg.style.display = 'block';
        let winner = currentState.score.left >= 15 ? "Links" : "Rechts";
        statusMsg.innerText = `Spiel vorbei! ${winner} gewinnt!`;
    } else {
        statusMsg.style.display = 'none';
    }
}

canvas.addEventListener('mousemove', (e) => {
    if (mySide && currentState && currentState.status === 'playing') {
        const rect = canvas.getBoundingClientRect();
        const y = e.clientY - rect.top - (120 / 2);
        socket.emit('move', { y: y });
    }
});

// Render Loop
function draw() {
    if (!currentState) {
        requestAnimationFrame(draw);
        return;
    }

    ctx.fillStyle = currentState.eckbertMode ? '#1a2e1a' : '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (mySide === 'right') {
        ctx.translate(-800, 0);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(800, 0);
    ctx.lineTo(800, 800);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.fillRect(currentState.paddles.left.x, currentState.paddles.left.y, 20, 120);
    ctx.fillRect(currentState.paddles.right.x, currentState.paddles.right.y, 20, 120);

    if (currentState.eckbertMode) {
        ctx.font = "30px Arial";
        ctx.fillText("🦆", currentState.ball.x - 10, currentState.ball.y + 10);
    } else {
        ctx.fillStyle = '#ff4757';
        ctx.fillRect(currentState.ball.x, currentState.ball.y, 20, 20);
    }

    ctx.font = '60px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(currentState.score.left, 400, 100);
    ctx.fillText(currentState.score.right, 1200, 100);

    if (currentState.mode === 'endless') {
        ctx.font = '30px Arial';
        ctx.fillStyle = '#feca57';
        ctx.fillText(`All-Time Highscore: ${currentState.highScore}`, 800 - 150, 50);
    }

    ctx.restore();
    requestAnimationFrame(draw);
}

draw();