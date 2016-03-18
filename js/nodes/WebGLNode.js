// Copyright 2014-2015, University of Colorado Boulder

/**
 * A node that is drawn with custom WebGL calls, specified by the painter type passed in. Responsible for handling its
 * own bounds and invalidation (via setting canvasBounds and calling invalidatePaint()).
 *
 * This is the WebGL equivalent of CanvasNode.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid
 */
define( function( require ) {
  'use strict';

  // modules
  var inherit = require( 'PHET_CORE/inherit' );
  var scenery = require( 'SCENERY/scenery' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var Node = require( 'SCENERY/nodes/Node' );
  var Renderer = require( 'SCENERY/display/Renderer' );
  var WebGLSelfDrawable = require( 'SCENERY/display/WebGLSelfDrawable' );
  var SelfDrawable = require( 'SCENERY/display/SelfDrawable' );

  /**
   * @constructor
   *
   * It is required to pass a canvasBounds option and/or keep canvasBounds such that it will cover the entirety of the
   * Node. This will also set its self bounds.
   *
   * A "Painter" type should be passed to the constructor. It will be responsible for creating individual "painters"
   * that are used with different WebGL contexts to paint. This is helpful, since each context will need to have its
   * own buffers/textures/etc.
   *
   * painterType will be called with new painterType( gl, node ). Should contain the following methods:
   *
   * paint( modelViewMatrix, projectionMatrix )
   *   {Matrix3} modelViewMatrix - Transforms from the node's local coordinate frame to Scenery's global coordinate
   *                               frame.
   *   {Matrix3} projectionMatrix - Transforms from the global coordinate frame to normalized device coordinates.
   * dispose()
   *
   * @param {Function} painterType - The type (constructor) for the painters that will be used for this node.
   * @param {Object} [options]
   */
  function WebGLNode( painterType, options ) {
    Node.call( this, options );

    // Only support rendering in WebGL
    this.setRendererBitmask( Renderer.bitmaskWebGL );

    // @private {Function} - Used to create the painters
    this.painterType = painterType;
  }

  scenery.register( 'WebGLNode', WebGLNode );

  inherit( Node, WebGLNode, {

    /**
     * Sets the bounds that are used for layout/repainting.
     * @public
     *
     * These bounds should always cover at least the area where the WebGLNode will draw in. If this is violated, this
     * node may be partially or completely invisible in Scenery's output.
     *
     * @param {Bounds2} selfBounds
     */
    setCanvasBounds: function( selfBounds ) {
      this.invalidateSelf( selfBounds );
    },
    set canvasBounds( value ) { this.setCanvasBounds( value ); },
    get canvasBounds() { return this.getSelfBounds(); },

    /**
     * @override
     *
     * @returns {boolean} - Whether this node is painted (always is!)
     */
    isPainted: function() {
      return true;
    },

    /**
     * Should be called when this node needs to be repainted. When not called, Scenery assumes that this node does
     * NOT need to be repainted (although Scenery may repaint it due to other nodes needing to be repainted).
     * @public
     */
    invalidatePaint: function() {
      var stateLen = this._drawables.length;
      for ( var i = 0; i < stateLen; i++ ) {
        this._drawables[ i ].markDirty();
      }
    },

    /**
     * Whether a given point is contained inside this node. For WebGLNode, we default to false always (you will need to
     * override this method if you want your WebGLNode to respond to user input).
     * @override
     *
     * @param {Vector2} point
     * @returns {boolean}
     */
    containsPointSelf: function( point ) {
      return false;
    },

    canvasPaintSelf: function( wrapper ) {
      // TODO: see https://github.com/phetsims/scenery/issues/308
      assert && assert( 'unimplemented: canvasPaintSelf in WebGLNode' );
    },

    createWebGLDrawable: function( renderer, instance ) {
      return WebGLNode.WebGLNodeDrawable.createFromPool( renderer, instance );
    },

    getBasicConstructor: function( propLines ) {
      return 'new scenery.WebGLNode( {' + propLines + '} )'; // TODO: no real way to do this nicely?
    }
  } );

  WebGLNode.prototype._mutatorKeys = [ 'canvasBounds' ].concat( Node.prototype._mutatorKeys );

  // Use a Float32Array-backed matrix, as it's better for usage with WebGL
  var modelViewMatrix = new Matrix3().setTo32Bit();

  WebGLNode.WebGLNodeDrawable = inherit( WebGLSelfDrawable, function WebGLNodeDrawable( renderer, instance ) {
    this.initialize( renderer, instance );
  }, {
    // What type of WebGL renderer/processor should be used.
    webglRenderer: Renderer.webglCustom,

    // called either from the constructor, or from pooling
    initialize: function( renderer, instance ) {
      this.initializeWebGLSelfDrawable( renderer, instance );
    },

    onAddToBlock: function( webGLBlock ) {
      this.webGLBlock = webGLBlock;
      this.backingScale = this.webGLBlock.backingScale;
      this.gl = this.webGLBlock.gl;

      var PainterType = this.node.painterType;
      this.painter = new PainterType( this.gl, this.node );
    },

    onRemoveFromBlock: function( webGLBlock ) {

    },

    draw: function() {
      // we have a precompute need
      var matrix = this.instance.relativeTransform.matrix;

      modelViewMatrix.set( matrix );

      this.painter.paint( modelViewMatrix, this.webGLBlock.projectionMatrix );
    },

    dispose: function() {
      this.painter.dispose();

      if ( this.webGLBlock ) {
        this.webGLBlock = null;
      }

      // super
      WebGLSelfDrawable.prototype.dispose.call( this );
    },

    // general flag set on the state, which we forward directly to the drawable's paint flag
    markPaintDirty: function() {
      this.markDirty();
    },

    // forward call to the WebGLNode
    get shaderAttributes() {
      return this.node.shaderAttributes;
    },

    update: function() {
      this.dirty = false;
    }
  } );
  SelfDrawable.Poolable.mixin( WebGLNode.WebGLNodeDrawable ); // pooling

  return WebGLNode;
} );
