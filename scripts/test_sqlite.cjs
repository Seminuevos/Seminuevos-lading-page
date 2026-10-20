try {
  const { DatabaseSync } = require('node:sqlite');
  console.log('node:sqlite is available!', typeof DatabaseSync);
} catch (e) {
  console.log('node:sqlite error:', e.message);
}
