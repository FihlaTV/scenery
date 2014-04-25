// Copyright 2002-2014, University of Colorado

/**
 * A unit that is drawable with a specific renderer
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';
  
  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );
  
  scenery.Drawable = function Drawable( renderer ) {
    this.initializeDrawable( renderer );
  };
  var Drawable = scenery.Drawable;
  
  inherit( Object, Drawable, {
    initializeDrawable: function( renderer ) {
      this.cleanDrawable();
      
      this.renderer = renderer;
      
      this.dirty = true;
    },
    
    cleanDrawable: function() {
      // what drawble we are being rendered (or put) into (will be filled in later)
      this.parentDrawable = null;
      
      // linked list handling (will be filled in later)
      this.previousDrawable = null;
      this.nextDrawable = null;
      
      // similar but pending handling, so that we can traverse both orders at the same time for stitching
      this.pendingPreviousDrawable = null;
      this.pendingNextDrawable = null;
    },
    
    markDirty: function() {
      if ( !this.dirty ) {
        this.dirty = true;
        
        // TODO: notify what we want to call repaint() later
        if ( this.parentDrawable ) {
          this.parentDrawable.markDirtyInstance( this );
        }
      }
    },
    
    dispose: function() {
      this.cleanDrawable();
    }
  } );
  
  return Drawable;
} );
