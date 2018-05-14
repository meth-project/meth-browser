import { sha512_256 as _sha256, sha512 as _sha512 } from 'js-sha512'
import { Base64 } from 'js-base64'
import sjcl from 'sjcl'

import getRandomBytes from './random'

export const sha256 = data => _sha256(JSON.stringify(data))

export const sha512 = data => _sha512(JSON.stringify(data))

export const encrypt = async (key, data) => {
  const password = sjcl.codec.hex.toBits(key)
  const plaintext = JSON.stringify(data)
  const iv = await getRandomBytes(16)

  return Base64.btoa(sjcl.encrypt(password, plaintext, {
    cipher: 'aes',
    iter: 1000,
    mode: 'gcm',
    iv,
    ts: 128,
    ks: 256
  }))
}

export const decrypt = async (key, ciphertext) => {
  const password = sjcl.codec.hex.toBits(key)

  const data = sjcl.decrypt(password, Base64.atob(ciphertext))

  return JSON.parse(data)
}
