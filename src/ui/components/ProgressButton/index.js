import React from 'react'
import PropTypes from 'prop-types'

import Button from '../Button'
import Loading from '../Loading'

const ProgressButton = ({ showInProgress, onPress, children, ...props }) => {
  const content = (!showInProgress) ? children : (
    <Loading />
  )

  return (
    <Button
      onPress={showInProgress ? null : onPress}
      {...props}>
        {content}
    </Button>
  )
}

ProgressButton.propTypes = {
  ...Button.propTypes,
  showInProgress: PropTypes.bool
}

ProgressButton.defaultProps = {
  showInProgress: false
}

export default ProgressButton
