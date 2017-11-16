// Copyright 2016, University of Colorado Boulder

/**
 * phet-io handling for DragListener.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
define( function( require ) {
  'use strict';

  // modules
  var assertInstanceOf = require( 'ifphetio!PHET_IO/assertInstanceOf' );
  var phetioInherit = require( 'ifphetio!PHET_IO/phetioInherit' );
  var scenery = require( 'SCENERY/scenery' );
  var PressListenerIO = require( 'SCENERY/listeners/PressListenerIO' );

  /**
   * @param {DragListener} dragListener
   * @param {string} phetioID
   * @constructor
   */
  function DragListenerIO( dragListener, phetioID ) {
    assert && assertInstanceOf( dragListener, phet.scenery.DragListener );
    PressListenerIO.call( this, dragListener, phetioID );
  }

  phetioInherit( PressListenerIO, 'DragListenerIO', DragListenerIO, {}, {
    documentation: 'Input listener for something that can be dragged.',
    events: [ 'start', 'end' ]
  } );

  scenery.register( 'DragListenerIO', DragListenerIO );

  return DragListenerIO;
} );

