const express = require("express");
const app = express();
const http = require("http").Server(app);
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");

const uri =
  "mongodb+srv://test:9D2WHgQDV0r353sP@cluster0.68sth1g.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose
  .connect(uri)
  .then(() => {
    console.log("DB Connetion Successfull");
  })
  .catch((err) => {
    console.log(err.message);
  });

const PORT = 4000;
const socketIO = require("socket.io")(http, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));
app.use(express.json());
app.use(cors());

// Define schema for rooms
const roomSchema = new mongoose.Schema({
  id: String,
  name: String,
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: "Message" }],
});

// Create model for rooms
const Room = mongoose.model("Room", roomSchema);

//Define schema for messages

const messageSchema = new mongoose.Schema(
  {
    room_id: String,
    text: String,
    media: String,
    user: {
      _id: String,
      name: String,
      avatar: String,
    },
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);

const generateID = () => Math.random().toString(36).substring(2, 10);
let chatRooms = [
  // {
  //   id: generateID(),
  //   name: 'Novu Hangouts',
  //   messages: [
  //     {
  //       _id: generateID(),
  //       text: 'Hello guys, welcome!',
  //       createdAt: new Date(),
  //       user: {
  //         _id: 1,
  //         name: 'React Native',
  //         avatar: 'https://placeimg.com/140/140/any',
  //       },
  //     },
  //     {
  //       _id: generateID(),
  //       text: 'Hello guys, welcome!',
  //       createdAt: new Date(),
  //       user: {
  //         _id: 2,
  //         name: 'React Native',
  //         avatar: 'https://placeimg.com/140/140/any',
  //       },
  //     },
  //   ],
  // },
];

socketIO.on("connection", (socket) => {
  socket.on("joinRoom", (roomId) => {
    console.log(`User ${socket.id} joined room ${roomId}`);
    socket.join(roomId);
  });
  console.log(`⚡: ${socket.id} user just connected!`);

  socket.on("createRoom", async (name) => {
    try {
      // Create a new room object
      const newRoom = {
        id: generateID(),
        name,
        messages: [],
        attachment: [],
      };

      // Save the new room to the MongoDB database
      await Room.create(newRoom);

      // Join the room
      socket.join(name);

      // Add the new room to the chatRooms array
      chatRooms.unshift(newRoom);

      // Emit updated room list to all clients
      socket.emit("roomsList", chatRooms);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  });

  socket.on("findRoom", async (id) => {
    try {
      const messages = await Message.find({ room_id: id });

      socket.emit("foundRoom", messages);
    } catch (error) {
      console.error("Error finding room:", error);
    }
  });

  // socket.on('newMessage', data => {
  //   const {room_id, message, user, createAtstamp} = data;
  //   let result = chatRooms.filter(room => room.id == room_id);
  //   const newMessage = {
  //     _id: generateID(),
  //     text: message,
  //     user,
  //     createAt: `${createAtstamp.hour}:${createAtstamp.mins}`,
  //   };
  //   console.log('New Message', newMessage);
  //   socket.to(result[0].name).emit('roomMessage', newMessage);
  //   result[0].messages.push(newMessage);

  //   socket.emit('roomsList', chatRooms);
  //   socket.emit('foundRoom', result[0].messages);
  // });

  socket.on("newMessage", async (data) => {
    const { room_id, message, media, user, createdAt } = data;

    const newMessage = new Message({
      room_id,
      text: message,
      media: media,
      user,
      createdAt: new Date(),
    });

    try {
      // Save message to MongoDB
      await newMessage.save();

      // Emit message to room
      socket.to(room_id).emit("roomMessage", newMessage);
      console.log(room_id);

      // Emit updated room list
      // socket.emit('roomsList', chatRooms);
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    socket.disconnect();
    console.log("🔥: A user disconnected");
  });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(file, "File");

    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    console.log(file, "File");
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage: storage, limits: { fileSize: 20000000 } });

app.get("/api", async (req, res) => {
  const _res = await Room.find();

  res.json(_res);
});

app.get("/api/room/:roomId/messages", async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const messages = await Message.find({ room_id: roomId }).sort({
      createdAt: -1,
    });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Could not fetch messages" });
  }
});

app.post("/api/general/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const protocol = req.protocol;
  const host = req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
  return res
    .status(200)
    .json({ message: "File uploaded successfully", imageUrl: fileUrl });
});

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
