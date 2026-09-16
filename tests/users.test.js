/**
 * Tests de integración para /api/users
 * Ejecutar con: node --test api/tests/users.test.js
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

describe('GET /api/users', () => {
    test('rechaza sin token JWT', async () => {
        const { status } = await req('GET', '/api/users');
        assert.equal(status, 401);
    });
});

describe('POST /api/users', () => {
    test('rechaza sin token JWT', async () => {
        const { status } = await req('POST', '/api/users', {
            email: 'test@test.com', full_name: 'Test', password: 'test123'
        });
        assert.equal(status, 401);
    });

    test('rechaza email inválido', { skip: !process.env.TEST_WITH_DB }, async () => {
        const loginRes = await req('POST', '/api/auth/login', {
            email: process.env.TEST_USER_EMAIL,
            password: process.env.TEST_USER_PASSWORD
        });
        const token = loginRes.body.token;
        const { status } = await req('POST', '/api/users', {
            email: 'not-an-email',
            full_name: 'Test User',
            password: 'ValidPass123'
        }, token);
        assert.equal(status, 400);
    });

    test('rechaza contraseña menor de 6 caracteres', { skip: !process.env.TEST_WITH_DB }, async () => {
        const loginRes = await req('POST', '/api/auth/login', {
            email: process.env.TEST_USER_EMAIL,
            password: process.env.TEST_USER_PASSWORD
        });
        const token = loginRes.body.token;
        const { status } = await req('POST', '/api/users', {
            email: 'valid@test.com',
            full_name: 'Test User',
            password: '123'
        }, token);
        assert.equal(status, 400);
    });

    test('la respuesta de creación nunca incluye password ni password_hash', { skip: !process.env.TEST_WITH_DB }, async () => {
        const loginRes = await req('POST', '/api/auth/login', {
            email: process.env.TEST_USER_EMAIL,
            password: process.env.TEST_USER_PASSWORD
        });
        const token = loginRes.body.token;
        const timestamp = Date.now();
        const { status, body } = await req('POST', '/api/users', {
            email: `testuser_${timestamp}@test.com`,
            full_name: 'Test User Auto',
            password: 'ValidPass123!',
            role: 'sales'
        }, token);

        if (status === 201) {
            assert.ok(!body.data?.password, 'password no debe estar en la respuesta');
            assert.ok(!body.data?.password_hash, 'password_hash no debe estar en la respuesta');
        }
    });
});
