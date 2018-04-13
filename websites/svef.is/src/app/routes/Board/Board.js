import React from 'react'
import Helmet from 'react-helmet'
import { withJob } from 'react-jobs'

import { Article, H1, Section } from '@svef/components'

import api from 'app/contentful'

const AsyncDetails = ({ jobResult: data }) => (
  <div>
    <Helmet>
      <title>Stjórn</title>
    </Helmet>
    <Section hero>
      <H1 color="svef">Stjórn</H1>
    </Section>
    <Section>
      {data.items.map(board => (
        <Article label={board.fields.starfsar} key={board.sys.id}>
          <ul>
            {board.fields.stjornarmedlimir.map(person => (
              <li key={person.sys.id}>
                {person.fields.nafn} {person.fields.titill}
              </li>
            ))}
          </ul>
        </Article>
      ))}
    </Section>
  </div>
)

export default withJob({
  work: () =>
    api.getEntries({ content_type: 'stjorn', order: '-fields.starfsar' }),
})(AsyncDetails)
