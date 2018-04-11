import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { Text } from 'react-native'

import { connectStore } from '../../../helpers/redux'
import Modal from '../../../components/Modal'
import QrCode from '../../../components/QrCode'
import styles from './styles'

@connectStore('modals')
export default class EditAddress extends PureComponent {
  static propTypes = {
    data: PropTypes.shape({
      address: PropTypes.string
    }).isRequired
  }

  render () {
    const { data: { address } } = this.props

    return (
      <Modal
        contentStyle={styles.content}
        onPressCloseButton={this.close}
      >
        <Text style={styles.addressText}>{address}</Text>
        <QrCode
          input={address}
          style={styles.qrCode}
        />
      </Modal>
    )
  }

  close = () => {
    const { hideAddressQrModal } = this.props.actions

    hideAddressQrModal()
  }
}