import React, { Component } from 'react'
import Helmet from 'react-helmet'
import { connect } from 'react-redux'
import Toggle from 'react-toggle'

import { Button } from '@svef/components'
import Loader from 'app/components/Loader'
import Footer from 'app/components/Footer'

import { postRegistration, SUCCESS, FAILURE } from 'app/redux/register'

import './Toggle.scss'
import './Registration.scss'

const initialState = {
  submitting: false,
  form: {
    name: '',
    email: '',
    issvef: false,
    comments: '',
    payer_same: false,
    payer_kt: '',
    payer_email: '',
  },
  touched: {
    name: false,
    email: false,
    comments: false,
    payer_kt: false,
    payer_email: false,
  },
}

class Registration extends Component {
  constructor(props) {
    super(props)

    this.state = initialState

    this.isFieldValid = this.isFieldValid.bind(this)
    this.isFormValid = this.isFormValid.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleChange = this.handleChange.bind(this)
    this.resetForm = this.resetForm.bind(this)
  }

  async handleSubmit(event) {
    event.preventDefault()
    if (this.isFormValid()) {
      this.setState({ submitting: true })

      const result = await this.props.register(this.state.form)

      window.scrollTo(0, 0)
      if (result.type === SUCCESS) {
        this.setState({
          success: true,
        })
      } else if (result.type === FAILURE) {
        this.setState({
          success: false,
        })
      }
    }
  }

  resetForm() {
    this.setState(
      {
        submitting: false,
        success: undefined,
        form: initialState.form,
        touched: initialState.touched,
      },
      () => {
        if (this.input) {
          this.input.focus()
        }
      }
    )
  }

  handleChange(event) {
    const { name: field, value: targetValue, checked } = event.target
    let value = targetValue

    if (field === 'payer_kt') {
      value = value.trim()
      value = value.replace(/\D/g, '')
    } else if (event.target.type === 'checkbox') {
      value = checked
    }
    this.setState({
      form: Object.assign({}, this.state.form, { [field]: value }),
      touched: Object.assign({}, this.state.touched, { [field]: true }),
    })
  }

  isFieldValid(field) {
    const value = this.state.form[field]
    if (this.state.touched[field] === false) {
      return 'clean'
    }

    if (field === 'payer_kt') {
      return (value.length === 10).toString()
    } else if (field === 'email' || field === 'payer_email') {
      // something@something.something
      return /(.+)@(.+)\.(.+)/.test(value).toString()
    } else {
      return (!!value).toString()
    }
  }

  isFormValid() {
    const { form } = this.state

    return (
      this.isFieldValid('name') === 'true' &&
      this.isFieldValid('email') === 'true' &&
      this.isFieldValid('payer_kt') === 'true' &&
      (form.payer_same ? true : this.isFieldValid('payer_email') === 'true') &&
      (form.student ? this.isFieldValid('payer_kt') === 'true' : true)
    )
  }

  componentDidMount() {
    if (this.input) {
      this.input.focus()
    }
  }

