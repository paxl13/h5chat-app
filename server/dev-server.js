const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const chokidar = require('chokidar');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const PORT = process.env.PORT || 3000;

const chatRooms = new Map();
const users = new Map();

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/hot-reload', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const watcher = chokidar.watch(path.join(__dirname, '..', 'public'), {
    ignored: /node_modules/,
    persistent: true,
  });

  watcher.on('change', (filepath) => {
    console.log(`File changed: ${filepath}`);
    res.write(`data: reload\n\n`);
  });

  req.on('close', () => {
    watcher.close();
  });
});

const hotReloadScript = `
<script>
(function() {
    if (typeof EventSource !== 'undefined') {
        const source = new EventSource('/hot-reload');
        source.onmessage = function(e) {
            if (e.data === 'reload') {
                console.log('Reloading page due to file change...');
                location.reload();
            }
        };
    }
})();
</script>
`;

app.get('*', (req, res, next) => {
  if (req.path.endsWith('.html')) {
    const filePath = path.join(__dirname, '..', 'public', req.path);
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        next();
        return;
      }
      const modifiedContent = content.replace(
        '</body>',
        hotReloadScript + '</body>',
      );
      res.send(modifiedContent);
    });
  } else {
    next();
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', (data) => {
    const { username, room } = data;
    const userId = uuidv4();

    users.set(socket.id, {
      id: userId,
      username: username || `User_${userId.slice(0, 8)}`,
      room: room || 'general',
    });

    const user = users.get(socket.id);
    socket.join(user.room);

    if (!chatRooms.has(user.room)) {
      chatRooms.set(user.room, {
        messages: [],
        users: new Set(),
      });
    }

    const roomData = chatRooms.get(user.room);
    roomData.users.add(socket.id);

    socket.emit('joinedRoom', {
      room: user.room,
      username: user.username,
      messages: roomData.messages,
    });

    socket.to(user.room).emit('userJoined', {
      username: user.username,
      timestamp: new Date().toISOString(),
    });

    io.to(user.room).emit('roomUsers', {
      users: Array.from(roomData.users)
        .map((sid) => {
          const u = users.get(sid);
          return u ? { username: u.username, id: u.id } : null;
        })
        .filter(Boolean),
    });
  });

  socket.on('message', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    const message = {
      id: uuidv4(),
      username: user.username,
      text: data.text,
      timestamp: new Date().toISOString(),
      room: user.room,
    };

    const roomData = chatRooms.get(user.room);
    if (roomData) {
      roomData.messages.push(message);

      if (roomData.messages.length > 100) {
        roomData.messages = roomData.messages.slice(-100);
      }
    }

    io.to(user.room).emit('message', message);
  });

  socket.on('typing', (data) => {
    const user = users.get(socket.id);
    if (!user) return;

    socket.to(user.room).emit('userTyping', {
      username: user.username,
      isTyping: data.isTyping,
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      const roomData = chatRooms.get(user.room);
      if (roomData) {
        roomData.users.delete(socket.id);

        if (roomData.users.size === 0) {
          setTimeout(() => {
            if (roomData.users.size === 0) {
              chatRooms.delete(user.room);
            }
          }, 300000);
        }

        socket.to(user.room).emit('userLeft', {
          username: user.username,
          timestamp: new Date().toISOString(),
        });

        io.to(user.room).emit('roomUsers', {
          users: Array.from(roomData.users)
            .map((sid) => {
              const u = users.get(sid);
              return u ? { username: u.username, id: u.id } : null;
            })
            .filter(Boolean),
        });
      }

      users.delete(socket.id);
    }
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(
    `Development server with hot reload running on http://localhost:${PORT}`,
  );
});
