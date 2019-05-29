// Copyright 2017, University of Colorado Boulder

/**
 * TODO: doc
 *
 * TODO: unit tests
 *
 * TODO: add example usage
 *
 * TODO: Handle interrupts
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';

  const KeyboardUtil = require( 'SCENERY/accessibility/KeyboardUtil' );
  var arrayRemove = require( 'PHET_CORE/arrayRemove' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Matrix = require( 'DOT/Matrix' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var Mouse = require( 'SCENERY/input/Mouse' );
  var scenery = require( 'SCENERY/scenery' );
  var SingularValueDecomposition = require( 'DOT/SingularValueDecomposition' );
  var TinyEmitter = require( 'AXON/TinyEmitter' );
  var Vector2 = require( 'DOT/Vector2' );

  /**
   * @constructor
   *
   * @param {Node} targetNode - The Node that should be transformed by this MultiListener.
   * @param {Object} [options] - See the constructor body (below) for documented options.
   */
  function MultiListener( targetNode, options ) {
    var self = this;

    options = _.extend( {
      mouseButton: 0, // TODO: see PressListener
      pressCursor: 'pointer', // TODO: see PressListener
      targetNode: null, // TODO: required? pass in at front
      allowScale: true,
      allowRotation: true,
      allowMultitouchInterruption: true,

      // max for scaling
      minScale: 1, // TODO: values less than 1 are currently not supported
      maxScale: 5
    }, options );

    // TODO: type checks for options

    this._targetNode = targetNode;

    this._mouseButton = options.mouseButton;
    this._pressCursor = options.pressCursor;
    this._allowScale = options.allowScale;
    this._allowRotation = options.allowRotation;
    this._allowMultitouchInterruption = options.allowMultitouchInterruption;
    this._minScale = options.minScale;
    this._maxScale = options.maxScale;

    // @private {Array.<Press>}
    this._presses = [];

    // @private {Array.<Press>}
    this._backgroundPresses = [];

    // @private - listener attached to a Pointer when a press (logical down) is received on a Node.
    this._pressListener = {
      move: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer move' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        self.movePress( self.findPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      up: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer up' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        // TODO: consider logging press on the pointer itself?
        self.removePress( self.findPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      cancel: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer cancel' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        var press = self.findPress( event.pointer );
        press.interrupted = true;

        self.removePress( press );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      interrupt: function() {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener pointer interrupt' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        // For the future, we could figure out how to track the pointer that calls this
        self.interrupt();

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      }
    };

    this._backgroundListener = {
      up: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener background up' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        self.removeBackgroundPress( self.findBackgroundPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      cancel: function( event ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener background cancel' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        self.removeBackgroundPress( self.findBackgroundPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      },

      interrupt: function() {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener background interrupt' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        self.removeBackgroundPress( self.findBackgroundPress( event.pointer ) );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      }
    };

    // Listen for the ctrl key on the document
    // TODO: We couldn't use Display.keyStateTracker for this because that KeyStateTracker isn't updated unless the
    // PDOM receives the event (focus must be inside PDOM). Should that change? I considered using another
    // KeyStateTracker here, but it felt very excessive.
    // TODO: Way to add document keydown listeners to scenery?
    // TODO: Global KeyStateTracker monotors document key events (rather than Display PDOM)?
    this.ctrlKeyDown = false;
    document.addEventListener( 'keydown', ( event ) => {
      const keyCode = event.keyCode;

      if ( !this.ctrlKeyDown && keyCode === KeyboardUtil.KEY_CTRL ) {
        this.ctrlKeyDown = true;
      }

      if ( this.ctrlKeyDown ) {

        // ctrl + equals key also allows zoom on most US keyboard layouts
        if ( KeyboardUtil.isPlusKey( event ) || KeyboardUtil.isEqualsKey( event ) ) {
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener plus key zoom' );
          sceneryLog && sceneryLog.InputListener && sceneryLog.push();

          // don't let browser zoom in
          event.preventDefault();

          // zoom in 10 percent
          const keyPress = new KeyPress( event, this._targetNode, 1.1 );
          this.repositionFromKeys( keyPress );

          sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
        }
        else if ( keyCode === KeyboardUtil.KEY_MINUS ) {
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener plus key zoom' );
          sceneryLog && sceneryLog.InputListener && sceneryLog.push();

          // don't let browser zoom out
          event.preventDefault();
          
          // zoom out 10 percent
          const keyPress = new KeyPress( event, this._targetNode, 0.9 );
          this.repositionFromKeys( keyPress );

          sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
        }
      }

      if ( KeyboardUtil.isArrowKey( keyCode ) ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener arrow key down' );
        sceneryLog && sceneryLog.InputListener && sceneryLog.push();

        const scale = 1; // no scale change for panning
        const keyPress = new KeyPress( event, this._targetNode, scale );
        this.repositionFromKeys( keyPress );

        sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
      }
    } );
    document.addEventListener( 'keyup', ( event ) => {
      if ( this.ctrlKeyDown && event.keyCode === KeyboardUtil.KEY_CTRL ) {
        this.ctrlKeyDown = false;
      }
    } );
  }

  scenery.register( 'MultiListener', MultiListener );

  inherit( Object, MultiListener, {

    findPress: function( pointer ) {
      for ( var i = 0; i < this._presses.length; i++ ) {
        if ( this._presses[ i ].pointer === pointer ) {
          return this._presses[ i ];
        }
      }
      assert && assert( false, 'Did not find press' );
      return null;
    },

    findBackgroundPress: function( pointer ) {
      // TODO: reduce duplication with findPress?
      for ( var i = 0; i < this._backgroundPresses.length; i++ ) {
        if ( this._backgroundPresses[ i ].pointer === pointer ) {
          return this._backgroundPresses[ i ];
        }
      }
      assert && assert( false, 'Did not find press' );
      return null;
    },

    // TODO: see PressListener
    down: function( event ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener down' );

      if ( event.pointer instanceof Mouse && event.domEvent.button !== this._mouseButton ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener abort: wrong mouse button' );

        return;
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      assert && assert( _.includes( event.trail.nodes, this._targetNode ),
        'MultiListener down trail does not include targetNode?' );

      var press = new Press( event.pointer, event.trail.subtrailTo( this._targetNode, false ) );

      if ( !event.pointer.isAttached() ) {
        sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener unattached, using press' );
        this.addPress( press );
        this.convertBackgroundPresses();
      }
      else if ( this._allowMultitouchInterruption ) {
        if ( this._presses.length || this._backgroundPresses.length ) {
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener attached, interrupting for press' );
          press.pointer.interruptAttached();
          this.addPress( press );
          this.convertBackgroundPresses();
        }
        else {
          sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener attached, adding background press' );
          this.addBackgroundPress( press );
        }
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    /**
     * Input listener, part of the Scenery Input API.
     *
     * TODO: should this be attached to the document like the keydown listeners?
     */
    wheel: function( event ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener wheel' );

      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      const wheel = new Wheel( event );
      this.repositionFromWheel( wheel );

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    /**
     * Handle reposition from wheel input, which may zoom or pan, depending on if the ctrl key is pressed down.
     * 
     * @param   {Wheel} wheel
     */
    repositionFromWheel: function( wheel ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener reposition' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      if ( this.ctrlKeyDown ) {
        const zoomDelta = wheel.up ? 1.1 : 0.9; // zoom in or out 10%
        this._targetNode.matrix = this.computeTranslationScaleToPointMatrix( wheel.localPoint, wheel.targetPoint, zoomDelta );
      }
      else {
        const translationUnitVector = wheel.right ? new Vector2( -1, 0 ) :
                                      wheel.left ? new Vector2( 1, 0 ) :
                                      wheel.down ? new Vector2( 0, -1 ) :
                                      wheel.up ? new Vector2( 0, 1 ) : null;

        // at the end of a wheel event we may receive the event without any direction (deltaX/deltaY)
        if ( translationUnitVector !==  null ) {
          this._targetNode.matrix = this.computeTranslationDeltaMatrix( translationUnitVector, 40 );
        }
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    /**
     * Reposition the target node externally at a custom global point with desired scale.
     *
     * @param {} globalPoint - point to zoom in on, in the global coordinate frame
     * @param {} scale - zoom amount (1.1 would zoom in 10%)
     */
    repositionCustom: function( globalPoint, scale ) {
      const localPoint = this._targetNode.globalToLocalPoint( globalPoint );
      const targetPoint = this._targetNode.globalToParentPoint( globalPoint );
      this._targetNode.matrix = this.computeTranslationScaleToPointMatrix( localPoint, targetPoint, scale );
    },

    /**
     * From a KeyPress zoom in or out.
     * per input event.
     * 
     * @param  {KeyPress} keyPress
     */
    repositionFromKeys: function( keyPress ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener reposition from key press' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      const zoomDelta = keyPress.zoom;
      if ( zoomDelta !== 1 ) {
        this._targetNode.matrix = this.computeTranslationScaleToPointMatrix( keyPress.localPoint, keyPress.targetPoint, zoomDelta );
      }
      else {

        const translationUnitVector = keyPress.right ? new Vector2( -1, 0 ) :
                                      keyPress.left ? new Vector2( 1, 0 ) :
                                      keyPress.down ? new Vector2( 0, -1 ) :
                                      keyPress.up ? new Vector2( 0, 1 ) : null;
        this._targetNode.matrix = this.computeTranslationDeltaMatrix( translationUnitVector, 40 );
      }


      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    addPress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener addPress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      this._presses.push( press );

      press.pointer.cursor = this._pressCursor;
      press.pointer.addInputListener( this._pressListener, true );

      this.recomputeLocals();
      this.reposition();

      // TODO: handle interrupted?

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    movePress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener movePress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      this.reposition();

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    removePress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener removePress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      press.pointer.removeInputListener( this._pressListener );
      press.pointer.cursor = null;

      arrayRemove( this._presses, press );

      this.recomputeLocals();
      this.reposition();

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    addBackgroundPress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener addBackgroundPress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      // TODO: handle turning background presses into main presses here
      this._backgroundPresses.push( press );
      press.pointer.addInputListener( this._backgroundListener, false );

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    removeBackgroundPress: function( press ) {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener removeBackgroundPress' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      press.pointer.removeInputListener( this._backgroundListener );

      arrayRemove( this._backgroundPresses, press );

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    convertBackgroundPresses: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener convertBackgroundPresses' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      var presses = this._backgroundPresses.slice();
      for ( var i = 0; i < presses.length; i++ ) {
        var press = presses[ i ];
        this.removeBackgroundPress( press );
        press.pointer.interruptAttached();
        this.addPress( press );
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    reposition: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener reposition' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      this._targetNode.matrix = this.computeMatrix();

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    recomputeLocals: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener recomputeLocals' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      for ( var i = 0; i < this._presses.length; i++ ) {
        this._presses[ i ].recomputeLocalPoint();
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    interrupt: function() {
      sceneryLog && sceneryLog.InputListener && sceneryLog.InputListener( 'MultiListener interrupt' );
      sceneryLog && sceneryLog.InputListener && sceneryLog.push();

      while ( this._presses.length ) {
        this.removePress( this._presses[ this._presses.length - 1 ] );
      }

      sceneryLog && sceneryLog.InputListener && sceneryLog.pop();
    },

    // @private?
    computeMatrix: function() {
      if ( this._presses.length === 0 ) {
        return this._targetNode.getMatrix();
      }
      else if ( this._presses.length === 1 ) {
        return this.computeSinglePressMatrix();
      }
      else if ( this._allowScale && this._allowRotation ) {
        return this.computeTranslationRotationScaleMatrix();
      } else if ( this._allowScale ) {
        return this.computeTranslationScaleMatrix();
      } else if ( this._allowRotation ) {
        return this.computeTranslationRotationMatrix();
      } else {
        return this.computeTranslationMatrix();
      }
    },

    // @private
    computeSinglePressMatrix: function() {
      // TODO: scratch things
      var singleTargetPoint = this._presses[ 0 ].targetPoint;
      var singleMappedPoint = this._targetNode.localToParentPoint( this._presses[ 0 ].localPoint );
      var delta = singleTargetPoint.minus( singleMappedPoint );
      return Matrix3.translationFromVector( delta ).timesMatrix( this._targetNode.getMatrix() );
    },

    // @private
    computeTranslationMatrix: function() {
      // translation only. linear least-squares simplifies to sum of differences
      var sum = new Vector2( 0, 0 );
      for ( var i = 0; i < this._presses.length; i++ ) {
        sum.add( this._presses[ i ].targetPoint );
        sum.subtract( this._presses[ i ].localPoint );
      }
      return Matrix3.translationFromVector( sum.dividedScalar( this._presses.length ) );
    },

    /**
     * Compute a matrix that will translate the node by a pre-described direction and magnitude.
     * 
     * @param   {Vector2} translationVector
     * @param   {number} magnitude         [description]
     */
    computeTranslationDeltaMatrix: function( translationVector, magnitude ) {
      return Matrix3.translationFromVector( translationVector.withMagnitude( magnitude ) ).timesMatrix( this._targetNode.getMatrix() );
    },

    /**
     * Rather than translating and scaling to a point defined by Presses, we translate and scale to a 
     * predefined point 
     * @returns {}
     */
    computeTranslationScaleToPointMatrix: function( localPoint, targetPoint, zoom ) {

      var translateFromLocal = Matrix3.translation( -localPoint.x, -localPoint.y );
      var translateToTarget = Matrix3.translation( targetPoint.x, targetPoint.y );

      // assume same scale in both x and y
      const currentScale = this._targetNode.getScaleVector().x;
      const newScale = this.limitScale( currentScale * zoom );

      return translateToTarget.timesMatrix( Matrix3.scaling( newScale ) ).timesMatrix( translateFromLocal );
    },

    // @private
    computeTranslationScaleMatrix: function() {

      // TODO: minimize closures
      var localPoints = this._presses.map( function( press ) { return press.localPoint; } );
      var targetPoints = this._presses.map( function( press ) { return press.targetPoint; } );

      var localCentroid = new Vector2( 0, 0 );
      var targetCentroid = new Vector2( 0, 0 );

      localPoints.forEach( function( localPoint ) { localCentroid.add( localPoint ); } );
      targetPoints.forEach( function( targetPoint ) { targetCentroid.add( targetPoint ); } );

      localCentroid.divideScalar( this._presses.length );
      targetCentroid.divideScalar( this._presses.length );

      var localSquaredDistance = 0;
      var targetSquaredDistance = 0;

      localPoints.forEach( function( localPoint ) { localSquaredDistance += localPoint.distanceSquared( localCentroid ); } );
      targetPoints.forEach( function( targetPoint ) { targetSquaredDistance += targetPoint.distanceSquared( targetCentroid ); } );

      var scale = Math.sqrt( targetSquaredDistance / localSquaredDistance );
      scale = this.limitScale( scale );

      var translateToTarget = Matrix3.translation( targetCentroid.x, targetCentroid.y );
      var translateFromLocal = Matrix3.translation( -localCentroid.x, -localCentroid.y );

      return translateToTarget.timesMatrix( Matrix3.scaling( scale ) ).timesMatrix( translateFromLocal );
    },

    /**
     * Limit the provided scale by constraints of this MultiListener.
     * @param   {number} scale
     * @returns {number}
     */
    limitScale: function( scale ) {
      let correctedScale = Math.max( scale, this._minScale );
      correctedScale = Math.min( correctedScale, this._maxScale );
      return correctedScale;
    },

    // @private
    computeTranslationRotationMatrix: function() {
      var i;
      var localMatrix = new Matrix( 2, this._presses.length );
      var targetMatrix = new Matrix( 2, this._presses.length );
      var localCentroid = new Vector2( 0, 0 );
      var targetCentroid = new Vector2( 0, 0 );
      for ( i = 0; i < this._presses.length; i++ ) {
        var localPoint = this._presses[ i ].localPoint;
        var targetPoint = this._presses[ i ].targetPoint;
        localCentroid.add( localPoint );
        targetCentroid.add( targetPoint );
        localMatrix.set( 0, i, localPoint.x );
        localMatrix.set( 1, i, localPoint.y );
        targetMatrix.set( 0, i, targetPoint.x );
        targetMatrix.set( 1, i, targetPoint.y );
      }
      localCentroid.divideScalar( this._presses.length );
      targetCentroid.divideScalar( this._presses.length );

      // determine offsets from the centroids
      for ( i = 0; i < this._presses.length; i++ ) {
        localMatrix.set( 0, i, localMatrix.get( 0, i ) - localCentroid.x );
        localMatrix.set( 1, i, localMatrix.get( 1, i ) - localCentroid.y );
        targetMatrix.set( 0, i, targetMatrix.get( 0, i ) - targetCentroid.x );
        targetMatrix.set( 1, i, targetMatrix.get( 1, i ) - targetCentroid.y );
      }
      var covarianceMatrix = localMatrix.times( targetMatrix.transpose() );
      var svd = new SingularValueDecomposition( covarianceMatrix );
      var rotation = svd.getV().times( svd.getU().transpose() );
      if ( rotation.det() < 0 ) {
        rotation = svd.getV().times( Matrix.diagonalMatrix( [ 1, -1 ] ) ).times( svd.getU().transpose() );
      }
      var rotation3 = new Matrix3().rowMajor( rotation.get( 0, 0 ), rotation.get( 0, 1 ), 0,
                                              rotation.get( 1, 0 ), rotation.get( 1, 1 ), 0,
                                              0, 0, 1 );
      var translation = targetCentroid.minus( rotation3.timesVector2( localCentroid ) );
      rotation3.set02( translation.x );
      rotation3.set12( translation.y );
      return rotation3;
    },

    // @private
    computeTranslationRotationScaleMatrix: function() {
      var i;
      var localMatrix = new Matrix( this._presses.length * 2, 4 );
      for ( i = 0; i < this._presses.length; i++ ) {
        // [ x  y 1 0 ]
        // [ y -x 0 1 ]
        var localPoint = this._presses[ i ].localPoint;
        localMatrix.set( 2 * i + 0, 0, localPoint.x );
        localMatrix.set( 2 * i + 0, 1, localPoint.y );
        localMatrix.set( 2 * i + 0, 2, 1 );
        localMatrix.set( 2 * i + 1, 0, localPoint.y );
        localMatrix.set( 2 * i + 1, 1, -localPoint.x );
        localMatrix.set( 2 * i + 1, 3, 1 );
      }
      var targetMatrix = new Matrix( this._presses.length * 2, 1 );
      for ( i = 0; i < this._presses.length; i++ ) {
        var targetPoint = this._presses[ i ].targetPoint;
        targetMatrix.set( 2 * i + 0, 0, targetPoint.x );
        targetMatrix.set( 2 * i + 1, 0, targetPoint.y );
      }
      var coefficientMatrix = SingularValueDecomposition.pseudoinverse( localMatrix ).times( targetMatrix );
      var m11 = coefficientMatrix.get( 0, 0 );
      var m12 = coefficientMatrix.get( 1, 0 );
      var m13 = coefficientMatrix.get( 2, 0 );
      var m23 = coefficientMatrix.get( 3, 0 );
      return new Matrix3().rowMajor( m11, m12, m13,
                                     -m12, m11, m23,
                                     0, 0, 1 );
    }
  } );

  function Press( pointer, trail ) {
    this.pointer = pointer;
    this.trail = trail;
    this.interrupted = false;

    this.localPoint = null;
    this.recomputeLocalPoint();
  }

  inherit( Object, Press, {
    recomputeLocalPoint: function() {
      this.localPoint = this.trail.globalToLocalPoint( this.pointer.point );
    },
    getTargetPoint() {
      return this.trail.globalToParentPoint( this.pointer.point );
    },
    get targetPoint() { return this.getTargetPoint(); }
  } );

  class Wheel extends Press {

    /**
     * @param {Event} event
     * @param {Node} targetNode
     */
    constructor( event, targetNode ) {
      super( event.pointer, event.trail.subtrailTo( targetNode, false ) );

      this.up = event.domEvent.deltaY < 0;
      this.down = event.domEvent.deltaY > 0;
      this.right = event.domEvent.deltaX > 0;
      this.left = event.domEvent.deltaX < 0;
    }
  }

  /**
   * A KeyPress has no associated trail or pointer since the key press will occur globally without a target. It will
   * also have no concept of a Pointer.
   */
  class KeyPress {
    constructor( event, targetNode, zoom ) {

      // @private
      this.targetNode = targetNode;
      this.zoom = zoom;
      this.localPoint = null;

      // @public (read-only)
      this.up = event.keyCode === KeyboardUtil.KEY_UP_ARROW;
      this.down = event.keyCode === KeyboardUtil.KEY_DOWN_ARROW;
      this.right = event.keyCode === KeyboardUtil.KEY_RIGHT_ARROW;
      this.left = event.keyCode === KeyboardUtil.KEY_LEFT_ARROW;

      this.recomputeLocalPoint();
    }

    recomputeLocalPoint() {
      this.localPoint = new Vector2( 0, 0 );
    }

    // from a key press, we will zoom in and out of the upper right corner of the display.
    get targetPoint() {
      const displayOrigin = new Vector2( 0, 0 );
      return this.targetNode.matrix.timesVector2( displayOrigin );
    }
  }

  return MultiListener;
} );
