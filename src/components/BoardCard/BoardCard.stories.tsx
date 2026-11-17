import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BoardCard, type Accent } from './BoardCard'
import { BoardGrid } from './BoardGrid'

const portrait = { url: '/dev-fixtures/sponsors/hraunmolar.png', alt: '', width: 800, height: 1000 }

const meta: Meta<typeof BoardCard> = {
  title: 'Content/BoardCard',
  component: BoardCard,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    name: 'Anna Jónsdóttir',
    role: 'Formaður',
    company: 'JúnÍ Digital',
    companyPrefix: 'hjá',
    portrait,
  },
}
export default meta

type Story = StoryObj<typeof BoardCard>

export const Default: Story = {}
/** `board-members.photo` is optional: the box keeps its shape as a striped placeholder. */
export const NoPortrait: Story = { args: { portrait: null } }
export const NoCompany: Story = { args: { company: null, role: 'Gjaldkeri' } }
export const LongNameAndRole: Story = {
  args: {
    name: 'Guðrún Sigríður Þorsteinsdóttir-Hjaltalín',
    role: 'Varaformaður og ábyrgðarmaður vefverðlauna',
    company: 'Hönnunar- og hugbúnaðarstofan Tröllaskagi',
  },
}
export const EnglishRole: Story = {
  args: { role: 'Chair', company: 'JúnÍ Digital', companyPrefix: 'at', roleLang: 'en' },
}

const ACCENTS: Accent[] = ['violet', 'pink', 'yellow', 'red']

/** The block behind the photo's corner, in each accent and on each side. */
export const Accents: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 'min(900px, 90vw)' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <BoardGrid>
      {ACCENTS.map((accent, i) => (
        <BoardCard
          key={accent}
          {...args}
          name={`${accent[0].toUpperCase()}${accent.slice(1)}`}
          accent={accent}
          side={i % 2 === 0 ? 'right' : 'left'}
          index={i}
        />
      ))}
    </BoardGrid>
  ),
}

/** Eight looks, then they repeat; some cards have no portrait, as a half-filled board would. */
export const Spread: Story = {
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ width: 'min(1200px, 100%)', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <BoardGrid>
      {Array.from({ length: 9 }, (_, i) => (
        <BoardCard
          key={i}
          {...args}
          name={`Stjórnarmaður ${i + 1}`}
          role={i === 0 ? 'Formaður' : 'Meðstjórnandi'}
          company={i % 3 === 0 ? 'Fyrirtæki' : null}
          portrait={i % 4 === 3 ? null : portrait}
          accent={ACCENTS[i % 4]}
          side={i % 2 === 0 ? 'right' : 'left'}
          index={i}
        />
      ))}
    </BoardGrid>
  ),
}
