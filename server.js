const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


const groups = {};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('User Connected');

  socket.on('disconnect', () => {
    console.log('User Disconnected');
    Object.keys(groups).forEach(group => {
      if (groups[group].includes(socket.id)) {
        groups[group] = groups[group].filter(userId => userId !== socket.id);
        io.to(group).emit('user left', { userId: socket.id });
      }
    });
  });

  socket.on('create group', (groupName) => {
    groups[groupName] = [socket.id];
    socket.join(groupName);
    socket.emit('group created', groupName);
    console.log(`User ${socket.id} created and joined group ${groupName}`);
  });


  socket.on('chat message', (msgData) => {
    io.to(msgData.group).emit('chat message', { msg: msgData.msg, userId: socket.id });
  });
});

server.listen(3000, () => {
  console.log('In ascolto su http://localhost:3000');
});
