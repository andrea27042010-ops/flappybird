var container = document.getElementById('game-container');
var birdElement = document.getElementById('bird');
var uiScore = document.getElementById('ui-score');
var tapHint = document.getElementById('tap-hint');
var btnPause = document.getElementById('btn-pause');
var pauseScreen = document.getElementById('pause-screen');

var gameWidth = 0;
var gameHeight = 0;
var username = "";
var score = 0;
var gameInterval;
var isReady = false;  
var isPlaying = false; 
var isPaused = false; 

// Costanti Motore Fisico
var birdY = 0;
var birdVelocity = 0;
var gravity = 0.4;
var jump = -7.5;
var birdRadius = 15;
var birdHeight = 32; 

// Configurazione Ostacoli (Tubi)
var pipes = [];
var pipeWidth = 75;
var pipeSpeed = 4;
var spawnRate = 90; 
var frameCount = 0;

// ==========================================
// APPLICAZIONE AVVIO E PERSISTENZA LOCALSTORAGE
// ==========================================

function updateHomeDisplay() {
    var classifica = JSON.parse(localStorage.getItem('flappy_leaderboard')) || [];
    var best = classifica.length > 0 ? classifica[0].score : 0;
    document.getElementById('best-score-display').innerText = "Record: " + best;
    aggiornaClassificaVisiva(classifica);
}

// Caricamento iniziale dei record
updateHomeDisplay();

document.getElementById('btn-pc').addEventListener('click', function() {
    container.className = "mode-pc";
    setTimeout(function() { aggiornaMisure(); mostraRegistrazione(); }, 50);
});

document.getElementById('btn-mobile').addEventListener('click', function() {
    container.className = "mode-mobile";
    setTimeout(function() { aggiornaMisure(); mostraRegistrazione(); }, 50);
});

function aggiornaMisure() {
    gameWidth = container.clientWidth;
    gameHeight = container.clientHeight;
}

function mostraRegistrazione() {
    document.getElementById('device-screen').classList.add('hidden');
    document.getElementById('registration-screen').classList.remove('hidden');
    if(username) document.getElementById('username-input').value = username;
}

document.getElementById('btn-back-device').addEventListener('click', function() {
    document.getElementById('registration-screen').classList.add('hidden');
    document.getElementById('device-screen').classList.remove('hidden');
});

// ==========================================
// MACCHINA A STATI: STRUTTURA DEL GAME LOOP
// ==========================================

function prepareGame() {
    aggiornaMisure();
    birdY = gameHeight / 2;
    birdVelocity = 0;
    score = 0;
    frameCount = 0;
    isPaused = false;

    uiScore.innerText = "0";
    uiScore.style.display = "block";
    btnPause.classList.add('hidden'); 
    birdElement.style.display = "block";
    birdElement.style.top = birdY + "px";
    birdElement.style.transform = "rotate(0deg)";
    tapHint.style.display = "block"; 

    var clearPipes = container.querySelectorAll('.pipe-container');
    clearPipes.forEach(function(p) { p.remove(); });
    pipes = [];

    isReady = true; 
    isPlaying = false;
}

function startMovement() {
    isReady = false;
    isPlaying = true;
    tapHint.style.display = "none"; 
    btnPause.classList.remove('hidden'); 
    gameInterval = setInterval(gameLoop, 1000 / 60);
    birdVelocity = jump; 
}

function gameLoop() {
    if (isPaused) return;

    // Elaborazione Vettoriale Fisica
    birdVelocity += gravity;
    birdY += birdVelocity;

    if (birdY <= 0) { birdY = 0; birdVelocity = 0.5; }
    var limitePavimento = gameHeight - birdHeight;
    if (birdY >= limitePavimento) { birdY = limitePavimento; birdVelocity = 0; }

    birdElement.style.top = birdY + "px";
    var angle = Math.min(Math.max(birdVelocity * 4, -20), 70);
    birdElement.style.transform = "rotate(" + angle + "deg)";

    // Generazione ad intervalli regolari degli ostacoli
    frameCount++;
    if (frameCount % spawnRate === 0) spawnPipePair();

    // Scorrimento array e verifica Hitbox di scontro
    for (var i = pipes.length - 1; i >= 0; i--) {
        var pipe = pipes[i];
        pipe.x -= pipeSpeed;
        pipe.containerDiv.style.left = pipe.x + "px";

        var birdX = 80; 
        if (birdX + birdRadius > pipe.x && birdX - birdRadius < pipe.x + pipeWidth) {
            if (pipe.type === 'top' && birdY < pipe.height) { gameOver(); return; }
            if (pipe.type === 'bottom' && birdY + birdRadius > gameHeight - pipe.height) { gameOver(); return; }
        }

        // Verifica superamento per assegnazione punteggio unico
        if (pipe.type === 'top' && !pipe.passed && pipe.x + pipeWidth / 2 < birdX) {
            pipe.passed = true;
            score++;
            uiScore.innerText = score;
        }

        // Garbage Collection elementi obsoleti
        if (pipe.x + pipeWidth + 50 < 0) {
            pipe.containerDiv.remove();
            pipes.splice(i, 1);
        }
    }
}

