require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`CraveKart API running at http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Unable to start CraveKart API:', error.message);
    process.exit(1);
  }
}

startServer();
