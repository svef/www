import React from 'react'
import PropTypes from 'prop-types'

export const Button = ({
  primary,
  secondary,
  success,
  alert,
  warning,
  hollow,
  disabled,
  clear,
  dropdown,
  ...props
}) => {
  const className = ['button']

  primary && className.push('primary')
  secondary && className.push('secondary')
  success && className.push('success')
  alert && className.push('alert')
  warning && className.push('warning')
  hollow && className.push('hollow')
  disabled && className.push('disabled')
  clear && className.push('clear')
  dropdown && className.push('dropdown')

  return <button className={className.join(' ')} {...props} />
}

Button.propTypes = {
  primary: PropTypes.bool,
  secondary: PropTypes.bool,
  success: PropTypes.bool,
  alert: PropTypes.bool,
  warning: PropTypes.bool,
  hollow: PropTypes.bool,
  disabled: PropTypes.bool,
  clear: PropTypes.bool,
  dropdown: PropTypes.bool,
}

Button.defaultProps = {
  primary: false,
  secondary: false,
  success: false,
  alert: false,
  warning: false,
  hollow: false,
  disabled: false,
  clear: false,
  dropdown: false,
}

export default Button
