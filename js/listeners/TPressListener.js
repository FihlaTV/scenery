// Copyright 2016, University of Colorado Boulder

/**
 * phet-io handling for PressListener.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
define( function( require ) {
  'use strict';

  // modules
  var assertInstanceOf = require( 'ifphetio!PHET_IO/assertions/assertInstanceOf' );
  var phetioInherit = require( 'ifphetio!PHET_IO/phetioInherit' );
  var scenery = require( 'SCENERY/scenery' );
  var TObject = require( 'ifphetio!PHET_IO/types/TObject' );

  /**
   * @param {PressListener} pressListener
   * @param {string} phetioID
   * @constructor
   */
  function TPressListener( pressListener, phetioID ) {
    TObject.call( this, pressListener, phetioID );

    assertInstanceOf( pressListener, phet.scenery.PressListener );
  }

  phetioInherit( TObject, 'TPressListener', TPressListener, {}, {
    documentation: 'Input listener for something that can be pressed.',
    events: [ 'press', 'drag', 'release' ]
  } );

  scenery.register( 'TPressListener', TPressListener );

  return TPressListener;
} );

