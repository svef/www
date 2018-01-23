import React from 'react'
import { createApp } from 'tux'

import '@svef/styles/global.scss'

import bootstrapper from 'app/middlewares/react-async-bootstrapper'
import asyncComponent from 'app/middlewares/react-async-component'
import jobs from 'app/middlewares/react-jobs'
import router from 'app/middlewares/react-router'
import redux from 'app/middlewares/react-redux'
import helmet from 'app/middlewares/react-helmet'

import Layout from 'app/views/Layout'

export default createApp()
  .use(bootstrapper())
  .use(asyncComponent())
  .use(jobs())
  .use(redux())
  .use(helmet())
  .use(router())
  .use(<Layout />)
