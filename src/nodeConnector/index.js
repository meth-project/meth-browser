import EventEmitter from 'eventemitter3'

import { Web3MethodFactory } from './web3Methods'
import { EVENT, STATE } from '../../common/constants'
import { UnableToConnectError } from '../utils/errors'
import { nodeDisconnected } from '../redux/node/actionCreators'
import logger from '../utils/log'
import RpcAdapter from './adapter/rpc'

const log = logger.create('NodeConnector')

class NodeConnector extends EventEmitter {
  constructor () {
    super()

    this._adapter = null
    this._wrapResponse = this._wrapResponse.bind(this)
  }

  init ({ store, walletManager }) {
    this._store = store
    this._walletManager = walletManager

    this._methodFactory = new Web3MethodFactory({
      nodeConnector: this,
      store: this._store,
      walletManager
    })

    // keep track of what's going on in connector
    this.on(EVENT.STATE_CHANGE, newState => {
      switch (newState) {
        case STATE.CONNECTON_ERROR: {
          store.dispatch(nodeDisconnected(STATE.CONNECTON_ERROR))
          break
        }
        default:
          break
      }
    })
  }

  setNetworks (networks) {
    log.debug('Set networks', networks)

    this._networks = networks
  }

  get isConnected () {
    return null !== this._adapter && this._adapter.isConnected
  }

  /**
   * Connect to given node.
   * @type {Promise}
   */
  async connect (cfg) {
    const { name, url, type } = cfg

    // disconnect first
    await this.disconnect()

    log.info(`Connecting to ${name} at ${url} of type ${type} ...`)

    switch (type) {
      case 'rpc':
        this._adapter = new RpcAdapter({ url })
        break
      default:
        throw new UnableToConnectError(`Unrecognized adapter type: ${type}`)
    }

    try {
      // connect
      await this._adapter.connect()

      // get genesis block
      const block = this.rawCall('eth_getBlockByNumber', [ '0x0', false ])

      // work out what network we're on
      let network = this._networks[
        Object.keys(this._networks).find(key => {
          const n = this._networks[key]

          return n.genesisBlock === block.hash
        })
      ]

      // if no match found then assume it's a private network
      if (!network) {
        network = this._networks.private
        network.genesisBlock = block.hash
      }

      // event propagation (set this up after connection succeeds)
      [ EVENT.STATE_CHANGE, EVENT.NEW_BLOCK ].forEach(e => {
        this._adapter.on(e, (...args) => this.emit(e, ...args))
      })

      log.info(`Connected to network: ${network.description}`)

      return network
    } catch (err) {
      throw new UnableToConnectError(err.message)
    }
  }

  /**
   * Disconnect current adapter.
   * @return {Promise}
   */
  async disconnect () {
    if (this.isConnected) {
      log.info(`Disconnecting current connection ...`)

      await this._adapter.disconnect()
    }

    this._adapter = null
  }

  /**
   * Make a web3 JSON RPC request that gets processed by our method handlers.
   *
   * @param {Object|Array} payload Either a single or batch request
   * @param {Object} context Context in which method is being called
   * @param {String} [context.dappUrl] URL of dapp which is calling this method
   * @return {Promise}
   */
  async request (payload, context) {
    log.debug('Request', payload, context)

    const isBatch = payload instanceof Array

    const finalPayload = !isBatch ? [ payload ] : payload

    // we will serially process the requests (as expected with batch requests)
    const result = []

    // eslint-disable-next-line no-restricted-syntax
    for (const { id, method, params } of finalPayload) {
      log.trace('Request', { id, method, params })

      try {
        this._ensureConnected()

        result.push({
          id,
          // eslint-disable-next-line no-await-in-loop
          result: await this._methodFactory.getHandler(method).run(params)
        })
      } catch (err) {
        err.method = method

        result.push({
          id,
          error: err
        })
      }
    }

    // process results
    const responses = result.map(this._wrapResponse)

    const ret = isBatch ? responses : responses[0]

    log.trace('Response', ret)

    return ret
  }

  /**
   * Make a raw method call directly to the adapter.
   *
   * @param  {String} method web3 method
   * @param  {Array} [params]
   * @return {Promise}
   */
  async rawCall (method, params = []) {
    this._ensureConnected()

    return this._adapter.execMethod(method, params)
  }

  _ensureConnected () {
    if (!this.isConnected || !this._adapter) {
      this.emit(EVENT.STATE_CHANGE, STATE.CONNECTON_ERROR)

      throw new UnableToConnectError('Adapter not connected')
    }
  }

  _wrapResponse ({ id, result, error }) {
    if (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: error.toString()
      }
    }

    return {
      jsonrpc: '2.0',
      id,
      result
    }
  }
}

export default new NodeConnector()
