import mongoose from 'mongoose'

export const webawardsSchema = new mongoose.Schema({
  name: String,
  email: String,
  issvef: Boolean,
  comments: String,
  payer_same: Boolean,
  payer_kt: String,
  payer_email: String,
})

export let Guest

try {
  Guest = mongoose.model('WebAwards-2018')
} catch (err) {
  Guest = mongoose.model('WebAwards-2018', webawardsSchema)
}
