/**
 * Tests de integración para /api/vehicles
 * Ejecutar con: node --test api/tests/vehicles.test.js
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.TEST_API_BASE || 'http://localhost:3000';

async function req(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const r = await fetch(`${BASE}${path}`, opts);
    return { status: r.status, body: await r.json() };
}

describe('GET /api/vehicles', () => {
    test('rechaza sin token JWT', async () => {
        const { status } = await req('GET', '/api/vehicles');
        assert.equal(status, 401);
    });

    test('retorna lista con token válido (skip sin DB)', { skip: !process.env.TEST_WITH_DB }, async () => {
        // Primero obtener token
        const loginRes = await req('POST', '/api/auth/login', {
            email: process.env.TEST_USER_EMAIL,
            password: process.env.TEST_USER_PASSWORD
        });
        const token = loginRes.body.token;
        assert.ok(token);

        const { status, body } = await req('GET', '/api/vehicles', null, token);
        assert.equal(status, 200);
        assert.ok(Array.isArray(body.data));
    });
});

describe('POST /api/vehicles', () => {
    test('rechaza sin token JWT', async () => {
        const { status } = await req('POST', '/api/vehicles', { title: 'Test' });
        assert.equal(status, 401);
    });

    test('rechaza sin título (campo requerido)', { skip: !process.env.TEST_WITH_DB }, async () => {
        const loginRes = await req('POST', '/api/auth/login', {
            email: process.env.TEST_USER_EMAIL,
            password: process.env.TEST_USER_PASSWORD
        });
        const token = loginRes.body.token;
        const { status } = await req('POST', '/api/vehicles', {}, token);
        assert.equal(status, 400);
    });
});
