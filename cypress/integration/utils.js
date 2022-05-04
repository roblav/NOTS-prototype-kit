const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const waitForApplication = async () => {
  cy.task('log', 'Waiting for app to restart and load home page')
  cy.task('waitUntilAppRestarts')
  cy.visit('/')
  cy.get('h1.govuk-heading-xl')
    .should('contains.text', 'Prototype your service using GOV.UK Prototype Kit')
}

const getFilename = ({ currentTarget }) => currentTarget.location.pathname
  .split('/')
  .pop()
  .replace('v', 'govuk-prototype-kit-') + '.zip'

/*   Based on the workaround examples here: https://github.com/cypress-io/cypress/issues/14857  */
const download = ({ timeout }) => (element) => {
  cy.window().document().then(doc => {
    doc.addEventListener('click', async (event) => {
      const downloadsFolder = Cypress.config('downloadsFolder')
      const filename = getFilename(event)
      await sleep(1000)
      cy.task('downloaded', { filename, downloadsFolder })
      await sleep(1000)
      cy.task('installApp', { timeout })
      doc.location.reload()
    })

    /* Make sure the file exists */
    cy.intercept('/', (req) => {
      req.reply((res) => {
        expect(res.statusCode).to.equal(200)
      })
    })

    element.click()
  })
}

module.exports = {
  download,
  sleep,
  waitForApplication
}
