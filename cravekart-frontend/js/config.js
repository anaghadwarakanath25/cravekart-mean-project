/*
 * CraveKart frontend configuration.
 * Change apiUrl if your backend runs on a different host/port
 * (the backend's CLIENT_URL in backend/.env must match the origin serving this app).
 */
window.CRAVEKART_CONFIG = {
  // true  = DEMO MODE: sample restaurants/food/orders run inside the browser, no backend needed.
  // false = talk to the real Express/MongoDB backend at apiUrl below.
  useMock: true,
  apiUrl: 'http://localhost:5000/api',
  defaultCity: 'Mysuru',
  defaultState: 'Karnataka',
  taxRate: 0.05            // display-only estimate; the server calculates the real total
};
