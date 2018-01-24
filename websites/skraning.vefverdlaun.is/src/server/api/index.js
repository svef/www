import express from 'express'
import mongoose from 'mongoose'

import { Guest } from './schemas'

const router = express.Router()

router.get('/webawards2018', (req, res) => {
  mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection
  Guest.find((err, results) => {
    db.close(() => {
      res.send(results)
    })
  })
})

router.post('/webawards2018', (req, res) => {
  mongoose.connect(process.env.MONGODB_URI)
  const db = mongoose.connection

  db.once('open', async () => {
    const person = new Guest({
      ...req.body,
    })

    await person.save()

    db.close(() => {
      res.send(person)
    })
  })
})

export default router
