const io = require('socket.io')(5000, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

console.log("🚀 AUDIO-ONLY Server auf Port 5000 bereit");

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    socket.join(userId);
    console.log(`[Socket] User im System: ${userId}`);
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`[Socket] Raum beigetreten: ${roomId}`);
  });

  socket.on('call-user', (data) => {
    console.log(`[Socket] Anruf von ${data.callerId} -> ${data.targetId}`);
    socket.to(data.targetId).emit('incoming-call', data);
  });

  socket.on('signal', (data) => {
    // Leitet Offer, Answer und ICE-Candidates weiter
    socket.to(data.roomId).emit('signal', data);
  });

  socket.on('speech-status', ({ roomId, isSpeaking }) => {
    socket.to(roomId).emit('speech-status', { isSpeaking });
  });

  socket.on('disconnect', () => {
    console.log("[Socket] Verbindung getrennt.");
  });
});