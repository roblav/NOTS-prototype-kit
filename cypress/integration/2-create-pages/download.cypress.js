import { download, waitForApplication } from '../utils'

describe('download page', () => {
  beforeEach(() => {
    waitForApplication()
  })

  it('loaded ok', () => {
    cy.get('main')
      .find('a').contains('Tutorials and templates')
      .click()

    cy.get('a[data-link="download"]')
      .should('contains.text', 'Download the Prototype Kit (zip file)')
      .click()

    cy.get('details a span')
      .first()
      .should('contains.text', 'govuk-prototype-kit')
      .then(download({ timeout: 60000 }))
  })
})
