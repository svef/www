import React from 'react'
import Helmet from 'react-helmet'
import { Button } from '@svef/components'

const Home = () => (
  <div>
    <Helmet>
      <title>Home</title>
    </Helmet>
    <span>Hi</span>
    <Button>Hello World</Button>
  </div>
)

export default Home
