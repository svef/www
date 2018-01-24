import React, { Component } from 'react'
import Helmet from 'react-helmet'
import throttle from 'lodash.throttle'

import { SignIn, SignOut } from 'app/components/Auth'
import List from 'app/components/List'
import { auth, database } from 'app/firebase'

import './Manage.scss'

const allowedAccounts = [
  'benediktvaldez@gmail.com',
  'kastaniubrunn@gmail.com',
  'kjarni@gmail.com',
]

class Manage extends Component {
  constructor(props) {
    super(props)

    this.state = {
      term: '',
      loaded: false,
      loggedIn: false,
      currentUser: null,
      members: [],
    }

    this.handleSearch = this.handleSearch.bind(this)
  }

  componentDidMount() {
    auth.onAuthStateChanged(currentUser => {
      if (currentUser === null) {
        this.setState({ loaded: true, loggedIn: false, currentUser })
      } else if (
        currentUser !== null &&
        !(
          currentUser.email.endsWith('@svef.is') ||
          allowedAccounts.includes(currentUser.email)
        )
      ) {
        auth.signOut()
      } else {
        this.setState({ loaded: true, loggedIn: true, currentUser })
      }
    })
  }

  handleSearch(term) {
    this.setState({ term })
  }

  render() {
    const { loggedIn } = this.state
    return !loggedIn
      ? [
          <div key="backdrop" className="registration-backdrop">
            <span className="h1">Íslensku vefverðlaunin 2017</span>
          </div>,

          <div key="login" className="row">
            <div className="col-10 offset-1">
              <div className="login">
                {this.state.loaded ? <SignIn /> : <p>One sec...</p>}
              </div>
            </div>
          </div>,
        ]
      : [
          <div key="logout" className="row">
            <div className="col-10 offset-1">
              <div className="logout">
                <SignOut />
              </div>
            </div>
          </div>,
          <div
            key="registration-manage"
            className="registration registration--manage Manage"
          >
            <div className="row">
              <div className="col-10 offset-1">
                <div className="search">
                  <h2>Skráningar</h2>
                  <input
                    autoFocus
                    className="h5 search"
                    type="text"
                    placeholder="Leita eftir nafni, netfangi eða kennitölu greiðanda"
                    onChange={event => this.handleSearch(event.target.value)}
                    ref={input => {
                      this.input = input
                    }}
                  />
                </div>
              </div>
            </div>
          </div>,

          <List key="list" term={this.state.term} />,
        ]
  }
}

export default Manage
