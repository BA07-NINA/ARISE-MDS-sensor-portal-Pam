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
          win.sessionStorage.setItem('authTokens', JSON.stringify(tokens))
        }
      })

      cy.wrap(tokens.access).as('accessToken')
    })
  })

  it('stays logged in and loads the deployments table', function() {
    cy.visit('/deployments')
    cy.wait('@refreshReq')

    cy.window().then((win) => {
      const authTokens = win.sessionStorage.getItem('authTokens');
      if (!authTokens) {
        throw new Error('authTokens not found in sessionStorage');
      }
      const { access } = JSON.parse(authTokens);

      cy.request({
        method: 'GET',
        url: '/api/deployment/',
        headers: { Authorization: `Bearer ${access}` }
      }).its('body').then((body) => {

        const site = body[0].site_name

        cy.get('table tbody tr')
          .should('have.length', body.length)

        cy.get('table tbody tr').first().within(() => {
          cy.get('td').eq(0).should('contain.text', site)
          cy.get('td').eq(1).should('contain.text', body[0].deployment_ID)
        })

        cy.get('table tbody tr')
          .first()
          .find('a')
          .click()

        cy.url().should('include', `/deployments/${site}`)

        cy.contains('Device Details').click()
        cy.contains('p', 'Device ID:').should('exist')

        cy.contains('Data Files').click()
        cy.get('table tbody tr').first().find('a').click()
        cy.contains('h1', 'Data File Details').should('exist')

        // Extract file ID from URL
        cy.url().then(url => {
          const fileId = url.split('/').pop()

          cy.window().then(win => {
            const { access } = JSON.parse(win.sessionStorage.getItem('authTokens')!)
            cy.request({
              method: 'GET',
              url: `/api/datafile/${fileId}/`,
              headers: { Authorization: `Bearer ${access}` }
            }).its('body').then((file) => {
              // Assert all key fields render correctly
              cy.contains('p', `File Name:`).should('contain.text', file.file_name)
              cy.contains('p', `File Format:`).should('contain.text', file.file_format)
              cy.contains('p', `Sample Rate:`)
                .should('contain.text', file.sample_rate ?? ':')
              cy.contains('p', `File Length:`)
                .should('contain.text', file.file_length ?? ':')
              cy.contains('p', `Quality Score:`)
                .should('contain.text', file.quality_score != null 
                  ? `${file.quality_score}` 
                  : ':')
              cy.contains('p', `Upload Date:`)
                .should('contain.text', new Date(file.upload_dt).toLocaleString())
              cy.contains('p', `Recording Date:`)
                .should('contain.text', new Date(file.recording_dt).toLocaleString())
              cy.contains('p', `Quality Check Status:`)
                .should('contain.text', file.quality_check_status)
              
              cy.intercept('POST', `/api/datafile/${fileId}/check_quality/`)
              .as('checkQuality')
              
              cy.contains('Check Quality').click()
              
              cy.wait('@checkQuality')
                .its('response.statusCode')
                .should('eq', 200)
            
                cy.reload()

              cy.contains('p', 'Quality Check Status:')
                .should('not.contain.text', 'Not checked')
              
              cy.reload()
            
              cy.contains('p', 'Quality Check Status:')
                .should('contain.text', 'completed')
                .and('not.contain.text', 'pending') 

    
          })
        })

        cy.contains('Map').click()

   
      })
    })
  })
})
})
