// Firebase init
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, update } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-database.js";

// Twoja konfiguracja Firebase
const firebaseConfig = {
  apiKey: "TU_WKLEJ_SWOJE_APIKEY",
  authDomain: "TU_WKLEJ_SWOJE_AUTHDOMAIN",
  databaseURL: "TU_WKLEJ_SWOJE_DATABASEURL",
  projectId: "TU_WKLEJ_SWOJE_PROJECTID",
  storageBucket: "TU_WKLEJ_SWOJE_STORAGEBUCKET",
  messagingSenderId: "TU_WKLEJ_SWOJE_MESSAGINGID",
  appId: "TU_WKLEJ_SWOJE_APPID"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// HTML elements
const playerNameInput = document.getElementById('playerName');
const roomCodeInput = document.getElementById('roomCode');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const loginMsg = document.getElementById('loginMsg');

const loginDiv = document.getElementById('login');
const gameDiv = document.getElementById('game');
const roomDisplay = document.getElementById('roomDisplay');
const playerList = document.getElementById('playerList');
const startGameBtn = document.getElementById('startGameBtn');
const roundDiv = document.getElementById('round');
const yourWord = document.getElementById('yourWord');
const revealBtn = document.getElementById('revealBtn');
const voteList = document.getElementById('voteList');
const voteMsg = document.getElementById('voteMsg');
const timer = document.getElementById('timer');
const hostPanel = document.getElementById('hostPanel');
const scoreList = document.getElementById('scoreList');
const nextRoundBtn = document.getElementById('nextRoundBtn');

let playerName, roomCode, isHost = false;
let playerId, playersData = {};
let currentWord = '', impostorId = '';

// Przyciski
createBtn.onclick = createRoom;
joinBtn.onclick = joinRoom;
startGameBtn.onclick = startGame;
revealBtn.onclick = revealWord;
nextRoundBtn.onclick = startNewRound;

// Funkcje
function createRoom() {
  playerName = playerNameInput.value.trim();
  roomCode = roomCodeInput.value.trim();
  if (!playerName || !roomCode) return loginMsg.innerText = "Podaj imię i kod pokoju!";
  
  isHost = true;
  playerId = 'player_' + Date.now();
  const roomRef = ref(db, 'rooms/' + roomCode);
  set(roomRef, {
    host: playerId,
    players: {}
  });
  joinRoomInternal();
}

function joinRoom() {
  playerName = playerNameInput.value.trim();
  roomCode = roomCodeInput.value.trim();
  if (!playerName || !roomCode) return loginMsg.innerText = "Podaj imię i kod pokoju!";
  
  joinRoomInternal();
}

function joinRoomInternal() {
  playerId = 'player_' + Date.now();
  const playersRef = ref(db, `rooms/${roomCode}/players/${playerId}`);
  set(playersRef, {name: playerName});
  
  loginDiv.style.display = 'none';
  gameDiv.style.display = 'block';
  roomDisplay.innerText = roomCode;
  
  if (isHost) startGameBtn.style.display = 'block';
  hostPanel.style.display = isHost ? 'block' : 'none';
  
  listenPlayers();
}

function listenPlayers() {
  const roomRef = ref(db, 'rooms/' + roomCode + '/players');
  onValue(roomRef, (snapshot) => {
    playersData = snapshot.val() || {};
    playerList.innerHTML = '';
    for (let pid in playersData) {
      const li = document.createElement('li');
      li.innerText = playersData[pid].name;
      playerList.appendChild(li);
    }
    
    if (isHost && Object.keys(playersData).length === 4) {
      startGameBtn.disabled = false;
    } else {
      startGameBtn.disabled = true;
    }
  });
}

function startGame() {
  // Losowanie impostora i hasła
  const playerIds = Object.keys(playersData);
  impostorId = playerIds[Math.floor(Math.random() * playerIds.length)];
  currentWord = getRandomWord();
  
  for (let pid of playerIds) {
    const wordToSet = pid === impostorId ? 'IMPOSTOR' : currentWord;
    update(ref(db, `rooms/${roomCode}/players/${pid}`), {word: wordToSet, vote: null});
  }
  
  roundDiv.style.display = 'block';
  yourWord.innerText = playersData[playerId]?.word || '';
}

function revealWord() {
  alert(`Poprawne hasło: ${currentWord}\nImpostor: ${playersData[impostorId].name}`);
}

// Funkcja do losowania słowa
function getRandomWord() {
  const words = ['kot', 'meme', 'selfie', 'pizza', 'telefon', 'tiktok', 'gry', 'netflix', 'książka', 'pizza', 'film', 'muzyka', 'laptop', 'kawa', 'rower', 'wakacje', 'impreza', 'hasło', 'internet', 'snap', 'hasztag', 'viral', 'fryzura'];
  return words[Math.floor(Math.random() * words.length)];
}

// Placeholder dla następnej rundy
function startNewRound() {
  startGame();
}
