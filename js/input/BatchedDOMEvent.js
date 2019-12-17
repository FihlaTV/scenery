// Copyright 2014-2019, University of Colorado Boulder


/**
 * Pooled structure to record batched events efficiently. How it calls the callback is based on the type
 * (pointer/mspointer/touch/mouse). There is one BatchedDOMEvent for each DOM Event (not for each touch).
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( require => {
  'use strict';

  const inherit = require( 'PHET_CORE/inherit' );
  const Poolable = require( 'PHET_CORE/Poolable' );
  const scenery = require( 'SCENERY/scenery' );

  /**
   * @constructor
   * @mixes Poolable
   *
   * @param {DOMEvent} domEvent
   * @param {string} type
   * @param {function} callback
   */
  function BatchedDOMEvent( domEvent, type, callback ) {
    assert && assert( domEvent, 'for some reason, there is no DOM event?' );

    // called multiple times due to pooling, this should be re-entrant

    // @public {DOMEvent}
    this.domEvent = domEvent;

    // @public {string} type
    this.type = type;

    // @public {function} callback
    this.callback = callback;
  }

  scenery.register( 'BatchedDOMEvent', BatchedDOMEvent );

  // enum for type
  // TODO: Create a specific enumeration type for this?
  BatchedDOMEvent.POINTER_TYPE = 1;
  BatchedDOMEvent.MS_POINTER_TYPE = 2;
  BatchedDOMEvent.TOUCH_TYPE = 3;
  BatchedDOMEvent.MOUSE_TYPE = 4;
  BatchedDOMEvent.WHEEL_TYPE = 5;

  inherit( Object, BatchedDOMEvent, {
    run: function( input ) {
      sceneryLog && sceneryLog.InputEvent && sceneryLog.InputEvent( 'Running batched event' );
      sceneryLog && sceneryLog.InputEvent && sceneryLog.push();

      const domEvent = this.domEvent;
      const callback = this.callback;

      // process whether anything under the pointers changed before running additional input events
      input.validatePointers();

      //OHTWO TODO: switch?
      if ( this.type === BatchedDOMEvent.POINTER_TYPE ) {
        callback.call( input, domEvent.pointerId, domEvent.pointerType, input.pointFromEvent( domEvent ), domEvent );
      }
      else if ( this.type === BatchedDOMEvent.MS_POINTER_TYPE ) {
        callback.call( input, domEvent.pointerId, scenery.Input.msPointerType( domEvent ), input.pointFromEvent( domEvent ), domEvent );
      }
      else if ( this.type === BatchedDOMEvent.TOUCH_TYPE ) {
        for ( let i = 0; i < domEvent.changedTouches.length; i++ ) {
          // according to spec (http://www.w3.org/TR/touch-events/), this is not an Array, but a TouchList
          const touch = domEvent.changedTouches.item( i );

          callback.call( input, touch.identifier, input.pointFromEvent( touch ), domEvent );
        }
      }
      else if ( this.type === BatchedDOMEvent.MOUSE_TYPE ) {
        callback.call( input, input.pointFromEvent( domEvent ), domEvent );
      }
      else if ( this.type === BatchedDOMEvent.WHEEL_TYPE ) {
        callback.call( input, domEvent );
      }
      else {
        throw new Error( 'bad type value: ' + this.type );
      }

      sceneryLog && sceneryLog.InputEvent && sceneryLog.pop();
    },

    dispose: function() {
      // clear our references
      this.domEvent = null;
      this.callback = null;
      this.freeToPool();
    }
  } );

  BatchedDOMEvent.fromPointerEvent = function( domEvent, pointFromEvent ) {
    return BatchedDOMEvent.createFromPool( domEvent, pointFromEvent( domEvent ), domEvent.pointerId );
  };

  Poolable.mixInto( BatchedDOMEvent );

  return BatchedDOMEvent;
} );
