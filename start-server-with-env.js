// Set environment variables
process.env.HELCIM_API_TOKEN = 'adClJoT.d*$JlSAZi6u-sMSuUPX%aojxchf6_S-wen.x._u5isgwIGjP0oDL*r@k';
process.env.HELCIM_API_URL = 'https://api.helcim.com/v1';

console.log('🚀 Starting server with Helcim environment variables...');
console.log('HELCIM_API_TOKEN:', process.env.HELCIM_API_TOKEN ? 'SET' : 'NOT SET');
console.log('HELCIM_API_URL:', process.env.HELCIM_API_URL);

// Start the server
const { spawn } = require('child_process');
const server = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  env: process.env
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

server.on('exit', (code) => {
  console.log(`Server exited with code ${code}`);
}); 