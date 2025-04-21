/// <reference types="cypress" />

describe('DeploymentsPage med navigering via Sidebar', () => {
  beforeEach(() => {
    // Logg inn
    cy.visit('/login');
    cy.get('input[name="username"]').type('admin');
    cy.get('input[name="password"]').type('admin');
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');

    // Stub liste‑kallet
    cy.intercept('GET', '**/deployment/', {
      statusCode: 200,
      body: [
        {
          id: 1,
          deployment_ID: 'deployment1',
          site_name: 'Voss',
          deployment_start: '2021-01-01T00:00:00Z',
          deployment_end:   '2021-12-31T00:00:00Z',
          folder_size: 500,
          last_upload: '2021-11-30T00:00:00Z',
        },
        {
          id: 2,
          deployment_ID: 'deployment2',
          site_name: 'Sogn',
          deployment_start: '2022-01-01T00:00:00Z',
          deployment_end:   null,
          folder_size: 300,
          last_upload: '2022-06-15T00:00:00Z',
        },
      ],
    }).as('getDeployments');
  });

  it('viser deployments-listen og navigerer til SiteDetailPage', () => {
    // Gå til Deployments-siden via sidebar
    cy.get('[data-testid="deploymentsPage"]').click();
    // Vent på stub
    cy.wait('@getDeployments');

    // URL skal være /deployments
    cy.url().should('include', '/deployments');
    // Sjekk at tabellen viser våre stub‑ede rader
    cy.contains('Voss').should('exist');
    cy.contains('Sogn').should('exist');
    cy.contains('500 MB').should('exist');

    // Stub detaljkallet for site "Voss"
    cy.intercept('GET', '**/deployment/by_site/Voss/', {
      statusCode: 200,
      body: {
        deployment_ID: 'deployment1',
        site_name: 'Voss',
        deployment_start: '2021-01-01T00:00:00Z',
        deployment_end:   '2021-12-31T00:00:00Z',
        folder_size: 500,
        last_upload: '2021-11-30T00:00:00Z',
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
    }).as('getDeploymentDetail');

    // Klikk på første lenke i tabellen (Voss)
    cy.get('a[href*="/deployments/Voss"]').first().click();
    cy.wait('@getDeploymentDetail');

    // URL og innhold på detaljsiden
    cy.url().should('include', '/deployments/Voss');
    cy.contains('Site Details').should('exist');
    cy.contains('Deployment ID:').next().should('contain', 'deployment1');
    cy.contains('Folder Size:').next().should('contain', '500');
    cy.contains('Country:').next().should('contain', 'Norway');
  });
});
