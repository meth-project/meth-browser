import Mnemonic from 'bitcore-mnemonic'

import { Actions } from '../../actions'
import Wallet from '../../../wallet'


const _ensureWallet = (instance) => {
  if (!instance._wallet) {
    throw new Error('Wallet not yet initialized!')
  }
}


module.exports = {
  generateNewMnemonic: function () {
    this._log.debug('Generate new mnemonic')

    return new Mnemonic(Mnemonic.Words.ENGLISH).toString()
  },

  openWithMnemonic: async function (mnemonic) {
    this._log.debug('Create wallet using mnemonic')

    this._action(Actions.SET_MNEMONIC, mnemonic)

    this._wallet = await Wallet.createFromMnemonic(mnemonic)
  },

  closeCurrent: async function () {
    this._log.debug('Close current wallet')

    this._wallet = null
    this._action(Actions.SET_MNEMONIC, null)
  },

  reloadCurrent: async function () {
    const { mnemonic } = this._getState('wallet')

    if (mnemonic && this._wallet) {
      this._log.debug(`Reload current wallet`)

      this._wallet = await Wallet.createFromMnemonic(mnemonic)
    }
  },

  createAccount: function () {
    _ensureWallet(this)

    // TODO: popup dialog to confirm with user prior to taking action

    return this._wallet.generateNextAddress()
  },

  getCurrent: function () {
    return this._wallet
  }
}