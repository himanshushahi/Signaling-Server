import { createServer } from "http";
import { Server } from "socket.io";
import express from 'express';
import cors from 'cors';

const app = express();

// Configure CORS middleware for Express
app.use(cors());

// Create the HTTP server
const httpServer = createServer(app);

// Configure CORS for Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: "*", // You can specify a specific origin instead of "*"
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log("A user connected");

  // Create a room
  socket.on("create-room", (roomId) => {
    socket.join(roomId);
    let room = rooms.get(roomId);

    if (!room) {
      room = { members: new Set() };
      rooms.set(roomId, room);
    }

    room.members.add(socket.id);
    socket.emit("all-users", Array.from(room.members));
    console.log(`User ${socket.id} created and joined room: ${roomId}`);
  });

  // Join an existing room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    let room = rooms.get(roomId);

    if (!room) {
      room = { members: new Set() };
      rooms.set(roomId, room);
    }

    room.members.add(socket.id);
    socket.emit("all-users", Array.from(room.members));
    socket.to(roomId).emit("user-joined", socket.id);
    console.log(`User ${socket.id} joined room: ${roomId}`);
  });

  socket.on("offer", ({ userId, offer }) => {
    io.to(userId).emit("offer", { userId: socket.id, offer });
  });

  socket.on("answer", ({ userId, answer }) => {
    io.to(userId).emit("answer", { userId: socket.id, answer });
  });

  socket.on("message", ({ message, roomId }) => {
    io.to(roomId).emit("incoming-message", message);
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    // Handle user disconnection from all rooms
    rooms.forEach((room, roomId) => {
      if (room.members.has(socket.id)) {
        room.members.delete(socket.id);
        socket.to(roomId).emit("user-disconnected", socket.id);
      }
    });
  });
});

httpServer.listen(4000, () => console.log('Server is listening on port 4000'));
