// Blackjack multiplayer server using Express + Socket.IO
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET","POST"] }
});

app.use(express.static('public'));

// Simple in-memory game state
const games = {}; // roomId -> { players: {}, deck: [], dealer: [], started: bool }

// Create new shuffled deck
function newDeck() {
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  let deck = [];
  for (let s of suits) for (let r of ranks) deck.push(r+s);
  // shuffle
  for (let i = deck.length-1; i>0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return deck;
}

// Get blackjack value of hand
function handValue(hand) {
  let val=0, aces=0;
  for (let c of hand) {
    let r=c.slice(0,-1);
    if (['J','Q','K'].includes(r)) val+=10;
    else if (r==='A') { val+=11; aces++; }
    else val+=parseInt(r);
  }
  while (val>21 && aces>0) { val-=10; aces--; }
  return val;
}

io.on('connection', (socket) => {
  console.log("connect", socket.id);

  socket.on('join', ({room, name}) => {
    room = room || 'lobby';
    socket.join(room);
    if (!games[room]) {
      games[room] = { players:{}, dealer:[], deck:[], started:false };
    }
    games[room].players[socket.id] = { id: name||socket.id, hand: [], bet:0, done:false };
    io.to(room).emit('state', games[room]);
  });

  socket.on('bet', ({room, amount}) => {
    if (!games[room]) return;
    const p=games[room].players[socket.id];
    if (p) { p.bet=amount; }
    io.to(room).emit('state', games[room]);
  });

  socket.on('start', (room) => {
    if (!games[room]) return;
    const g=games[room];
    g.deck=newDeck();
    g.dealer=[];
    for (let pid in g.players) {
      g.players[pid].hand=[g.deck.pop(), g.deck.pop()];
      g.players[pid].done=false;
    }
    g.dealer=[g.deck.pop(), g.deck.pop()];
    g.started=true;
    io.to(room).emit('state', g);
  });

  socket.on('hit', (room) => {
    const g=games[room]; if (!g) return;
    const p=g.players[socket.id]; if (!p || p.done) return;
    p.hand.push(g.deck.pop());
    if (handValue(p.hand)>=21) p.done=true;
    io.to(room).emit('state', g);
  });

  socket.on('stand', (room) => {
    const g=games[room]; if (!g) return;
    const p=g.players[socket.id]; if (!p) return;
    p.done=true;
    // if all done -> dealer plays
    if (Object.values(g.players).every(pp=>pp.done)) {
      while (handValue(g.dealer)<17) g.dealer.push(g.deck.pop());
    }
    io.to(room).emit('state', g);
  });

  socket.on('leave', (room) => {
    if (games[room] && games[room].players[socket.id]) {
      delete games[room].players[socket.id];
      socket.leave(room);
      io.to(room).emit('state', games[room]);
    }
  });

  socket.on('disconnect', () => {
    for (let room in games) {
      if (games[room].players[socket.id]) {
        delete games[room].players[socket.id];
        io.to(room).emit('state', games[room]);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=> console.log("Server on", PORT));
