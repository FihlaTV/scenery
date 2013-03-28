// Copyright 2002-2012, University of Colorado

/**
 * Module that includes all Scenery dependencies, so that requiring this module will return an object
 * that consists of the entire exported 'scenery' namespace API.
 *
 * The API is actually generated by the 'scenery' module, so if this module (or all other modules) are
 * not included, the 'scenery' namespace may not be complete.
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( [
    'SCENERY/scenery',
    'SCENERY/debug/DebugContext',
    
    'SCENERY/input/Event',
    'SCENERY/input/Input',
    'SCENERY/input/Key',
    'SCENERY/input/Mouse',
    'SCENERY/input/Pen',
    'SCENERY/input/Pointer',
    'SCENERY/input/SimpleDragHandler',
    'SCENERY/input/Touch',
    
    'SCENERY/layers/CanvasLayer',
    'SCENERY/layers/DOMLayer',
    'SCENERY/layers/Layer',
    'SCENERY/layers/LayerBoundary',
    'SCENERY/layers/LayerBuilder',
    'SCENERY/layers/LayerStrategy',
    'SCENERY/layers/LayerType',
    'SCENERY/layers/Renderer',
    'SCENERY/layers/SVGLayer',
    
    'SCENERY/nodes/Circle',
    'SCENERY/nodes/DOM',
    'SCENERY/nodes/Fillable',
    'SCENERY/nodes/HBox',
    'SCENERY/nodes/Image',
    'SCENERY/nodes/Node',
    'SCENERY/nodes/Path',
    'SCENERY/nodes/Rectangle',
    'SCENERY/nodes/Strokable',
    'SCENERY/nodes/Text',
    'SCENERY/nodes/VBox',
    
    'SCENERY/util/Color',
    'SCENERY/util/Font',
    'SCENERY/util/LinearGradient',
    'SCENERY/util/Pattern',
    'SCENERY/util/RadialGradient',
    'SCENERY/util/RenderState',
    'SCENERY/util/SceneImage',
    'SCENERY/util/Trail',
    'SCENERY/util/TrailInterval',
    'SCENERY/util/TrailPointer',
    'SCENERY/util/Util',
    
    'SCENERY/Scene'
  ], function(
    scenery // note: we don't need any of the other parts, we just need to specify them as dependencies so they fill in the scenery namespace
  ) {
  
  return scenery;
} );
