// Copyright 2002-2012, University of Colorado

/**
 * DOM nodes. Currently lightweight handling
 *
 * @author Jonathan Olson <olsonsjc@gmail.com>
 */

define( function( require ) {
  "use strict";
  
  var assert = require( 'ASSERT/assert' )( 'scenery' );
  
  var Bounds2 = require( 'DOT/Bounds2' );
  
  var scenery = require( 'SCENERY/scenery' );
  
  var Node = require( 'SCENERY/nodes/Node' ); // DOM inherits from Node
  var Renderer = require( 'SCENERY/layers/Renderer' );
  var objectCreate = require( 'SCENERY/util/Util' ).objectCreate;
  
  scenery.DOM = function( element, options ) {
    options = options || {};
    
    this._interactive = false;
    
    // unwrap from jQuery if that is passed in, for consistency
    if ( element && element.jquery ) {
      element = element[0];
    }
    
    this._container = document.createElement( 'div' );
    this._$container = $( this._container );
    this._$container.css( 'position', 'absolute' );
    this._$container.css( 'left', 0 );
    this._$container.css( 'top', 0 );
    
    this.attachedToDOM = false;
    this.invalidateDOMLock = false;
    
    // so that the mutator will call setElement()
    options.element = element;
    
    // will set the element after initializing
    Node.call( this, options );
  };
  var DOM = scenery.DOM;
  
  DOM.prototype = objectCreate( Node.prototype );
  DOM.prototype.constructor = DOM;
  
  DOM.prototype.invalidatePaint = function( bounds ) {
    Node.prototype.invalidatePaint.call( this, bounds );
  };
  
  // needs to be attached to the DOM tree for this to work
  DOM.prototype.calculateDOMBounds = function() {
    var boundingRect = this._element.getBoundingClientRect();
    return new Bounds2( 0, 0, boundingRect.width, boundingRect.height );
  };
  
  DOM.prototype.createTemporaryContainer = function() {
    var temporaryContainer = document.createElement( 'div' );
    $( temporaryContainer ).css( {
      display: 'hidden',
      padding: '0 !important',
      margin: '0 !important',
      position: 'absolute',
      left: 0,
      top: 0,
      width: 65535,
      height: 65535
    } );
    return temporaryContainer;
  };
  
  DOM.prototype.invalidateDOM = function() {
    // prevent this from being executed as a side-effect from inside one of its own calls
    if ( this.invalidateDOMLock ) {
      return;
    }
    this.invalidateDOMLock = true;
    
    // we will place ourselves in a temporary container to get our real desired bounds
    var temporaryContainer = this.createTemporaryContainer();
    
    // move to the temporary container
    this._container.removeChild( this._element );
    temporaryContainer.appendChild( this._element );
    document.body.appendChild( temporaryContainer );
    
    // bounds computation and resize our container to fit precisely
    var selfBounds = this.calculateDOMBounds();
    this.invalidateSelf( selfBounds );
    this._$container.width( selfBounds.getWidth() );
    this._$container.height( selfBounds.getHeight() );
    
    // move back to the main container
    document.body.removeChild( temporaryContainer );
    temporaryContainer.removeChild( this._element );
    this._container.appendChild( this._element );
    
    this.invalidateDOMLock = false;
  };
  
  DOM.prototype.addToDOMLayer = function( domLayer ) {
    this.attachedToDOM = true;
    
    // TODO: find better way to handle non-jquery and jquery-wrapped getters for the container. direct access for now ()
    domLayer.$div.append( this._container );
    
    // recompute the bounds
    this.invalidateDOM();
  };
  
  DOM.prototype.removeFromDOMLayer = function( domLayer ) {
    domLayer.$div.remove( this._container );
    this.attachedToDOM = false;
  };
  
  DOM.prototype.updateCSSTransform = function( transform ) {
    this._$container.css( transform.getMatrix().getCSSTransformStyles() );
  };
  
  DOM.prototype.hasSelf = function() {
    return true;
  };
  
  DOM.prototype.setElement = function( element ) {
    if ( this._element !== element ) {
      if ( this._element ) {
        this._container.removeChild( this._element );
      }
      
      this._element = element;
      this._$element = $( element );
      
      this._container.appendChild( this._element );
      
      // TODO: bounds issue, since this will probably set to empty bounds and thus a repaint may not draw over it
      this.invalidateDOM();  
    }

    return this; // allow chaining
  };
  
  DOM.prototype.getElement = function() {
    return this._element;
  };
  
  DOM.prototype.setInteractive = function( interactive ) {
    if ( this._interactive !== interactive ) {
      this._interactive = interactive;
      
      // TODO: anything needed here?
    }
  };
  
  DOM.prototype.isInteractive = function() {
    return this._interactive;
  };
  
  DOM.prototype._mutatorKeys = [ 'element', 'interactive' ].concat( Node.prototype._mutatorKeys );
  
  DOM.prototype._supportedRenderers = [ Renderer.DOM ];
  
  Object.defineProperty( DOM.prototype, 'element', { set: DOM.prototype.setElement, get: DOM.prototype.getElement } );
  Object.defineProperty( DOM.prototype, 'interactive', { set: DOM.prototype.setInteractive, get: DOM.prototype.isInteractive } );
  
  return DOM;
} );


