const path = require('path')

const { waitForApplication } = require('../utils')

const customStylesFixture = 'custom-styles'
const customStylesFixtureName = `${customStylesFixture}.scss`
const customStylesFixturePath = path.join(Cypress.config('fixturesFolder'), 'sass', customStylesFixtureName)
const customStylesAppPath = path.join(Cypress.env('projectFolder'), 'app', 'assets', 'sass', customStylesFixtureName)
const customStylesPublicPath = 'public/stylesheets/custom-styles.css'

const pageFixture = 'custom-styles'
const pageFixtureName = `${pageFixture}.html`
const pageFixturePath = path.join(Cypress.config('fixturesFolder'), pageFixtureName)
const pageAppPath = path.join(Cypress.env('projectFolder'), 'app', 'views', pageFixtureName)

describe('watch custom sass files', () => {
  describe(`sass file ${customStylesFixtureName} should be created and linked within ${pageFixturePath} and accessible from the browser as /${customStylesPublicPath}`, () => {
    beforeEach(() => {
      waitForApplication()
    })

    afterEach(() => {
      // delete test files
      cy.task('deleteFile', { filename: path.join(Cypress.env('projectFolder'), customStylesPublicPath) })
      cy.task('deleteFile', { filename: customStylesAppPath })
      cy.task('deleteFile', { filename: pageAppPath })
    })

    it('The colour of the paragraph should be changed to green', () => {
      cy.task('log', 'Create a page to view our custom styles')
      cy.task('copyFile', {
        source: pageFixturePath,
        target: pageAppPath
      })

      cy.task('log', 'The colour of the paragraph should be black')
      cy.visit(`/${pageFixture}`)
      cy.get('p.app-custom-style').should('have.css', 'background-color', 'rgba(0, 0, 0, 0)')

      cy.task('log', `Create ${customStylesAppPath}`)
      cy.task('copyFile', {
        source: customStylesFixturePath,
        target: customStylesAppPath
      })

      // When we add our stylesheet, we expect Browsersync to detect that and
      // tell the browser to fetch it, so let's wait for that resource to
      // become available. From the Cypress example recipes:
      // https://github.com/cypress-io/cypress-example-recipes/blob/master/examples/testing-dom__wait-for-resource/README.md
      cy.task('log', 'Wait for the stylesheet to be loaded')
      cy.window().then(win => {
        win.performance
          .getEntriesByType('resource')
          .find(item => item.name.endsWith(`${customStylesFixture}.css`))
      })

      cy.task('log', 'The colour of the paragraph should be changed to green')
      cy.get('p.app-custom-style').should('have.css', 'background-color', 'rgb(0, 255, 0)')

      cy.task('log', `Request ${customStylesPublicPath}`)
      cy.request(`/${customStylesPublicPath}`)
        .then(response => expect(response.status).to.eq(200))
    })
  })
})
