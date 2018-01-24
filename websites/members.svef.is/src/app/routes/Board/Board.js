import React from 'react'
import Helmet from 'react-helmet'
import { withJob } from 'react-jobs'
import api from 'app/contentful'

const AsyncDetails = ({ jobResult: data }) => (
  <div className="row">
    <Helmet>
      <title>Stjórn</title>
    </Helmet>
    {data.items.map(board => (
      <div className="col-4" key={board.sys.id}>
        <h4>{board.fields.starfsar}</h4>
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
