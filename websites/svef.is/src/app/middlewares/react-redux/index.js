import React from 'react'
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import { compose } from 'redux'
import { Provider } from 'react-redux'
import { composeWithDevTools } from 'redux-devtools-extension'

import rootReducer from 'app/reducers'

// Middleware for reducing boilerplate when using async actions
// github.com/reactjs/redux/issues/99#issuecomment-112212639
export const promiseMiddleware = () => next => action => {
  const { promise, types, ...rest } = action
  if (!promise) {
    return next(action)
  }

  const [REQUEST, SUCCESS, FAILURE] = types
  next({ ...rest, type: REQUEST })
  return promise.then(
    payload => next({ ...rest, payload, type: SUCCESS }),
    error => next({ ...rest, error, type: FAILURE })
  )
}

const redux = () => session => {
  const middlewares = [thunk, promiseMiddleware]
  const stateFromServer =
    typeof window === 'undefined' ? undefined : window.REDUX_STATE
  const store = createStore(
    rootReducer,
    stateFromServer,
    process.env.NODE_ENV === 'development' && typeof window !== 'undefined'
      ? composeWithDevTools(applyMiddleware(...middlewares))
      : compose(applyMiddleware(...middlewares))
  )

  session.on('server', next => {
    next()
    session.document.window.REDUX_STATE = store.getState()
  })

  return async next => {
    const children = await next()

    return <Provider store={store}>{children}</Provider>
  }
}

export default redux
