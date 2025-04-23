/// <reference types="cypress" />

describe('DeploymentsPage – full E2E with real login + refresh stub', () => {
  beforeEach(() => {
    cy.intercept('POST', '/api/token/').as('loginReq')

    cy.visit('/login')
    cy.get('input[name="username"]').type('admin')
    cy.get('input[name="password"]').type('admin')
    cy.get('button[type="submit"]').click()

    cy.wait('@loginReq').then(({ response }) => {
      expect(response?.statusCode).to.equal(200)
      const tokens = response!.body
      expect(tokens).to.have.property('access')
      expect(tokens).to.have.property('refresh')

      cy.intercept('POST', '/api/token/refresh/', {
        statusCode: 200,
        body: tokens
      }).as('refreshReq')

      cy.visit('/', {
        onBeforeLoad(win) {
          win.localStorage.setItem('authTokens', JSON.stringify(tokens))
        }
      })

      cy.wrap(tokens.access).as('accessToken')
    })
  })

  it('stays logged in and loads the deployments table', function() {
    cy.visit('/deployments')

    cy.wait('@refreshReq')

    cy.window().then((win) => {
      const authTokens = win.localStorage.getItem('authTokens');
      if (!authTokens) {
        throw new Error('authTokens not found in localStorage');
      }
      const { access } = JSON.parse(authTokens);
      cy.request({
        method: 'GET',
        url: '/api/deployment/',
        headers: { Authorization: `Bearer ${access}` }
      }).its('body').then((body) => {
        cy.get('table tbody tr')
          .should('have.length', body.length)

        cy.get('table tbody tr').first().within(() => {
          cy.get('td').eq(0).should('contain.text', body[0].site_name)
          cy.get('td').eq(1).should('contain.text', body[0].deployment_ID)
        })
        cy.get('table tbody tr')
        .first()
        .find('a')
        .click()

        cy.url().should('include', `/deployments/${body[0].site_name}`)

        cy.contains('Device Details').click()
        cy.contains('p', 'Device ID:').should('exist')

        cy.contains('Data Files').click()
        cy.get('table tbody tr').first().find('a').click()
        cy.contains('h1', 'Data File Details').should('exist')
        

  
      })
    })

  })
})