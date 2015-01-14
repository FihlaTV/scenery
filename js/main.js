// Copyright 2002-2014, University of Colorado Boulder

/**
 * Module that includes all Scenery dependencies, so that requiring this module will return an object
 * that consists of the entire exported 'scenery' namespace API.
 *
 * The API is actually generated by the 'scenery' module, so if this module (or all other modules) are
 * not included, the 'scenery' namespace may not be complete.
 *
 * @author Jonathan Olson <jonathan.olson@colorado.edu>
 */

define( [
  'SCENERY/scenery',

  'SCENERY/accessibility/AccessibilityLayer',

  'SCENERY/debug/DebugContext',

  'SCENERY/display/BackboneDrawable',
  'SCENERY/display/Block',
  'SCENERY/display/CanvasBlock',
  'SCENERY/display/CanvasSelfDrawable',
  'SCENERY/display/ChangeInterval',
  'SCENERY/display/Display',
  'SCENERY/display/DOMBlock',
  'SCENERY/display/DOMSelfDrawable',
  'SCENERY/display/Drawable',
  'SCENERY/display/FittedBlock',
  'SCENERY/display/GreedyStitcher',
  'SCENERY/display/InlineCanvasCacheDrawable',
  'SCENERY/display/Instance',
  'SCENERY/display/RebuildStitcher',
  'SCENERY/display/RelativeTransform',
  'SCENERY/display/Renderer',
  'SCENERY/display/SelfDrawable',
  'SCENERY/display/SharedCanvasCacheDrawable',
  'SCENERY/display/Stitcher',
  'SCENERY/display/SVGBlock',
  'SCENERY/display/SVGGroup',
  'SCENERY/display/SVGSelfDrawable',
  'SCENERY/display/WebGLBlock',
  'SCENERY/display/WebGLSelfDrawable',

  'SCENERY/display/webgl/ColorTriangleBufferData',
  'SCENERY/display/webgl/ColorTriangleRenderer',
  'SCENERY/display/webgl/SpriteSheet',
  'SCENERY/display/webgl/SquareUnstrokedRectangle',
  'SCENERY/display/webgl/TextureBufferData',
  'SCENERY/display/webgl/TextureRenderer',
  'SCENERY/display/webgl/WebGLRectangle',
  'SCENERY/display/webgl/WebGLRenderer',
  'SCENERY/display/webgl/WebGLUtil',

  'SCENERY/input/BatchedDOMEvent',
  'SCENERY/input/ButtonListener',
  'SCENERY/input/DownUpListener',
  'SCENERY/input/Event',
  'SCENERY/input/Input',
  'SCENERY/input/Mouse',
  'SCENERY/input/Pen',
  'SCENERY/input/Pointer',
  'SCENERY/input/SimpleDragHandler',
  'SCENERY/input/Touch',

  'SCENERY/nodes/CanvasNode',
  'SCENERY/nodes/Circle',
  'SCENERY/nodes/DOM',
  'SCENERY/nodes/HBox',
  'SCENERY/nodes/HTMLText',
  'SCENERY/nodes/Image',
  'SCENERY/nodes/LayoutNode',
  'SCENERY/nodes/Line',
  'SCENERY/nodes/Node',
  'SCENERY/nodes/Paintable',
  'SCENERY/nodes/Path',
  'SCENERY/nodes/Plane',
  'SCENERY/nodes/Rectangle',
  'SCENERY/nodes/Text',
  'SCENERY/nodes/VBox',
  'SCENERY/nodes/WebGLNode',

  'SCENERY/overlays/CanvasNodeBoundsOverlay',
  'SCENERY/overlays/PointerAreaOverlay',
  'SCENERY/overlays/PointerOverlay',

  'SCENERY/util/AccessibilityPeer',
  'SCENERY/util/CanvasContextWrapper',
  'SCENERY/util/Color',
  'SCENERY/util/Features',
  'SCENERY/util/Font',
  'SCENERY/util/Gradient',
  'SCENERY/util/LinearGradient',
  'SCENERY/util/LiveRegion',
  'SCENERY/util/Pattern',
  'SCENERY/util/RadialGradient',
  'SCENERY/util/RendererSummary',
  'SCENERY/util/SceneImage',
  'SCENERY/util/SceneryStyle',
  'SCENERY/util/ShaderProgram',
  'SCENERY/util/Trail',
  'SCENERY/util/TrailPointer',
  'SCENERY/util/Util'
], function( scenery ) {
  'use strict';

  // note: we don't need any of the other parts, we just need to specify them as dependencies so they fill in the scenery namespace
  return scenery;
} );
