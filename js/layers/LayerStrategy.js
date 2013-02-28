// Copyright 2002-2012, University of Colorado

/**
 * Controls the underlying layer behavior around a node. The node's LayerStrategy's enter() and exit() will be
 * called in a depth-first order during the layer building process, and will modify a LayerState to signal any
 * layer-specific signals.
 *
 * This generally ensures that a layer containing the proper renderer and settings to support its associated node
 * will be created.
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  "use strict";
  
  var assert = require( 'ASSERT/assert' )( 'scenery' );
  
  var scenery = require( 'SCENERY/scenery' );
  
  // specified as such, since there is no needed shared state (we can have node.layerStrategy = scenery.DefaultLayerStrategy for many nodes)
  scenery.DefaultLayerStrategy = {
    enter: function( trail, layerState ) {
      var node = trail.lastNode();
      
      // if the node isn't self-rendering, we can skip it completely
      if ( node.hasSelf() ) {
        var supportedRenderers = node._supportedRenderers;
        var preferredType = layerState.bestPreferredLayerTypeFor( supportedRenderers );
        var currentType = layerState.getCurrentLayerType();
        
        // If any of the preferred types are compatible, use the top one. This allows us to support caching and hierarchical layer types
        if ( preferredType ) {
          if ( currentType !== preferredType ) {
            layerState.switchToType( trail, preferredType );
          }
        } else {
          // if no preferred types are compatible, only switch if the current type is also incompatible
          if ( !currentType || !currentType.supportsNode( node ) ) {
            layerState.switchToType( trail, supportedRenderers[0].defaultLayerType );
          }
        }
        
        // trigger actual layer creation if necessary (allow collapsing of layers otherwise)
        layerState.markSelf();
      }
    },
    
    // afterSelf: function( trail, layerState ) {
    //   // no-op, and possibly not used
    // },
    
    // betweenChildren: function( trail, layerState ) {
    //   // no-op, and possibly not used
    // },
    
    exit: function( trail, layerState ) {
      // currently a no-op
    }
  };
  var DefaultLayerStrategy = scenery.DefaultLayerStrategy;
  
  scenery.SeparateLayerStrategy = function( strategy ) {
    return {
      strategy: strategy,
      
      enter: function( trail, layerState ) {
        // trigger a switch to what we already have
        layerState.switchToType( trail, layerState.getCurrentLayerType() );
        
        // execute the decorated strategy afterwards
        strategy.enter( trail, layerState );
      },
      
      exit: function( trail, layerState ) {
        // execute the decorated strategy afterwards
        strategy.exit( trail, layerState );
        
        // trigger a switch to what we already have
        layerState.switchToType( trail, layerState.getCurrentLayerType() );
      }
    };
  };
  var SeparateLayerStrategy = scenery.SeparateLayerStrategy;
  
  scenery.LayerTypeStrategy = function( strategy, preferredLayerType ) {
    return {
      strategy: strategy,
      
      enter: function( trail, layerState ) {
        // push the preferred layer type
        layerState.pushPreferredLayerType( preferredLayerType );
        if ( layerState.getCurrentLayerType() !== preferredLayerType ) {
          layerState.switchToType( trail, preferredLayerType );
        }
        
        // execute the decorated strategy afterwards
        strategy.enter( trail, layerState );
      },
      
      exit: function( trail, layerState ) {
        // execute the decorated strategy afterwards
        strategy.exit( trail, layerState );
        
        // pop the preferred layer type
        layerState.popPreferredLayerType();
      }
    };
  };
  var LayerTypeStrategy = scenery.LayerTypeStrategy;
  
  return {
    DefaultLayerStrategy: DefaultLayerStrategy,
    SeparateLayerStrategy: SeparateLayerStrategy,
    LayerTypeStrategy: LayerTypeStrategy
  };
} );
