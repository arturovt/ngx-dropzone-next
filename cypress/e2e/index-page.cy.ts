describe('Index page', () => {
  beforeEach(() => cy.visit('/'));

  it('should render application using the latest version', () => {
    // Arrange & act & assert
    // Expect that the running applicaiton was compiled
    // with the necessary Angular version!
    cy.get('app-root').invoke('attr', 'ng-version').should('have.string', '19');
  });
});
