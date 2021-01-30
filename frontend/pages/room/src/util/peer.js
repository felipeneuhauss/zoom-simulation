class PeerBuilder {
  constructor({peerConfig}) {
    this.peerConfig = peerConfig

    const defaultFunctionValue = () => {
    }
    this.onError = defaultFunctionValue
    this.onCallReceived = defaultFunctionValue
    this.onConnectionOpened = defaultFunctionValue
    this.onPeerStreamReceived = defaultFunctionValue
    this.onCallError = defaultFunctionValue
    this.onCallClose = defaultFunctionValue
  }

  setOnCallError(fn) {
    this.onCallError = fn
    return this
  }

  setOnCallClose(fn) {
    this.onCallClose = fn
    return this
  }

  setOnError(fn) {
    this.onError = fn

    return this
  }

  setOnCallReceived(fn) {
    this.onCallReceived = fn

    return this
  }

  setOnConnectionOpened(fn) {
    this.onConnectionOpened = fn

    return this
  }

  setOnPeerStreamReceived(fn) {
    this.onPeerStreamReceived = fn

    return this
  }

  _preparePeerInstanceFunction (peerModule) {
    class PeerCustomModule extends peerModule {}
    const peerCall = PeerCustomModule.prototype.call
    const context = this
    PeerCustomModule.prototype.call = function(id, stream) {
       const call = peerCall.apply(this, [id, stream])
       context._prepareCallEvent(call)

      return call
    }

    return PeerCustomModule
  }

  /**
   * @origin peer.on('call', function(call) {
   * @param call
   * @private
   */
  _prepareCallEvent(call) {
    console.log('call', call)
    call.on('stream', stream => this.onPeerStreamReceived(call, stream))
    call.on('error', error => this.onCallError(call, error))
    call.on('close', _ => this.onCallClose(call))

    // Answer with our streaming
    this.onCallReceived(call)
  }

  build() {
    // const peer = new Peer(...this.peerConfig)
    const PeerCustomInstance = this._preparePeerInstanceFunction(Peer)
    const peer = new PeerCustomInstance(...this.peerConfig)

    peer.on('error', this.onError)
    peer.on('call', this._prepareCallEvent.bind(this))

    return new Promise(resolve => peer.on('open', id => {
      this.onConnectionOpened(peer)
      return resolve(peer)
    }))
  }
}
