const defaultHubPort = Number(Bun.env.HUBPORT ?? 1997)
export class Client {
  private id: number = 0
  port: number
  ws: WebSocket | undefined
  requests = new ObjectMap<number, PendingRequest>()
  constructor(port: number = defaultHubPort) {
    this.port = port
    this.connect()
  }
  connect() {
    const ws = new WebSocket(`ws://127.0.0.1:${this.port}`)
    ws.onopen = () => {
      this.ws = ws
      let batch: Request[] = this.requests.map(a => a.request)
      if (batch.length) {
        this.ws.send(JSON.stringify(batch))
      }
    }
    ws.onclose = () => {
      this.ws = undefined
      setTimeout(() => this.connect(), 1000)
    }
    ws.onmessage = message => {
      if (typeof message.data == 'string') {
        const response = JSON.parse(message.data)
        if (Array.isArray(response)) {
          response.forEach(a => this.received(a))
        } else {
          this.received(response)
        }
      }
    }
  }
  post(path: string, body?: any) {
    let id = this.id
    this.id += 1
    return new Promise<any>((resolve, reject) => {
      const request: PendingRequest = {
        request: { id, path, body },
        promise: { resolve, reject },
      }
      this.requests.set(id, request)
      if (this.ws) {
        this.ws.send(JSON.stringify({ id, path, body }))
      }
    })
  }
  fastPost(path: string, body: any, completion: (body: any) => void) {
    let id = this.id
    this.id += 1
    const request: PendingRequest = {
      request: { id, path, body },
      promise: { resolve: completion },
    }
    this.requests.set(id, request)
    this.ws?.send(JSON.stringify({ id, path, body }))
  }
  private received(response: Response) {
    const request = this.requests.get(response.id)
    if (!request) return
    this.requests.delete(response.id)
    if (response.error) {
      request.promise.reject?.(response.error)
    } else {
      request.promise.resolve(response.body)
    }
  }
}

interface PendingRequest {
  request: Request
  promise: {
    resolve: (value: any) => void
    reject?: (reason?: any) => void
  }
}
interface Request {
  id: number
  path: string
  body?: any
}
interface Response {
  id: number
  body?: any
  error?: string
}

class ObjectMap<Key, Value> {
  storage: any = {}
  get(id: Key): Value | undefined {
    return this.storage[id]
  }
  set(id: Key, value: Value) {
    this.storage[id] = value
  }
  delete(id: Key) {
    delete this.storage[id]
  }
  get size(): number {
    return Object.values(this.storage).length
  }
  map<O>(transform: (value: Value) => O): O[] {
    let array: O[] = []
    for (let a of Object.values(this.storage)) {
      array.push(transform(a as Value))
    }
    return array
  }
}
