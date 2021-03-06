// Copyright 2017-2020, University of Colorado Boulder

/**
 * A listener for common button usage, providing the fire() method/callback and helpful properties. NOTE that it doesn't
 * need to be an actual button (or look like a button), this is useful whenever that type of "fire" behavior is helpful.
 *
 * For example usage, see scenery/examples/input.html. Usually you can just pass a fire callback and things work.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

import CallbackTimer from '../../../axon/js/CallbackTimer.js';
import Emitter from '../../../axon/js/Emitter.js';
import inherit from '../../../phet-core/js/inherit.js';
import merge from '../../../phet-core/js/merge.js';
import EventType from '../../../tandem/js/EventType.js';
import Tandem from '../../../tandem/js/Tandem.js';
import NullableIO from '../../../tandem/js/types/NullableIO.js';
import SceneryEventIO from '../input/SceneryEventIO.js';
import scenery from '../scenery.js';
import PressListener from './PressListener.js';

/**
 * @constructor
 * @extends PressListener
 *
 * @param {Object} [options] - See the constructor body (below) and in PressListener for documented options.
 */
function FireListener( options ) {
  options = merge( {

    // {Function} - Called as fire() when the button is fired.
    fire: _.noop,

    // {boolean} - If true, the button will fire when the button is pressed. If false, the button will fire when the
    // button is released while the pointer is over the button.
    fireOnDown: false,

    // fire-on-hold feature (similar to PushButtonModel, see https://github.com/phetsims/scenery/issues/1004 as
    // this exists here so we don't need to use FireOnHoldInputListener ever).
    fireOnHold: false, // {boolean} - is the fire-on-hold feature enabled?
    fireOnHoldDelay: 400, // {number} - start to fire continuously after pressing for this long (milliseconds)
    fireOnHoldInterval: 100, // {number} - fire continuously at this interval (milliseconds)

    // {Tandem}
    tandem: Tandem.REQUIRED
  }, options );

  assert && assert( typeof options.fire === 'function', 'The fire callback should be a function' );
  assert && assert( typeof options.fireOnDown === 'boolean', 'fireOnDown should be a boolean' );

  PressListener.call( this, options );

  // @private {boolean}
  this._fireOnDown = options.fireOnDown;

  // @private {Emitter}
  this.firedEmitter = new Emitter( {
    tandem: options.tandem.createTandem( 'firedEmitter' ),
    phetioEventType: EventType.USER,
    parameters: [ {
      name: 'event',
      phetioType: NullableIO( SceneryEventIO )
    } ]
  } );
  this.firedEmitter.addListener( options.fire );

  // Create a timer to handle the optional fire-on-hold feature.
  // When that feature is enabled, calling this.fire is delegated to the timer.
  if ( options.fireOnHold ) {
    // @private {CallbackTimer}
    this._timer = new CallbackTimer( {
      callback: this.fire.bind( this, null ), // Pass null for fire-on-hold events
      delay: options.fireOnHoldDelay,
      interval: options.fireOnHoldInterval
    } );
  }
}

scenery.register( 'FireListener', FireListener );

inherit( PressListener, FireListener, {

  /**
   * Fires any associated button fire callback.
   * @public
   *
   * @param {SceneryEvent|null} event
   * NOTE: This is safe to call on the listener externally.
   */
  fire( event ) {
    sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'FireListener fire' );
    sceneryLog && sceneryLog.InputListener && sceneryLog.push();

    this.firedEmitter.emit( event );

    sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
  },

  /**
   * Presses the button.
   * @public
   * @override
   *
   * NOTE: This is safe to call externally in order to attempt to start a press. fireListener.canPress( event ) can
   * be used to determine whether this will actually start a press.
   *
   * @param {SceneryEvent} event
   * @param {Node} [targetNode] - If provided, will take the place of the targetNode for this call. Useful for
   *                              forwarded presses.
   * @param {function} [callback] - to be run at the end of the function, but only on success
   * @returns {boolean} success - Returns whether the press was actually started
   */
  press( event, targetNode, callback ) {
    return PressListener.prototype.press.call( this, event, targetNode, () => {
      // This function is only called on success
      if ( this._fireOnDown ) {
        this.fire( event );
      }
      if ( this._timer ) {
        this._timer.start();
      }
      callback && callback();
    } );
  },

  /**
   * Releases the button.
   * @public
   * @override
   *
   * NOTE: This can be safely called externally in order to force a release of this button (no actual 'up' event is
   * needed). If the cancel/interrupt behavior is more preferable (will not fire the button), then call interrupt()
   * on this listener instead.
   *
   * @param {SceneryEvent} [event] - scenery event if there was one
   * @param {function} [callback] - called at the end of the release
   */
  release( event, callback ) {
    PressListener.prototype.release.call( this, event, () => {
      // Notify after the rest of release is called in order to prevent it from triggering interrupt().
      const shouldFire = !this._fireOnDown && this.isHoveringProperty.value && !this.interrupted;
      if ( this._timer ) {
        this._timer.stop( shouldFire );
      }
      else if ( shouldFire ) {
        this.fire( event );
      }
      callback && callback();
    } );
  },

  /**
   * Interrupts the listener, releasing it (canceling behavior).
   * @public
   * @override
   *
   * This effectively releases/ends the press, and sets the `interrupted` flag to true while firing these events
   * so that code can determine whether a release/end happened naturally, or was canceled in some way.
   *
   * This can be called manually, but can also be called through node.interruptSubtreeInput().
   */
  interrupt() {
    PressListener.prototype.interrupt.call( this );

    this._timer && this._timer.stop( false ); // Stop the timer, don't fire if we haven't already
  },

  /**
   * @override
   * @public
   */
  dispose() {
    this.firedEmitter.dispose();
    this._timer && this._timer.dispose();

    PressListener.prototype.dispose.call( this );
  }
} );

export default FireListener;