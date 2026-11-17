import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { FaqAccordion } from './FaqAccordion'

const meta: Meta<typeof FaqAccordion> = {
  title: 'Content/FaqAccordion',
  component: FaqAccordion,
  parameters: { layout: 'padded' },
  args: {
    items: [
      { question: 'Hvað kostar að ganga í SVEF?', answer: 'Félagsgjald fer eftir stærð fyrirtækis. Sjá verðskrá á aðildarsíðunni.' },
      { question: 'Hver getur gengið í félagið?', answer: 'Allir sem starfa við vefiðnað á Íslandi, einstaklingar og fyrirtæki.' },
      { question: 'Hvernig sendi ég inn vef í Vefverðlaunin?', answer: 'Skráning opnar í upphafi árs og lokar í lok febrúar.' },
    ],
  },
}
export default meta

type Story = StoryObj<typeof FaqAccordion>

export const Closed: Story = {}

/** One row opened; the others stay closed. */
export const OneOpen: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getAllByRole('button')[0])
  },
}

export const LongAnswer: Story = {
  args: {
    items: [
      {
        question: 'Hvað gerir SVEF nákvæmlega?',
        answer:
          'SVEF miðlar þekkingu, heldur viðburði, stendur að Vefverðlaununum og vinnur að bættum vinnubrögðum í vefiðnaði. '.repeat(6),
      },
    ],
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button'))
  },
}

/** The English site with an answer that has no English text yet. */
export const FallbackLanguage: Story = {
  args: {
    items: [
      { question: 'Who can join?', answer: 'Allir sem starfa við vefiðnað.', answerLang: 'is' },
      { question: 'Is it free?', answer: 'Nei.', questionLang: 'is', answerLang: 'is' },
    ],
  },
}
export const Empty: Story = { args: { items: [] } }
