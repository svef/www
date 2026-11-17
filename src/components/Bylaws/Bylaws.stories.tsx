import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { BylawsText } from './BylawsText'
import { BylawsNote } from './BylawsNote'
import { is } from '@/lib/i18n/is'

const markdown = `# Lög Samtaka vefiðnaðarins

### 1. gr.
Félagið heitir Samtök vefiðnaðarins, skammstafað SVEF.

### 2. gr.
Tilgangur félagsins er að efla vefiðnað á Íslandi, miðla þekkingu og standa að Vefverðlaununum.

- Fundir og ráðstefnur
- Útgáfa og fræðsla

### 3. gr.
Stjórn félagsins skipa fimm aðalmenn og tveir varamenn.
`

const meta: Meta<typeof BylawsText> = {
  title: 'Content/Bylaws',
  component: BylawsText,
  parameters: { layout: 'fullscreen' },
  args: { markdown, lang: 'is' },
}
export default meta

type Story = StoryObj<typeof BylawsText>

export const Articles: Story = {}
/** A source that cannot be split into articles is shown as it is rather than dropped. */
export const NoArticles: Story = {
  args: { markdown: '# Lög\n\nTextinn er ekki í greinum.\n\nÖnnur málsgrein.' },
}
export const WithNote: Story = {
  render: (args) => (
    <>
      <BylawsText {...args} />
      <BylawsNote heading={is.about.bylawsProcess.heading}>
        <p>{is.about.bylawsProcess.meeting}</p>
        <p>{is.about.bylawsProcess.article8}</p>
      </BylawsNote>
    </>
  ),
}
