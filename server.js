const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('User Connected');

  socket.on('disconnect', () => {
    console.log('User Disconnected');
  });

  socket.on('chat message', (msg) => {
    io.emit('chat message', { msg: msg, userId: socket.id });
  });
});

server.listen(3000, () => {
  console.log('In ascolto su http://localhost:3000');
});
