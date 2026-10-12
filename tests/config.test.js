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
