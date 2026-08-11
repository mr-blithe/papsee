import { NextIntlClientProvider } from 'next-intl'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import en from '@/../messages/en.json'
import { WhyPapSeeSection } from './why-papsee-section'

describe('why PapSee section', () => {
  it('presents the six reasons to keep a therapy history in a responsive two-row layout', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(
      <NextIntlClientProvider locale="en" messages={en}>
        <WhyPapSeeSection />
      </NextIntlClientProvider>,
    )

    const section = container.querySelector('section#why')
    const reasons = section?.querySelectorAll('ol > li')
    const list = section?.querySelector('ol')

    expect(section?.querySelector('h2')?.textContent).toBe(en.Landing.whyTitle)
    expect(reasons).toHaveLength(6)
    expect(list?.classList).toContain('lg:grid-cols-3')
  })
})
