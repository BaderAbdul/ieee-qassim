import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Sample Test Suite', () => {
  it('should assert basic arithmetic', () => {
    const sum: number = 2 + 2;
    assert.equal(sum, 4);
  });
});
