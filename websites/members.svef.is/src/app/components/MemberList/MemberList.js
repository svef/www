import React, { Component } from 'react'
import Helmet from 'react-helmet'
import Fuse from 'fuse.js'
import throttle from 'lodash.throttle'

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
    const list = this.state.members.filter(
      m =>
        this.props.term === ''
          ? true
          : m.nafn.toLowerCase().includes(this.props.term) ||
            m.netfang.toLowerCase().includes(this.props.term) ||
            m.vinnustadur.toLowerCase().includes(this.props.term) ||
            m.kennitala.toLowerCase().includes(this.props.term) ||
            m.kennitala_greidanda.toLowerCase().includes(this.props.term)
    )
    return (
      <div className="row MemberList">
        <div className="col-12">
          <div className="row title">
            <div className="col-10 offset-1">
              <p className="member_changes">
                Gætið þess að allar breytingar eru varanlegar! Það er enginn
                'Vista' takki, allt uppfærist jafnóðum og því er breytt.
                <br />
                Félagar: {this.props.term === '' ? '' : `${list.length}/`}
                {this.state.members.length}
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
          {list.map(
            (member, i) =>
              member.nafn && (
                <div className="row member_row" key={`member-${i}`}>
                  <div className="col-2 offset-1">
                    <input
                      type="text"
                      name="nafn"
                      value={member.nafn}
                      onChange={event =>
                        this.handleChange(i, 'nafn', event.target.value)
                      }
                    />
                  </div>
                  <div className="col-2">
                    <input
                      type="text"
                      name="netfang"
                      value={member.netfang}
                      onChange={event =>
                        this.handleChange(i, 'netfang', event.target.value)
                      }
                    />
                  </div>
                  <div className="col-2">
                    <input
                      type="text"
                      name="kennitala"
                      value={member.kennitala}
                      onChange={event =>
                        this.handleChange(i, 'kennitala', event.target.value)
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
                          i,
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
                        this.handleChange(i, 'vinnustadur', event.target.value)
                      }
                    />
                  </div>
                </div>
              )
          )}
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
