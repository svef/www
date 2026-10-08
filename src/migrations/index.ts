import * as migration_20261008_035238_initial from './20261008_035238_initial'
import * as migration_20261008_000000_submissions from './20261008_000000_submissions'

export const migrations = [
  {
    up: migration_20261008_035238_initial.up,
    down: migration_20261008_035238_initial.down,
    name: '20261008_035238_initial',
  },
  {
    up: migration_20261008_000000_submissions.up,
    down: migration_20261008_000000_submissions.down,
    name: '20261008_000000_submissions',
  },
]
