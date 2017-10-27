import firebase from 'firebase'

export const config = {
  apiKey: 'AIzaSyDweThVW74TCUnqnhu8tfQGTnfjUpyQiuo',
  authDomain: 'svef-1140.firebaseapp.com',
  databaseURL: 'https://svef-1140.firebaseio.com',
  projectId: 'svef-1140',
  storageBucket: '',
  messagingSenderId: '240086420581',
}

firebase.initializeApp(config)

export default firebase

export const database = firebase.database
export const auth = firebase.auth()
export const googleAuthProvider = new firebase.auth.GoogleAuthProvider()
