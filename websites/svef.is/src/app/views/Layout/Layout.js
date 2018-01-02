import React from 'react'
import { Switch, Route, Link } from 'react-router-dom'
import Helmet from 'react-helmet'

import Home from 'app/routes/Home'
import Board from 'app/routes/Board'

const Layout = () => (
  <div>
    <Helmet titleTemplate="%s | Samtök Vefiðnaðarins">
      <title>Samtök Vefiðnaðarins</title>
    </Helmet>
    <p>
      <Link to="/">Heim</Link>
      <Link to="/stjorn">Stjórn</Link>
    </p>

    <br />
    <Switch>
      <Route path="/stjorn" component={Board} />
      <Route exact path="/" component={Home} />
    </Switch>
  </div>
)

export default Layout