function spawnPipePair() {
    var minHeight = 80; 
    var randomGap = Math.floor(Math.random() * (240 - 180 + 1)) + 180;
    var maxTopHeight = gameHeight - randomGap - minHeight;
    var topHeight = Math.floor(Math.random() * (maxTopHeight - minHeight + 1)) + minHeight;
    var bottomHeight = gameHeight - topHeight - randomGap;

    var top = document.createElement('div');
    top.className = 'pipe-container';
    top.style.height = topHeight + "px";
    top.style.top = "0px";
    top.style.left = gameWidth + "px";
    top.innerHTML = '<div class="pipe-body"></div><div class="pipe-head" style="bottom: 0px;"></div>';

    var bottom = document.createElement('div');
    bottom.className = 'pipe-container';
    bottom.style.height = bottomHeight + "px";
    bottom.style.bottom = "0px";
    bottom.style.left = gameWidth + "px";
    bottom.innerHTML = '<div class="pipe-body"></div><div class="pipe-head" style="top: 0px;"></div>';

    container.appendChild(top);
    container.appendChild(bottom);

    pipes.push({ x: gameWidth, height: topHeight, type: 'top', containerDiv: top, passed: false });
    pipes.push({ x: gameWidth, height: bottomHeight, type: 'bottom', containerDiv: bottom });
}

// ==========================================
// GESTIONE DEGLI INPUT UTENTE (MOUSEDOWN / TOUCH / TASTIERA)
// ==========================================

function togglePause() {
    if (!isPlaying) return; 
    isPaused = !isPaused;
    if (isPaused) {
        document.getElementById('pause-current-score').innerText = "Punteggio: " + score;
        pauseScreen.classList.remove('hidden');
        btnPause.innerText = "RIPRENDI";
    } else {
        pauseScreen.classList.add('hidden');
        btnPause.innerText = "PAUSA";
    }
}

btnPause.addEventListener('click', function(e) { e.stopPropagation(); togglePause(); });
document.getElementById('btn-resume').addEventListener('click', function(e) { e.stopPropagation(); togglePause(); });

function gestisciInput() {
    if (isPaused) return; 
    if (isReady) startMovement();
    else if (isPlaying) birdVelocity = jump;
}

container.addEventListener('mousedown', function(e) { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') gestisciInput(); });
container.addEventListener('touchstart', function(e) { if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') gestisciInput(); });
window.addEventListener('keydown', function(e) {
    if (e.keyCode === 32 || e.keyCode === 38) {
        e.preventDefault();
        gestisciInput();
    }
    if (e.keyCode === 80) togglePause();
});

// ==========================================
// GESTIONE FINE GIOCO E REGISTRAZIONI
// ==========================================

function gameOver() {
    isPlaying = false;
    clearInterval(gameInterval);
    uiScore.style.display = "none";
    btnPause.classList.add('hidden'); 
    
    document.getElementById('final-score').innerText = "Punteggio: " + score;
    document.getElementById('gameover-screen').classList.remove('hidden');
    
    var classifica = JSON.parse(localStorage.getItem('flappy_leaderboard')) || [];
    var isNewRecord = classifica.length === 0 || score > classifica[0].score;
    
    if (isNewRecord && score > 0) {
        document.getElementById('new-record-tag').classList.remove('hidden');
    } else {
        document.getElementById('new-record-tag').classList.add('hidden');
    }
    
    salvaEClassifica(username, score);
}

function salvaEClassifica(user, punti) {
    var classifica = JSON.parse(localStorage.getItem('flappy_leaderboard')) || [];
    classifica.push({ username: user, score: punti });
    classifica.sort(function(a, b) { return b.score - a.score; });
    classifica = classifica.slice(0, 5);
    localStorage.setItem('flappy_leaderboard', JSON.stringify(classifica));
    aggiornaClassificaVisiva(classifica);
}

function aggiornaClassificaVisiva(data) {
    var box = document.getElementById('leaderboard-content');
    box.innerHTML = "";
    data.forEach(function(item, index) {
        box.innerHTML += `<div class="leaderboard-item">
            <span>${index + 1}. ${item.username}</span>
            <strong>${item.score}</strong>
        </div>`;
    });
}

document.getElementById('btn-register').addEventListener('click', function() {
    var val = document.getElementById('username-input').value.trim();
    if (val) { username = val; document.getElementById('registration-screen').classList.add('hidden'); prepareGame(); }
    else alert("Inserisci un nome!");
});

document.getElementById('btn-restart').addEventListener('click', function() {
    document.getElementById('gameover-screen').classList.add('hidden');
    prepareGame();
});

document.getElementById('btn-home').addEventListener('click', function() {
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('device-screen').classList.remove('hidden');
    updateHomeDisplay();
});