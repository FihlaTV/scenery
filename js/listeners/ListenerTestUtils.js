// Copyright 2018-2020, University of Colorado Boulder

/**
 * Utilities for listener tests
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */
define( require => {
  'use strict';

  // modules
  const Display = require( 'SCENERY/display/Display' );
  const Node = require( 'SCENERY/nodes/Node' );
  const Rectangle = require( 'SCENERY/nodes/Rectangle' );
  const Vector2 = require( 'DOT/Vector2' );

  const ListenerTestUtils = {

    /**
     * Sends a synthesized mouseDown event at the given coordinates.
     * @public
     *
     * @param {Display} display
     * @param {number} x
     * @param {number} y
     */
    mouseDown: function( display, x, y ) {
      const domEvent = document.createEvent( 'MouseEvent' );

      // technically deprecated, but DOM4 event constructors not out yet. people on #whatwg said to use it
      domEvent.initMouseEvent( 'mousedown', true, true, window, 1, // click count
        x, y, x, y,
        false, false, false, false,
        0, // button
        null );

      display._input.validatePointers();
      display._input.mouseDown( new Vector2( x, y ), domEvent );
    },

    /**
     * Sends a synthesized mouseUp event at the given coordinates.
     * @public
     *
     * @param {Display} display
     * @param {number} x
     * @param {number} y
     */
    mouseUp: function( display, x, y ) {
      const domEvent = document.createEvent( 'MouseEvent' );

      // technically deprecated, but DOM4 event constructors not out yet. people on #whatwg said to use it
      domEvent.initMouseEvent( 'mouseup', true, true, window, 1, // click count
        x, y, x, y,
        false, false, false, false,
        0, // button
        null );

      display._input.validatePointers();
      display._input.mouseUp( new Vector2( x, y ), domEvent );
    },

    /**
     * Sends a synthesized mouseMove event at the given coordinates.
     * @public
     *
     * @param {Display} display
     * @param {number} x
     * @param {number} y
     */
    mouseMove: function( display, x, y ) {
      const domEvent = document.createEvent( 'MouseEvent' );

      // technically deprecated, but DOM4 event constructors not out yet. people on #whatwg said to use it
      domEvent.initMouseEvent( 'mousemove', true, true, window, 0, // click count
        x, y, x, y,
        false, false, false, false,
        0, // button
        null );


      display._input.validatePointers();
      display._input.mouseMove( new Vector2( x, y ), domEvent );
    },

    /**
     * Runs a simple test with a 20x20 rectangle in a 640x480 display.
     * @public
     *
     * @param {Function} callback - Called with callback( {Display}, {Node}, {Node} ) - First node is the draggable rect
     */
    simpleRectangleTest: function( callback ) {
      const node = new Node();
      const display = new Display( node, { width: 640, height: 480 } );
      display.initializeEvents();
      display.updateDisplay();

      const rect = new Rectangle( 0, 0, 20, 20, { fill: 'red' } );
      node.addChild( rect );

      callback( display, rect, node );

      // Cleanup, so we don't leak listeners/memory
      display.dispose();
    }
  };

  return ListenerTestUtils;
} );
