const bcrypt = require('bcryptjs');

async function generateHash(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}\n`);
}

// Generate hashes for your passwords
generateHash('admin123');
generateHash('user123');