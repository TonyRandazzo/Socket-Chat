const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const mysql = require('mysql');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'chat_db'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL Database');
});

app.use(express.static(__dirname + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const selectUserQuery = `
    SELECT * FROM users WHERE username = ? AND password = ?;
  `;
  connection.query(selectUserQuery, [username, password], (err, results) => {
    if (err) {
      console.error('Errore nel login:', err);
      return res.status(500).send('Errore nel login');
    }
    if (results.length > 0) {
      res.status(200).send('Login avvenuto con successo');
    } else {
      res.status(401).send('Credenziali non valide');
    }
  });
});

io.on('connection', (socket) => {
  console.log('Utente Connesso');

  socket.on('authenticate', ({ username, password }) => {
    const selectUserQuery = `
      SELECT * FROM users WHERE username = ? AND password = ?;
    `;
    connection.query(selectUserQuery, [username, password], (err, results) => {
      if (err || results.length === 0) {
        socket.emit('authentication error', 'Credenziali non valide');
      } else {
        socket.username = username;
        socket.emit('authenticated');

        console.log(`Utente ${username} autenticato`);

        io.emit('chat message', { msg: 'Online', userId: 'system' });

        socket.on('disconnect', () => {
          console.log('Utente Disconnesso');
          io.emit('chat message', { msg: 'Offline', userId: 'system' });
        });

        socket.on('join group', (group) => {
          socket.join(group);
          io.to(group).emit('chat message', { msg: `Utente ${socket.username} ha unito ${group}`, userId: 'system' });
        });

        socket.on('leave group', (group) => {
          socket.leave(group);
          io.to(group).emit('chat message', { msg: `Utente ${socket.username} ha lasciato ${group}`, userId: 'system' });
          socket.emit('left group', group);
        });
      }
    });
  });

  socket.on('chat message', (data) => {
    const { msg, group } = data;
    const insertMessageQuery = `
      INSERT INTO messages (group_name, user_id, message)
      VALUES (?, ?, ?);
    `;
    connection.query(insertMessageQuery, [group, socket.username, msg], (err, result) => {
      if (err) throw err;
      console.log('Messaggio salvato nel database!');
    });
    if (data.group) {
      io.to(data.group).emit('chat message', { msg: data.msg, userId: socket.username });
    } else {
      io.emit('chat message', { msg: data.msg, userId: socket.username });
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

});
  
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
