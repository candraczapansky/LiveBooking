import express from 'express';
import { registerLocationRoutes } from './server/routes/locations.js';

const app = express();

// Add basic middleware
app.use(express.json());

// Mock authentication middleware
app.use((req, res, next) => {
  req.user = { id: 1, username: 'test', email: 'test@example.com', role: 'admin' };
  next();
});

// Register the locations routes
registerLocationRoutes(app);

// Test the route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

const server = app.listen(3002, () => {
  console.log('Test server running on port 3002');
  
  // Test the locations endpoint
  fetch('http://localhost:3002/api/locations')
    .then(response => response.json())
    .then(data => {
      console.log('Locations endpoint response:', data);
      server.close();
    })
    .catch(error => {
      console.error('Error testing locations endpoint:', error);
      server.close();
    });
}); 