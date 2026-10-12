// Pruebas de la gestión de secretos: la configuración sale de las variables de entorno.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const { loadConfig } = require('../src/loadConfig');

const SECRETO = 'x'.repeat(48);
const URL_BD = 'postgresql://usuario:clave@host/grada?sslmode=require';

test('en producción, sin SESSION_SECRET o sin DATABASE_URL la aplicación no arranca', () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /SESSION_SECRET, DATABASE_URL/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', SESSION_SECRET: SECRETO }), /DATABASE_URL/);
  assert.throws(() => loadConfig({ NODE_ENV: 'production', DATABASE_URL: URL_BD }), /SESSION_SECRET/);
});

test('en producción, un SESSION_SECRET demasiado corto se rechaza', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production', SESSION_SECRET: 'corto', DATABASE_URL: URL_BD }),
    /al menos 32 caracteres/,
  );
});

test('los valores se leen de las variables de entorno', () => {
  const config = loadConfig({ NODE_ENV: 'production', SESSION_SECRET: SECRETO, DATABASE_URL: URL_BD, PORT: '8080' });
  assert.equal(config.isProduction, true);
  assert.equal(config.sessionSecret, SECRETO);
  assert.equal(config.databaseUrl, URL_BD);
  assert.equal(config.port, 8080);
});

test('en desarrollo no hay secretos fijos: si falta SESSION_SECRET se genera uno aleatorio', () => {
  const a = loadConfig({});
  const b = loadConfig({});
  assert.equal(a.isProduction, false);
  assert.equal(a.databaseUrl, null);
  assert.ok(a.sessionSecret.length >= 32);
  assert.notEqual(a.sessionSecret, b.sessionSecret);
});

test('el fichero .env con los secretos locales está excluido del repositorio', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const gitignore = fs.readFileSync(path.join(__dirname, '..', '.gitignore'), 'utf8').split(/\r?\n/);
  assert.ok(gitignore.includes('.env'));
});

test('la confirmación por correo está activada salvo que se desactive a propósito', () => {
  assert.equal(loadConfig({}).requireEmailConfirmation, true);
  assert.equal(loadConfig({ REQUIRE_EMAIL_CONFIRMATION: 'true' }).requireEmailConfirmation, true);
  assert.equal(loadConfig({ REQUIRE_EMAIL_CONFIRMATION: 'false' }).requireEmailConfirmation, false);
});

test('el correo saliente se configura con SMTP_URL y MAIL_FROM (los dos juntos)', () => {
  assert.equal(loadConfig({}).mail.smtpUrl, null);
  assert.throws(() => loadConfig({ SMTP_URL: 'smtps://u:p@smtp.ejemplo.com:465' }), /MAIL_FROM/);

  const config = loadConfig({ SMTP_URL: 'smtps://u:p@smtp.ejemplo.com:465', MAIL_FROM: 'La Grada <a@b.es>' });
  assert.equal(config.mail.smtpUrl, 'smtps://u:p@smtp.ejemplo.com:465');
  assert.equal(config.mail.from, 'La Grada <a@b.es>');
});

test('PUBLIC_URL se normaliza (sin barra final) y debe ser una URL http(s)', () => {
  assert.equal(loadConfig({}).publicUrl, null);
  assert.equal(loadConfig({ PUBLIC_URL: 'https://grada.example.com/' }).publicUrl, 'https://grada.example.com');
  assert.throws(() => loadConfig({ PUBLIC_URL: 'grada.example.com' }), /PUBLIC_URL/);
});
