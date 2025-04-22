/// <reference types="cypress" />

describe('DeploymentsPage – country filter, drill into site, then device details', () => {
  beforeEach(() => {
    // log in
    cy.visit('/login')
    cy.get('input[name="username"]').type('admin')
    cy.get('input[name="password"]').type('admin')
    cy.get('button[type="submit"]').click()
    cy.url().should('not.include', '/login')

    // stub the deployments list
    cy.intercept('GET', '**/deployment/', {
      statusCode: 200,
      body: [
        {
          id: 1,
          deployment_ID: 'dep1',
          site_name: 'Voss',
          deployment_start: '2021-01-01T00:00:00Z',
          deployment_end:   '2021-06-01T00:00:00Z',
          folder_size: 500,
          last_upload: '2021-05-15T00:00:00Z',
          country:     'Norway'
        },
        {
          id: 2,
          deployment_ID: 'dep2',
          site_name: 'Sogn',
          deployment_start: '2021-07-01T00:00:00Z',
          deployment_end:   null,
          folder_size: 300,
          last_upload: '2021-08-20T00:00:00Z',
          country:     'Sweden'
        },
      ],
    }).as('getDeployments')
  })

  it('filters by country, enters site, then shows device details', () => {
    // 1) go to deployments page
    cy.get('[data-testid="deploymentsPage"]').click()
    cy.wait('@getDeployments')
    cy.url().should('include', '/deployments')

    // 2) filter by country “Norway”
    cy.get('button').contains('Select Country').click()
    cy.get('li').contains('Norway').click()
    cy.contains('Voss').should('exist')
    cy.contains('Sogn').should('not.exist')

    // 3) clear filter
    cy.get('button').contains('Clear Selection').click()
    cy.contains('Voss').should('exist')
    cy.contains('Sogn').should('exist')

    // 4) stub & click into Voss site detail
    cy.intercept('GET', '**/deployment/by_site/Voss/', {
      statusCode: 200,
      body: {
        deployment_ID: 'dep1',
        site_name: 'Voss',
        deployment_start: '2021-01-01T00:00:00Z',
        deployment_end:   '2021-06-01T00:00:00Z',
        folder_size: 500,
        last_upload: '2021-05-15T00:00:00Z',
        country: 'Norway',
        latitude: 60.0,
        longitude: 10.0,
        coordinate_uncertainty: 5,
        gps_device: 'GPS1',
        mic_height: 100,
        mic_direction: 'North',
        habitat: 'Forest',
        score: 90,
        protocol_checklist: 'Checklist data',
        user_email: 'user@example.com',
        comment: 'No comment',
      },
    }).as('getSiteDetail')

    cy.get('a[href*="/deployments/Voss"]').click()
    cy.wait('@getSiteDetail')
    cy.url().should('include', '/deployments/Voss')
    cy.contains('p', 'Deployment ID: dep1').should('exist')
    cy.contains('p', 'Country: Norway').should('exist')

    // 5) now stub the device detail endpoint
    cy.intercept('GET', '**/devices/by_site/Voss/', {
      statusCode: 200,
      body: {
        device_ID:      'device123',
        configuration:  'cfg-A',
        sim_card_icc:   'ICC-0001',
        sim_card_batch: 'BATCH-42',
        sd_card_size:   32
      }
    }).as('getDeviceDetail')

    // 6) click the Device Details **tab**
    cy.contains('Device Details').click()
    cy.wait('@getDeviceDetail')

    // 7) assert that the DeviceDetailPage shows the stubbed data
    cy.contains('h2', 'Device Details').should('exist')
    cy.contains('p', 'Device ID: device123').should('exist')
    cy.contains('p', 'Configuration: cfg-A').should('exist')
    cy.contains('p', 'SIM Card ICC: ICC-0001').should('exist')
    cy.contains('p', 'SIM Card Batch: BATCH-42').should('exist')
    cy.contains('p', 'SD Card Size (GB): 32').should('exist')
  })
})
