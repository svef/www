import * as migration_20261008_035238_initial from './20261008_035238_initial'
import * as migration_20261008_000000_submissions from './20261008_000000_submissions'
import * as migration_20261117_161706_events_sponsors from './20261117_161706_events_sponsors'
import * as migration_20261117_185038_cms_fields_byline_stats_press from './20261117_185038_cms_fields_byline_stats_press'
import * as migration_20261117_200331_home_page_copy from './20261117_200331_home_page_copy'
import * as migration_20261117_200500_submissions_lock_rels from './20261117_200500_submissions_lock_rels'

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
  {
    up: migration_20261117_185038_cms_fields_byline_stats_press.up,
    down: migration_20261117_185038_cms_fields_byline_stats_press.down,
    name: '20261117_185038_cms_fields_byline_stats_press',
  },
  {
    up: migration_20261117_200331_home_page_copy.up,
    down: migration_20261117_200331_home_page_copy.down,
    name: '20261117_200331_home_page_copy',
  },
  {
    up: migration_20261117_200500_submissions_lock_rels.up,
    down: migration_20261117_200500_submissions_lock_rels.down,
    name: '20261117_200500_submissions_lock_rels',
  },
]
