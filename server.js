const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const mysql = require('mysql');





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
  socket.on('connect', function () {
    var currentUsername = socket.id;
    localStorage.setItem('currentUsername', currentUsername);
    io.emit('new username', socket.id);
  });

  socket.on('connect', function () {
    var currentGroupName = socket.id;
    localStorage.setItem('currentGroupName', currentGroupName);
    io.emit('new group name', socket.id);
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

  const connection = mysql.createConnection({
    host: 'chat_db',
    user: 'root',
    password: 'password',
    database: 'chat_db'
  });

  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_name VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  connection.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL database!');
  });

  connection.query(createTableQuery, (err, result) => {
    if (err) throw err;
    console.log('Messages table created!');
  });
  socket.on('chat message', (data) => {
    const { msg, userId, group } = data;
    const insertMessageQuery = `
    INSERT INTO messages (group_name, user_id, message)
    VALUES (?, ?, ?);
  `;
    connection.query(insertMessageQuery, [group, userId, msg], (err, result) => {
      if (err) throw err;
      console.log('Message saved to database!');
    });
    if (data.group) {
      io.to(data.group).emit('chat message', { msg: data.msg, userId: socket.id });
    } else {
      io.emit('chat message', { msg: data.msg, userId: socket.id });
    }
  });
  socket.on('load messages', (group) => {
    const selectMessagesQuery = `
    SELECT * FROM messages WHERE group_name = ? ORDER BY timestamp ASC;
  `;
    connection.query(selectMessagesQuery, [group], (err, results) => {
      if (err) throw err;
      results.forEach((result) => {
        socket.emit('chat message', {
          msg: result.message,
          userId: result.user_id,
          timestamp: result.timestamp
        });
      });
    });
  });
})

server.listen(3000, () => {
  console.log('In ascolto su http://localhost:3000');
});