  render() {
    return [
      <Helmet key="helmet" F>
        <title>Skráning</title>
      </Helmet>,
      <div key="backdrop" className="registration-backdrop">
        <span className="h1">Íslensku vefverðlaunin 2017</span>
      </div>,
      <div key="registration" className="registration">
        <div className="row">
          <div className="col-10 offset-1">
            <h1>Skráning</h1>
          </div>
          {this.state.success === true ? (
            <div className="col-10 offset-1 col-lg-6 offset-lg-3">
              <p>
                Til hamingju <b>{this.state.form.name}</b>, skráning tókst!
              </p>
              <p>
                Aðgöngumiði verður sendur fyrir föstudaginn á{' '}
                <b>{this.state.form.email}</b>
                <br />
                Greiðsluseðill verður sendur á kt{' '}
                <b>{this.state.form.payer_kt}</b>
                <br />
                Reikningur verður sendur í tölvupósti á{' '}
                <b>
                  {this.state.form.payer_same
                    ? this.state.form.email
                    : this.state.form.payer_email}
                </b>
              </p>
              <div className="button-wrap">
                <button className="button" onClick={this.resetForm}>
                  Skrá annan gest
                </button>
              </div>{' '}
            </div>
          ) : (
            <div className="col-10 offset-1">
              <p>
                Fylltu út formið hér að neðan til að skrá þig á
                verðlaunaafhendingu Íslensku vefverðalaunanna 2017 sem haldin er
                föstudaginn 26. janúar í Silfurbergi Hörpu.
              </p>
              <p>
                Gleðin byrjar með fordrykk og léttum veitingum kl. 17.30 en
                verðlaunaafhending hefst stundvíslega kl. 18
              </p>
              <p>
                Allir félagar í SVEF fá frítt inn að vanda.<br />Aðrir þurfa að
                borga 4.900 kr. til að mæta kostnaði.
              </p>
            </div>
          )}
          <div className="col-10 offset-1 col-lg-6 offset-lg-3">
            {this.state.submitting && !this.state.success && <Loader />}
            <form
              className={this.state.submitting ? 'submitting' : ''}
              onSubmit={this.handleSubmit}
            >
              <label>
                <span>
                  Nafn gests
                  {this.isFieldValid('name') === 'false' && (
                    <span>Fullt nafn gests</span>
                  )}
                </span>
                <input
                  autoFocus
                  className="p"
                  type="text"
                  name="name"
                  valid={this.isFieldValid('name')}
                  placeholder="Fullt nafn gests"
                  disabled={!!this.state.submitting}
                  onBlur={this.handleChange}
                  onChange={this.handleChange}
                  value={this.state.form.name}
                  ref={input => {
                    this.input = input
                  }}
                />
              </label>
              <label>
                <span>
                  Netfang gests
                  {this.isFieldValid('email') !== 'clean' && (
                    <span>Aðgöngumiði verður sendur á þetta netfang</span>
                  )}
                </span>
                <input
                  className="p"
                  type="email"
                  name="email"
                  valid={this.isFieldValid('email')}
                  placeholder="Aðgöngumiði verður sendur á þetta netfang"
                  disabled={!!this.state.submitting}
                  onBlur={this.handleChange}
                  onChange={this.handleChange}
                  value={this.state.form.email}
                />
              </label>
              <label className="checkbox">
                <span>
                  {this.state.form.name || 'Gestur'} er félagi í SVEF
                  <span>
                    Ekki viss? Athugaðu hvort nafnið þitt sé{' '}
                    <a
                      href="https://members.svef.is"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      á þessum lista
                    </a>{' '}
                    og hvort þær upplýsingar sem við höfum séu réttar.
                  </span>
                </span>
                <Toggle
                  icons={false}
                  name="issvef"
                  disabled={!!this.state.submitting}
                  onChange={this.handleChange}
                  defaultChecked={this.state.form.issvef}
                />
              </label>
              <h5>Greiðandi</h5>
              <label>
                <span>
                  Kennitala greiðanda
                  {this.isFieldValid('payer_kt') === 'false' && (
                    <span>10 tölustafir, engin bandstrik</span>
                  )}
                </span>
                <input
                  className="p"
                  type="text"
                  name="payer_kt"
                  valid={this.isFieldValid('payer_kt')}
                  placeholder="10 tölustafir, engin bandstrik"
                  disabled={!!this.state.submitting}
                  onBlur={this.handleChange}
                  onChange={this.handleChange}
                  value={this.state.form.payer_kt}
                />
              </label>
              <label className="checkbox">
                <span>
                  {this.state.form.name || 'Gestur'} er einnig greiðandi
                </span>
                <Toggle
                  icons={false}
                  name="payer_same"
                  disabled={!!this.state.submitting}
                  onChange={this.handleChange}
                  defaultChecked={this.state.form.payer_same}
                />
              </label>
              <label className={this.state.form.payer_same ? 'disabled' : ''}>
                <span>
                  Netfang greiðanda
                  {this.isFieldValid('payer_email') !== 'clean' && (
                    <span>Reikningur verður sendur á þetta netfang</span>
                  )}
                </span>
                <input
                  className="p"
                  type="text"
                  name="payer_email"
                  valid={
                    this.state.form.payer_same
                      ? 'true'
                      : this.isFieldValid('payer_email')
                  }
                  placeholder="Reikningur verður sendur á þetta netfang"
                  disabled={
                    !!this.state.submitting || this.state.form.payer_same
                  }
                  onBlur={this.handleChange}
                  onChange={this.handleChange}
                  value={
                    this.state.form.payer_same
                      ? this.state.form.email
                      : this.state.form.payer_email
                  }
                />
              </label>
              <div className="button-wrap">
                <input
                  className="button"
                  type="submit"
                  value="Skrá mig"
                  disabled={!!this.state.submitting || !this.isFormValid()}
                />
              </div>
            </form>
          </div>
        </div>
      </div>,
      <Footer key="footer" />,
    ]
  }
}

const mapDispatchToProps = dispatch => ({
  register: (...args) => dispatch(postRegistration(...args)),
})

export default connect(undefined, mapDispatchToProps)(Registration)
