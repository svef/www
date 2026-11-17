import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PageSection } from './PageSection'
import { SectionHead } from '../SectionHead/SectionHead'

const meta: Meta<typeof PageSection> = {
  title: 'Layout/PageSection',
  component: PageSection,
  parameters: { layout: 'fullscreen' },
}
export default meta

type Story = StoryObj<typeof PageSection>

export const Named: Story = {
  render: () => (
    <PageSection aria-labelledby="s-head">
      <SectionHead id="s-head" title="Fréttir" />
      <p>Efni kaflans.</p>
    </PageSection>
  ),
}
/** The page's body, with no heading of its own. */
export const Unnamed: Story = {
  render: () => (
    <PageSection>
      <p>Efni síðunnar.</p>
    </PageSection>
  ),
}
/** The last section keeps the space above the footer. */
export const Last: Story = {
  render: () => (
    <PageSection last aria-labelledby="l-head">
      <SectionHead id="l-head" title="Síðasti kaflinn" />
      <p>Efni kaflans.</p>
    </PageSection>
  ),
}
