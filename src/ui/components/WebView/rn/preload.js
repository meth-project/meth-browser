/* eslint-disable */
import IPC from '../../../../../common/constants/ipc'

export default () => `
(function () {
  const pendingRequests = {}

  const sendIpc = (type, payload) => {
    const id = Date.now() + '-' + Math.random()

    const promise = new Promise((resolve, reject) => {
      pendingRequests[id] = { resolve, reject }
    })

    try {
      window.postMessage(JSON.stringify({ id, type, payload }), '*')
    } catch (err) {
      alert(err)
    }

    return promise
  }

  window.handleIpcResponse = obj => {
    try {
      const { id, error, response } = obj

      const req = pendingRequests[id]

      if (req) {
        pendingRequests[id] = null

        if (error) {
          req.reject(error)
        } else {
          req.resolve(response)
        }
      }
    } catch (err) {
      alert(err)
      console.error(err)
    }
  }

  class Web3IpcProvider {
    isConnected () {
      return true
    }

    send () {
      throw new Error('Synchronous web3 calls are not supported.')
    }

    sendAsync (payload, callback) {
      sendIpc('${IPC.WEB3}', payload)
        .catch(callback)
        .then(response => {
          const hasError = [].concat(response).find(r => !!r.error)

          if (hasError) {
            callback(response)
          } else {
            callback(null, response)
          }
        })
    }
  }

  window.web3 = {
    currentProvider: new Web3IpcProvider()
  }
})()
`
/* eslint-enable */
