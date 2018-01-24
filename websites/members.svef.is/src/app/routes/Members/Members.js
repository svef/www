import React, { Component } from 'react'
import Helmet from 'react-helmet'
import Fuse from 'fuse.js'
import throttle from 'lodash.throttle'
// import { withJob } from 'react-jobs'
import { database } from 'app/firebase'

import './Members.scss'

class Members extends Component {
  constructor(props) {
    super(props)

    this.state = {
      members: [],
    }

    this.handleClick = this.handleClick.bind(this)
    this.handleSearch = throttle(this.handleSearch.bind(this), 150)
  }
  componentDidMount() {
    document.body.addEventListener('click', this.handleClick, false)
    database.ref('/felagar').once('value', snapshot => {
      const members = snapshot.val()
      this.fuse = new Fuse(members, {
        shouldSort: true,
        includeScore: true,
        threshold: 0.2,
        location: 0,
        distance: 30,
        maxPatternLength: 32,
        minMatchCharLength: 5,
        keys: [
          'nafn',
          'netfang',
          'vinnustadur',
          'kennitala',
          'kennitala_greidanda',
        ],
      })
      this.handleClick()
    })
  }

  componentWillUnmount() {
    document.body.removeEventListener('click', this.handleClick)
  }

  handleClick() {
    if (this.input) {
      this.input.focus()
    }
  }

  handleSearch(value) {
    if (this.fuse) {
      if (value.length >= 3) {
        const foo = this.fuse.search(value)
        this.setState({
          members: foo,
        })
      } else {
        this.setState({
          members: [],
        })
      }
    }
  }

  render() {
    // const members = this.state.members.filter(member =>
    //   member.nafn.toLowerCase().includes('ómar')
    // )

    return [
      <div key="search" className="row Members">
        <div className="col-10 offset-1">
          <div className="search">
            <h1>Félagatal</h1>
            <input
              autoFocus
              className="h3 search"
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
      <div key="results" className="row Members">
        <Helmet>
          <title>Félagar</title>
        </Helmet>

        <div className="col-12">
          {this.state.members.length > 0 && (
            <div className="row title">
              <div className="col-10 offset-1">
                <p className="member_changes">
                  Breytingar á skráningum sendist á{' '}
                  <a href="mailto:svef@svef.is?subject=#laga">svef@svef.is</a>{' '}
                  með subjectið #laga
                </p>
              </div>
              <div className="col-4 offset-1">
                <p>Nafn einstaklings</p>
              </div>
              <div className="col-4">
                <p>Netfang</p>
              </div>
              <div className="col-2">
                <p>
                  Kennitala greiðanda <small>(fyrirtæki)</small>
                </p>
              </div>
            </div>
          )}
          {this.state.members.map(
            ({ item: member, score }, i) =>
              member.nafn && (
                <div className="row member_row" key={`member-${i}`}>
                  <div className="col-4 offset-1">
                    <p className="large member_name">
                      <span style={{ fontSize: `${1 - score}em` }}>
                        {member.nafn}
                      </span>
                    </p>
                  </div>
                  <div className="col-4">
                    <p className="member_email">{member.netfang}</p>
                  </div>
                  <div className="col-2">
                    {member.kennitala_greidanda.charAt(0) > 3 ? (
                      <p>
                        <a
                          href={`https://www.rsk.is/fyrirtaekjaskra/leit/kennitala/${
                            member.kennitala_greidanda
                          }`}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          {member.kennitala_greidanda}
                        </a>
                      </p>
                    ) : (
                      <p>
                        <i>
                          <small>greiðir sjálf/ur</small>
                        </i>
                      </p>
                    )}
                  </div>
                </div>
              )
          )}
        </div>
      </div>,
    ]
  }
}

export default Members
