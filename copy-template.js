const fs = require('fs-extra');
const path = require('path');
try {
  fs.copySync(path.join(__dirname, 'src', 'templates'),path.join(__dirname, 'dist', 'templates'));
  console.log('Templates copied successfully.');
} catch (err) {
  console.error('Error copying templates:', err);
}
