const path = require('path')

const { waitForApplication } = require('../utils')

const templatesView = path.join(Cypress.env('packageFolder') || Cypress.env('projectFolder'), 'cypress', 'fixtures', 'views', 'checkbox-test.html')
const appView = path.join(Cypress.env('projectFolder'), 'app', 'views', 'checkbox-test.html')
const pagePath = '/checkbox-test'

describe('checkbox tests', () => {
  before(() => {
    waitForApplication()
    cy.task('deleteFile', { filename: appView })
    cy.task('log', `Copy ${templatesView} to ${appView}`)
    cy.task('copyFile', { source: templatesView, target: appView })
    cy.task('log', 'The checkbox-test page should be displayed')
    cy.visit(pagePath)
    cy.get('h1')
      .should('contains.text', 'Checkbox tests')
  })

  after(() => {
    cy.task('deleteFile', { filename: appView })
  })

  it('hidden input with value _unchecked is created', () => {
    cy.get('input[type="checkbox"]').eq(1).check({ force: true })
  })
})
