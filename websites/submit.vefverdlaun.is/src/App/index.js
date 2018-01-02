import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { auth } from '../Auth/firebase'

import { appState, appInvalidLogin } from '../store/actions/app'
import { userSignIn, userSignOut } from '../store/actions/user'

import { Hero, Loading, TopBar } from '../components'

import './App.css'

export class App extends Component {
  componentDidMount() {
    auth.onAuthStateChanged(currentUser => {
      console.log('authstatechanged', currentUser)
      if (currentUser === null) {
        this.props.userSignOut()
      } else {
        this.props.userSignIn(currentUser)
      }

      this.props.appState('loaded')
    })
  }

  render() {
    const { loading } = this.props

    const className = ['App']

    if (loading) {
      className.push('loading')
    }

    return (
      <div>
        {loading && <Loading />}
        <div className={className.join(' ')}>
          <Hero title="Innsendingar" />
          <TopBar />
          <div className="grid-container">
            <div className="grid-x grid-margin-x">
              <div className="cell">
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
                <p className="App-intro">
                  This project will be the form to submit projects to the
                  Icelandic Web Awards. lorem
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

App.propTypes = {
  appState: PropTypes.func.isRequired,
  appInvalidLogin: PropTypes.func.isRequired,
  userSignIn: PropTypes.func.isRequired,
  userSignOut: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  user: PropTypes.shape({
    displayName: PropTypes.string,
    email: PropTypes.string.isRequired,
    photoURL: PropTypes.string,
    uid: PropTypes.string.isRequired,
  }),
}

const mapStateToProps = state => ({
  loading: state.app.state === 'loading',
  user: state.user,
})

const mapDispatchToProps = dispatch => ({
  appState: (...args) => dispatch(appState(...args)),
  appInvalidLogin: (...args) => dispatch(appInvalidLogin(...args)),
  userSignIn: (...args) => dispatch(userSignIn(...args)),
  userSignOut: (...args) => dispatch(userSignOut(...args)),
})

export default connect(mapStateToProps, mapDispatchToProps)(App)
