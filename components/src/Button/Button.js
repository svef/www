import React from 'react'

import './Button.scss'

const Button = ({ theme, ...props }) => (
  <button className={['Button', theme].join(' ')} {...props} />
)

export default Button
