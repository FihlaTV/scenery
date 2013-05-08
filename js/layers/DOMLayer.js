// Copyright 2002-2012, University of Colorado

/**
 * A DOM-based layer in the scene graph. Each layer handles dirty-region handling separately,
 * and corresponds to a single canvas / svg element / DOM element in the main container.
 * Importantly, it does not contain rendered content from a subtree of the main
 * scene graph. It only will render a contiguous block of nodes visited in a depth-first
 * manner.
 *
 * Nodes supporting the DOM renderer should have the following functions:
 *   allowsMultipleDOMInstances:               {Boolean} whether getDOMElement will return the same element every time, or new elements.
 *   getDOMElement():                          Returns a DOM element that represents this node.
 *   updateDOMElement( element ):              Updates the DOM element with any changes that were made.
 *   updateCSSTransform( transform, element ): Updates the CSS transform of the element
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  "use strict";
  
  var assert = require( 'ASSERT/assert' )( 'scenery' );
  
  var inherit = require( 'PHET_CORE/inherit' );
  var Bounds2 = require( 'DOT/Bounds2' );
  
  var scenery = require( 'SCENERY/scenery' );
  
  var Layer = require( 'SCENERY/layers/Layer' ); // DOMLayer inherits from Layer
  
  scenery.DOMLayer = function( args ) {
    sceneryLayerLog && sceneryLayerLog( 'DOMLayer constructor' );
    
    Layer.call( this, args );
    
    var width = args.scene.sceneBounds.width;
    var height = args.scene.sceneBounds.height;
    
    this.div = document.createElement( 'div' );
    var div = this.div;
    div.style.position = 'absolute';
    div.style.left = '0';
    div.style.top = '0';
    div.style.width = '0';
    div.style.height = '0';
    div.style.clip = 'rect(0px,' + width + 'px,' + height + 'px,0px)';
    this.$div = $( this.div );
    this.$main.append( this.div );
    
    this.scene = args.scene;
    
    this.isDOMLayer = true;
    
    // maps trail ID => DOM element fragment
    this.idElementMap = {};
    
    // maps trail ID => Trail. trails need to be reindexed
    this.idTrailMap = {};
    
    this.trails = [];
  };
  var DOMLayer = scenery.DOMLayer;
  
  inherit( DOMLayer, Layer, {
    
    addNodeFromTrail: function( trail ) {
      Layer.prototype.addNodeFromTrail.call( this, trail );
      trail = trail.copy();
      this.reindexTrails();
      
      var node = trail.lastNode();
      
      var element = node.getDOMElement();
      node.updateDOMElement( element );
      this.updateVisibility( trail, element );
      
      this.idElementMap[trail.getUniqueId()] = element;
      this.idTrailMap[trail.getUniqueId()] = trail;
      
      // walk the insertion index up the array. TODO: performance: binary search version?
      var insertionIndex;
      for ( insertionIndex = 0; insertionIndex < this.trails.length; insertionIndex++ ) {
        var otherTrail = this.trails[insertionIndex];
        otherTrail.reindex();
        var comparison = otherTrail.compare( trail );
        assert && assert( comparison !== 0, 'Trail has already been inserted into the DOMLayer' );
        if ( comparison === 1 ) { // TODO: enum values!
          break;
        }
      }
      
      if ( insertionIndex === this.div.childNodes.length ) {
        this.div.appendChild( element );
        this.trails.push( trail );
      } else {
        this.div.insertBefore( this.getElementFromTrail( this.trails[insertionIndex] ) );
        this.trails.splice( insertionIndex, 0, trail );
      }
      node.updateCSSTransform( trail.getTransform(), element );
    },
    
    removeNodeFromTrail: function( trail ) {
      Layer.prototype.removeNodeFromTrail.call( this, trail );
      this.reindexTrails();
      
      var element = this.getElementFromTrail( trail );
      assert && assert( element, 'Trail does not exist in the DOMLayer' );
      
      delete this.idElementMap[trail.getUniqueId];
      delete this.idTrailMap[trail.getUniqueId];
      
      this.div.removeChild( element );
      
      var removalIndex = this.getIndexOfTrail( trail );
      this.trails.splice( removalIndex, 1 );
    },
    
    getElementFromTrail: function( trail ) {
      return this.idElementMap[trail.getUniqueId()];
    },
    
    reindexTrails: function( zIndex ) {
      Layer.prototype.reindex.call( this, zIndex );
      
      _.each( this.trails, function( trail ) {
        trail.reindex();
      } );
    },
    
    getIndexOfTrail: function( trail ) {
      // find the index where our trail is at. strict equality won't work, we want to compare differently
      var i;
      for ( i = 0; i < this.trails.length; i++ ) {
        if ( this.trails[i].compare( trail ) === 0 ) {
          return i;
        }
      }
      throw new Error( 'DOMLayer.getIndexOfTrail unable to find trail: ' + trail.toString() );
    },
    
    render: function( scene, args ) {
      // nothing at all needed here, CSS transforms taken care of when dirty regions are notified
    },
    
    dispose: function() {
      Layer.prototype.dispose.call( this );
      
      this.div.parentNode.removeChild( this.div );
    },
    
    updateVisibility: function( trail, element ) {
      if ( trail.isVisible() ) {
        element.style.visibility = 'visible';
      } else {
        element.style.visibility = 'hidden';
      }
    },
    
    // TODO: consider a stack-based model for transforms?
    // TODO: deprecated? remove this?
    applyTransformationMatrix: function( matrix ) {
      // nothing at all needed here
    },
    
    getContainer: function() {
      return this.div;
    },
    
    // returns next zIndex in place. allows layers to take up more than one single zIndex
    reindex: function( zIndex ) {
      Layer.prototype.reindex.call( this, zIndex );
      
      if ( this.zIndex !== zIndex ) {
        this.div.style.zIndex = zIndex;
        this.zIndex = zIndex;
      }
      return zIndex + 1;
    },
    
    pushClipShape: function( shape ) {
      // TODO: clipping
    },
    
    popClipShape: function() {
      // TODO: clipping
    },
    
    getSVGString: function() {
      var data = "<svg xmlns='http://www.w3.org/2000/svg' width='" + this.$main.width() + "' height='" + this.$main.height() + "'>" +
        "<foreignObject width='100%' height='100%'>" +
        $( this.div ).html() +
        "</foreignObject></svg>";
    },
    
    // TODO: note for DOM we can do https://developer.mozilla.org/en-US/docs/HTML/Canvas/Drawing_DOM_objects_into_a_canvas
    // TODO: note that http://pbakaus.github.com/domvas/ may work better, but lacks IE support
    renderToCanvas: function( canvas, context, delayCounts ) {
      // TODO: consider not silently failing?
      // var data = "<svg xmlns='http://www.w3.org/2000/svg' width='" + this.$main.width() + "' height='" + this.$main.height() + "'>" +
      //   "<foreignObject width='100%' height='100%'>" +
      //   $( this.div ).html() +
      //   "</foreignObject></svg>";
      
      // var DOMURL = window.URL || window.webkitURL || window;
      // var img = new Image();
      // var svg = new Blob( [ data ] , { type: "image/svg+xml;charset=utf-8" } );
      // var url = DOMURL.createObjectURL( svg );
      // delayCounts.increment();
      // img.onload = function() {
      //   context.drawImage( img, 0, 0 );
      //   // TODO: this loading is delayed!!! ... figure out a solution to potentially delay?
      //   DOMURL.revokeObjectURL( url );
      //   delayCounts.decrement();
      // };
      // img.src = url;
    },
    
    getName: function() {
      return 'dom';
    },
    
    /*---------------------------------------------------------------------------*
    * Events from Instances
    *----------------------------------------------------------------------------*/
    
    notifyVisibilityChange: function( instance ) {
      var trail = instance.trail;
      
      // TODO: performance: faster way to iterate through!
      for ( var trailId in this.idTrailMap ) {
        var subtrail = this.idTrailMap[trailId];
        subtrail.reindex();
        if ( subtrail.isExtensionOf( trail, true ) ) {
          this.updateVisibility( subtrail, this.idElementMap[trailId] );
        }
      }
    },
    
    notifyOpacityChange: function( instance ) {
      // TODO: BROKEN: FIXME: DOM opacity is not handled yet, see issue #31: https://github.com/phetsims/scenery/issues/31
    },
    
    // only a painted trail under this layer
    notifyBeforeSelfChange: function( instance ) {
      // no-op, we don't need paint changes
    },
    
    notifyBeforeSubtreeChange: function( instance ) {
      // no-op, we don't need paint changes
    },
    
    // only a painted trail under this layer
    notifyDirtySelfPaint: function( instance ) {
      var node = instance.getNode();
      var trail = instance.trail;
      
      // TODO: performance: store this in the Instance itself?
      var dirtyElement = this.idElementMap[trail.getUniqueId()];
      if ( dirtyElement ) {
        node.updateDOMElement( dirtyElement );
        
        if ( node.domUpdateTransformOnRepaint ) {
          node.updateCSSTransform( trail.getTransform(), dirtyElement );
        }
      }
    },
    
    notifyTransformChange: function( instance ) {
      var layer = this;
      
      var baseTrail = instance.trail;
      
      // TODO: performance: efficiency! this computes way more matrix transforms than needed
      this.startPointer.eachTrailBetween( this.endPointer, function( trail ) {
        // bail out quickly if the trails don't match
        if ( !trail.isExtensionOf( baseTrail, true ) ) {
          return;
        }
        
        var node = trail.lastNode();
        if ( node.isPainted() ) {
          var element = layer.idElementMap[trail.getUniqueId()];
          node.updateCSSTransform( trail.getTransform(), element );
        }
      } );
    },
    
    // only a painted trail under this layer (for now)
    notifyBoundsAccuracyChange: function( instance ) {
      // no-op, we don't care about bounds
    }
    
  } );
  
  return DOMLayer;
} );


