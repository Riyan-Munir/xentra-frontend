export class FrontendPacket {
    constructor(data) {
        this.payload = data
        this.timestamp = Date.now()
        this.version = '1.0'
    }
}
