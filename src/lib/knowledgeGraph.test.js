import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildKnowledgeGraphModeLabel,
  buildKnowledgeGraphQueryPayload,
  buildSvgGraphLayout,
  clampGraphScale,
  clampKnowledgeGraphMaxNodes,
  deriveFullGraphEdges,
  encodeKnowledgeGraphParam,
  normalizeKnowledgeGraphStatus,
  zoomGraphViewport,
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

test('buildKnowledgeGraphModeLabel returns readable labels for full and subgraph views', () => {
  assert.equal(buildKnowledgeGraphModeLabel({ mode: 'full' }), '目前檢視：全量知識圖譜');
  assert.equal(
    buildKnowledgeGraphModeLabel({ mode: 'subgraph', query: 'fiber' }),
    '目前檢視：查詢子圖 - fiber',
  );
});

test('normalizeKnowledgeGraphStatus returns a stable ready summary shape', () => {
  assert.deepEqual(
    normalizeKnowledgeGraphStatus({
      ready: true,
      summary: {
        document_count: 18,
        node_count: 124,
        edge_count: 212,
        evidence_count: 278,
      },
    }),
    {
      ready: true,
      summary: {
        document_count: 18,
        node_count: 124,
        edge_count: 212,
        evidence_count: 278,
        generated_at: '',
        source_counts: {},
      },
    },
  );
});

test('normalizeKnowledgeGraphStatus accepts alternate ready fields and status labels', () => {
  assert.deepEqual(
    normalizeKnowledgeGraphStatus({
      graph_ready: true,
      summary: {},
    }),
    {
      ready: true,
      summary: {
        document_count: 0,
        node_count: 0,
        edge_count: 0,
        evidence_count: 0,
        generated_at: '',
        source_counts: {},
      },
    },
  );

  assert.equal(
    normalizeKnowledgeGraphStatus({
      status: 'ready',
      summary: {},
    }).ready,
    true,
  );
});

test('normalizeKnowledgeGraphStatus infers ready when summary counts already exist', () => {
  assert.equal(
    normalizeKnowledgeGraphStatus({
      summary: {
        node_count: 8,
      },
    }).ready,
    true,
  );

  assert.equal(
    normalizeKnowledgeGraphStatus({
      status: 'processing',
      summary: {
        node_count: 8,
      },
    }).ready,
    false,
  );
});

test('buildKnowledgeGraphModeLabel falls back to full graph label without subgraph query text', () => {
  assert.equal(buildKnowledgeGraphModeLabel({ mode: 'subgraph', query: '' }), '目前檢視：全量知識圖譜');
});

test('deriveFullGraphEdges connects nodes that share documents', () => {
  const edges = deriveFullGraphEdges([
    { id: 'food:broccoli', document_ids: ['doc-a'] },
    { id: 'nutrient:fiber', document_ids: ['doc-a'] },
    { id: 'condition:gut', document_ids: ['doc-b'] },
  ]);

  assert.deepEqual(edges, [
    {
      id: 'derived:food:broccoli|co_document|nutrient:fiber',
      source: 'food:broccoli',
      target: 'nutrient:fiber',
      relation_type: 'co_document',
      derived: true,
    },
  ]);
});

test('buildSvgGraphLayout returns positioned nodes and edges inside bounds', () => {
  const layout = buildSvgGraphLayout({
    nodes: [
      { id: 'food:broccoli', label: 'broccoli' },
      { id: 'nutrient:fiber', label: 'fiber' },
      { id: 'condition:gut', label: 'gut health' },
    ],
    edges: [
      {
        id: 'e1',
        source: 'food:broccoli',
        target: 'nutrient:fiber',
        relation_type: 'contains',
      },
    ],
    width: 900,
    height: 520,
  });

  assert.equal(layout.nodes.length, 3);
  assert.equal(layout.edges.length, 1);
  assert.ok(layout.nodes.every((node) => node.x >= 40 && node.x <= 860));
  assert.ok(layout.nodes.every((node) => node.y >= 40 && node.y <= 480));
  assert.equal(layout.edges[0].sourceNode.id, 'food:broccoli');
  assert.equal(layout.edges[0].targetNode.id, 'nutrient:fiber');
});

test('clampGraphScale keeps zoom inside supported range', () => {
  assert.equal(clampGraphScale(0.1), 0.6);
  assert.equal(clampGraphScale(1), 1);
  assert.equal(clampGraphScale(5), 2.4);
});

test('zoomGraphViewport zooms around a focal point', () => {
  const next = zoomGraphViewport({
    scale: 1,
    translateX: 0,
    translateY: 0,
    nextScale: 2,
    focalX: 100,
    focalY: 120,
  });

  assert.deepEqual(next, {
    scale: 2,
    translateX: -100,
    translateY: -120,
  });
});
