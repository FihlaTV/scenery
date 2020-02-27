// Copyright 2017-2019, University of Colorado Boulder

/**
 * Focus tests
 *
 * @author Sam Reid (PhET Interactive Simulations)
 */

import Display from '../display/Display.js';
import Node from '../nodes/Node.js';
import Trail from '../util/Trail.js';

QUnit.module( 'Focus' );

// Arrays of items of the type { trail: {Trail}, children: {Array.<Item>} }
function nestedEquality( assert, a, b ) {
  assert.equal( a.length, b.length );

  for ( let i = 0; i < a.length; i++ ) {
    const aItem = a[ i ];
    const bItem = b[ i ];

    assert.ok( aItem.trail.equals( bItem.trail ) );

    nestedEquality( assert, aItem.children, bItem.children );
  }
}

QUnit.test( 'Simple Test', function( assert ) {

  const a1 = new Node( { tagName: 'div' } );
  const a2 = new Node( { tagName: 'div' } );

  const b1 = new Node( { tagName: 'div' } );
  const b2 = new Node( { tagName: 'div' } );

  const a = new Node( { children: [ a1, a2 ] } );
  const b = new Node( { children: [ b1, b2 ] } );

  const root = new Node( { children: [ a, b ] } );

  const nestedOrder = root.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    { trail: new Trail( [ root, a, a1 ] ), children: [] },
    { trail: new Trail( [ root, a, a2 ] ), children: [] },
    { trail: new Trail( [ root, b, b1 ] ), children: [] },
    { trail: new Trail( [ root, b, b2 ] ), children: [] }
  ] );
} );

QUnit.test( 'accessibleOrder Simple Test', function( assert ) {

  const a1 = new Node( { tagName: 'div' } );
  const a2 = new Node( { tagName: 'div' } );

  const b1 = new Node( { tagName: 'div' } );
  const b2 = new Node( { tagName: 'div' } );

  const a = new Node( { children: [ a1, a2 ] } );
  const b = new Node( { children: [ b1, b2 ] } );

  const root = new Node( { children: [ a, b ], accessibleOrder: [ b, a ] } );

  const nestedOrder = root.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    { trail: new Trail( [ root, b, b1 ] ), children: [] },
    { trail: new Trail( [ root, b, b2 ] ), children: [] },
    { trail: new Trail( [ root, a, a1 ] ), children: [] },
    { trail: new Trail( [ root, a, a2 ] ), children: [] }
  ] );
} );

QUnit.test( 'accessibleOrder Descendant Test', function( assert ) {

  const a1 = new Node( { tagName: 'div' } );
  const a2 = new Node( { tagName: 'div' } );

  const b1 = new Node( { tagName: 'div' } );
  const b2 = new Node( { tagName: 'div' } );

  const a = new Node( { children: [ a1, a2 ] } );
  const b = new Node( { children: [ b1, b2 ] } );

  const root = new Node( { children: [ a, b ], accessibleOrder: [ a1, b1, a2, b2 ] } );

  const nestedOrder = root.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    { trail: new Trail( [ root, a, a1 ] ), children: [] },
    { trail: new Trail( [ root, b, b1 ] ), children: [] },
    { trail: new Trail( [ root, a, a2 ] ), children: [] },
    { trail: new Trail( [ root, b, b2 ] ), children: [] }
  ] );
} );

QUnit.test( 'accessibleOrder Descendant Pruning Test', function( assert ) {

  const a1 = new Node( { tagName: 'div' } );
  const a2 = new Node( { tagName: 'div' } );

  const b1 = new Node( { tagName: 'div' } );
  const b2 = new Node( { tagName: 'div' } );

  const c1 = new Node( { tagName: 'div' } );
  const c2 = new Node( { tagName: 'div' } );

  const c = new Node( { children: [ c1, c2 ] } );

  const a = new Node( { children: [ a1, a2, c ] } );
  const b = new Node( { children: [ b1, b2 ] } );

  const root = new Node( { children: [ a, b ], accessibleOrder: [ c1, a, a2, b2 ] } );

  const nestedOrder = root.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    { trail: new Trail( [ root, a, c, c1 ] ), children: [] },
    { trail: new Trail( [ root, a, a1 ] ), children: [] },
    { trail: new Trail( [ root, a, c, c2 ] ), children: [] },
    { trail: new Trail( [ root, a, a2 ] ), children: [] },
    { trail: new Trail( [ root, b, b2 ] ), children: [] },
    { trail: new Trail( [ root, b, b1 ] ), children: [] }
  ] );
} );

