import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildKnowledgeGraphQueryPayload,
  clampKnowledgeGraphMaxNodes,
  encodeKnowledgeGraphParam,
} from './knowledgeGraph.js';

test('buildKnowledgeGraphQueryPayload trims and normalizes optional fields', () => {
  assert.deepEqual(
    buildKnowledgeGraphQueryPayload({
      query: '  fiber  ',
      maxNodes: '18',
      sourceTypes: ['uploaded_knowledge', 'nutrition_rules'],
      documentIdsText: ' doc-a, , doc-b ',
    }),
    {
      query: 'fiber',
      max_nodes: 18,
      source_types: ['uploaded_knowledge', 'nutrition_rules'],
      document_ids: ['doc-a', 'doc-b'],
    },
  );
});

test('clampKnowledgeGraphMaxNodes keeps the value inside the UI range', () => {
  assert.equal(clampKnowledgeGraphMaxNodes('0'), 1);
  assert.equal(clampKnowledgeGraphMaxNodes('12'), 12);
  assert.equal(clampKnowledgeGraphMaxNodes('99'), 24);
});

test('encodeKnowledgeGraphParam escapes reserved path characters', () => {
  assert.equal(encodeKnowledgeGraphParam('food:broccoli'), 'food%3Abroccoli');
  assert.equal(
    encodeKnowledgeGraphParam('food:broccoli|contains|nutrient:fiber'),
    'food%3Abroccoli%7Ccontains%7Cnutrient%3Afiber',
  );
});

test('knowledge graph form payload includes document ids only when present', () => {
  assert.deepEqual(
    buildKnowledgeGraphQueryPayload({
      query: 'omega 3',
      maxNodes: 8,
      sourceTypes: [],
      documentIdsText: '',
    }),
    {
      query: 'omega 3',
      max_nodes: 8,
    },
  );
});
