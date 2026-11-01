import { execFileSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('Firebase Admin runtime compatibility', () => {
  it('loads Auth and resolves an RSA signing key without CommonJS-to-ESM require support', () => {
    const script = `
      require('firebase-admin/auth');
      const { retrieveSigningKeys } = require('jwks-rsa/src/utils');
      const { generateKeyPairSync, sign, verify } = require('node:crypto');
      (async () => {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
        const jwk = publicKey.export({ format: 'jwk' });
        const keys = await retrieveSigningKeys([{ ...jwk, use: 'sig', alg: 'RS256', kid: 'synthetic' }]);
        if (keys.length !== 1 || keys[0].kid !== 'synthetic') throw new Error('Signing key missing');
        const message = Buffer.from('synthetic runtime verification');
        const signature = sign('RSA-SHA256', message, privateKey);
        if (!verify('RSA-SHA256', message, keys[0].getPublicKey(), signature)) throw new Error('Key mismatch');
        const { passportJwtSecret } = require('jwks-rsa');
        await new Promise((resolve, reject) => {
          passportJwtSecret({ jwksUri: 'https://unused.invalid/keys' })({}, 'invalid', (error, key) => {
            if (error || key !== null) reject(new Error('Invalid token not rejected'));
            else resolve();
          });
        });
        console.log('runtime-compatible');
      })().catch(() => process.exitCode = 1);
    `
    const output = execFileSync(
      process.execPath,
      ['--no-experimental-require-module', '-e', script],
      { encoding: 'utf8', env: { PATH: process.env.PATH, NODE_ENV: 'test' } }
    )
    expect(output.trim()).toBe('runtime-compatible')
  })
})
