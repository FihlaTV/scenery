

(function(){
    
    // $( '#display' ).hide();
    
    var canvasWidth = 320;
    var canvasHeight = 240;
    
    // takes a snapshot of a scene and stores the pixel data, so that we can compare them
    function snapshot( scene ) {
        var canvas = document.createElement( 'canvas' );
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        var context = phet.canvas.initCanvas( canvas );
        scene.renderToCanvas( canvas, context );
        var data = context.getImageData( 0, 0, canvasWidth, canvasHeight );
        return data;
    }
    
    function snapshotToCanvas( snapshot ) {
        var canvas = document.createElement( 'canvas' );
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        var context = phet.canvas.initCanvas( canvas );
        context.putImageData( snapshot, 0, 0 );
        $( canvas ).css( 'border', '1px solid black' );
        return canvas;
    }
    
    // compares two pixel snapshots and uses the qunit's assert to verify they are the same
    function snapshotEquals( a, b, threshold, message ) {
        var isEqual = a.width == b.width && a.height == b.height;
        var largestDifference = 0;
        if( isEqual ) {
            for( var i = 0; i < a.data.length; i++ ) {
                if( a.data[i] != b.data[i] && Math.abs( a.data[i] - b.data[i] ) > threshold ) {
                    // console.log( message + ": " + Math.abs( a.data[i] - b.data[i] ) );
                    largestDifference = Math.max( largestDifference, Math.abs( a.data[i] - b.data[i] ) );
                    isEqual = false;
                    // break;
                }
            }
        }
        if( largestDifference > 0 ) {
            var display = $( '#display' );
            // header
            var note = document.createElement( 'h2' );
            $( note ).text( message );
            display.append( note );
            var differenceDiv = document.createElement( 'div' );
            $( differenceDiv ).text( 'Largest pixel color-channel difference: ' + largestDifference );
            display.append( differenceDiv );
            
            display.append( snapshotToCanvas( a ) );
            display.append( snapshotToCanvas( b ) );
            
            // for a line-break
            display.append( document.create( 'div' ) );
            
        }
        ok( isEqual, message );
        return isEqual;
    }
    
    // compares the "update" render against a full render in-between a series of steps
    function updateVsFullRender( actions ) {
        var mainScene = new phet.scene.Scene( $( '#main' ) );
        var secondaryScene = new phet.scene.Scene( $( '#secondary' ) );
        
        var mainRoot = mainScene.root;
        var secondaryRoot = secondaryScene.root;
        
        for( var i = 0; i < actions.length; i++ ) {
            var action = actions[i];
            action( mainScene );
            mainScene.updateScene();
            
            secondaryScene.clearAllLayers();
            action( secondaryScene );
            secondaryScene.rebuildLayers();
            secondaryScene.renderScene();
            
            var isEqual = snapshotEquals( snapshot( mainScene ), snapshot( secondaryScene ), 0, 'action #' + i );
            if( !isEqual ) {
                break;
            }
        }
    }
    
    function sceneEquals( constructionA, constructionB, message, threshold ) {
        if( threshold === undefined ) {
            threshold = 0;
        }
        
        var sceneA = new phet.scene.Scene( $( '#main' ) );
        var sceneB = new phet.scene.Scene( $( '#secondary' ) );
        
        constructionA( sceneA );
        constructionB( sceneB );
        
        sceneA.renderScene();
        sceneB.renderScene();
        
        var isEqual = snapshotEquals( snapshot( sceneA ), snapshot( sceneB ), threshold, message );
        
        // TODO: consider showing if tests fail
        return isEqual;
    }
    
    function strokeEqualsFill( shapeToStroke, shapeToFill, strokeNodeSetup, message ) {
        sceneEquals( function( scene ) {
            var node = new phet.scene.Node();
            node.setShape( shapeToStroke );
            node.setStroke( '#000000' );
            if( strokeNodeSetup ) { strokeNodeSetup( node ); }
            scene.root.addChild( node );
        }, function( scene ) {
            var node = new phet.scene.Node();
            node.setShape( shapeToFill );
            node.setFill( '#000000' );
            scene.root.addChild( node );
        }, message, 128 ); // threshold of 128 due to antialiasing differences between fill and stroke... :(
    }
    
    /*---------------------------------------------------------------------------*
    * TESTS BELOW
    *----------------------------------------------------------------------------*/     
    
    module( 'Canvas Scene Regression' );
    
    test( 'Canvas 2D Context and Features', function() {
        var canvas = document.createElement( 'canvas' );
        var context = phet.canvas.initCanvas( canvas );
        
        ok( context, 'context' );
        
        var neededMethods = [
            'arc',
            'arcTo',
            'beginPath',
            'bezierCurveTo',
            'clearRect',
            'clip',
            'closePath',
            'fill',
            'fillRect',
            'fillStyle',
            'isPointInPath',
            'lineTo',
            'moveTo',
            'rect',
            'restore',
            'quadraticCurveTo',
            'save',
            'setTransform',
            'stroke',
            'strokeRect',
            'strokeStyle'
        ];
        _.each( neededMethods, function( method ) {
            ok( context[method] !== undefined, 'context.' + method );
        } );
    } );
    
    test( 'Text width measurement in canvas', function() {
        var canvas = document.createElement( 'canvas' );
        var context = phet.canvas.initCanvas( canvas );
        var metrics = context.measureText('Hello World');
        ok( metrics.width, 'metrics.width' );
    } );
    
    test( 'Sceneless node handling', function() {
        var a = new phet.scene.Node();
        var b = new phet.scene.Node();
        var c = new phet.scene.Node();
        
        a.setShape( phet.scene.Shape.rectangle( 0, 0, 20, 20 ) );
        c.setShape( phet.scene.Shape.rectangle( 10, 10, 30, 30 ) );
        
        a.addChild( b );
        b.addChild( c );
        
        a.validateBounds();
        
        a.removeChild( b );
        c.addChild( a );
        
        b.validateBounds();
        
        ok( !a.isRooted() );
        
        a.invalidatePaint();
    } );
    
    test( 'Checking Layers and external canvas', function() {
        var scene = new phet.scene.Scene( $( '#main' ) );
        var root = scene.root;
        
        root.addChild( new phet.scene.nodes.Rectangle( {
            x: 0,
            y: 0,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
            fill: '#ff0000'
        } ) );
        
        var middleRect = new phet.scene.nodes.Rectangle( {
            x: canvasWidth / 4,
            y: canvasHeight / 4,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
            fill: '#00ff00'
        } );
        middleRect.setLayerType( phet.scene.layers.CanvasLayer );
        
        root.addChild( middleRect );
        
        root.addChild( new phet.scene.nodes.Rectangle( {
            x: canvasWidth / 2,
            y: canvasHeight / 2,
            width: canvasWidth / 2,
            height: canvasHeight / 2,
            fill: '#0000ff'
        } ) );
        
        scene.updateScene();
        
        equal( scene.layers.length, 3, 'simple layer check' );
    } );
    
    test( 'Update vs Full Basic Clearing Check', function() {
        updateVsFullRender( [
            function( scene ) {
                scene.root.addChild( new phet.scene.nodes.Rectangle( {
                    x: 0,
                    y: 0,
                    width: canvasWidth / 2,
                    height: canvasHeight / 2,
                    fill: '#000000'
                } ) );
            }, function( scene ) {
                scene.root.children[0].translate( 20, 20 );
            }
        ] );
    } );
    
    test( 'Update vs Full Self-Bounds increase', function() {
        updateVsFullRender( [
            function( scene ) {
                var node = new phet.scene.Node();
                node.setShape( phet.scene.Shape.rectangle( 0, 0, canvasWidth / 3, canvasHeight / 3 ) );
                node.setFill( '#ff0000' );
                node.setStroke( '#000000' );
                scene.root.addChild( node );
            }, function( scene ) {
                scene.root.children[0].setShape( phet.scene.Shape.rectangle( 0, 0, canvasWidth / 2, canvasHeight / 2 ) );
            }
        ] );
    } );
    
    test( 'Update vs Full Stroke Repaint', function() {
        updateVsFullRender( [
            function( scene ) {
                // TODO: clearer way of specifying parameters
                var node = new phet.scene.Node();
                node.setShape( phet.scene.Shape.rectangle( 15, 15, canvasWidth / 2, canvasHeight / 2 ) );
                node.setFill( '#ff0000' );
                node.setStroke( '#000000' );
                node.setLineWidth( 10 );
                scene.root.addChild( node );
            }, function( scene ) {
                scene.root.children[0].translate( canvasWidth / 4, canvasHeight / 4 );
            }
        ] );
    } );
    
    test( 'Correct bounds on rectangle', function() {
        var rectBounds = phet.scene.canvasAccurateBounds( function( context ) { context.fillRect( 100, 100, 200, 200 ); } );
        ok( Math.abs( rectBounds.minX - 100 ) < 0.01, rectBounds.minX );
        ok( Math.abs( rectBounds.minY - 100 ) < 0.01, rectBounds.minY );
        ok( Math.abs( rectBounds.maxX - 300 ) < 0.01, rectBounds.maxX );
        ok( Math.abs( rectBounds.maxY - 300 ) < 0.01, rectBounds.maxY );
    } );
    
    test( 'Consistent and precise bounds range on Text', function() {
        var textBounds = phet.scene.canvasAccurateBounds( function( context ) { context.fillText( 'test string', 0, 0 ); } );
        ok( textBounds.isConsistent, textBounds.toString() );
        
        // precision of 0.001 (or lower given different parameters) is possible on non-Chome browsers (Firefox, IE9, Opera)
        ok( textBounds.precision < 0.15, 'precision: ' + textBounds.precision );
    } );
    
    /*---------------------------------------------------------------------------*
    * Shapes
    *----------------------------------------------------------------------------*/        
    
    (function(){
        module( 'Shapes' );
        
        var Shape = phet.scene.Shape;
        
        function p( x, y ) { return new phet.math.Vector2( x, y ); }
    
        test( 'Verifying Line/Rect', function() {
            var lineWidth = 50;
            // /shapeToStroke, shapeToFill, strokeNodeSetup, message, debugFlag
            var strokeShape = Shape.lineSegment( p( 100, 100 ), p( 300, 100 ) );
            var fillShape = Shape.rectangle( 100, 100 - lineWidth / 2, 200, lineWidth );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineWidth( lineWidth ); }, QUnit.config.current.testName );
        } );
        
        test( 'Line Segment - butt', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 50;
            
            var strokeShape = Shape.lineSegment( p( 100, 100 ), p( 300, 100 ) );
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Line Segment - square', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 50;
            styles.lineCap = 'square';
            
            var strokeShape = Shape.lineSegment( p( 100, 100 ), p( 300, 100 ) );
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Line Join - Miter', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            styles.lineJoin = 'miter';
            
            var strokeShape = new Shape();
            strokeShape.moveTo( 70, 70 );
            strokeShape.lineTo( 140, 200 );
            strokeShape.lineTo( 210, 70 );
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Line Join - Miter - Closed', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            styles.lineJoin = 'miter';
            
            var strokeShape = new Shape();
            strokeShape.moveTo( 70, 70 );
            strokeShape.lineTo( 140, 200 );
            strokeShape.lineTo( 210, 70 );
            strokeShape.close();
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Line Join - Bevel - Closed', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            styles.lineJoin = 'bevel';
            
            var strokeShape = new Shape();
            strokeShape.moveTo( 70, 70 );
            strokeShape.lineTo( 140, 200 );
            strokeShape.lineTo( 210, 70 );
            strokeShape.close();
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Rect', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            
            var strokeShape = Shape.rectangle( 40, 40, 150, 150 );
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Manual Rect', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            
            var strokeShape = new Shape();
            strokeShape.moveTo( 40, 40 );
            strokeShape.lineTo( 190, 40 );
            strokeShape.lineTo( 190, 190 );
            strokeShape.lineTo( 40, 190 );
            strokeShape.lineTo( 40, 40 );
            strokeShape.close();
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Hex', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            
            var strokeShape = Shape.regularPolygon( 6, 100 ).transformed( phet.math.Matrix3.translation( 130, 130 ) );
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        test( 'Overlap', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            
            var strokeShape = new Shape();
            strokeShape.moveTo( 40, 40 );
            strokeShape.lineTo( 200, 200 );
            strokeShape.lineTo( 40, 200 );
            strokeShape.lineTo( 200, 40 );
            strokeShape.lineTo( 100, 0 );
            strokeShape.close();
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
        
        var miterMagnitude = 160;
        var miterAnglesInDegrees = [5, 8, 10, 11.5, 13, 20, 24, 30, 45];
        
        _.each( miterAnglesInDegrees, function( miterAngle ) {
            var miterAngleRadians = miterAngle * Math.PI / 180;
            test( 'Miter limit angle (degrees): ' + miterAngle + ' would change at ' + 1 / Math.sin( miterAngleRadians / 2 ), function() {
                var styles = new Shape.LineStyles();
                styles.lineWidth = 30;
                
                var strokeShape = new Shape();
                var point = new phet.math.Vector2( 40, 100 );
                strokeShape.moveTo( point );
                point = point.plus( phet.math.Vector2.X_UNIT.times( miterMagnitude ) );
                strokeShape.lineTo( point );
                point = point.plus( phet.math.Vector2.createPolar( miterMagnitude, miterAngleRadians ).negated() );
                strokeShape.lineTo( point );
                var fillShape = strokeShape.getStrokedShape( styles );
                
                strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
            } );
        } );
        
        test( 'Overlapping rectangles', function() {
            var styles = new Shape.LineStyles();
            styles.lineWidth = 30;
            
            var strokeShape = new Shape();
            strokeShape.rect( 40, 40, 100, 100 );
            strokeShape.rect( 50, 50, 100, 100 );
            strokeShape.rect( 80, 80, 100, 100 );
            var fillShape = strokeShape.getStrokedShape( styles );
            
            strokeEqualsFill( strokeShape, fillShape, function( node ) { node.setLineStyles( styles ); }, QUnit.config.current.testName );
        } );
    })();
    
    /*---------------------------------------------------------------------------*
    * DOM
    *----------------------------------------------------------------------------*/        
    
    module( 'DOM Layers' );
    
    test( 'DOM Test', function() {
        updateVsFullRender( [
            function( scene ) {
                var node = new phet.scene.Node();
                node.setShape( phet.scene.Shape.rectangle( 0, 0, canvasWidth / 3, canvasHeight / 3 ) );
                node.setFill( '#ff0000' );
                node.setStroke( '#000000' );
                scene.root.addChild( node );
                
                var domNode = new phet.scene.Node();
                domNode.setLayerType( phet.scene.layers.DOMLayer );
                node.addChild( domNode );
            }
        ] );
    } );
    
    /*---------------------------------------------------------------------------*
    * Miscellaneous HTML / JS
    *----------------------------------------------------------------------------*/        
    
    module( 'Miscellaneous' );
    
    test( 'ES5 Object.defineProperty get/set', function() {
        var ob = { _key: 5 };
        Object.defineProperty( ob, 'key', {
            enumerable: true,
            configurable: true,
            get: function() { return this._key; },
            set: function( val ) { this._key = val; }
        } );
        ob.key += 1;
        equal( ob._key, 6, 'incremented object value' );
    } );
    
    /*---------------------------------------------------------------------------*
    * WebGL
    *----------------------------------------------------------------------------*/        
    
    module( 'WebGL tests' );
    
    test( 'Canvas WebGL Context and Features', function() {
        var canvas = document.createElement( 'canvas' );
        var context = phet.webgl.initWebGL( canvas );
        ok( context, 'context' );
    } );
    
    /*---------------------------------------------------------------------------*
    * Canvas V5 (NEW)
    *----------------------------------------------------------------------------*/        
    
    // v5 canvas additions
    module( 'Bleeding Edge Canvas Support' );
    
    test( 'Canvas 2D v5 Features', function() {
        var canvas = document.createElement( 'canvas' );
        var context = phet.canvas.initCanvas( canvas );
        
        var neededMethods = [
            'addHitRegion',
            'ellipse',
            'resetClip',
            'resetTransform'
        ];
        _.each( neededMethods, function( method ) {
            ok( context[method] !== undefined, 'context.' + method );
        } );
    } );
    
    test( 'Path object support', function() {
        var path = new Path();
    } );
       
    test( 'Text width measurement in canvas', function() {
        var canvas = document.createElement( 'canvas' );
        var context = phet.canvas.initCanvas( canvas );
        var metrics = context.measureText('Hello World');
        _.each( [ 'actualBoundingBoxLeft', 'actualBoundingBoxRight', 'actualBoundingBoxAscent', 'actualBoundingBoxDescent' ], function( method ) {
            ok( metrics[method] !== undefined, 'metrics.' + method );
        } );
    } );
    
})();



