/// <reference types="cypress" />

describe('DevicesPage med navigering via Sidebar', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="username"]').type('admin');
      cy.get('input[name="password"]').type('admin');
      cy.get('button[type="submit"]').click();
  
      cy.url().should('include', '/');
  
      cy.intercept('GET', '**/devices/', {
        statusCode: 200,
        body: [
          {
            device_ID: 'device1',
            start_date: '2021-01-01',
            end_date: '2021-12-31',
            id: 1,
            folder_size: 500,
          },
          {
            device_ID: 'device2',
            start_date: '2021-02-01',
            end_date: '2021-11-30',
            id: 2,
            folder_size: 300,
          },
        ],
      }).as('getDevices');
    });
  
    it('navigerer til DevicesPage ved å klikke på Devices i sidebaren', () => {
      cy.contains('Devices').click();
  
      cy.wait('@getDevices');
  
      cy.url().should('include', '/devices');
  
      cy.contains('Device').should('exist');
    });
});
  