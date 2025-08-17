// Debug environment variables
console.log('🔍 Debugging environment variables...\n');

console.log('process.env.HELCIM_API_TOKEN:', process.env.HELCIM_API_TOKEN ? 'SET' : 'NOT SET');
console.log('process.env.HELCIM_API_URL:', process.env.HELCIM_API_URL || 'NOT SET');

if (process.env.HELCIM_API_TOKEN) {
  console.log('Token length:', process.env.HELCIM_API_TOKEN.length);
  console.log('Token preview:', process.env.HELCIM_API_TOKEN.substring(0, 10) + '...');
} else {
  console.log('❌ HELCIM_API_TOKEN is not set');
}

console.log('\nAll environment variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('HELCIM') || key.includes('API')) {
    console.log(`${key}: ${process.env[key] ? 'SET' : 'NOT SET'}`);
  }
}); 