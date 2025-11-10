import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, push, get, update, onValue } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// 🔹 Wstaw tutaj swoją konfigurację Firebase
const firebaseConfig = {
    apiKey: "TWOJE_API_KEY",
    authDomain: "TWOJE_AUTH_DOMAIN",
    databaseURL: "TWOJE_DATABASE_URL",
    projectId: "TWOJE_PROJECT_ID",
    storageBucket: "TWOJE_STORAGE_BUCKET",
    messagingSenderId: "TWOJE_SENDER_ID",
    appId: "TWOJE_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---------- ZMIENNE ----------
let playerName = "";
let roomCode = "";
let isHost = false;
let playerId = "";
let playersData = {};
let round = 1;
let gameStarted = false;

// ---------- ELEMENTY ----------
const entryDiv = document.getElementById('entry');
const lobbyDiv = document.getElementById('lobby');
const gameDiv = document.getElementById('game');
const playerListEl = document.getElementById('playerList');
const hostControls = document.getElementById('hostControls');
const startGameBtn = document.getElementById('startGameBtn');
const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const wordDisplay = document.getElementById('wordDisplay');
const submitWordDiv = document.getElementById('submitWordDiv');
const playerWordInput = document.getElementById('playerWord');
const submitWordBtn = document.getElementById('submitWordBtn');
const voteDiv = document.getElementById('voteDiv');
const voteListEl = document.getElementById('voteList');
const roundResults = document.getElementById('roundResults');
const roundInfo = document.getElementById('roundInfo');
const nextRoundBtn = document.getElementById('nextRoundBtn');
const roundNumberEl = document.getElementById('roundNumber');

// ---------- PRZYCISKI ----------
document.getElementById('createBtn').addEventListener('click', createRoom);
document.getElementById('joinBtn').addEventListener('click', joinRoom);
startGameBtn.addEventListener('click', startGame);
submitWordBtn.addEventListener('click', submitWord);
nextRoundBtn.addEventListener('click', nextRound);

// ---------- FUNKCJE ----------

// Generowanie losowego kodu pokoju
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Stworzenie pokoju przez hosta
async function createRoom() {
    playerName = document.getElementById('playerName').value.trim();
    if (!playerName) return alert("Podaj imię!");

    roomCode = generateRoomCode();
    playerId = push(ref(db, 'rooms/' + roomCode + '/players')).key;
    isHost = true;

    await set(ref(db, 'rooms/' + roomCode), {
        host: playerName,
        gameStarted: false,
        round: 1,
        impostor: null,
        word: null
    });

    await set(ref(db, 'rooms/' + roomCode + '/players/' + playerId), {
        name: playerName,
        word: "",
        vote: null,
        score: 0
    });

    enterLobby();
}

// Dołączenie do istniejącego pokoju
async function joinRoom() {
    playerName = document.getElementById('playerName').value.trim();
    if (!playerName) return alert("Podaj imię!");

    roomCode = document.getElementById('roomCodeJoin').value.trim();
    if (!roomCode) return alert("Podaj kod pokoju!");

    const roomSnap = await get(ref(db, 'rooms/' + roomCode));
    if (!roomSnap.exists()) return alert("Pokój nie istnieje!");

    const playersSnap = await get(ref(db, 'rooms/' + roomCode + '/players'));
    if (Object.keys(playersSnap.val() || {}).length >= 4) return alert("Pokój pełny!");

    playerId = push(ref(db, 'rooms/' + roomCode + '/players')).key;
    await set(ref(db, 'rooms/' + roomCode + '/players/' + playerId), {
        name: playerName,
        word: "",
        vote: null,
        score: 0
    });

    enterLobby();
}

// Wejście do lobby
function enterLobby() {
    entryDiv.style.display = 'none';
    lobbyDiv.style.display = 'block';
    roomCodeDisplay.textContent = roomCode;

    if (isHost) hostControls.style.display = 'block';

    // Nasłuchiwanie graczy
    const playersRef = ref(db, 'rooms/' + roomCode + '/players');
    onValue(playersRef, (snapshot) => {
        playersData = snapshot.val() || {};
        renderPlayers();
    });
}

// Wyświetlenie listy graczy
function renderPlayers() {
    playerListEl.innerHTML = '';
    Object.entries(playersData).forEach(([id, data]) => {
        const li = document.createElement('li');
        li.textContent = data.name;
        playerListEl.appendChild(li);
    });
}

// Rozpoczęcie gry przez hosta
async function startGame() {
    if (Object.keys(playersData).length < 4) return alert("Potrzebni są 4 gracze!");
    const playerIds = Object.keys(playersData);
    const impostorIndex = Math.floor(Math.random() * 4);
    const words = ["MEM", "TikTok", "Pizza", "Netflix", "Selfie", "Viral", "Kot", "Siema"];
    const chosenWord = words[Math.floor(Math.random() * words.length)];

    await update(ref(db, 'rooms/' + roomCode), {
        gameStarted: true,
        impostor: playerIds[impostorIndex],
        word: chosenWord,
        round: 1
    });

    startRound();
}

// Rozpoczęcie rundy
function startRound() {
    lobbyDiv.style.display = 'none';
    gameDiv.style.display = 'block';
    round = 1;
    roundNumberEl.textContent = round;

    updateWordDisplay();
}

// Wyświetlenie słowa lub "IMPOSTOR"
function updateWordDisplay() {
    const currentPlayer = playersData[playerId];
    if (!currentPlayer) return;

    const roomRef = ref(db, 'rooms/' + roomCode);
    get(roomRef).then(snapshot => {
        const roomData = snapshot.val();
        if (playerId === roomData.impostor) {
            wordDisplay.textContent = "IMPOSTOR";
        } else {
            wordDisplay.textContent = roomData.word;
        }
    });
}

// Wysłanie słowa przez gracza
async function submitWord() {
    const word = playerWordInput.value.trim();
    if (!word) return;
    await update(ref(db, 'rooms/' + roomCode + '/players/' + playerId), {
        word
    });
    submitWordDiv.style.display = 'none';
    startVoting();
}

// Rozpoczęcie głosowania
function startVoting() {
    voteDiv.style.display = 'block';
    voteListEl.innerHTML = '';
    Object.entries(playersData).forEach(([id, data]) => {
        if (id !== playerId) {
            const li = document.createElement('li');
            li.textContent = data.name;
            li.addEventListener('click', () => castVote(id));
            voteListEl.appendChild(li);
        }
    });
}

// Oddanie głosu
async function castVote(votedId) {
    await update
