const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/groups.html', (req, res) => {
  res.sendFile(__dirname + '/groups.html');
});

io.on('connection', (socket) => {
  console.log('User Connected');
  io.emit('chat message', { msg: 'Online', userId: 'system' });

  socket.on('disconnect', () => {
    console.log('User Disconnected');
    io.emit('chat message', { msg: 'Offline', userId: 'system' });
  });

  socket.on('join group', (group) => {
    socket.join(group);
    io.to(group).emit('chat message', { msg: `User ${socket.id} joined ${group}`, userId: 'system' });
  });

  socket.on('leave group', (group) => {
    socket.leave(group);
    io.to(group).emit('chat message', { msg: `User ${socket.id} left ${group}`, userId: 'system' });
    socket.emit('left group', group); 
  });

  socket.on('chat message', (data) => {
    if (data.group) {
      io.to(data.group).emit('chat message', { msg: data.msg, userId: socket.id });
    } else {
      io.emit('chat message', { msg: data.msg, userId: socket.id });
    }
  });
});

server.listen(3000, () => {
  console.log('In ascolto su http://localhost:3000');
});
