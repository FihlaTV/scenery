// Copyright 2002-2014, University of Colorado Boulder

/**
 * A Node meant to just take up certain bounds. It is never displayed, and cannot have children.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );

  var Bounds2 = require( 'DOT/Bounds2' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Leaf = require( 'SCENERY/nodes/Leaf' );

  /**
   * Creates a spacer taking up a rectangular area from x: [0,width] and y: [0,height]. Use x/y in options to control
   * its position.
   */
  scenery.Spacer = function Spacer( width, height, options ) {
    Node.call( this );

    // override the local bounds to our area
    this.localBounds = new Bounds2( 0, 0, width, height );

    this.mutate( options );
  };
  var Spacer = scenery.Spacer;

  inherit( Node, Spacer );
  Leaf.mixin( Spacer ); // prevent children from being added, since we're overriding local bounds

  return Spacer;
} );