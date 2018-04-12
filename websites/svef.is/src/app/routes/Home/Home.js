import React from 'react'
import Helmet from 'react-helmet'
import { Button, Section, H1 } from '@svef/components'

const Home = () => (
  <div className="row">
    <Helmet>
      <title>Home</title>
    </Helmet>
    <div className="col">
      <Section hero>
        <H1 color="awards">Samtök vefiðnaðarins</H1>
      </Section>
      <Section>
        <span>Hi</span>
        <Button>Hello World</Button>
      </Section>
    </div>
  </div>
)

export default Home
