import { serve, buildAssets } from 'tux'
import Document from 'react-document'
import express from 'express'

import app from 'app'
// import apiMiddleware from 'server/api'

export default ({ clientStats }) => {
  const expressApp = express()

  // expressApp.use('/api', apiMiddleware)

  // Tux middleware
  expressApp.use(
    serve({
      Document,
      assets: buildAssets(clientStats),
      app,
    })
  )

  return expressApp
}
