// Copyright 2002-2012, University of Colorado

/**
 * Mutable state passed through the scene graph rendering process that stores
 * the current transformation and layer.
 *
 * @author Jonathan Olson
 */

var phet = phet || {};
phet.scene = phet.scene || {};

(function(){
    phet.scene.RenderState = function() {
        this.transform = new phet.math.Transform3();
        
        this.layer = null;
        
        // clipping shapes should be added in reference to the global coordinate frame
        this.clipping = [];
    }

    var RenderState = phet.scene.RenderState;

    RenderState.prototype = {
        constructor: RenderState,
        
        switchToLayer: function( layer ) {
            this.layer = layer;
            
            // give the layer the current state so it can initialize itself properly
            layer.initialize( this );
        },
        
        isCanvasState: function() {
            return this.layer.isCanvasLayer;
        },
        
        // TODO: consider a stack-based model for transforms?
        applyTransformationMatrix: function( matrix ) {
            this.transform.append( matrix );
            this.layer.applyTransformationMatrix( matrix );
        }
    };
})();