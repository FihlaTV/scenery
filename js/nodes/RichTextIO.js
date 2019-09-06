// Copyright 2017-2019, University of Colorado Boulder

/**
 * IO type for RichText
 *
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  const ObjectIO = require( 'TANDEM/types/ObjectIO' );
  var NodeIO = require( 'SCENERY/nodes/NodeIO' );
  var NodeProperty = require( 'SCENERY/util/NodeProperty' );
  var PropertyIO = require( 'AXON/PropertyIO' );
  var scenery = require( 'SCENERY/scenery' );
  var StringIO = require( 'TANDEM/types/StringIO' );

  class RichTextIO extends NodeIO {
    /**
     * @param {RichText} richText
     * @param {string} phetioID
     */
    constructor( richText, phetioID ) {
      super( richText, phetioID );

      // this uses a sub Property adapter as described in https://github.com/phetsims/phet-io/issues/1326
      var textProperty = new NodeProperty( richText, 'text', 'text', _.extend( {

        // pick the following values from the parent Node
        phetioReadOnly: richText.phetioReadOnly,
        phetioState: richText.phetioState,
        phetioType: PropertyIO( StringIO ),

        tandem: richText.tandem.createTandem( 'textProperty' ),
        phetioDocumentation: 'Property for the displayed text'
      }, richText.phetioComponentOptions, richText.phetioComponentOptions.textProperty ) );

      // @private
      this.disposeRichTextIO = function() {
        textProperty.dispose();
      };
    }

    /**
     * @public - called by PhetioObject when the wrapper is done
     */
    dispose() {
      this.disposeRichTextIO();
      NodeIO.prototype.dispose.call( this );
    }
  }

  RichTextIO.documentation = 'The tandem IO type for the scenery RichText node';
  RichTextIO.validator = { valueType: scenery.RichText };
  RichTextIO.typeName = 'RichTextIO';
  ObjectIO.validateSubtype( RichTextIO );

  return scenery.register( 'RichTextIO', RichTextIO );
} );