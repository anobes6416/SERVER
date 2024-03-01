import express from 'express';
import { app } from './app';
import connectDB from './utils/db';
require('dotenv').config();

// Create an instance of Express
const app = express();

// Define the /api/v1/registration route
app.post('/api/v1/registration', (req, res) => {
  // Handle the registration logic here
  // ...
});

// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server is connected with port ${process.env.PORT}`);
  connectDB();
});