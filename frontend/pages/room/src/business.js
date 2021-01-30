class Business {
  constructor({room, media, view, socketBuilder, peerBuilder}) {
    this.room = room
    this.media = media
    this.view = view

    this.socketBuilder = socketBuilder
    this.peerBuilder = peerBuilder

    this.socket = {}
    this.currentStream = {}
    this.currentPeer = {}

    this.peers = new Map()
    this.usersRecordings = new Map()
  }

  static initialize(deps) {
    const instance = new Business(deps)
    return instance._init()
  }

  async _init() {
    this.view.configureRecordButton(this.onRecordPressed.bind(this))
    this.view.configureLeaveButton(this.onLeavePressed.bind(this))

    this.currentStream = await this.media.getCamera()
    this.socket = this.socketBuilder
      .setOnUserConnected(this.onUserConnected())
      .setOnUserDisconnected(this.onUserDisconnected())
      .build()

    this.currentPeer = await this.peerBuilder
      .setOnError(this.onPeerError())
      .setOnConnectionOpened(this.onPeerConnectionOpened())
      .setOnCallReceived(this.onPeerCallReceived())
      .setOnPeerStreamReceived(this.onPeerStreamReceived())
      .setOnCallError(this.onPeerCallError())
      .setOnCallClose(this.onPeerCallClose())
      .build()

    this.addVideoStream(this.currentPeer.id)
  }

  addVideoStream(userId, stream = this.currentStream) {
    const recorderInstance = new Recorder(userId, stream)
    this.usersRecordings.set(recorderInstance.filename, recorderInstance)
    if (this.recordingEnabled) {
      recorderInstance.startRecording()
    }
    const isCurrentId = userId === this.currentPeer.id
    this.view.renderVideo({
      userId,
      stream,
      isCurrentId
    })
  }

  onPeerConnectionOpened() {
    return (peer) => {
      const id = peer.id
      this.socket.emit('join-room', this.room, id)
    }
  }

  onUserConnected() {
    return userId => {
      console.log('user connected! sharing our stream', userId)
      this.currentPeer.call(userId, this.currentStream)
      /*
        const media = this.currentPeer.call(userId, this.currentStream);
        media.on("stream", (stream) => {
          this.addVideoStream(media.peer, stream);
        });
       */
    }
  }

  onUserDisconnected() {
    return userId => {
      console.log('user disconnected!', userId)
      if (this.peers.has(userId)) {
        this.peers.get(userId).call.close()
        this.peers.delete(userId)
        this.view.setParticipants(this.peers.size)
        this.view.removeVideoElement(userId)
        this.stopRecording(userId)
      }
    }
  }

  onPeerError() {
    return error => {
      console.error('error on peer!', error)
    }
  }

  onPeerCallReceived() {
    return call => {
      console.log('answering call')
      call.answer(this.currentStream)
    }
  }

  onPeerStreamReceived() {
    return (call, stream) => {
      const callerId = call.peer
      if (this.peers.has(callerId)) {
        return;
      }

      this.addVideoStream(callerId, stream)
      this.peers.set(callerId, {call})

      this.view.setParticipants(this.peers.size)
    }
  }
  onPeerCallError() {
    return (call, error) => {
      console.log('an call error occurred!', error)
      this.view.removeVideoElement(call.peer)
    }
  }
  onPeerCallClose() {
    return (call) => {
      console.log('an call closed!', call)
    }
  }

  onRecordPressed (recordEnabled) {
    this.recordingEnabled = recordEnabled
    for (const [userId, rec] of this.usersRecordings) {
      if (this.recordingEnabled) {
        rec.startRecording()
        continue
      }
      this.stopRecording(userId)
    }
  }

  onLeavePressed () {
    this.usersRecordings.forEach((userRecord) => {
      userRecord.download()
    })
  }

  async stopRecording(userId) {
    const usersRecordings = this.usersRecordings
    for (const [key, value] of usersRecordings) {
      const isContextUser = key.includes(userId)
      if (!isContextUser) continue;

      const rec = value
      const isRecordingActive = rec.recordingActive
      if (!isRecordingActive) continue
      await rec.stopRecording()
    }
  }

  playRecordings(userId) {
    const userRecordings = this.usersRecordings.get(userId)
    const videosURLs = userRecordings.getAllVideoURLs()
    videosURLs.map(url => {
      this.view.renderVideo({url, userId})
    })

  }
}
