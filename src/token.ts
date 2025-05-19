export class AccessToken {
  #value!: string
  #expiresAt: number = 0
  readonly #windowSeconds!: number

  constructor(options: { windowSeconds: number }) {
    this.#windowSeconds = options.windowSeconds
  }

  setToken(value: string, expiresIn: number) {
    this.#value = value
    this.#expiresIn = expiresIn
  }
  get value() {
    if (this.expired) {
      return null
    }
    return this.#value
  }
  get expired() {
    return this.#expiresAt < Date.now()
  }
  set #expiresIn(expiresIn: number) {
    this.#expiresAt = Date.now() + (expiresIn - this.#windowSeconds) * 1000
  }
}

export class Ticket extends AccessToken {
  constructor(options: { windowSeconds: number }) {
    super(options)
  }
}
