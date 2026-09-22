/**
 * Creates or promotes an administrator.
 *   node server/create-admin.js you@example.com 'a long passphrase'
 */
import { run } from './db.js';
import { createUser, findUserByEmail, setPassword, validateEmail, validatePassword } from './auth.js';

const [email, password] = process.argv.slice(2);
if (!validateEmail(email)) {
  console.error('Usage: node server/create-admin.js <email> <password>');
  process.exit(1);
}
const problem = validatePassword(password);
if (problem) {
  console.error(problem);
  process.exit(1);
}

const existing = findUserByEmail(email);
if (existing) {
  setPassword(existing.id, password);
  run("UPDATE users SET role = 'admin' WHERE id = ?", existing.id);
  console.log(`Promoted ${email} to administrator and reset the password.`);
} else {
  createUser({ email, password, name: 'Radar admin', role: 'admin' });
  console.log(`Created administrator ${email}.`);
}
