import React from 'react'
import Helmet from 'react-helmet'
import { withJob } from 'react-jobs'
import api from '../../contentful'

const AsyncDetails = ({ jobResult: data }) => (
  <div>
    <Helmet>
      <title>Stjórn</title>
    </Helmet>
    {data.items.map(board => (
      <div key={board.sys.id}>
        <h2>{board.fields.starfsar}</h2>
        <ul>
          {board.fields.stjornarmedlimir.map(person => (
            <li key={person.sys.id}>
              {person.fields.nafn} {person.fields.titill}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
)

export default withJob({
  work: () =>
    api.getEntries({ content_type: 'stjorn', order: '-fields.starfsar' }),
})(AsyncDetails)
