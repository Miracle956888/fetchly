import { describe, expect, it } from 'vitest';
import { signDeliveryToken, verifyDeliveryToken } from '../deliveryToken.js';

describe('delivery tokens', () => {
  it('accepts a freshly signed token for the right job', () => {
    const { token } = signDeliveryToken('job-1');
    expect(verifyDeliveryToken('job-1', token)).toBe(true);
  });

  it('rejects a token presented for a different job', () => {
    const { token } = signDeliveryToken('job-1');
    expect(verifyDeliveryToken('job-2', token)).toBe(false);
  });

  it('rejects expired tokens', () => {
    const past = Date.now() - 20 * 60_000;
    const { token } = signDeliveryToken('job-1', past);
    expect(verifyDeliveryToken('job-1', token)).toBe(false);
  });

  it('rejects tampered, malformed or missing tokens', () => {
    const { token } = signDeliveryToken('job-1');
    const tampered = token.slice(0, -2) + 'aa';
    expect(verifyDeliveryToken('job-1', tampered)).toBe(false);
    expect(verifyDeliveryToken('job-1', 'garbage')).toBe(false);
    expect(verifyDeliveryToken('job-1', undefined)).toBe(false);
    expect(verifyDeliveryToken('job-1', null)).toBe(false);
  });

  it('does not leak the file path or job internals', () => {
    const { token } = signDeliveryToken('job-1');
    expect(token).not.toContain('job-1');
    expect(token).not.toContain('/');
  });
});
