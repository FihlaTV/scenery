// Copyright 2002-2012, University of Colorado

var scenery = scenery || {};

(function(){
  scenery.LayerState = function() {
    this.preferredLayerTypes = [];
    
    this.resetInternalState();
  };
  
  var LayerState = scenery.LayerState;
  LayerState.prototype = {
    constructor: LayerState,
    
    /*
     * Construct a list of layer entries between two Trails (inclusive).
     * Each element of the returned array will have { type: <layer type>, start: <start trail>, end: <end trail> }
     * startingLayerType can be null to signify there is no preceeding layer
     */
    buildLayers: function( startPointer, endPointer, startingLayerType ) {
      // TODO: accept initial layer in args?
      this.resetInternalState();
      
      if ( startingLayerType ) {
        this.nextLayerType = startingLayerType;
      }
      
      var state = this;
      
      startPointer.depthFirstUntil( endPointer, function( pointer ) {
        var node = pointer.trail.lastNode();
        
        if ( pointer.isBefore ) {
          node.layerStrategy.enter( pointer.trail, state );
        } else {
          node.layerStrategy.exit( pointer.trail, state );
        }
      }, false ); // don't exclude endpoints
      
      return this.layerEntries;
    },
    
    resetInternalState: function() {
      this.layerEntries = [];
      this.typeDirty = true;
      this.nextLayerType = null;
    },
    
    pushPreferredLayerType: function( layerType ) {
      this.preferredLayerTypes.push( layerType );
    },
    
    popPreferredLayerType: function( layerType ) {
      this.preferredLayerTypes.pop();
    },
    
    getPreferredLayerType: function() {
      if ( this.preferredLayerTypes.length !== 0 ) {
        return this.preferredLayerTypes[this.preferredLayerTypes.length - 1];
      } else {
        return null;
      }
    },
    
    switchToType: function( trail, layerType ) {
      this.typeDirty = true;
      this.nextLayerType = layerType;
    },
    
    // called so that we can finalize a layer switch (instead of collapsing unneeded layers)
    markSelf: function( trail ) {
      if ( this.typeDirty ) {
        this.layerChange( trail );
      }
    },
    
    // can be null to indicate that there is no current layer type
    getCurrentLayerType: function() {
      return this.nextLayerType;
    },
    
    bestPreferredLayerTypeFor: function( defaultTypeOptions ) {
      for ( var i = this.preferredLayerTypes.length - 1; i >= 0; i-- ) {
        var preferredType = this.preferredLayerTypes[i];
        if ( _.some( defaultTypeOptions, function( defaultType ) { return preferredType.supports( defaultType ); } ) ) {
          return preferredType;
        }
      }
      
      // none of our stored preferred layer types are able to support any of the default type options
      return null;
    },
    
    layerChange: function( firstSelfTrail ) {
      this.typeDirty = false;
      
      this.layerEntries.push( {
        type: this.nextLayerType,
        startTrail: firstSelfTrail
      } );
    }
  };
})();
