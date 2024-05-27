const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser()); 


const connection = mysql.createConnection({
  host: 'chat_db',
  user: 'root',
  password: 'password',
  database: 'chat_db'
});

connection.connect((err) => {
  if (err) throw err;
  console.log('Connesso al database MySQL!');

  const createMessagesTableQuery = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      group_name VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  const createUsersTableQuery = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL
    );
  `;
  connection.query(createMessagesTableQuery, (err, result) => {
    if (err) throw err;
    console.log('Tabella messages creata!');
  });
  connection.query(createUsersTableQuery, (err, result) => {
    if (err) throw err;
    console.log('Tabella users creata!');
  });
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/auth.html');
});

app.get('/index.html', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/groups.html', (req, res) => {
  res.sendFile(__dirname + '/groups.html');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  const insertUserQuery = `
    INSERT INTO users (username, password) VALUES (?, ?);
  `;
  connection.query(insertUserQuery, [username, password], (err, result) => {
    if (err) {
      console.error('Errore nella registrazione:', err);
      return res.status(500).send('Errore nella registrazione');
    }
    res.status(200).send('Registrazione avvenuta con successo');
  });
});

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
      res.cookie('username', username, { maxAge: 900000, httpOnly: true });
      res.status(200).json({ success: true, message: 'Login avvenuto con successo' });
    } else {
      res.status(401).json({ success: false, message: 'Credenziali non valide' });
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
        socket.emit('authenticated', username);

        console.log(`Utente ${username} autenticato`);

        io.emit('chat message', { msg: 'Online', userId: 'system' });

        socket.on('disconnect', () => {
          console.log('Utente Disconnesso');
          io.emit('chat message', { msg: 'Offline', userId: 'system' });
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
      }
    });
  });
});

server.listen(3000, () => {
  console.log('In ascolto su http://localhost:3000');
});
