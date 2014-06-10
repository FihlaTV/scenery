// Copyright 2002-2014, University of Colorado

/**
 * A "backbone" block that controls a DOM element (usually a div) that contains other blocks with DOM/SVG/Canvas/WebGL content
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( function( require ) {
  'use strict';
  
  var inherit = require( 'PHET_CORE/inherit' );
  var Poolable = require( 'PHET_CORE/Poolable' );
  var cleanArray = require( 'PHET_CORE/cleanArray' );
  var scenery = require( 'SCENERY/scenery' );
  var Drawable = require( 'SCENERY/display/Drawable' );
  var Renderer = require( 'SCENERY/display/Renderer' );
  var CanvasBlock = require( 'SCENERY/display/CanvasBlock' );
  var SVGBlock = require( 'SCENERY/display/SVGBlock' );
  var DOMBlock = require( 'SCENERY/display/DOMBlock' );
  var Util = require( 'SCENERY/util/Util' );
  
  // shared stitcher state machine
  var stitcher;
  
  scenery.BackboneDrawable = function BackboneDrawable( display, backboneInstance, transformRootInstance, renderer, isDisplayRoot ) {
    this.initialize( display, backboneInstance, transformRootInstance, renderer, isDisplayRoot );
  };
  var BackboneDrawable = scenery.BackboneDrawable;
  
  inherit( Drawable, BackboneDrawable, {
    initialize: function( display, backboneInstance, transformRootInstance, renderer, isDisplayRoot ) {
      Drawable.call( this, renderer );
      
      this.display = display;
      
      this.forceAcceleration = Renderer.isAccelerationForced( this.renderer );
      
      // reference to the instance that controls this backbone
      this.backboneInstance = backboneInstance;
      
      // where is the transform root for our generated blocks?
      this.transformRootInstance = transformRootInstance;
      
      // where have filters been applied to up? our responsibility is to apply filters between this and our backboneInstance
      this.filterRootAncestorInstance = backboneInstance.parent ? backboneInstance.parent.getFilterRootInstance() : backboneInstance;
      
      // where have transforms been applied up to? our responsibility is to apply transforms between this and our backboneInstance
      this.transformRootAncestorInstance = backboneInstance.parent ? backboneInstance.parent.getTransformRootInstance() : backboneInstance;
      
      this.willApplyTransform = this.transformRootAncestorInstance !== this.transformRootInstance;
      this.willApplyFilters = this.filterRootAncestorInstance !== this.backboneInstance;
      
      this.transformListener = this.transformListener || this.markTransformDirty.bind( this );
      if ( this.willApplyTransform ) {
        this.backboneInstance.addRelativeTransformListener( this.transformListener ); // when our relative tranform changes, notify us in the pre-repaint phase
        this.backboneInstance.addRelativeTransformPrecompute(); // trigger precomputation of the relative transform, since we will always need it when it is updated
      }
      
      this.renderer = renderer;
      this.domElement = isDisplayRoot ? display._domElement : BackboneDrawable.createDivBackbone();
      this.isDisplayRoot = isDisplayRoot;
      this.dirtyDrawables = cleanArray( this.dirtyDrawables );
      
      Util.prepareForTransform( this.domElement, this.forceAcceleration );
      
      // if we need to, watch nodes below us (and including us) and apply their filters (opacity/visibility/clip) to the backbone.
      this.watchedFilterNodes = cleanArray( this.watchedFilterNodes );
      this.opacityDirty = true;
      this.visibilityDirty = true;
      this.clipDirty = true;
      this.opacityDirtyListener = this.opacityDirtyListener || this.markOpacityDirty.bind( this );
      this.visibilityDirtyListener = this.visibilityDirtyListener || this.markVisibilityDirty.bind( this );
      this.clipDirtyListener = this.clipDirtyListener || this.markClipDirty.bind( this );
      if ( this.willApplyFilters ) {
        assert && assert( this.filterRootAncestorInstance.trail.nodes.length < this.backboneInstance.trail.nodes.length,
                          'Our backboneInstance should be deeper if we are applying filters' );
        
        // walk through to see which instances we'll need to watch for filter changes
        for ( var instance = this.backboneInstance; instance !== this.filterRootAncestorInstance; instance = instance.parent ) {
          var node = instance.node;
          
          this.watchedFilterNodes.push( node );
          node.onStatic( 'opacity', this.opacityDirtyListener );
          node.onStatic( 'visibility', this.visibilityDirtyListener );
          node.onStatic( 'clip', this.clipDirtyListener );
        }
      }
      
      this.lastZIndex = 0; // our last zIndex is stored, so that overlays can be added easily
      
      this.blocks = this.blocks || []; // we are responsible for their disposal
      
      //OHTWO @deprecated
      this.lastFirstDrawable = null;
      this.lastLastDrawable = null;
      
      // We track whether our drawables were marked for removal (in which case, they should all be removed by the time we dispose).
      // If removedDrawables = false during disposal, it means we need to remove the drawables manually (this should only happen if an instance tree is removed)
      this.removedDrawables = false;
      
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( 'initialized ' + this.toString() );
      
      return this; // chaining
    },
    
    dispose: function() {
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( 'dispose ' + this.toString() );
      
      while ( this.watchedFilterNodes.length ) {
        var node = this.watchedFilterNodes.pop();
        
        node.offStatic( 'opacity', this.opacityDirtyListener );
        node.offStatic( 'visibility', this.visibilityDirtyListener );
        node.offStatic( 'clip', this.clipDirtyListener );
      }
      
      // if we need to remove drawables from the blocks, do so
      if ( !this.removedDrawables ) {
        for ( var d = this.lastFirstDrawable; d !== null; d = d.nextDrawable ) {
          d.parentDrawable.removeDrawable( d );
          if ( d === this.lastLastDrawable ) { break; }
        }
      }
      
      this.markBlocksForDisposal();
      
      if ( this.willApplyTransform ) {
        this.backboneInstance.removeRelativeTransformListener( this.transformListener );
        this.backboneInstance.removeRelativeTransformPrecompute();
      }
      
      this.backboneInstance = null;
      this.transformRootInstance = null;
      this.filterRootAncestorInstance = null;
      this.transformRootAncestorInstance = null;
      cleanArray( this.dirtyDrawables );
      cleanArray( this.watchedFilterNodes );
      
      Drawable.prototype.dispose.call( this );
    },
    
    // dispose all of the blocks while clearing our references to them
    markBlocksForDisposal: function() {
      while ( this.blocks.length ) {
        var block = this.blocks.pop();
        sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( this.toString() + ' removing block: ' + block.toString() );
        //TODO: PERFORMANCE: does this cause reflows / style calculation
        if ( block.domElement.parentNode === this.domElement ) {
          // guarded, since we may have a (new) child drawable add it before we can remove it
          this.domElement.removeChild( block.domElement );
        }
        block.markForDisposal( this.display );
      }
    },
    
    // should be called during syncTree
    markForDisposal: function( display ) {
      for ( var d = this.lastFirstDrawable; d !== null; d = d.oldNextDrawable ) {
        d.notePendingRemoval( this.display );
        if ( d === this.lastLastDrawable ) { break; }
      }
      this.removedDrawables = true;
      
      // super call
      Drawable.prototype.markForDisposal.call( this, display );
    },
    
    markDirtyDrawable: function( drawable ) {
      this.dirtyDrawables.push( drawable );
      this.markDirty();
    },
    
    markTransformDirty: function() {
      assert && assert( this.willApplyTransform, 'Sanity check for willApplyTransform' );
      
      // relative matrix on backbone instance should be up to date, since we added the compute flags
      scenery.Util.applyPreparedTransform( this.backboneInstance.relativeMatrix, this.domElement, this.forceAcceleration );
    },
    
    markOpacityDirty: function() {
      if ( !this.opacityDirty ) {
        this.opacityDirty = true;
        this.markDirty();
      }
    },
    
    markVisibilityDirty: function() {
      if ( !this.visibilityDirty ) {
        this.visibilityDirty = true;
        this.markDirty();
      }
    },
    
    markClipDirty: function() {
      if ( !this.clipDirty ) {
        this.clipDirty = true;
        this.markDirty();
      }
    },
    
    update: function() {
      if ( this.dirty && !this.disposed ) {
        this.dirty = false;
        
        while ( this.dirtyDrawables.length ) {
          this.dirtyDrawables.pop().update();
        }
        
        if ( this.opacityDirty ) {
          this.opacityDirty = false;
          
          var filterOpacity = this.willApplyFilters ? this.getFilterOpacity() : 1;
          this.domElement.style.opacity = ( filterOpacity !== 1 ) ? filterOpacity : '';
        }
        
        if ( this.visibilityDirty ) {
          this.visibilityDirty = false;
          
          this.domElement.style.display = ( this.willApplyFilters && !this.getFilterVisibility() ) ? 'none' : '';
        }
        
        if ( this.clipDirty ) {
          this.clipDirty = false;
          
          var clip = this.willApplyFilters ? this.getFilterClip() : '';
          
          //OHTWO TODO: CSS clip-path/mask support here. see http://www.html5rocks.com/en/tutorials/masking/adobe/
          this.domElement.style.clipPath = clip; // yikes! temporary, since we already threw something?
        }
      }
    },
    
    getFilterOpacity: function() {
      var opacity = 1;
      
      var len = this.watchedFilterNodes.length;
      for ( var i = 0; i < len; i++ ) {
        opacity *= this.watchedFilterNodes[i].getOpacity();
      }
      
      return opacity;
    },
    
    getFilterVisibility: function() {
      var len = this.watchedFilterNodes.length;
      for ( var i = 0; i < len; i++ ) {
        if ( !this.watchedFilterNodes[i].isVisible() ) {
          return false;
        }
      }
      
      return true;
    },
    
    getFilterClip: function() {
      var clip = '';
      
      //OHTWO TODO: proper clipping support
      // var len = this.watchedFilterNodes.length;
      // for ( var i = 0; i < len; i++ ) {
      //   if ( this.watchedFilterNodes[i]._clipArea ) {
      //     throw new Error( 'clip-path for backbones unimplemented, and with questionable browser support!' );
      //   }
      // }
      
      return clip;
    },
    
    rebuild: function( firstDrawable, lastDrawable, oldFirstDrawable, oldLastDrawable, firstChangeInterval, lastChangeInterval ) {
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( 'rebuild ' + this.toString() +
                                                                                ' first:' + ( firstDrawable ? firstDrawable.toString() : 'null' ) +
                                                                                ' last:' + ( lastDrawable ? lastDrawable.toString() : 'null' ) );
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.push();
      
      for ( var d = this.lastFirstDrawable; d !== null; d = d.oldNextDrawable ) {
        d.notePendingRemoval( this.display );
        if ( d === this.lastLastDrawable ) { break; }
      }
      
      this.lastFirstDrawable = firstDrawable;
      this.lastLastDrawable = lastDrawable;
      
      this.markBlocksForDisposal();
      
      var currentBlock = null;
      var currentRenderer = 0;
      var firstDrawableForBlock = null;
      
      // linked-list iteration inclusively from firstDrawable to lastDrawable
      for ( var drawable = firstDrawable; drawable !== null; drawable = drawable.nextDrawable ) {
        
        // if we need to switch to a new block, create it
        if ( !currentBlock || drawable.renderer !== currentRenderer ) {
          if ( currentBlock ) {
            currentBlock.notifyInterval( firstDrawableForBlock, drawable.previousDrawable );
          }
          
          currentRenderer = drawable.renderer;
          
          if ( Renderer.isCanvas( currentRenderer ) ) {
            currentBlock = CanvasBlock.createFromPool( this.display, currentRenderer, this.transformRootInstance, this.backboneInstance );
          } else if ( Renderer.isSVG( currentRenderer ) ) {
            //OHTWO TODO: handle filter root separately from the backbone instance?
            currentBlock = SVGBlock.createFromPool( this.display, currentRenderer, this.transformRootInstance, this.backboneInstance );
          } else if ( Renderer.isDOM( currentRenderer ) ) {
            currentBlock = DOMBlock.createFromPool( this.display, drawable );
            currentRenderer = 0; // force a new block for the next drawable
          } else {
            throw new Error( 'unsupported renderer for BackboneDrawable.rebuild: ' + currentRenderer );
          }
          
          this.blocks.push( currentBlock );
          currentBlock.setBlockBackbone( this );
          sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( this.toString() + ' adding block: ' + currentBlock.toString() );
          //OHTWO TODO: minor speedup by appending only once its fragment is constructed? or use DocumentFragment?
          this.domElement.appendChild( currentBlock.domElement );
          
          // mark it dirty for now, so we can check
          this.markDirtyDrawable( currentBlock );
          
          firstDrawableForBlock = drawable;
        }
        
        drawable.notePendingAddition( this.display, currentBlock, this );
        
        // don't cause an infinite loop!
        if ( drawable === lastDrawable ) { break; }
      }
      if ( currentBlock ) {
        currentBlock.notifyInterval( firstDrawableForBlock, lastDrawable );
      }
      
      this.reindexBlocks();
      
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.pop();
    },
    
    // ensures that z-indices are strictly increasing, while trying to minimize the number of times we must change it
    reindexBlocks: function() {
      // full-pass change for zindex.
      var zIndex = 0; // don't start below 1 (we ensure > in loop)
      for ( var k = 0; k < this.blocks.length; k++ ) {
        var block = this.blocks[k];
        if ( block.zIndex <= zIndex ) {
          var newIndex = ( k + 1 < this.blocks.length && this.blocks[k+1].zIndex - 1 > zIndex ) ?
                         Math.ceil( ( zIndex + this.blocks[k+1].zIndex ) / 2 ) :
                         zIndex + 20;
          
          // NOTE: this should give it its own stacking index (which is what we want)
          block.domElement.style.zIndex = block.zIndex = newIndex;
        }
        zIndex = block.zIndex;
        
        if ( assert ) {
          assert( this.blocks[k].zIndex % 1 === 0, 'z-indices should be integers' );
          assert( this.blocks[k].zIndex > 0, 'z-indices should be greater than zero for our needs (see spec)' );
          if ( k > 0 ) {
            assert( this.blocks[k-1].zIndex < this.blocks[k].zIndex, 'z-indices should be strictly increasing' );
          }
        }
      }
      
      // sanity check
      this.lastZIndex = zIndex + 1;
    },
    
    stitch: function( firstDrawable, lastDrawable, oldFirstDrawable, oldLastDrawable, firstChangeInterval, lastChangeInterval ) {
      return stitcher.stitch( this, firstDrawable, lastDrawable, oldFirstDrawable, oldLastDrawable, firstChangeInterval, lastChangeInterval );
    },
    
    audit: function( allowPendingBlock, allowPendingList, allowDirty ) {
      if ( assertSlow ) {
        Drawable.prototype.audit.call( this, allowPendingBlock, allowPendingList, allowDirty );
        
        assertSlow && assertSlow( this.backboneInstance.state.isBackbone, 'We should reference an instance that requires a backbone' );
        assertSlow && assertSlow( this.transformRootInstance.state.isTransformed, 'Transform root should be transformed' );
        
        for ( var i = 0; i < this.blocks.length; i++ ) {
          this.blocks[i].audit( allowPendingBlock, allowPendingList, allowDirty );
        }
      }
    }
  } );
  
  BackboneDrawable.createDivBackbone = function() {
    var div = document.createElement( 'div' );
    div.style.position = 'absolute';
    div.style.left = '0';
    div.style.top = '0';
    div.style.width = '0';
    div.style.height = '0';
    return div;
  };
  
  BackboneDrawable.noteIntervalForRemoval = function( display, interval, oldFirstDrawable, oldLastDrawable ) {
    // if before/after is null, we go out to the old first/last
    var first = interval.drawableBefore || oldFirstDrawable;
    var last = interval.drawableAfter || oldLastDrawable;
    
    for ( var drawable = first;; drawable = drawable.oldNextDrawable ) {
      drawable.notePendingRemoval( display );
      
      if ( drawable === last ) { break; }
    }
  };
  
  BackboneDrawable.Stitcher = function() {
    this.reusableBlocks = []; // {[Block]}
    this.blockOrderChanged = false;
    //OHTWO TODO: initialize empty vars?
  };
  BackboneDrawable.Stitcher.prototype = {
    constructor: BackboneDrawable.Stitcher,
    
    initialize: function() {
      this.blockOrderChanged = false;
    },
    
    clean: function() {
      cleanArray( this.reusableBlocks );
    },
    
    stitch: function( backbone, firstDrawable, lastDrawable, oldFirstDrawable, oldLastDrawable, firstChangeInterval, lastChangeInterval ) {
      this.initialize();
      
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( 'stitch ' + backbone.toString() +
                                                                                ' first:' + ( firstDrawable ? firstDrawable.toString() : 'null' ) +
                                                                                ' last:' + ( lastDrawable ? lastDrawable.toString() : 'null' ) +
                                                                                ' oldFirst:' + ( oldFirstDrawable ? oldFirstDrawable.toString() : 'null' ) +
                                                                                ' oldLast:' + ( oldLastDrawable ? oldLastDrawable.toString() : 'null' ) );
      
      var interval;
      
      assert && assert( lastChangeInterval.nextChangeInterval === null, 'This allows us to have less checks in the loop' );
      
      // make the intervals as small as possible by skipping areas without changes
      for ( interval = firstChangeInterval; interval !== null; interval = interval.nextChangeInterval ) {
        interval.constrict();
      }
      
      if ( sceneryLog && sceneryLog.BackboneDrawable ) {
        for ( var debugInterval = firstChangeInterval; debugInterval !== null; debugInterval = debugInterval.nextChangeInterval ) {
          sceneryLog.BackboneDrawable( '  interval: ' +
                                       ( debugInterval.isEmpty() ? '(empty) ' : '' ) +
                                       ( debugInterval.drawableBefore ? debugInterval.drawableBefore.toString : '-' ) + ' to ' +
                                       ( debugInterval.drawableAfter ? debugInterval.drawableAfter.toString : '-' ) );
        }
      }
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.push();
      
      // dispose compatibility (for now)
      backbone.lastFirstDrawable = firstDrawable;
      backbone.lastLastDrawable = lastDrawable;
      
      // per-interval work
      for ( interval = firstChangeInterval; interval !== null; interval = interval.nextChangeInterval ) {
        if ( !interval.isEmpty() ) {
          //OHTWO TODO: here (in the old-iteration), we should collect references to potentially reusable blocks?
          BackboneDrawable.noteIntervalForRemoval( backbone.display, interval, oldFirstDrawable, oldLastDrawable );
          
          var firstBlock = interval.drawableBefore === null ? backbone.blocks[0] : interval.drawableBefore.pendingParentDrawable;
          var lastBlock = interval.drawableAfter === null ? backbone.blocks[backbone.blocks.length-1] : interval.drawableAfter.pendingParentDrawable;
          
          // blocks totally contained within the change interval are marked as reusable (doesn't include end blocks)
          if ( firstBlock !== lastBlock ) {
            for ( var markedBlock = firstBlock.nextBlock; markedBlock !== lastBlock; markedBlock = markedBlock.nextBlock ) {
              markedBlock.used = false; // mark it as unused until we pull it out (so we can reuse, or quickly identify)
              this.reusableBlocks.push( markedBlock );
            }
          }
        }
      }
      
      for ( interval = firstChangeInterval; interval !== null; interval = interval.nextChangeInterval ) {
        if ( !interval.isEmpty() ) {
          var currentRenderer = interval.drawableBefore ? interval.drawableBefore.renderer : 0;
          
          for ( var drawable = interval.drawableBefore.nextDrawable; drawable !== interval.drawableAfter; drawable = drawable.nextDrawable ) {
            if ( drawable.renderer !== currentRenderer ) {
              
            }
          }
        }
      }
      
      //OHTWO TODO: remember to set blockOrderChanged on changes
      
      //OHTWO TODO: DOMBlock special case with backbones / etc.? Always have the same drawable!!!
      
      //OHTWO TODO: drawable.notePendingAddition( backbone.display, block, backbone );
      
      //OHTWO TODO: backbone.markDirtyDrawable on changed blocks
      
      //OHTWO TODO: maintain array or linked-list of blocks (and update)
      
      //OHTWO TODO: notifyInterval on all blocks that were changed
      
      this.removeUnusedBlocks( backbone );
      
      if ( this.blockOrderChanged ) {
        throw new Error( 'enable this' );
        // this.createBlockArrayFromLinks( backbone, firstBlock, lastBlock );
        backbone.reindexBlocks();
      }
      
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.pop();
      
      this.clean();
    },
    
    // NOTE: this doesn't handle hooking up the block linked list
    getBlockForRenderer: function( backbone, renderer, drawable ) {
      var block;
      
      // If it's not a DOM block, scan our reusable blocks for a match
      if ( !Renderer.isDOM( renderer ) ) {
        var len = this.reusableBlocks.length;
        for ( var i = 0; i < len; i++ ) {
          block = this.reusableBlocks[i];
          if ( block.renderer === renderer ) {
            this.reusableBlocks.splice( i, 1 ); // remove it from our reusable blocks, since it's now in use
            block.used = true; // mark it as used, so we don't match it when scanning
          }
        }
      }
      
      if ( !block ) {
        // Didn't find it in our reusable blocks, create a fresh one from scratch
        if ( Renderer.isCanvas( renderer ) ) {
          block = CanvasBlock.createFromPool( backbone.display, renderer, backbone.transformRootInstance, backbone.backboneInstance );
        } else if ( Renderer.isSVG( renderer ) ) {
          //OHTWO TODO: handle filter root separately from the backbone instance?
          block = SVGBlock.createFromPool( backbone.display, renderer, backbone.transformRootInstance, backbone.backboneInstance );
        } else if ( Renderer.isDOM( renderer ) ) {
          block = DOMBlock.createFromPool( backbone.display, drawable );
        } else {
          throw new Error( 'unsupported renderer for BackboneDrawable.getBlockForRenderer: ' + renderer );
        }
        block.setBlockBackbone( backbone );
        
        this.blockOrderChanged = true; // we created a new block, this will always happen
      }
      
      sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( backbone.toString() + ' adding block: ' + block.toString() );
      //OHTWO TODO: minor speedup by appending only once its fragment is constructed? or use DocumentFragment?
      backbone.domElement.appendChild( block.domElement );
      
      // mark it dirty for now, so we can check
      backbone.markDirtyDrawable( block );
      
      return block;
    },
    
    // removes a block from the list of reused blocks (done during matching)
    useBlock: function( backbone, block ) {
      var idx = _.indexOf( this.reusableBlocks, block );
      assert && assert( idx >= 0 );
      
      // remove it
      this.reusableBlocks.splice( idx, 1 );
      
      // mark it as used
      block.used = true;
    },
    
    // removes them from our domElement, and marks them for disposal
    removeUnusedBlocks: function( backbone ) {
      while ( this.reusableBlocks.length ) {
        var block = this.reusableBlocks.pop();
        
        sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( backbone.toString() + ' removing block: ' + block.toString() );
        //TODO: PERFORMANCE: does this cause reflows / style calculation
        if ( block.domElement.parentNode === backbone.domElement ) {
          // guarded, since we may have a (new) child drawable add it before we can remove it
          backbone.domElement.removeChild( block.domElement );
        }
        block.markForDisposal( backbone.display );
      }
    },
    
    createBlockArrayFromLinks: function( backbone, firstBlock, lastBlock ) {
      // for now, just clear out the array first
      while ( backbone.blocks.length ) {
        backbone.blocks.pop();
      }
      
      // and rewrite it
      for ( var block = firstBlock;; block = block.nextBlock ) {
        backbone.blocks.push( block );
        
        if ( block === lastBlock ) { break; }
      }
    }
  };
  stitcher = new BackboneDrawable.Stitcher();
  
  /* jshint -W064 */
  Poolable( BackboneDrawable, {
    constructorDuplicateFactory: function( pool ) {
      return function( display, backboneInstance, transformRootInstance, renderer, isDisplayRoot ) {
        if ( pool.length ) {
          sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( 'new from pool' );
          return pool.pop().initialize( display, backboneInstance, transformRootInstance, renderer, isDisplayRoot );
        } else {
          sceneryLog && sceneryLog.BackboneDrawable && sceneryLog.BackboneDrawable( 'new from constructor' );
          return new BackboneDrawable( display, backboneInstance, transformRootInstance, renderer, isDisplayRoot );
        }
      };
    }
  } );
  
  return BackboneDrawable;
} );