QUnit.test( 'accessibleOrder Descendant Override', function( assert ) {

  const a1 = new Node( { tagName: 'div' } );
  const a2 = new Node( { tagName: 'div' } );

  const b1 = new Node( { tagName: 'div' } );
  const b2 = new Node( { tagName: 'div' } );

  const a = new Node( { children: [ a1, a2 ] } );
  const b = new Node( { children: [ b1, b2 ], accessibleOrder: [ b1, b2 ] } );

  const root = new Node( { children: [ a, b ], accessibleOrder: [ b, b1, a ] } );

  const nestedOrder = root.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    { trail: new Trail( [ root, b, b2 ] ), children: [] },
    { trail: new Trail( [ root, b, b1 ] ), children: [] },
    { trail: new Trail( [ root, a, a1 ] ), children: [] },
    { trail: new Trail( [ root, a, a2 ] ), children: [] }
  ] );
} );

QUnit.test( 'accessibleOrder Hierarchy', function( assert ) {

  const a1 = new Node( { tagName: 'div' } );
  const a2 = new Node( { tagName: 'div' } );

  const b1 = new Node( { tagName: 'div' } );
  const b2 = new Node( { tagName: 'div' } );

  const a = new Node( { children: [ a1, a2 ], accessibleOrder: [ a2 ] } );
  const b = new Node( { children: [ b1, b2 ], accessibleOrder: [ b2, b1 ] } );

  const root = new Node( { children: [ a, b ], accessibleOrder: [ b, a ] } );

  const nestedOrder = root.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    { trail: new Trail( [ root, b, b2 ] ), children: [] },
    { trail: new Trail( [ root, b, b1 ] ), children: [] },
    { trail: new Trail( [ root, a, a2 ] ), children: [] },
    { trail: new Trail( [ root, a, a1 ] ), children: [] }
  ] );
} );

QUnit.test( 'accessibleOrder DAG test', function( assert ) {

  const a1 = new Node( { tagName: 'div' } );
  const a2 = new Node( { tagName: 'div' } );

  const a = new Node( { children: [ a1, a2 ], accessibleOrder: [ a2, a1 ] } );
  const b = new Node( { children: [ a1, a2 ], accessibleOrder: [ a1, a2 ] } );

  const root = new Node( { children: [ a, b ] } );

  const nestedOrder = root.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    { trail: new Trail( [ root, a, a2 ] ), children: [] },
    { trail: new Trail( [ root, a, a1 ] ), children: [] },
    { trail: new Trail( [ root, b, a1 ] ), children: [] },
    { trail: new Trail( [ root, b, a2 ] ), children: [] }
  ] );
} );

QUnit.test( 'accessibleOrder DAG test', function( assert ) {

  const x = new Node();
  const a = new Node();
  const b = new Node();
  const c = new Node();
  const d = new Node( { tagName: 'div' } );
  const e = new Node();
  const f = new Node( { tagName: 'div' } );
  const g = new Node( { tagName: 'div' } );
  const h = new Node( { tagName: 'div' } );
  const i = new Node( { tagName: 'div' } );
  const j = new Node( { tagName: 'div' } );
  const k = new Node( { tagName: 'div' } );
  const l = new Node();

  x.children = [ a ];
  a.children = [ k, b, c ];
  b.children = [ d, e ];
  c.children = [ e ];
  e.children = [ j, f, g ];
  f.children = [ h, i ];

  x.accessibleOrder = [ f, c, d, l ];
  a.accessibleOrder = [ c, b ];
  e.accessibleOrder = [ g, f, j ];

  const nestedOrder = x.getNestedAccessibleOrder();

  nestedEquality( assert, nestedOrder, [
    // x order's F
    {
      trail: new Trail( [ x, a, b, e, f ] ), children: [
        { trail: new Trail( [ x, a, b, e, f, h ] ), children: [] },
        { trail: new Trail( [ x, a, b, e, f, i ] ), children: [] }
      ]
    },
    {
      trail: new Trail( [ x, a, c, e, f ] ), children: [
        { trail: new Trail( [ x, a, c, e, f, h ] ), children: [] },
        { trail: new Trail( [ x, a, c, e, f, i ] ), children: [] }
      ]
    },

    // X order's C
    { trail: new Trail( [ x, a, c, e, g ] ), children: [] },
    { trail: new Trail( [ x, a, c, e, j ] ), children: [] },

    // X order's D
    { trail: new Trail( [ x, a, b, d ] ), children: [] },

    // X everything else
    { trail: new Trail( [ x, a, b, e, g ] ), children: [] },
    { trail: new Trail( [ x, a, b, e, j ] ), children: [] },
    { trail: new Trail( [ x, a, k ] ), children: [] }
  ] );
} );

