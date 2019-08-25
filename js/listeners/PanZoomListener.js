// Copyright 2017, University of Colorado Boulder

/**
 * TODO: doc
 *
 * TODO: unit tests
 *
 * TODO: add example usage
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  var Bounds2 = require( 'DOT/Bounds2' );
  var inherit = require( 'PHET_CORE/inherit' );
  var MultiListener = require( 'SCENERY/listeners/MultiListener' );
  var NumberProperty = require( 'AXON/NumberProperty' );
  var Property = require( 'AXON/Property' );
  var scenery = require( 'SCENERY/scenery' );

  /**
   * @constructor
   * @extends MultiListener
   *
   * TODO: Have 'content' bounds (instead of using the targetNode's bounds), since some things may extend off the side
   *       of the content bounds.
   *
   * TODO: Support mutable target or pan bounds (adjust transform).
   *
   * TODO: If scale !~=1, allow interrupting other pointers when multitouch begins (say pan area is filled with button)
   *
   * @param {Node} targetNode - The Node that should be transformed by this PanZoomListener.
   * @param {Bounds2} panBounds - Bounds that should be fully filled with content at all times.
   * @param {Object} [options] - See the constructor body (below) for documented options.
   */
  function PanZoomListener( targetNode, options ) {
    options = _.extend( {
      allowScale: true,
      allowRotation: false,
      pressCursor: null,
      panBounds: Bounds2.NOTHING, // these bounds should be fully filled with content at all times
      targetBounds: null, // these bounds are adjusted by target transformation
      animate: true
    }, options );

    // TODO: type checks for options

    MultiListener.call( this, targetNode, options );

    // @private {Bounds2} - bounds for the panning area, this area will be fully filled with target content at all times
    this._panBounds = options.panBounds;

    // @private {null|Bounds2} - set of bounds that should fill panBounds -
    this._targetBounds = options.targetBounds || targetNode.bounds;

    this._animate = options.animate;

    // @public - magnification scale for the model
    this.magnificationProperty = new NumberProperty( 1 );

    // @public - horizontal scroll amount from panning
    this.horizontalScrollProperty = new NumberProperty( 0 );

    // @public - vertical scroll amount from panning
    this.verticalScrollProperty = new NumberProperty( 0 );

    this.relativeHeightVisibleProperty = new NumberProperty( 1 );

    this.relativeWidthVisibleProperty = new NumberProperty( 1 );

    this.transformedPanBounds = this.panBounds.transformed( this._targetNode.matrix.inverted() );

    this.sourceLocation = this.transformedPanBounds.center;

    const transformedBounds = this._targetBounds.transformed( this._targetNode.getMatrix() );
    this.transformedTargetBoundsProperty = new Property( transformedBounds );

    // TODO: move this out of this listener, maybe into Sim.js - PanZoomListener shouldn't care about scenery.Display
    scenery.Display.focusProperty.link( focus => {
      if ( focus ) {
        const node = focus.trail.lastNode();
        if ( !this.panBounds.intersectsBounds( node.globalBounds ) ) {
          this.panToNode( node );
        }
      }
    } );

  }

  scenery.register( 'PanZoomListener', PanZoomListener );

  inherit( MultiListener, PanZoomListener, {
    reposition: function() {
      MultiListener.prototype.reposition.call( this );
      this.correctReposition();
    },

    repositionFromWheel: function( wheel, event ) {
      MultiListener.prototype.repositionFromWheel.call( this, wheel, event );
      this.correctReposition();
    },

    repositionFromKeys: function( keyPress ) {
      MultiListener.prototype.repositionFromKeys.call( this, keyPress );
      this.correctReposition();
    },

    translateToTarget: function( localPoint, targetPoint, scale ) {
      MultiListener.prototype.translateToTarget.call( this, localPoint, targetPoint, scale );
      this.correctReposition();
    },

    animateToTargets: function( dt ) {
      MultiListener.prototype.animateToTargets.call( this, dt );
      this.correctReposition();
    },

    /**
     * Pan to a provided Node, attempting to place the node in the center of the view. It may not end up exactly in
     * the center since we have to make sure panBounds are completely filled with targetNode content.
     * @public
     *
     * @param {Node} node
     */
    panToNode: function( node ) {
      if ( this._animate ) {
        const globalLocation = node.globalBounds.center;

        const locationInTargetFrame = this._targetNode.globalToLocalPoint( globalLocation );

        const distanceToLeftEdge = Math.abs( this.targetBounds.left - locationInTargetFrame.x );
        const distanceToRightEdge = Math.abs( this.targetBounds.right - locationInTargetFrame.x );
        const distanceToTopEdge = Math.abs( this.targetBounds.top - locationInTargetFrame.y );
        const distanceToBottomEdge = Math.abs( this.targetBounds.bottom - locationInTargetFrame.y );

        // debugger;
        if ( distanceToRightEdge < this.transformedPanBounds.width / 2  ) {
          const correction = this.transformedPanBounds.width / 2 - distanceToRightEdge;
          locationInTargetFrame.x = locationInTargetFrame.x - correction;
        }
        if ( distanceToLeftEdge < this.transformedPanBounds.width / 2 ) {
          const correction = this.transformedPanBounds.width / 2 - distanceToLeftEdge;
          locationInTargetFrame.x = locationInTargetFrame.x + correction;
        }
        if ( distanceToTopEdge < this.transformedPanBounds.height / 2 ) {
          const correction = this.transformedPanBounds.height / 2 - distanceToTopEdge;
          locationInTargetFrame.y = locationInTargetFrame.y + correction;
        }
        if ( distanceToBottomEdge < this.transformedPanBounds.height / 2 ) {
          const correction = this.transformedPanBounds.height / 2 - distanceToBottomEdge;
          locationInTargetFrame.y = locationInTargetFrame.y - correction;
        }

        this.setDestinationLocation( locationInTargetFrame );
      }
      else {

        // we want to "move" the view (whatever is within pan bounds) to the center of the targetNode, so we actually
        // translate the targetNode FROM the node center TO the center of the pan bounds, relative to the target node
        const targetPoint = this._targetNode.globalToParentPoint( this.panBounds.center );
        const sourcePoint = this._targetNode.globalToParentPoint( node.parentToGlobalPoint( node.center ) );
        this.translateToTarget( sourcePoint, targetPoint, this.getCurrentScale() );
      }
    },

    /**
     * Pan in a direction specified by deltaVector.
     * @public
     *
     * @param {Vector2} deltaVector
     */
    panDelta: function( deltaVector ) {
      const targetPoint = this._targetNode.globalToParentPoint( this.panBounds.center );
      const sourcePoint = targetPoint.plus( deltaVector );
      this.translateToTarget( sourcePoint, targetPoint );
    },

    translateScaleToTarget: function( localPoint, parentPoint, scaleDelta ) {
      MultiListener.prototype.translateScaleToTarget.call( this, localPoint, parentPoint, scaleDelta );
      this.correctReposition();
    },

    /**
     * Reset the transform on the target node and make sure that the node is within bounds defined by correctPosition.
     * @override
     */
    resetTransform: function() {
      MultiListener.prototype.resetTransform.call( this );
      this.correctReposition();

      this.setDestinationLocation( this.sourceLocation );
      this.setDestinationScale( this.sourceScale );
    },

    /**
     * If the targetNode is larger than than the panBounds specified, keep the panBounds completely filled
     * with targetNode content.
     *
     * TODO: Otherwise, allow targetNode to be dragged within panBounds OR limit scale of targetNode.
     */
    correctReposition: function() {
      const transformedBounds = this._targetBounds.transformed( this._targetNode.getMatrix() );

      // Don't let panning go through if the node is full contained by the pan bounds
      if ( transformedBounds.left > this._panBounds.left ) {
        this._targetNode.left = this._panBounds.left - ( transformedBounds.left - this._targetNode.left );
      }
      if ( transformedBounds.top > this._panBounds.top ) {
        this._targetNode.top = this._panBounds.top - ( transformedBounds.top - this._targetNode.top );
      }
      if ( transformedBounds.right < this._panBounds.right ) {
        this._targetNode.right = this._panBounds.right + ( this._targetNode.right - transformedBounds.right );
      }
      if ( transformedBounds.bottom < this._panBounds.bottom ) {
        this._targetNode.bottom = this._panBounds.bottom + ( this._targetNode.bottom - transformedBounds.bottom );
      }

      // update the transformed bounds after corrections above as it will be used for calculations
      const correctedTransformedBounds = this._targetBounds.transformed( this._targetNode.getMatrix() );
      // const correctedTransformedBounds = this._targetNode.globalToParentBounds( this._targetBounds );
      this.transformedTargetBoundsProperty.set( correctedTransformedBounds );

      // the pan bounds transformed so they are relative to the target node
      // this.transformedPanBounds = this.panBounds.transformed( this._targetNode.matrix.inverted() );

      // the pan bounds transformed
      // this.transformedPanBounds = this._targetNode.localToGlobalBounds( this.panBounds );
      this.transformedPanBounds = this.panBounds.transformed( this._targetNode.matrix.inverted() );

      this.magnificationProperty.set( this._targetNode.getScaleVector().x );

      const totalHorizontalPan = correctedTransformedBounds.getWidth() - this._panBounds.getWidth();
      const currentHorizontalPan = correctedTransformedBounds.getRight() - this._panBounds.getRight();
      const horizontalScroll = totalHorizontalPan === 0 ? 0 : 1 - currentHorizontalPan / totalHorizontalPan;
      this.horizontalScrollProperty.set( horizontalScroll );
      this.relativeWidthVisibleProperty.set( this._panBounds.getWidth() / correctedTransformedBounds.getWidth() );

      const totalVerticalPan = correctedTransformedBounds.getHeight() - this._panBounds.getHeight();
      const currentVerticalPan = correctedTransformedBounds.getTop() - this._panBounds.getTop();
      const verticalScroll = totalVerticalPan === 0 ? 0 : -currentVerticalPan / totalVerticalPan;
      this.verticalScrollProperty.set( verticalScroll );
      this.relativeHeightVisibleProperty.set( this._panBounds.getHeight() / correctedTransformedBounds.getHeight() );


      // this.sourceLocation = this.transformedTargetBoundsProperty.get().center;
      // this.sourceLocation = this._targetNode.parentToGlobalPoint( this.panBounds.center );
      // console.log( this.transformedPanBounds.center );

      // this is the center of the pan bounds, in the local coordinate frame of the target node
      this.sourceLocation = this.transformedPanBounds.center;
      this.sourceScale = this.getCurrentScale();
      // this.sourceLocation = this._targetNode.globalToParentPoint( this.panBounds.center );
    },

    /**
     * Get the visible bounds in the global coordinate frame after panning and zooming. This is the portion of
     * targetBounds within the panBounds, in the global coordinate frame.
     *
     * @returns {}
     */
    getVisibleBounds: function() {
    },

    initializeLocations: function() {
      this.sourceLocation = this.transformedPanBounds.center;
      this.setDestinationLocation( this.sourceLocation );
    },

    setPanBounds: function( bounds ) {
      this._panBounds = bounds;

      this.correctReposition();
      this.initializeLocations();
    },
    set panBounds( bounds ) { this.setPanBounds( bounds ); },

    getPanBounds: function( bounds ) {
      return this._panBounds;
    },
    get panBounds() { return this.getPanBounds(); },

    setTargetBounds: function( targetBounds ) {
      this._targetBounds = targetBounds;
      this.correctReposition();

      this.initializeLocations();
    },
    set targetBounds( targetBounds ) { this.setTargetBounds( targetBounds ); },

    getTargetBounds: function() {
      return this._targetBounds;
    },
    get targetBounds() { return this.getTargetBounds(); },

    setDestinationLocation( destination ) {
      // const dilatedTargetBounds = this._targetBounds.erodedXY( this.transformedPanBounds.width / 2, this.transformedPanBounds.height / 2 );
      // this.destinationLocation = dilatedTargetBounds.closestPointTo( destination );
      this.destinationLocation = destination;

      this.animating = true;
    },

    setDestinationScale: function( scale ) {
      this.destinationScale = this.limitScale( scale );
      this.animating = true;
    }
  } );

  return PanZoomListener;
} );
