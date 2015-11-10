// Copyright 2015, University of Colorado Boulder

/**
 * A Node meant to just take up vertical space (usually for layout purposes).
 * It is never displayed, and cannot have children.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );

  var Spacer = require( 'SCENERY/nodes/Spacer' );

  /**
   * Creates a strut with x=0 and y in the range [0,height].
   */
  function VStrut( height, options ) {
    Spacer.call( this, 0, height, options );
  }
  scenery.register( 'VStrut', VStrut );

  return inherit( Spacer, VStrut );
} );
