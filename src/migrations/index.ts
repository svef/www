import * as migration_20261008_035238_initial from './20261008_035238_initial'
import * as migration_20261008_000000_submissions from './20261008_000000_submissions'
import * as migration_20261117_161706_events_sponsors from './20261117_161706_events_sponsors'

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
  {
    up: migration_20261117_161706_events_sponsors.up,
    down: migration_20261117_161706_events_sponsors.down,
    name: '20261117_161706_events_sponsors',
  },
]
