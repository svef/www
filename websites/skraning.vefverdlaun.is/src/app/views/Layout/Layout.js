import React from 'react'
import { Switch, Route, Link } from 'react-router-dom'
import Helmet from 'react-helmet'

import TestGrid from 'app/components/TestGrid'
import Registration from 'app/routes/Registration'

import './Layout.scss'

const Layout = () => (
  <main className="container" style={{ opacity: 0 }}>
    <Helmet titleTemplate="%s | Samtök Vefiðnaðarins">
      <title>Samtök Vefiðnaðarins</title>
    </Helmet>
    {/* <TestGrid vertical /> */}

    {/* <p>
      <Link to="/">Heim</Link>
      <Link to="/stjorn">Stjórn</Link>
      <Link to="/felagar">Félagar</Link>
    </p> */}

    <br />
    <Switch>
      <Route path="/" component={Registration} />
    </Switch>
  </main>
)

export default Layout
