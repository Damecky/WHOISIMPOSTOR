import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, push, get, onValue, update } from "firebase/database";

const firebaseConfig = {
  apiKey: "TWOJE_API_KEY",
  authDomain: "TWOJ_PROJEKT.firebaseapp.com",
  databaseURL: "https://TWOJ_PROJEKT-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "TWOJ_PROJEKT",
  storageBucket: "TWOJ_PROJEKT.appspot.com",
  messagingSenderId: "TWOJE_ID",
  appId: "TWOJE_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// UI
const entryDiv = document.getElementById('entry');
const lobbyDiv = document.getElementById('lobby');
const gameDiv = document.getElementById('game');

const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const startGameBtn = document.getElementById('startGameBtn');
const nextRoundBtn = document.getElementById('nextRoundBtn');

const playerList = document.getElementById('playerList');
const voteList = document.getElementById('voteList');

const roomCodeDisplay = document.getElementById('roomCodeDisplay');
const roundNumberEl = document.getElementById('roundNumber');
const yourWordEl = document.getElementById('yourWord');
const roundResultEl = document.getElementById('roundResult');

const lobbyInfo = document.getElementById('lobbyInfo');
const hostControls = document.getElementById('hostControls');

let playerName, roomCode, playerId, isHost, playersData, impostorId, word, round = 0, maxRounds = 10;
const wordsList = ["kot", "meme", "pizza", "TikTok", "telefon", "selfie", "czipsy", "viral", "komputer", "rower"]; // Dodaj więcej haseł

// Event listeners
createBtn.onclick = createRoom;
joinBtn.onclick = joinRoom;
startGameBtn.onclick = startGame;
nextRoundBtn.onclick = newRound;

// Functions
function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function createRoom() {
    playerName = document.getElementById('playerName').value.trim();
    if (!playerName) return alert("Podaj imię!");
    roomCode = generateRoomCode();
    playerId = push(ref(db, 'rooms/' + roomCode + '/players')).key;
    isHost = true;

    await set(ref(db, 'rooms/' + roomCode), { host: playerName, gameStarted: false, round:0 });
    await set(ref(db, `rooms/${roomCode}/players/${playerId}`), { name: playerName, vote:null, score:0 });

    enterLobby();
}

async function joinRoom() {
    playerName = document.getElementById('playerName').value.trim();
    roomCode = document.getElementById('roomCodeJoin').value.trim();
    if (!playerName || !roomCode) return alert("Podaj dane!");

    const roomSnap = await get(ref(db, 'rooms/' + roomCode));
    if (!roomSnap.exists()) return alert("Pokój nie istnieje!");
    const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
    if (Object.keys(playersSnap.val() || {}).length >= 4) return alert("Pokój pełny!");

    playerId = push(ref(db, `rooms/${roomCode}/players`)).key;
    isHost = false;
    await set(ref(db, `rooms/${roomCode}/players/${playerId}`), { name: playerName, vote:null, score:0 });

    enterLobby();
}

function enterLobby() {
    entryDiv.style.display = 'none';
    lobbyDiv.style.display = 'block';
    roomCodeDisplay.textContent = roomCode;

    if (isHost) hostControls.style.display = 'block';

    const playersRef = ref(db, `rooms/${roomCode}/players`);
    onValue(playersRef, snapshot => {
        playersData = snapshot.val() || {};
        renderPlayers();
        if (isHost) {
            const numPlayers = Object.keys(playersData).length;
            lobbyInfo.textContent = `Gracze: ${numPlayers}/4`;
            startGameBtn.disabled = numPlayers !== 4;
        }
    });
}

function renderPlayers() {
    playerList.innerHTML = '';
    for (let id in playersData) {
        let li = document.createElement('li');
        li.textContent = playersData[id].name;
        playerList.appendChild(li);
    }
}

// START GAME
async function startGame() {
    if (!isHost) return;
    round = 1;
    await set(ref(db, `rooms/${roomCode}/gameStarted`), true);
    startRound();
}

async function startRound() {
    roundNumberEl.textContent = round;
    // Losowanie słowa i impostora
    let playerIds = Object.keys(playersData);
    impostorId = playerIds[Math.floor(Math.random()*playerIds.length)];
    word = wordsList[Math.floor(Math.random()*wordsList.length)];

    for (let id of playerIds) {
        await update(ref(db, `rooms/${roomCode}/players/${id}`), {
            word: id === impostorId ? "IMPOSTOR" : word,
            vote: null
        });
    }

    // Pokaz słowo graczowi
    showWord();
}

// Pokaz słowa
function showWord() {
    const player = playersData[playerId];
    yourWordEl.textContent = `Twoje słowo: ${player.word}`;
    gameDiv.style.display = 'block';
    lobbyDiv.style.display = 'none';

    // Pokaż głosowanie po 10s
    setTimeout(() => { setupVoting(); }, 10000);
}

// Ustawianie głosowania
function setupVoting() {
    voteList.innerHTML = '';
    const voteSection = document.getElementById('voteSection');
    voteSection.style.display = 'block';

    for (let id in playersData) {
        if (id !== playerId) {
            let li = document.createElement('li');
            li.textContent = playersData[id].name;
            li.onclick = () => vote(id);
            voteList.appendChild(li);
        }
    }
}

// Głosowanie
async function vote(votedId) {
    await update(ref(db, `rooms/${roomCode}/players/${playerId}`), { vote:votedId });
    voteList.querySelectorAll('li').forEach(li => li.style.pointerEvents='none');
    checkVotes();
}

// Sprawdzenie czy wszyscy zagłosowali
async function checkVotes() {
    const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
    const players = playersSnap.val();
    let allVoted = Object.values(players).every(p => p.vote !== null);
    if (allVoted) endRound();
}

// Koniec rundy i punktacja
async function endRound() {
    const playersSnap = await get(ref(db, `rooms/${roomCode}/players`));
    const players = playersSnap.val();

    // Punktacja
    let impostorCaught = 0;
    for (let id in players) {
        if (players[id].vote === impostorId) {
            players[id].score += 2;
            impostorCaught++;
        }
    }
    if (impostorCaught===0) players[impostorId].score +=3;

    // Aktualizacja punktów w DB
    for (let id in players) {
        await update(ref(db, `rooms/${roomCode}/players/${id}`), { score: players[id].score });
    }

    roundResultEl.textContent = `Impostor to: ${playersData[impostorId].name}. Poprawne słowo: ${word}`;
    nextRoundBtn.style.display = 'block';
}

// Nowa runda
function newRound() {
    nextRoundBtn.style.display = 'none';
    roundResultEl.textContent = '';
    round++;
    if (round > maxRounds) {
        alert("Koniec gry!");
        location.reload();
    } else {
        startRound();
    }
}

