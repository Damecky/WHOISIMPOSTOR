// Twoja konfiguracja Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAy1mE_Q3fJo9W2Aa9EQUqp0L0Bn53XPHc",
  authDomain: "impostor-game-ebc12.firebaseapp.com",
  databaseURL: "https://impostor-game-ebc12-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "impostor-game-ebc12",
  storageBucket: "impostor-game-ebc12.appspot.com",
  messagingSenderId: "561452405867",
  appId: "1:561452405867:web:24fb4cdf0320c2c3488d2e",
  measurementId: "G-DKBLTBFHJ5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Dane gry
let playerName, roomCode, playerId;
let roomRef, playersRef, currentWord, impostorId;
let round = 1;
const totalRounds = 10;

// Funkcja dołączenia
function joinRoom() {
  playerName = document.getElementById('playerName').value.trim();
  roomCode = document.getElementById('roomCode').value.trim();
  if (!playerName || !roomCode) return alert("Podaj imię i kod pokoju");

  document.getElementById('login').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('roomDisplay').innerText = roomCode;

  roomRef = database.ref('rooms/' + roomCode);
  playersRef = roomRef.child('players');

  playerId = playersRef.push({name: playerName, points: 0, vote: null}).key;

  listenPlayers();
  listenRound();
}

// Wyświetlanie listy graczy
function listenPlayers() {
  playersRef.on('value', snapshot => {
    const playersListDiv = document.getElementById('playersList');
    playersListDiv.innerHTML = '';
    snapshot.forEach(child => {
      const data = child.val();
      const btn = document.createElement('button');
      btn.innerText = data.name;
      btn.onclick = () => vote(child.key);
      playersListDiv.appendChild(btn);
    });
  });
}

// Rozpoczęcie rundy
function listenRound() {
  roomRef.child('round').on('value', snap => {
    if (!snap.exists()) {
      startNewRound();
    } else {
      const roundData = snap.val();
      currentWord = roundData.word;
      impostorId = roundData.impostorId;
      showWordSection();
    }
  });
}

// Sekcja z hasłem
function showWordSection() {
  const wordSection = document.getElementById('wordSection');
  wordSection.style.display = 'block';
  document.getElementById('wordDisplay').innerText = (playerId === impostorId) ? "IMPOSTOR" : currentWord;
}

// Pokazanie głosowania
function showVoting() {
  document.getElementById('voteButton').disabled = true;
  const votingSection = document.getElementById('votingSection');
  votingSection.style.display = 'block';
}

// Oddanie głosu
function vote(targetId) {
  playersRef.child(playerId).update({vote: targetId});
  checkVotingComplete();
}

// Sprawdzenie czy wszyscy zagłosowali
function checkVotingComplete() {
  playersRef.once('value', snap => {
    const players = snap.val();
    let allVoted = true;
    Object.values(players).forEach(p => {
      if (!p.vote) allVoted = false;
    });
    if (allVoted) endRound(players);
  });
}

// Zakończenie rundy
function endRound(players) {
  let pointsText = '';
  let impostor = players[impostorId];
  let impostorGuessed = false;

  for (const [id, p] of Object.entries(players)) {
    if (p.vote === impostorId) {
      database.ref('rooms/' + roomCode + '/players/' + p.name).child('points').transaction(x => (x||0)+2);
      impostorGuessed = true;
    }
  }
  if (!impostorGuessed) {
    database.ref('rooms/' + roomCode + '/players/' + impostorId).child('points').transaction(x => (x||0)+3);
  }

  document.getElementById('roundResult').style.display = 'block';
  document.getElementById('revealedWord').innerText = currentWord;
  document.getElementById('roundPoints').innerText = pointsText;
}

// Nowa runda
function startNewRound() {
  const words = ["mem", "selfie", "TikTok", "pizza", "kot", "laptop", "gra", "viral", "telefon", "kino"];
  currentWord = words[Math.floor(Math.random()*words.length)];

  playersRef.once('value', snap => {
    const keys = Object.keys(snap.val()||{});
    impostorId = keys[Math.floor(Math.random()*keys.length)];
    roomRef.child('round').set({word: currentWord, impostorId: impostorId});
    // Reset głosów
    keys.forEach(k => playersRef.child(k).update({vote:null}));
  });
}

function nextRound() {
  round++;
  if (round > totalRounds) {
    alert("Gra zakończona!");
    return;
  }
  document.getElementById('roundResult').style.display = 'none';
  startNewRound();
}
