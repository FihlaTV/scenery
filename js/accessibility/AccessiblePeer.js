// Copyright 2015, University of Colorado Boulder

/**
 * An accessible peer controls the appearance of an accessible Node's instance in the parallel DOM.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var inherit = require( 'PHET_CORE/inherit' );
  var Poolable = require( 'PHET_CORE/Poolable' );
  var Events = require( 'AXON/Events' );
  var scenery = require( 'SCENERY/scenery' );
  var Display = require( 'SCENERY/display/Display' );

  var globalId = 1;

  function AccessiblePeer( accessibleInstance, domElement, containerDOMElement ) {
    this.initializeAccessiblePeer( accessibleInstance, domElement, containerDOMElement );
  }

  scenery.register( 'AccessiblePeer', AccessiblePeer );

  inherit( Events, AccessiblePeer, {
    /**
     * @param {DOMElement} domElement - The main DOM element used for this peer.
     * @param {DOMElement} [containerDOMElement] - A container DOM element (usually an ancestor of the domElement) where
     *                                             nested elements are placed
     */
    initializeAccessiblePeer: function( accessibleInstance, domElement, containerDOMElement ) {
      var self = this;

      Events.call( this ); // TODO: is Events worth mixing in by default? Will we need to listen to events?

      assert && assert( !this.id || this.disposed, 'If we previously existed, we need to have been disposed' );

      // unique ID
      this.id = this.id || globalId++;

      this.accessibleInstance = accessibleInstance;
      this.display = accessibleInstance.display;
      this.trail = accessibleInstance.trail;

      this.domElement = domElement;
      this.containerDOMElement = containerDOMElement ? containerDOMElement : ( this.containerDOMElement || null );

      this.disposed = false;

      // @private - listener for the focus event, to be disposed
      self.focusEventListener = function( event ) {
        if ( event.target === self.domElement ) {
          Display.focus = {
            display: accessibleInstance.display,
            trail: accessibleInstance.trail
          };
        }
      };
      this.domElement.addEventListener( 'focus', self.focusEventListener );

      // @private - listener for the blur event, to be disposed
      self.blurEventListener = function( event ) {
        if ( event.target === self.domElement ) {
          Display.focus = null;
        }
      };
      this.domElement.addEventListener( 'blur', self.blurEventListener );

      return this;
    },

    getChildContainerElement: function() {
      return this.containerDOMElement || this.domElement;
    },

    dispose: function() {
      this.disposed = true;

      this.domElement.removeEventListener( 'blur', this.blurEventListener );
      this.domElement.removeEventListener( 'focus', this.focusEventListener );

      // for now
      this.freeToPool && this.freeToPool();
    }
  } );

  // TODO: evaluate pooling, and is it OK to pool only some peers?
  AccessiblePeer.Poolable = {
    mixin: function( selfDrawableType ) {
      // for pooling, allow <AccessiblePeerType>.createFromPool( accessibleInstance ) and accessiblePeer.freeToPool().
      // Creation will initialize the peer to an initial state.
      Poolable.mixin( selfDrawableType, {
        defaultFactory: function() {
          return new selfDrawableType();
        },
        constructorDuplicateFactory: function( pool ) {
          return function( accessibleInstance ) {
            if ( pool.length ) {
              return pool.pop().initialize( accessibleInstance );
            }
            else {
              return new selfDrawableType( accessibleInstance );
            }
          };
        }
      } );
    }
  };

  return AccessiblePeer;
} );
