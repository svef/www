import React from 'react'
import Helmet from 'react-helmet'
import { Button } from '@svef/components'

const Home = () => (
  <div className="row">
    <Helmet>
      <title>Home</title>
    </Helmet>
    <div className="col">
      <span>Hi</span>
      <Button>Hello World</Button>
    </div>
  </div>
)

export default Home
