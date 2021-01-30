const app = require('express')()
const http = require('http').createServer(app)
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
    credentials: false
  }
})

app.get('/', (req, res) => {
  res.send('<h1>Hello world</h1>')
})
const port = process.env.PORT || 3000
http.listen(port, () => {
  console.log('listening on *:', port)
})

io.on('connection', (socket) => {
  console.log('connection', socket.id)
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)
    socket.on('disconnected', () => {
      console.log('disconnected!', roomId, userId)
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})
