import { FrontendPacket } from './frontend_packet'

export class FrontendPacketFactory {
    static create(data) {
        return new FrontendPacket(data)
    }

    static wrap(data) {
        return { packet: FrontendPacketFactory.create(data) }
    }
}
