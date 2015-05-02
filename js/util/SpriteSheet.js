//  Copyright 2002-2014, University of Colorado Boulder

/**
 * A single Canvas/texture with multiple different images (sprites) drawn internally. During rendering, this texture
 * can be used in one draw call to render multiple different images by providing UV coordinates to each quad for each
 * image to be drawn.
 *
 * Note that the WebGL texture part is not required to be run - the Canvas-only part can be used functionally without
 * any WebGL dependencies.
 *
 * TODO: Add padding around sprites, otherwise interpolation could cause issues!
 * TODO: How to use custom mipmap levels?
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 * @author Sam Reid (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var scenery = require( 'SCENERY/scenery' );
  var inherit = require( 'PHET_CORE/inherit' );
  var BinPacker = require( 'DOT/BinPacker' );
  var Bounds2 = require( 'DOT/Bounds2' );

  /**
   * @constructor
   *
   * @param {boolean} useMipmaps - Whether built-in WebGL mipmapping should be used. Higher quality, but may be slower
   *                               to add images (since mipmaps need to be updated).
   */
  scenery.SpriteSheet = function SpriteSheet( useMipmaps ) {
    this.useMipmaps = useMipmaps;

    this.gl = null; // assume later creation of context for now

    // Use the max supported texture size (according to http://codeflow.org/entries/2013/feb/22/how-to-write-portable-webgl/ )
    // TODO: potentially support larger texture sizes based on reported capabilities (could cause fewer draw calls?)
    this.bounds = new Bounds2( 0, 0, 2048, 2048 );
    assert && assert( this.bounds.minX === 0 && this.bounds.minY === 0, 'Assumed constraint later on for transforms' );
    this.width = this.bounds.width;
    this.height = this.bounds.height;

    this.canvas = document.createElement( 'canvas' );
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext( '2d' );

    this.binPacker = new BinPacker( this.bounds );

    this.dirty = true; // @public [read-only] - Used to check if we need to updateTexture()

    this.usedSprites = [];
    this.unusedSprites = []; // works as a LRU cache for removing items when we need to allocate new space
  };

  inherit( Object, scenery.SpriteSheet, {
    /**
     * Initialize (or reinitialize) ourself with a new GL context. Should be called at least once before updateTexture()
     */
    initializeContext: function( gl ) {
      this.gl = gl;

      this.createTexture();
    },

    /**
     * Allocates and creates a GL texture, configures it, and initializes it with our current Canvas.
     */
    createTexture: function() {
      var gl = this.gl;

      this.texture = gl.createTexture();
      gl.bindTexture( gl.TEXTURE_2D, this.texture );
      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE );
      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE );
      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.useMipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR );
      gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR );
      gl.pixelStorei( gl.UNPACK_FLIP_Y_WEBGL, false );
      gl.pixelStorei( gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true ); // work with premultiplied numbers
      gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas );
      if ( this.useMipmaps ) {
        gl.hint( gl.GENERATE_MIPMAP_HINT, gl.NICEST );
        gl.generateMipmap( gl.TEXTURE_2D );
      }
      gl.bindTexture( gl.TEXTURE_2D, null );

      this.dirty = false;
    },

    /**
     * Updates a pre-existing texture with our current Canvas.
     */
    updateTexture: function() {
      assert && assert( this.gl, 'SpriteSheet needs context to updateTexture()' );

      if ( this.dirty ) {
        this.dirty = false;

        var gl = this.gl;

        gl.bindTexture( gl.TEXTURE_2D, this.texture );
        gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas );
        if ( this.useMipmaps ) {
          gl.generateMipmap( gl.TEXTURE_2D );
        }
        gl.bindTexture( gl.TEXTURE_2D, null );
      }
    },

    /**
     * Adds an image (if possible) to our sprite sheet. If successful, will return a {Sprite}, otherwise null.
     *
     * @param {HTMLCanvasElement | HTMLImageElement} image
     * @param {number} width
     * @param {number} height
     *
     * @returns {Sprite | null}
     */
    addImage: function( image, width, height ) {
      var i;

      // check used cache
      for ( i = 0; i < this.usedSprites.length; i++ ) {
        var usedSprite = this.usedSprites[i];
        if ( usedSprite.image === image ) {
          usedSprite.count++;
          return usedSprite;
        }
      }

      // check unused cache
      for ( i = 0; i < this.unusedSprites.length; i++ ) {
        var unusedSprite = this.unusedSprites[i];
        if ( unusedSprite.image === image ) {
          unusedSprite.count++;
          assert && assert( unusedSprite.count === 1, 'Count should be exactly 1 after coming back from being unused' );
          this.unusedSprites.splice( i, 1 ); // remove it from the unused array
          this.usedSprites.push( unusedSprite ); // add it to the used array
          return unusedSprite;
        }
      }

      // Not in any caches, let's try to find space. If we can't find space at first, we start removing unused sprites
      // one-by-one.
      var bin;
      // Enters 'while' loop only if allocate() returns null and we have unused sprites (i.e. conditions where we will
      // want to deallocate the least recently used (LRU) unused sprite and then check for allocation again).
      while ( !( bin = this.binPacker.allocate( width, height ) ) && this.unusedSprites.length ) {
        var ejectedSprite = this.unusedSprites.shift(); // LRU policy by taking first item

        // clear its space in the Canvas
        this.dirty = true;
        var ejectedBounds = ejectedSprite.bin.bounds;
        this.context.clearRect( ejectedBounds.x, ejectedBounds.y, ejectedBounds.width, ejectedBounds.height );

        // deallocate its area in the bin packer
        this.binPacker.deallocate( ejectedSprite.bin );
      }

      if ( bin ) {
        // WebGL will want UV coordinates in the [0,1] range
        var uvBounds = new Bounds2( bin.bounds.minX / this.width, bin.bounds.minY / this.height,
                                    bin.bounds.maxX / this.width, bin.bounds.maxY / this.height );
        var sprite = new scenery.SpriteSheet.Sprite( this, bin, uvBounds, image, 1 );
        this.context.drawImage( image, bin.bounds.x, bin.bounds.y );
        this.dirty = true;
        this.usedSprites.push( sprite );
        return sprite;
      }
      // no space, even after clearing out our unused sprites
      else {
        return null;
      }
    },

    removeImage: function( image ) {
      // find the used sprite (and its index)
      var usedSprite;
      var i;
      for ( i = 0; i < this.usedSprites.length; i++ ) {
        if ( this.usedSprites[i].image === image ) {
          usedSprite = this.usedSprites[i];
          break;
        }
      }
      assert && assert( usedSprite, 'Sprite not found for removeImage' );

      // if we have no more references to the image/sprite
      if ( --usedSprite.count <= 0 ) {
        this.usedSprites.splice( i, 1 ); // remove it from the used list
        this.unusedSprites.push( usedSprite ); // add it to the unused list
      }

      // NOTE: no modification to the Canvas/texture is made, since we can leave it drawn there and unreferenced.
      // If addImage( image ) is called for the same image, we can 'resurrect' it without any further Canvas/texture
      // changes being made.
    },

    /**
     * Whether the sprite for the specified image is handled by this spritesheet. It can be either used or unused, but
     * addImage() calls with the specified image should be extremely fast (no need to modify the Canvas or texture).
     *
     * @returns {boolean}
     */
    containsImage: function( image ) {
      var i;

      // check used cache
      for ( i = 0; i < this.usedSprites.length; i++ ) {
        if ( this.usedSprites[i].image === image ) {
          return true;
        }
      }

      // check unused cache
      for ( i = 0; i < this.unusedSprites.length; i++ ) {
        if ( this.unusedSprites[i].image === image ) {
          return true;
        }
      }

      return false;
    }
  } );

  /**
   * A reference to a specific part of the texture that can be used.
   *
   * @constructor
   */
  scenery.SpriteSheet.Sprite = function( spriteSheet, bin, uvBounds, image, initialCount ) {
    // @public [read-only] {SpriteSheet} - The containing SpriteSheet
    this.spriteSheet = spriteSheet;

    // @private [read-only] {BinPacker.Bin} - Contains the actual image bounds in our Canvas, and is used to deallocate.
    this.bin = bin;

    // @public [read-only] {Bounds2} - Normalized bounds between [0,1] for the full texture (for GLSL texture lookups).
    this.uvBounds = uvBounds;

    // @private [read-only] {HTMLCanvasElement | HTMLImageElement} - Image element used.
    this.image = image;

    // @private [read-write] {number} - Reference count for number of addChild() calls minus removeChild() calls. If
    // the count is 0, it should be in the 'unusedSprites' array, otherwise it should be in the 'usedSprites' array.
    this.count = initialCount;
  };

  return scenery.SpriteSheet;
} );