import { serve, buildAssets } from 'tux'
import Document from 'react-document'
import express from 'express'
import bodyParser from 'body-parser'

import app from 'app'
import apiMiddleware from 'server/api'

export default ({ clientStats }) => {
  const expressApp = express()

  expressApp.use(bodyParser.urlencoded({ extended: true }))
  expressApp.use(bodyParser.json())

  expressApp.use('/api', apiMiddleware)

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
