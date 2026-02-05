const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static('../client'));

const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store connected users with their socket IDs
const users = {};

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', (username) => {
        users[username] = socket.id;
        socket.username = username;
        console.log(`${username} registered with ID: ${socket.id}`);
    });
    
    // Handle call request
    socket.on('call-user', ({ to, offer, from }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            console.log(`Call from ${from} to ${to}`);
            io.to(toSocketId).emit('incoming-call', {
                from,
                offer,
                others
            });
        } else {
            socket.emit('user-unavailable', to);
        }
    });
    
    // Handle call answer
    socket.on('call-accepted', ({ to, answer, from }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit('call-accepted', {
                from,
                answer,
                others
            });
        }
    });
    
    // Handle ICE candidates
    socket.on('ice-candidate', ({ candidate, to, from }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit('ice-candidate', {
                candidate,
                from
            });
        }
    });
    
    // Handle call rejection
    socket.on('reject-call', ({ to, from }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit('call-rejected', { from });
        }
    });
    
    // Handle hangup
    socket.on('hangup', ({ to, from }) => {
        const toSocketId = users[to];
        if (toSocketId) {
            io.to(toSocketId).emit('call-ended', { from });
        }
    });
    
    // Handle user list request
    socket.on('get-users', () => {
        const onlineUsers = Object.keys(users).filter(username => users[username] !== socket.id);
        socket.emit('users-list', onlineUsers);
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.username) {
            delete users[socket.username];
            console.log(`${socket.username} disconnected`);
            io.emit('user-disconnected', socket.username);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});