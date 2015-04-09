// Copyright 2002-2014, University of Colorado Boulder

/**
 * Renders a visual layer of WebGL drawables.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Sharfudeen Ashraf (For Ghent University)
 */
define( function( require ) {
  'use strict';

  // modules
  var scenery = require( 'SCENERY/scenery' );
  var inherit = require( 'PHET_CORE/inherit' );
  var Poolable = require( 'PHET_CORE/Poolable' );
  var cleanArray = require( 'PHET_CORE/cleanArray' );
  var Matrix3 = require( 'DOT/Matrix3' );
  var FittedBlock = require( 'SCENERY/display/FittedBlock' );
  var Renderer = require( 'SCENERY/display/Renderer' );
  var Util = require( 'SCENERY/util/Util' );
  var SpriteSheet = require( 'SCENERY/util/SpriteSheet' );
  var ShaderProgram = require( 'SCENERY/util/ShaderProgram' );

  scenery.WebGLBlock = function WebGLBlock( display, renderer, transformRootInstance, filterRootInstance ) {
    this.initialize( display, renderer, transformRootInstance, filterRootInstance );
  };
  var WebGLBlock = scenery.WebGLBlock;

  inherit( FittedBlock, WebGLBlock, {
    initialize: function( display, renderer, transformRootInstance, filterRootInstance ) {

      this.initializeFittedBlock( display, renderer, transformRootInstance );

      // WebGLBlocks are hard-coded to take the full display size (as opposed to svg and canvas)
      // Since we saw some jitter on iPad, see #318 and generally expect WebGL layers to span the entire display
      // In the future, it would be good to understand what was causing the problem and make webgl consistent
      // with svg and canvas again.
      this.setFit( FittedBlock.FULL_DISPLAY );

      this.filterRootInstance = filterRootInstance;

      // TODO: This block can be shared across displays, so we need to handle preserveDrawingBuffer separately?
      this.preserveDrawingBuffer = display.options.preserveDrawingBuffer;

      // list of {Drawable}s that need to be updated before we update
      this.dirtyDrawables = cleanArray( this.dirtyDrawables );

      // {Array.<SpriteSheet>}, permanent list of spritesheets for this block
      this.spriteSheets = this.spriteSheets || [];

      if ( !this.domElement ) {
        this.canvas = document.createElement( 'canvas' );
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = '0';
        this.canvas.style.top = '0';
        this.canvas.style.pointerEvents = 'none';
        this.canvasId = this.canvas.id = 'scenery-webgl' + this.id;

        var contextOptions = {
          antialias: true,
          preserveDrawingBuffer: this.preserveDrawingBuffer // true: need to clear buffer and is slower
        };

        // we've already committed to using a WebGLBlock, so no use in a try-catch around our context attempt
        this.gl = this.canvas.getContext( 'webgl', contextOptions ) || this.canvas.getContext( 'experimental-webgl', contextOptions );
        assert && assert( this.gl, 'We should have a context by now' );
        var gl = this.gl;

        this.backingScale = Util.backingScale( gl );

        gl.clearColor( 0, 0, 0, 0 );
        gl.clear( gl.COLOR_BUFFER_BIT );

        // NOTE: not using gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA ) since that is for non-premultiplied alpha
        // see http://webglfundamentals.org/webgl/lessons/webgl-and-alpha.html
        gl.blendFunc( gl.ONE, gl.ONE_MINUS_SRC_ALPHA );
        gl.enable( gl.BLEND );

        this.domElement = this.canvas;

        this.customProcessor = new WebGLBlock.CustomProcessor( this );
        this.texturedQuadProcessor = new WebGLBlock.TexturedQuadProcessor( this );
      }

      // reset any fit transforms that were applied
      Util.prepareForTransform( this.canvas, false );
      Util.unsetTransform( this.canvas ); // clear out any transforms that could have been previously applied

      this.projectionMatrix = this.projectionMatrix || new Matrix3().setTo32Bit();
      // a column-major 3x3 array specifying our projection matrix for 2D points (homogenized to (x,y,1))
      this.projectionMatrixArray = this.projectionMatrix.entries;

      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( 'initialized #' + this.id );

      return this;
    },

    setSizeFullDisplay: function() {
      var size = this.display.getSize();
      this.canvas.width = size.width * this.backingScale;
      this.canvas.height = size.height * this.backingScale;
      this.canvas.style.width = size.width + 'px';
      this.canvas.style.height = size.height + 'px';
    },

    setSizeFitBounds: function() {
      throw new Error( 'setSizeFitBounds unimplemented for WebGLBlock' );
    },

    update: function() {
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( 'update #' + this.id );
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.push();

      var gl = this.gl;

      if ( this.dirty && !this.disposed ) {
        this.dirty = false;

        while ( this.dirtyDrawables.length ) {
          this.dirtyDrawables.pop().update();
        }

        // ensure sprite sheet textures are up-to-date
        var numSpriteSheets = this.spriteSheets.length;
        for ( var i = 0; i < numSpriteSheets; i++ ) {
          this.spriteSheets[i].updateTexture();
        }

        // udpate the fit BEFORE drawing, since it may change our offset
        this.updateFit();

        // finalX = 2 * x / display.width - 1
        // finalY = 1 - 2 * y / display.height
        // result = matrix * ( x, y, 1 )
        this.projectionMatrix.rowMajor( 2 / this.display.width, 0, -1,
                                        0, -2 / this.display.height, 1,
                                        0, 0, 1 );

        // if we created the context with preserveDrawingBuffer, we need to clear before rendering
        if ( this.preserveDrawingBuffer ) {
          gl.clear( gl.COLOR_BUFFER_BIT );
        }

        gl.viewport( 0.0, 0.0, this.canvas.width, this.canvas.height );

        var currentProcessor = null;

        //OHTWO TODO: PERFORMANCE: create an array for faster drawable iteration (this is probably a hellish memory access pattern)
        for ( var drawable = this.firstDrawable; drawable !== null; drawable = drawable.nextDrawable ) {
          // select our desired processor
          var desiredProcessor = null;
          if ( drawable.webglRenderer === Renderer.webglTexturedQuad ) {
            desiredProcessor = this.texturedQuadProcessor;
          }
          else if ( drawable.webglRenderer === Renderer.webglCustom ) {
            desiredProcessor = this.customProcessor;
          }
          assert && assert( desiredProcessor );

          // swap processors if necessary
          if ( desiredProcessor !== currentProcessor ) {
            // deactivate any old processors
            if ( currentProcessor ) {
              currentProcessor.deactivate();
            }
            // activate the new processor
            currentProcessor = desiredProcessor;
            currentProcessor.activate();
          }

          // process our current drawable with the current processor
          currentProcessor.processDrawable( drawable );

          // exit loop end case
          if ( drawable === this.lastDrawable ) { break; }
        }
        if ( currentProcessor ) {
          currentProcessor.deactivate();
        }

        gl.flush();
      }

      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.pop();
    },

    dispose: function() {
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( 'dispose #' + this.id );

      // TODO: many things to dispose!?

      // clear references
      cleanArray( this.dirtyDrawables );

      FittedBlock.prototype.dispose.call( this );
    },

    markDirtyDrawable: function( drawable ) {
      sceneryLog && sceneryLog.dirty && sceneryLog.dirty( 'markDirtyDrawable on WebGLBlock#' + this.id + ' with ' + drawable.toString() );

      assert && assert( drawable );

      // TODO: instance check to see if it is a canvas cache (usually we don't need to call update on our drawables)
      this.dirtyDrawables.push( drawable );
      this.markDirty();
    },

    addDrawable: function( drawable ) {
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( '#' + this.id + '.addDrawable ' + drawable.toString() );

      FittedBlock.prototype.addDrawable.call( this, drawable );

      drawable.initializeContext( this );

      // see if we need to allocate a texture within our sprite sheets
      if ( drawable.webglRenderer === Renderer.webglTexturedQuad ) {
        // TODO: how to change images seamlessly?
        assert && assert( drawable.image, 'Drawable with webglTexturedQuad should have an image' );

        // if the width/height isn't loaded yet, we can still use the desired value
        var width = ( drawable.node && drawable.node.getImageWidth ) ? drawable.node.getImageWidth() : drawable.image.width;
        var height = ( drawable.node && drawable.node.getImageHeight ) ? drawable.node.getImageHeight() : drawable.image.height;
        var sprite = this.addSpriteSheetImage( drawable.image, width, height );
        drawable.sprite = sprite;
      }
    },

    removeDrawable: function( drawable ) {
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( '#' + this.id + '.removeDrawable ' + drawable.toString() );

      FittedBlock.prototype.removeDrawable.call( this, drawable );

      if ( drawable.webglRenderer === Renderer.webglTexturedQuad ) {
        this.removeSpriteSheetImage( drawable.sprite );
        drawable.sprite = null;
      }
    },

    addSpriteSheetImage: function( image, width, height ) {
      var sprite = null;
      var numSpriteSheets = this.spriteSheets.length;
      for ( var i = 0; i < numSpriteSheets; i++ ) {
        var spriteSheet = this.spriteSheets[i];
        sprite = spriteSheet.addImage( image );
        if ( sprite ) {
          break;
        }
      }
      if ( !sprite ) {
        var newSpriteSheet = new SpriteSheet( true ); // use mipmaps for now?
        sprite = newSpriteSheet.addImage( image, width, height );
        newSpriteSheet.initializeContext( this.gl );
        newSpriteSheet.createTexture();
        if ( !sprite ) {
          // TODO: renderer flags should change for very large images
          throw new Error( 'Attempt to load image that is too large for sprite sheets' );
        }
      }
      return sprite;
    },

    removeSpriteSheetImage: function( sprite ) {
      sprite.spriteSheet.removeImage( sprite.image );
    },

    onIntervalChange: function( firstDrawable, lastDrawable ) {
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( '#' + this.id + '.onIntervalChange ' + firstDrawable.toString() + ' to ' + lastDrawable.toString() );

      FittedBlock.prototype.onIntervalChange.call( this, firstDrawable, lastDrawable );

      this.markDirty();
    },

    onPotentiallyMovedDrawable: function( drawable ) {
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( '#' + this.id + '.onPotentiallyMovedDrawable ' + drawable.toString() );
      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.push();

      assert && assert( drawable.parentDrawable === this );

      this.markDirty();

      sceneryLog && sceneryLog.WebGLBlock && sceneryLog.pop();
    },

    toString: function() {
      return 'WebGLBlock#' + this.id + '-' + FittedBlock.fitString[ this.fit ];
    }
  } );

  /*---------------------------------------------------------------------------*
  * Processors rely on the following lifecycle:
  * 1. activate()
  * 2. processDrawable() - 0 or more times
  * 3. deactivate()
  * Once deactivated, they should have executed all of the draw calls they need to make.
  *----------------------------------------------------------------------------*/


  WebGLBlock.CustomProcessor = function( webglBlock ) {
    this.webglBlock = webglBlock;

    this.drawable = null;
  };
  inherit( Object, WebGLBlock.CustomProcessor, {
    activate: function() {
      // drawable responsible for shader program
    },

    processDrawable: function( drawable ) {
      assert && assert( drawable.webglRenderer === Renderer.webglCustom );

      this.draw();
      this.drawable = drawable;
    },

    deactivate: function() {
      // drawable responsible for shader program

      this.draw();
    },

    // @private
    draw: function() {
      if ( this.drawable ) {
        this.drawable.draw();
      }
    }
  } );

  WebGLBlock.TexturedQuadProcessor = function( webglBlock ) {
    this.webglBlock = webglBlock;
    var gl = this.gl = webglBlock.gl;

    assert && assert( webglBlock.gl );
    this.shaderProgram = new ShaderProgram( gl, [
      // vertex shader
      'attribute vec4 aVertex;',
      // 'attribute vec2 aTextureCoord;',
      'varying vec2 vTextureCoord;',
      'uniform mat3 uProjectionMatrix;',

      'void main() {',
      '  vTextureCoord = aVertex.zw;',
      '  vec3 ndc = uProjectionMatrix * vec3( aVertex.xy, 1.0 );', // homogeneous map to to normalized device coordinates
      '  gl_Position = vec4( ndc.xy, 0.0, 1.0 );',
      '}'
    ].join( '\n' ), [
      // fragment shader
      'precision mediump float;',
      'varying vec2 vTextureCoord;',
      'uniform sampler2D uTexture;',

      'void main() {',
      '  gl_FragColor = texture2D( uTexture, vTextureCoord, -0.7 );', // mipmap LOD bias of -0.7 (for now)
      '}'
    ].join( '\n' ), {
      // attributes: [ 'aVertex', 'aTextureCoord' ],
      attributes: [ 'aVertex' ],
      uniforms: [ 'uTexture', 'uProjectionMatrix' ]
    } );

    this.vertexBuffer = gl.createBuffer();
    this.vertexArray = new Float32Array( 128 );

    gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, this.vertexArray, gl.DYNAMIC_DRAW ); // fully buffer at the start
  };
  inherit( Object, WebGLBlock.TexturedQuadProcessor, {
    activate: function() {
      this.shaderProgram.use();

      this.currentSpriteSheet = null;
      this.vertexArrayIndex = 0;
    },

    processDrawable: function( drawable ) {
      assert && assert( drawable.webglRenderer === Renderer.webglTexturedQuad );
      if ( this.currentSpriteSheet && drawable.sprite.spriteSheet !== this.currentSpriteSheet ) {
        this.draw();
      }
      this.currentSpriteSheet = drawable.sprite.spriteSheet;

      var vertexData = drawable.vertexArray;

      // if our vertex data won't fit, keep doubling the size until it fits
      while ( vertexData.length + this.vertexArrayIndex > this.vertexArray.length ) {
        var newVertexArray = new Float32Array( this.vertexArray.length * 2 );
        newVertexArray.set( this.vertexArray );
        this.vertexArray = newVertexArray;
      }

      // copy our vertex data into the main array
      this.vertexArray.set( vertexData, this.vertexArrayIndex );
      this.vertexArrayIndex += vertexData.length;
    },

    deactivate: function() {
      if ( this.currentSpriteSheet ) {
        this.draw();
      }

      this.shaderProgram.unuse();
    },

    // @private
    draw: function() {
      assert && assert( this.currentSpriteSheet );
      var gl = this.gl;

      // (uniform) projection transform into normalized device coordinates
      gl.uniformMatrix3fv( this.shaderProgram.uniformLocations.uProjectionMatrix, false, this.webglBlock.projectionMatrixArray );

      gl.bindBuffer( gl.ARRAY_BUFFER, this.vertexBuffer );
      gl.bufferSubData( gl.ARRAY_BUFFER, 0, this.vertexArray.subarray( 0, this.vertexArrayIndex ) );
      gl.vertexAttribPointer( this.shaderProgram.attributeLocations.aVertex, 4, gl.FLOAT, false, 0, 0 );
      // var sizeOfFloat = 4;
      // gl.vertexAttribPointer( this.shaderProgram.attributeLocations.aVertex, 2, gl.FLOAT, false, 4 * sizeOfFloat, 0 * sizeOfFloat );
      // gl.vertexAttribPointer( this.shaderProgram.attributeLocations.aTextureCoord, 2, gl.FLOAT, false, 4 * sizeOfFloat, 2 * sizeOfFloat );

      gl.activeTexture( gl.TEXTURE0 );
      gl.bindTexture( gl.TEXTURE_2D, this.currentSpriteSheet.texture );
      gl.uniform1i( this.shaderProgram.uniformLocations.uTexture, 0 );

      gl.drawArrays( gl.TRIANGLES, 0, this.vertexArrayIndex / 4 );

      gl.bindTexture( gl.TEXTURE_2D, null );

      this.currentSpriteSheet = null;
      this.vertexArrayIndex = 0;
    }
  } );


  Poolable.mixin( WebGLBlock, {
    constructorDuplicateFactory: function( pool ) {
      return function( display, renderer, transformRootInstance, filterRootInstance ) {
        if ( pool.length ) {
          sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( 'new from pool' );
          return pool.pop().initialize( display, renderer, transformRootInstance, filterRootInstance );
        }
        else {
          sceneryLog && sceneryLog.WebGLBlock && sceneryLog.WebGLBlock( 'new from constructor' );
          return new WebGLBlock( display, renderer, transformRootInstance, filterRootInstance );
        }
      };
    }
  } );

  return WebGLBlock;
} );
