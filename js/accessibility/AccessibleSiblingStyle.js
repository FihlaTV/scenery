// Copyright 2019, University of Colorado Boulder

/**
 * Static CSS style for elements of the PDOM (siblings of AccessiblePeer). Adds the styling directly to SceneryStyle,
 * but also exports the class names for root and siblings for where elements are created or retrieved
 * by document.getElementsByClassName().
 *
 * @author Jesse Greenberg
 */

define( require => {
  'use strict';

  // modules
  const SceneryStyle = require( 'SCENERY/util/SceneryStyle' );
  const scenery = require( 'SCENERY/scenery' );

  // constants
  const SIBLING_CLASS_NAME = 'a11y-sibling';
  const ROOT_CLASS_NAME = 'a11y-root';

  // All elements that use AccessibilityUtil.createElement should have this style. The only exception is the root of
  // the PDOM, which should use Additional notes about attributes
  // that should not be used:
  //  padding: 0px; - might assist with correct viewport bounds, but prevents <input> from having defined width
  SceneryStyle.addRule( '.' + SIBLING_CLASS_NAME +
    '{' +
      // fixed to the 'relative' styled root element, to be transformed with left/top
      'position: fixed;' +

      // ABSOLUTELY CRITICAL - so PDOM elements do not interfere with rest of scenery input
      'pointer-events: none;' +

      // default, to the 'relative' root PDOM element - will change with node transform if focusable
      'top: 0px;' +
      'left: 0px;' +

      // for CSS transformations of focusable elements, origin at left top
      'transform-origin: left top 0px;' +

      // helps get accurate bounds with getBoundingClientRect() for transformations
      'border-width: 0px;' +
      'margin: 0px;' +
      'white-space: nowrap;' +

      // to remove the default focus highlight around HTML elements
      'outline: none;' +
      'box-shadow:none;' +
      'border-color:transparent;' +

      // // So that elements can never be seen visually, can comment this out to "see" transformed elements in the
      // // PDOM. Text and Backgrounds of elements are made transparent where possible. Text is made very small so that
      // // it doesn't extend into the display. Very low opacity on the root takes care of the rest.
      // 'font-size: 1px;' + // must be at least 1px to be readable with AT
      // 'color: transparent;' +
      // 'background-color: transparent;' +

      // color: white // helpful for seeing text over a black background, just for debugging!
      'z-index: 5000;' + // on top of other display Blocks, just for debugging!
    '}'
  );

  SceneryStyle.addRule( '.' + ROOT_CLASS_NAME +
    '{' +
      // root has 'relative' style so that descendants can be positioned 'fixed' relative to this root
      'position: relative;' +

      // a catch all for things that are not hidden by the styling on descendants of the root (for example
      // there is no other way to hide or style check boxes with CSS)
      // 'opacity: 0.0001;' +
    '}'
  );

  const AccessibleSiblingStyle = {
    SIBLING_CLASS_NAME: SIBLING_CLASS_NAME,
    ROOT_CLASS_NAME: ROOT_CLASS_NAME
  };

  return scenery.register( 'AccessibleSiblingStyle', AccessibleSiblingStyle );
} );
