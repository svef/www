import React, { Component } from 'react'
import Helmet from 'react-helmet'
import Fuse from 'fuse.js'
import throttle from 'lodash.throttle'

import { Button } from '@svef/components'
import { database } from 'app/firebase'

import './MemberList.scss'

class Members extends Component {
  constructor(props) {
    super(props)

    this.state = {
      members: [],
    }

    this.ref = database.ref('/felagar')

    this.handleChange = throttle(this.handleChange.bind(this), 150)
    this.validateEmail = this.validateEmail.bind(this)
    this.addNewMember = this.addNewMember.bind(this)
    this.renderPayerKt = this.renderPayerKt.bind(this)
  }

  componentDidMount() {
    this.ref.on('value', snapshot => {
      const members = snapshot.val()
      this.setState({ members })
    })
  }

  handleChange(key, field, value) {
    const updates = {
      [`/${key}/${field}`]: value,
    }

    console.log('change', updates)

    this.ref.update(updates)

    this.setState({
      form: Object.assign({}, this.state.form, { [field]: value }),
      touched: Object.assign({}, this.state.touched, { [field]: true }),
    })
  }

  validateEmail(value) {
    return /(.+)@(.+)\.(.+)/.test(value).toString()
  }

  deleteMember(key) {
    const member = this.state.members[key]
    if (member && typeof window !== 'undefined') {
      if (
        window.confirm(
          `Ertu VISS um að þú viljir eyða ${member.nafn ||
            member.netfang ||
            'þessum félaga'}? Aðgerðin er óafturkvæm!`
        )
      ) {
        console.log('DELETING', member.nafn)

        this.ref.update({ [`/${key}`]: null })
      }
    }
  }

  addNewMember() {
    const newMember = {
      kennitala: '',
      kennitala_greidanda: '',
      nafn: '',
      netfang: '',
      vinnustadur: '',
    }

    console.log('new member', newMember)

    this.ref.push().set(newMember)

    if (typeof window !== 'undefined') {
      window.scrollTo(0, document.body.scrollHeight)
    }
  }

  renderPayerKt(kt) {
    return kt.charAt(0) > 3 ? (
      <p>
        <a
          href={`https://www.rsk.is/fyrirtaekjaskra/leit/kennitala/${kt}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {kt}
        </a>
      </p>
    ) : (
      <p>
        {kt}{' '}
        <i>
          <small>greiðir sjálf/ur</small>
        </i>
      </p>
    )
  }

  render() {
    const { term } = this.props
    const { members } = this.state
    const membersKeys = Object.keys(members)

    const matchesTerm = member =>
      term === ''
        ? true
        : member.nafn.toLowerCase().includes(term) ||
          member.netfang.toLowerCase().includes(term) ||
          member.vinnustadur.toLowerCase().includes(term) ||
          member.kennitala.toLowerCase().includes(term) ||
          member.kennitala_greidanda.toLowerCase().includes(term)

    const list = membersKeys.filter(key => matchesTerm(members[key]))
    return (
      <div className="row MemberList">
        <div className="col-12">
          <div className="row title">
            <div className="col-10 offset-1">
              <p className="member_changes">
                <Button theme="blue" onClick={this.addNewMember}>
                  Bæta við félaga
                </Button>
                <br />
                <br />
                Gætið þess að allar breytingar eru varanlegar! Það er enginn
                'Vista' takki, allt uppfærist jafnóðum og því er breytt.
                <br />
                Félagar: {term === '' ? '' : `${list.length}/`}
                {membersKeys.length}
              </p>
            </div>
            <div className="col-2 offset-1">
              <p>Nafn einstaklings</p>
            </div>
            <div className="col-2">
              <p>Netfang</p>
            </div>
            <div className="col-2">
              <p>Kennitala</p>
            </div>
            <div className="col-2">
              <p>Kennitala greiðanda</p>
            </div>
            <div className="col-2">
              <p>Vinnustaður</p>
            </div>
          </div>
          {membersKeys.map(key => {
            const member = members[key]
            return (
              matchesTerm(member) && (
                <div className="row member_row" key={`member-${key}`}>
                  <div className="col-2 offset-1">
                    <input
                      type="text"
                      name="nafn"
                      value={member.nafn}
                      onChange={event =>
                        this.handleChange(key, 'nafn', event.target.value)
                      }
                    />
                  </div>
                  <div className="col-2">
                    <input
                      type="text"
                      name="netfang"
                      value={member.netfang}
                      valid={this.validateEmail(member.netfang)}
                      onChange={event =>
                        this.handleChange(key, 'netfang', event.target.value)
                      }
                    />
                  </div>
                  <div className="col-2">
                    <input
                      type="text"
                      name="kennitala"
                      value={member.kennitala}
                      onChange={event =>
                        this.handleChange(key, 'kennitala', event.target.value)
                      }
                    />
                  </div>
                  <div className="col-2">
                    <input
                      type="text"
                      name="kennitala_greidanda"
                      value={member.kennitala_greidanda}
                      onChange={event =>
                        this.handleChange(
                          key,
                          'kennitala_greidanda',
                          event.target.value
                        )
                      }
                    />
                  </div>
                  <div className="col-2">
                    <input
                      type="text"
                      name="vinnustadur"
                      value={member.vinnustadur}
                      onChange={event =>
                        this.handleChange(
                          key,
                          'vinnustadur',
                          event.target.value
                        )
                      }
                    />
                  </div>
                  <div className="col-1">
                    <p>
                      <Button
                        theme="action red"
                        onClick={() => this.deleteMember(key)}
                      >
                        -
                      </Button>
                    </p>
                  </div>
                </div>
              )
            )
          })}
          <div className="row title">
            <div className="col-10 offset-1">
              <p className="member_changes">
                <br />
                Gætið þess að allar breytingar eru varanlegar! Það er enginn
                'Vista' takki, allt uppfærist jafnóðum og því er breytt.
                <br />
                <br />
                <Button theme="blue" onClick={this.addNewMember}>
                  Bæta við félaga
                </Button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

Members.defaultProps = {
  loggedIn: false,
  term: '',
}

export default Members
