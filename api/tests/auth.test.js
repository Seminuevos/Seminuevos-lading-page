/**
 * Tests de integración para /api/auth/login y /api/auth/logout
 * Ejecutar con: node --test api/tests/auth.test.js
 * Requiere las variables de entorno configuradas en .env
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

async function post(path, body, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    return { status: r.status, body: await r.json() };
}

describe('POST /api/auth/login', () => {
    test('rechaza cuando falta email', async () => {
        const { status } = await post('/api/auth/login', { password: 'test' });
        assert.equal(status, 400);
    });

    test('rechaza cuando falta password', async () => {
        const { status } = await post('/api/auth/login', { email: 'test@test.com' });
        assert.equal(status, 400);
    });

    test('rechaza email con formato inválido', async () => {
        const { status } = await post('/api/auth/login', { email: 'no-es-un-email', password: '123456' });
        assert.equal(status, 400);
    });

    test('rechaza credenciales incorrectas', async () => {
        const { status, body } = await post('/api/auth/login', {
            email: 'noexiste@test.com',
            password: 'wrongpassword'
        });
        assert.equal(status, 401);
        assert.ok(body.error);
    });

    // Para este test necesitas un usuario de prueba en tu DB
    test('retorna token JWT con credenciales válidas (skip en CI sin DB)', { skip: !process.env.TEST_WITH_DB }, async () => {
        const { status, body } = await post('/api/auth/login', {
            email: process.env.TEST_USER_EMAIL,
            password: process.env.TEST_USER_PASSWORD
        });
        assert.equal(status, 200);
        assert.ok(body.token);
        assert.ok(body.user?.email);
        assert.ok(!body.user?.password);
        assert.ok(!body.user?.password_hash);
    });
});

describe('POST /api/auth/logout', () => {
    test('responde 200 incluso sin token válido', async () => {
        const { status } = await post('/api/auth/logout', {});
        assert.equal(status, 200);
    });
});
