import { sign } from './keychain'
import type { Sender } from 'channel/channel'
import { Channel } from 'channel/client'

const defaultHubPort = Number(Bun.env.HUBPORT ?? 1997)
const v = '0'
export class Client {
  channel = new Channel()
  sender: Sender
  constructor(port: number = defaultHubPort) {
    this.sender = this.channel.connect(port, {
      headers: async () => ({ auth: await sign(), v }),
    })
  }
  post(path: string, body?: any) {
    return this.sender.send(path, body)
  }
}
