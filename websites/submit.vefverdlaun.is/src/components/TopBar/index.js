import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import SignInOut from '../../Auth/SignInOut'

import './styles.css'

export const TopBar = ({
  user,
  primary,
  secondary,
  success,
  alert,
  warning,
  ...props
}) => {
  const className = ['top-bar']

  primary && className.push('primary')
  secondary && className.push('secondary')
  success && className.push('success')
  alert && className.push('alert')
  warning && className.push('warning')

  return (
    <header className="Header">
      <div className="grid-container">
        <div className="grid-x grid-margin-x">
          <div className="cell">
            <div className={className.join(' ')}>
              <div className="top-bar-left">
                <h1>Welcome to React</h1>
              </div>
              <div className="top-bar-right">
                <SignInOut />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

TopBar.propTypes = {
  primary: PropTypes.bool,
  secondary: PropTypes.bool,
  success: PropTypes.bool,
  alert: PropTypes.bool,
  warning: PropTypes.bool,
}

TopBar.defaultProps = {
  primary: false,
  secondary: false,
  success: false,
  alert: false,
  warning: false,
}

const mapStateToProps = state => ({
  user: state.user,
})

const mapDispatchToProps = dispatch => ({})

export default connect(mapStateToProps, mapDispatchToProps)(TopBar)
