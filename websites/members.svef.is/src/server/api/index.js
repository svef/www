import express from 'express'
import axios from 'axios'

const router = express.Router()
router.get('/something', (req, res) => {
  return axios
    .get('//...')
    .then(({ data }) => {
      res.send(data)
    })
    .catch(response => response)
})

export default router
