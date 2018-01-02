import { serve, buildAssets } from 'tux'
import Document from 'react-document'
import express from 'express'

import app from 'app'

export default ({ clientStats }) => {
  const expressApp = express()

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
