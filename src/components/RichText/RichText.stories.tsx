import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { RichText } from './RichText'

const text = (value: string) => ({
  detail: 0,
  format: 0,
  mode: 'normal',
  style: '',
  text: value,
  type: 'text',
  version: 1,
})

const block = (type: string, value: string, extra: Record<string, unknown> = {}) => ({
  children: [text(value)],
  direction: 'ltr',
  format: '',
  indent: 0,
  textFormat: 0,
  type,
  version: 1,
  ...extra,
})

// Transcribed from the article page of the Claude Design export, which is what
// the prose styling is measured against.
const data = {
  root: {
    children: [
      block(
        'paragraph',
        'Ný stjórn SVEF tók við störfum á aðalfundi samtakanna þann 22. maí síðastliðinn.',
      ),
      block(
        'paragraph',
        'Á fundinum var farið yfir starfsárið sem er að baki: átta viðburði, tvö Klúðurkvöld og vefverðlaun sem seldust upp á tíu dögum.',
      ),
      block('heading', 'Áherslur næsta starfsárs', { tag: 'h2' }),
      block(
        'paragraph',
        'Stjórnin ætlar að leggja áherslu á aðgengismál og fjölbreyttari viðburði utan höfuðborgarsvæðisins.',
      ),
      block(
        'quote',
        '„Við hlökkum mikið til starfsársins með ykkur og getum ekki beðið eftir að halda vefverðlaunin í 26. sinn.“',
      ),
      block(
        'paragraph',
        'Nánari upplýsingar um dagskrá og staðsetningu verða birtar á næstu vikum.',
      ),
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const meta: Meta<typeof RichText> = {
  title: 'Content/RichText',
  component: RichText,
  args: { data: data as never },
  parameters: { layout: 'padded' },
}
export default meta

type Story = StoryObj<typeof RichText>

export const ArticleBody: Story = {}
/** An empty field renders nothing rather than an empty prose box. */
export const Empty: Story = { args: { data: null } }
