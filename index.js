// Websocket server
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const PORT = process.env.PORT || 8080;
const WebSocket = require("ws");

// Egyszerűsítve: ne kelljen DOMAIN_NAME változó
const WEB_URL =
  process.env.NODE_ENV === "production"
    ? "/" // production-ban saját hostját használja
    : `http://localhost:${PORT}/`;

const wss = new WebSocket.Server({ server: server });

const cacheDuration = 1000 * 60 * 60 * 24 * 365; // 1 year

// Serve all the static files, (ex. index.html app.js style.css)
app.use(
  express.static("public", {
    maxAge: cacheDuration,
    setHeaders: (res, path) => {
      // Set caching headers
      res.setHeader("Cache-Control", `public, max-age=${cacheDuration}`);
      res.setHeader(
        "Expires",
        new Date(Date.now() + cacheDuration).toUTCString()
      );
    },
  })
);

server.listen(PORT, () =>
  console.log(`Listening on ${process.env.PORT || 8080}`)
);

// hashmap clients
const clients = {};
const games = {};
const players = {};
const spectators = {};

let dealer = null;
let gameOn = null;

wss.on("connection", (ws) => {
  ws.on("open", () => console.log("opened"));
  ws.on("close", () => {
    console.log("closed");
  });

  ws.on("message", (message) => {
    const result = JSON.parse(message);

    // a user want to create a new game
    if (result.method === "create") {
      const clientId = result.clientId;
      const playerSlot = result.playerSlot;
      const offline = result.offline;
      const roomId = partyId();
      const gameId = WEB_URL + roomId;

      app.get("/" + roomId, (req, res) => {
        res.sendFile(__dirname + "/public/index.html");
      });

      games[gameId] = {
        id: gameId,
        clients: [],
        players: [],
        dealer: dealer,
        gameOn: gameOn,
        player: playerSlot,
      };

      const payload = {
        method: "create",
        game: games[gameId],
      };

      ws.send(JSON.stringify(payload));
    }

    // ide jön a többi eredeti logika (join, bet, hit, stb.)
    // ...
  });
});

function partyId() {
  return Math.random().toString(36).substr(2, 5);
}
