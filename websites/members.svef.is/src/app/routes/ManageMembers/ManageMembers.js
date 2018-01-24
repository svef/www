import React, { Component } from 'react'
import Helmet from 'react-helmet'
import throttle from 'lodash.throttle'

import { SignIn, SignOut } from 'app/components/Auth'
import MemberList from 'app/components/MemberList'
import { auth, database } from 'app/firebase'

import './ManageMembers.scss'

class ManageMembers extends Component {
  constructor(props) {
    super(props)

    this.state = {
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
    return !loggedIn ? (
      <div key="login" className="row">
        <div className="col-10 offset-1">
          <div className="login">
            {this.state.loaded ? <SignIn /> : <p>One sec...</p>}
          </div>
        </div>
      </div>
    ) : (
      [
        <div key="logout" className="row">
          <div className="col-10 offset-1">
            <div className="logout">
              <SignOut />
            </div>
          </div>
        </div>,
        <div key="search" className="row ManageMembers">
          <div className="col-10 offset-1">
            <div className="search">
              <h2>Félaga umsýsla</h2>
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
        </div>,

        <MemberList
          key="memberlist"
          loggedIn={this.state.loggedIn}
          term={this.state.term}
        />,
      ]
    )
  }
}

export default ManageMembers
