/**
 * Genera el valor de ADMIN_PASSWORD_HASH para guardar en Vercel.
 * Uso:  node scripts/generar-hash.mjs "mi contraseña"
 *
 * Es opcional: también puedes usar ADMIN_PASSWORD en texto plano,
 * ya que Vercel cifra las variables de entorno.
 */
import { randomBytes, scryptSync } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Falta la contraseña.\n\n  node scripts/generar-hash.mjs "mi contraseña"\n');
  process.exit(1);
}
if (password.length < 10) {
  console.error('⚠  Usa una contraseña de al menos 10 caracteres.\n');
}

const salt = randomBytes(16).toString('hex');
const hash = scryptSync(password, salt, 32).toString('hex');

console.log('\nGuarda esto en Vercel como ADMIN_PASSWORD_HASH:\n');
console.log(`${salt}:${hash}\n`);
console.log('Y borra la variable ADMIN_PASSWORD si la tenías.\n');
