import React from 'react'
import { Switch, Route, Link } from 'react-router-dom'
import Helmet from 'react-helmet'

import TestGrid from 'app/components/TestGrid'
import Home from 'app/routes/Home'
import Board from 'app/routes/Board'
import Members from 'app/routes/Members'
import ManageMembers from 'app/routes/ManageMembers'

import './Layout.scss'

const Layout = () => (
  <main className="container" style={{ opacity: 0 }}>
    <Helmet titleTemplate="%s | Samtök Vefiðnaðarins">
      <title>Samtök Vefiðnaðarins</title>
    </Helmet>
    <TestGrid vertical />

    {/* <p>
      <Link to="/">Heim</Link>
      <Link to="/stjorn">Stjórn</Link>
      <Link to="/felagar">Félagar</Link>
    </p> */}

    <Switch>
      {/* <Route path="/felagar" component={Members} /> */}
      {/* <Route path="/stjorn" component={Board} /> */}
      <Route path="/manage" component={ManageMembers} />
      <Route path="/" component={Members} />
    </Switch>
  </main>
)

export default Layout
