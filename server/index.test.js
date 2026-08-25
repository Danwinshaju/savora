import test from 'node:test';
import assert from 'node:assert/strict';
import { products } from './index.js';

test('catalogue contains the products shown by the original storefront', () => {
  assert.equal(products.length, 35);
  assert.deepEqual([...new Set(products.map(product => product.category))], ['sweets', 'snacks', 'pickles', 'masala', 'rice']);
  assert.ok(products.every(product => product.id && product.name && product.price > 0 && product.image));
});

test('catalogue identifiers are unique', () => {
  assert.equal(new Set(products.map(product => product.id)).size, products.length);
});