QUnit.test( 'setting accessibleOrder', function( assert ) {

  const rootNode = new Node();
  var display = new Display( rootNode ); // eslint-disable-line
  document.body.appendChild( display.domElement );

  const a = new Node( { tagName: 'div' } );
  const b = new Node( { tagName: 'div' } );
  const c = new Node( { tagName: 'div' } );
  const d = new Node( { tagName: 'div' } );
  rootNode.children = [ a, b, c, d ];

  // reverse accessible order
  rootNode.accessibleOrder = [ d, c, b, a ];

  const divRoot = display._rootAccessibleInstance.peer.primarySibling;
  const divA = a.accessibleInstances[ 0 ].peer.primarySibling;
  const divB = b.accessibleInstances[ 0 ].peer.primarySibling;
  const divC = c.accessibleInstances[ 0 ].peer.primarySibling;
  const divD = d.accessibleInstances[ 0 ].peer.primarySibling;

  assert.ok( divRoot.children[ 0 ] === divD, 'divD should be first child' );
  assert.ok( divRoot.children[ 1 ] === divC, 'divC should be second child' );
  assert.ok( divRoot.children[ 2 ] === divB, 'divB should be third child' );
  assert.ok( divRoot.children[ 3 ] === divA, 'divA should be fourth child' );
} );

QUnit.test( 'setting accessibleOrder before setting accessible content', function( assert ) {
  const rootNode = new Node();
  var display = new Display( rootNode ); // eslint-disable-line
  document.body.appendChild( display.domElement );

  const a = new Node();
  const b = new Node();
  const c = new Node();
  const d = new Node();
  rootNode.children = [ a, b, c, d ];

  // reverse accessible order
  rootNode.accessibleOrder = [ d, c, b, a ];

  a.tagName = 'div';
  b.tagName = 'div';
  c.tagName = 'div';
  d.tagName = 'div';

  const divRoot = display._rootAccessibleInstance.peer.primarySibling;
  const divA = a.accessibleInstances[ 0 ].peer.primarySibling;
  const divB = b.accessibleInstances[ 0 ].peer.primarySibling;
  const divC = c.accessibleInstances[ 0 ].peer.primarySibling;
  const divD = d.accessibleInstances[ 0 ].peer.primarySibling;

  assert.ok( divRoot.children[ 0 ] === divD, 'divD should be first child' );
  assert.ok( divRoot.children[ 1 ] === divC, 'divC should be second child' );
  assert.ok( divRoot.children[ 2 ] === divB, 'divB should be third child' );
  assert.ok( divRoot.children[ 3 ] === divA, 'divA should be fourth child' );
} );

QUnit.test( 'setting accessible order on nodes with no accessible content', function( assert ) {
  const rootNode = new Node();
  var display = new Display( rootNode ); // eslint-disable-line
  document.body.appendChild( display.domElement );

  // root
  //    a
  //      b
  //     c   e
  //        d  f

  const a = new Node( { tagName: 'div' } );
  const b = new Node( { tagName: 'div' } );
  const c = new Node( { tagName: 'div' } );
  const d = new Node( { tagName: 'div' } );
  const e = new Node( { tagName: 'div' } );
  const f = new Node( { tagName: 'div' } );
  rootNode.addChild( a );
  a.addChild( b );
  b.addChild( c );
  b.addChild( e );
  c.addChild( d );
  c.addChild( f );
  b.accessibleOrder = [ e, c ];

  const divB = b.accessibleInstances[ 0 ].peer.primarySibling;
  const divC = c.accessibleInstances[ 0 ].peer.primarySibling;
  const divE = e.accessibleInstances[ 0 ].peer.primarySibling;

  assert.ok( divB.children[ 0 ] === divE, 'div E should be first child of div B' );
  assert.ok( divB.children[ 1 ] === divC, 'div C should be second child of div B' );
} );

QUnit.test( 'setting accessible order on nodes with no accessible content', function( assert ) {
  const rootNode = new Node();
  var display = new Display( rootNode ); // eslint-disable-line
  document.body.appendChild( display.domElement );

  const a = new Node( { tagName: 'div' } );
  const b = new Node();
  const c = new Node( { tagName: 'div' } );
  const d = new Node( { tagName: 'div' } );
  const e = new Node( { tagName: 'div' } );
  const f = new Node( { tagName: 'div' } );
  rootNode.addChild( a );
  a.addChild( b );
  b.addChild( c );
  b.addChild( e );
  c.addChild( d );
  c.addChild( f );
  a.accessibleOrder = [ e, c ];

  const divA = a.accessibleInstances[ 0 ].peer.primarySibling;
  const divC = c.accessibleInstances[ 0 ].peer.primarySibling;
  const divE = e.accessibleInstances[ 0 ].peer.primarySibling;

  assert.ok( divA.children[ 0 ] === divE, 'div E should be first child of div B' );
  assert.ok( divA.children[ 1 ] === divC, 'div C should be second child of div B' );
} );