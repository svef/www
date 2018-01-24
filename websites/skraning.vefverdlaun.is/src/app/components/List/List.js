import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { getRegistrations, SUCCESS, FAILURE } from 'app/redux/register'

import './List.scss'

class List extends Component {
  constructor(props) {
    super(props)
  }

  componentWillMount() {
    this.props.fetchData()
  }

  render() {
    const list = this.props.list.filter(
      m =>
        this.props.term === '!svef'
          ? !m.issvef
          : this.props.term === 'svef'
            ? m.issvef
            : this.props.term === ''
              ? true
              : m.name.toLowerCase().includes(this.props.term) ||
                m.email.toLowerCase().includes(this.props.term) ||
                m.payer_kt.toLowerCase().includes(this.props.term) ||
                m.payer_email.toLowerCase().includes(this.props.term)
    )

    return (
      <div className="row List">
        <div className="col-12">
          <div className="row title">
            <div className="col-12">
              <p className="item_changes">
                Ekki er hægt að breyta skráningum eins og er, kemur bráðlega!
                <br />
                Skráningar: {this.props.term === '' ? '' : `${list.length}/`}
                {this.props.list.length}
              </p>
            </div>
            <div className="col-3">
              <p>Nafn</p>
            </div>
            <div className="col-2">
              <p>Netfang</p>
            </div>
            <div className="col-1">
              <p>Er í SVEF?</p>
            </div>
            <div className="col-2">
              <p>Kennitala greiðanda</p>
            </div>
            <div className="col-2">
              <p>Netfang greiðanda</p>
            </div>
          </div>
          {list.map((item, i) => (
            <div className="row item_row" key={`item-${i}`}>
              <div className="col-3">
                <p>{item.name}</p>
              </div>
              <div className="col-2">
                <p>{item.email}</p>
              </div>
              <div className="col-1">
                <p>{item.issvef ? 'já' : 'nei'}</p>
              </div>
              <div className="col-2">
                <p>{item.payer_kt}</p>
              </div>
              <div className="col-2">
                <p>{item.payer_same ? item.email : item.payer_email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
}

List.propTypes = {
  term: PropTypes.string,
  fetchData: PropTypes.func.isRequired,
  list: PropTypes.arrayOf(PropTypes.object).isRequired,
}

const mapStateToProps = state => ({
  list: state.register.registrations,
})

const mapDispatchToProps = dispatch => ({
  fetchData: (...args) => dispatch(getRegistrations(...args)),
})

export default connect(mapStateToProps, mapDispatchToProps)(List)
