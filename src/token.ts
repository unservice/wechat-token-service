export class AccessToken {
  #value!: string
  #expiresAt: number = 0
  readonly #windowSeconds!: number
  #refreshPromise: Promise<void> | null = null
  #refreshFn?: () => Promise<any>

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

  /**
   * 设置用于刷新token的函数
   * @param refreshFn 执行实际刷新操作的函数，需要返回包含token的结果
   */
  setRefreshFunction(refreshFn: () => Promise<any>) {
    this.#refreshFn = refreshFn
  }

  /**
   * 获取token值，如果过期会自动尝试刷新
   * @param forceRefresh 是否强制刷新，即使token未过期
   * @returns token的值
   */
  async getToken(forceRefresh = false): Promise<string> {
    if (!this.expired && !forceRefresh) {
      return this.value!
    }

    if (!this.#refreshFn) {
      throw new Error('刷新函数未设置，无法刷新token')
    }

    await this.#refresh(forceRefresh)
    return this.value ?? ''
  }

  /**
   * 内部刷新token的方法，处理并发问题
   * @param force 是否强制刷新
   * @private
   */
  async #refresh(force = false): Promise<void> {
    // 如果token没有过期且不强制刷新，则直接返回
    if (!this.expired && !force) {
      return
    }

    // 如果已经有刷新操作在进行中，等待其完成
    if (this.#refreshPromise) {
      await this.#refreshPromise
      // 如果等待后token已刷新且有效且不需要强制刷新，则直接返回
      if (!this.expired && !force) {
        return
      }
    }

    // 创建一个新的刷新Promise
    let resolveFn: () => void
    this.#refreshPromise = new Promise<void>((resolve) => {
      resolveFn = resolve
    })

    try {
      // 执行实际的刷新操作
      const result = await this.#refreshFn!()

      // 处理响应结果
      if ('errcode' in result && result.errcode !== 0) {
        throw new Error(`刷新token失败: ${JSON.stringify(result)}`)
      }

      // 根据结果类型设置token
      if ('accessToken' in result && 'expiresIn' in result) {
        this.setToken(result.accessToken, result.expiresIn)
      } else if ('access_token' in result && 'expires_in' in result) {
        this.setToken(result.access_token, result.expires_in)
      } else if ('ticket' in result && 'expires_in' in result) {
        this.setToken(result.ticket, result.expires_in)
      } else {
        throw new Error('返回结果格式不符合预期')
      }
    } finally {
      // 无论成功失败，都需要释放刷新锁
      resolveFn!()
      this.#refreshPromise = null
    }
  }
}

export class Ticket extends AccessToken {
  constructor(options: { windowSeconds: number }) {
    super(options)
  }
}
