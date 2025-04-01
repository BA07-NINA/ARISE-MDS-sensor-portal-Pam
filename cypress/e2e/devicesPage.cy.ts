/// <reference types="cypress" />

describe('DevicesPage med navigering via Sidebar', () => {
    beforeEach(() => {
      cy.visit('http://localhost:8080/login');
      cy.get('input[name="username"]').type('admin');
      cy.get('input[name="password"]').type('admin');
      cy.get('button[type="submit"]').click();
  
      cy.url().should('include', '/');
  
      // Intercept kall for å hente devices-lista
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
  
    it('navigerer til DevicesPage og deretter til DeviceDetailPage', () => {
      // Klikk på Devices i sidebaren
      cy.get('[data-testid="devicesPage"]').click();
      cy.wait('@getDevices');
      cy.url().should('include', '/devices');
      cy.contains('Device').should('exist');
  
      // Intercept kall for å hente detaljer for device med id "device1"
      cy.intercept('GET', '**/devices/device1', {
        statusCode: 200,
        body: {
          device_ID: 'device1',
          deployment_device_ID: 'deployment1',
          startDate: '2021-01-01',
          endDate: '2021-12-31',
          lastUpload: '2021-11-30',
          folder_size: 500,
          country: 'Norway',
          site: 'Site A',
          latitude: 60.0,
          longitude: 10.0,
          coordinateUncertainty: 5,
          gpsDevice: 'GPS1',
          micHeight: 100,
          micDirection: 'North',
          habitat: 'Forest',
          score: 90,
          protocolChecklist: 'Checklist data',
          userEmail: 'user@example.com',
          comment: 'No comment',
        },
      }).as('getDeviceDetail');
  
      // Klikk på device-linken (må ha data-testid "deviceDetails" på linken i DevicesPage)
      cy.get('[data-testid="deviceDetails"]').first().click();
      cy.wait('@getDeviceDetail');
      cy.url().should('include', '/devices/device1');
      cy.contains('Device Details').should('exist');
    });
  

  });
  