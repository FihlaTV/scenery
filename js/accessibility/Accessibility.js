// Copyright 2017, University of Colorado Boulder

/**
 * A trait that is meant to be composed with Node, adding accessibility by defining content for the Parallel DOM.
 *
 * The parallel DOM is an HTML structure that provides semantics for assistive technologies. For web content to be
 * accessible, assistive technologies require HTML markup, which is something that pure graphical content does not
 * include. This trait adds the accessible HTML content for any Node in the scene graph.
 *
 * Any Node can have accessible content, but they have to opt into it. The structure of the accessible content will
 * match the structure of the scene graph.
 *
 * Say we have the following scene graph:
 *
 *   A
 *  / \
 * B   C
 *    / \
 *   D   E
 *        \
 *         F
 *
 * And say that nodes A, B, C, D, and F specify accessible content for the DOM.  Scenery will render the accessible
 * content like so:
 *
 * <div id="node-A">
 *   <div id="node-B"></div>
 *   <div id="node-C">
 *     <div id="node-D"></div>
 *     <div id="node-F"></div>
 *   </div>
 * </div>
 *
 * In this example, each element is represented by a div, but any HTML element could be used. Note that in this example,
 * node E did not specify accessible content, so node F was added as a child under node C.  If node E had specified
 * accessible content, content for node F would have been added as a child under the content for node E.
 *
 * --------------------------------------------------------------------------------------------------------------------
 * #BASIC EXAMPLE
 *
 * In a basic example let's say that we want to make a Node an unordered list. To do this, add the `tagName` option to
 * the Node, and assign it to the string "ul". Here is what the code could look like:
 *
 * var myUnorderedList = new Node( { tagName: 'ul' } );
 *
 * To get the desired list html, we can assign the `li` `tagName` to children Nodes, like:
 *
 * var listItem1 = new Node( { tagName: 'li' } );
 * myUnorderedList.addChild( listItem1 );
 *
 * Now we have a single list element in the unordered list. To assign content to this <li>, use the `innerContent`
 * option (all of these Node options have getters and setters, just like any other Node option):
 *
 * listItem1.innerContent = 'I am list item number 1';
 *
 * The above operations will create the following PDOM structure (note that actual ids will be different):
 *
 * <ul id='myUnorderedList'>
 *   <li>I am a list item number 1</li>
 * </ul
 *
 * --------------------------------------------------------------------------------------------------------------------
 * #DOM SIBLINGS
 *
 * The api in this trait allows you to add additional structure to the accessible DOM content if necessary. Each node
 * can have multiple DOM Elements associated with it. A Node can have a label DOM element, and a description DOM element.
 * These are called siblings. The Node's direct DOM element (the DOM element you create with the `tagName` option)
 * is called the "primary sibling." You can also have a container parent DOM element that surrounds all of these
 * siblings. With three siblings and a container parent, each Node can have up to 4 DOM Elements representing it in the
 * PDOM. Here is an example of how a Node may use these features:
 *
 * <div>
 *   <label for="myInput">This great label for input</label
 *   <input id="myInput"/>
 *   <p>This is a description for the input</p>
 * </div>
 *
 * Although you can create this structure with four nodes (`input` A, `label B, and `p` C children to `div` D),
 * this structure can be created with one single Node. It is often preferable to do this to limit the number of new
 * Nodes that have to be created just for accessibility purposes. To accomplish this we have the following Node code.
 *
 * new Node( {
 *  tagName: 'input'
 *  labelTagName: 'label',
 *  labelContent: 'This great label for input'
 *  descriptionTagName: 'p',
 *  descriptionContent: 'This is a description for the input',
 *  containerTagName: 'div'
 * });
 *
 * A few notes:
 * 1. Notice the names of the content setters for siblings parallel the `innerContent` option for setting the primary
 *    sibling.
 * 2. To make this example actually work, you would need the `inputType` option to set the "type" attribute on the `input`.
 * 3. When you specify the  <label> tag for the label sibling, the "for" attribute is automatically added to the sibling.
 * 4. Finally, the example above doesn't utilize the default tags that we have in place for the parent and siblings.
 *      default labelTagName: 'p'
 *      default descriptionTagName: 'p'
 *      default containerTagName: 'div'
 *    so the following will yield the same PDOM structure:
 *
 *    new Node( {
 *     tagName: 'input',
 *     labelTagName: 'label',
 *     labelContent: 'This great label for input'
 *     descriptionContent: 'This is a description for the input',
 *    });
 *
 * The Accessibility trait is smart enough to know when there needs to be a container parent to wrap multiple siblings,
 * it is not necessary to use that option unless the desired tag name is  something other than 'div'.
 *
 * --------------------------------------------------------------------------------------------------------------------
 *
 * For additional accessibility options, please see the options listed in ACCESSIBILITY_OPTION_KEYS. To understand the
 * PDOM more, see AccessiblePeer, which manages the DOM Elements for a node. For more documentation on Scenery, Nodes,
 * and the scene graph, please see http://phetsims.github.io/scenery/
 *
 * @author Jesse Greenberg (PhET Interactive Simulations)
 * @author Sam Reid (PhET Interactive Simulations)
 * @author Michael Kauzmann (PhET Interactive Simulations)
 */
define( function( require ) {
  'use strict';

  // modules
  var AccessibilityTree = require( 'SCENERY/accessibility/AccessibilityTree' );
  var AccessibilityUtil = require( 'SCENERY/accessibility/AccessibilityUtil' );
  var AccessibleDisplaysInfo = require( 'SCENERY/accessibility/AccessibleDisplaysInfo' );
  var arrayDifference = require( 'PHET_CORE/arrayDifference' );
  var Emitter = require( 'AXON/Emitter' );
  var extend = require( 'PHET_CORE/extend' );
  var invalidateAccessibleContent = require( 'SCENERY/accessibility/invalidateAccessibleContent' );
  var scenery = require( 'SCENERY/scenery' );

  var INPUT_TAG = AccessibilityUtil.TAGS.INPUT;
  var P_TAG = AccessibilityUtil.TAGS.P;

  // default tag names for siblings
  var DEFAULT_DESCRIPTION_TAG_NAME = P_TAG;
  var DEFAULT_LABEL_TAG_NAME = P_TAG;

  // these elements are typically associated with forms, and support certain attributes
  var FORM_ELEMENTS = AccessibilityUtil.FORM_ELEMENTS;

  // The options for the Accessibility API. In general, most default to null; to clear, set back to null.
  var ACCESSIBILITY_OPTION_KEYS = [
    'tagName', // Sets the tag name for the primary sibling DOM element in the parallel DOM, should be first

    /*
     * Higher Level API Functions
     */

    'accessibleName',
    'helpText',

    /*
     * Lower Level API Functions
     */

    'containerTagName', // Sets the tag name for an [optional] element that contains this Node's siblings, see setContainerTagName()
    'containerAriaRole', // Sets the ARIA role for the container parent DOM element, see setContainerAriaRole()

    'innerContent', // Sets the inner text or HTML for a node's primary sibling element, see setInnerContent()
    'inputType', // Sets the input type for the primary sibling DOM element, only relevant if tagName is 'input'
    'inputValue', // Sets the input value for the primary sibling DOM element, only relevant if tagName is 'input'
    'accessibleChecked', // Sets the 'checked' state for inputs of type 'radio' and 'checkbox', see setAccessibleChecked()
    'accessibleNamespace', // Sets the namespace for the primary element, see setAccessibleNamespace()
    'ariaLabel', // Sets the value of the 'aria-label' attribute on the primary sibling of this Node, see setAriaLabel()
    'ariaRole', // Sets the ARIA role for the primary sibling of this Node, see setAriaRole()

    'labelTagName', // Sets the tag name for the DOM element sibling labelling this node, see setLabelTagName()
    'labelContent', // Sets the label content for the node, see setLabelContent()
    'appendLabel', // Sets the label sibling to come after the primary sibling in the PDOM, see setAppendLabel()

    'descriptionTagName', // Sets the tag name for the DOM element sibling describing this node, see setDescriptionTagName()
    'descriptionContent', // Sets the description content for the node, see setDescriptionContent()
    'appendDescription', // Sets the description sibling to come after the primary sibling in the PDOM, see setAppendDescription()

    'focusHighlight', // Sets the focus highlight for the node, see setFocusHighlight()
    'focusHighlightLayerable', // Flag to determine if the focus highlight node can be layered in the scene graph, see setFocusHighlightLayerable()
    'groupFocusHighlight', // Sets the outer focus highlight for this node when a descendant has focus, see setGroupFocusHighlight()
    'accessibleVisible', // Sets whether or not the node's DOM element is visible in the parallel DOM, see setAccessibleVisible()
    'accessibleContentDisplayed', // Sets whether or not the accessible content of the node (and its subtree) is displayed, see setAccessibleContentDisplayed()
    'focusable', // Sets whether or not the node can receive keyboard focus, see setFocusable()
    'accessibleOrder', // Modifies the order of accessible  navigation, see setAccessibleOrder()
    'accessibleContent', // Sets up accessibility handling (probably don't need to use this), see setAccessibleContent()

    'ariaLabelledbyAssociations', // sets the list of aria-labelledby associations between from this node to others (including itself), see setAriaLabelledbyAssociations
    'ariaDescribedbyAssociations' // sets the list of aria-describedby associations between from this node to others (including itself), see setAriaDescribedbyAssociations
  ];

  var Accessibility = {

    /**
     * Given the constructor for Node, add accessibility functions into the prototype.
     *
     * @param {function} type - the constructor for Node
     */
    compose: function( type ) {
      // Can't avoid circular dependency, so no assertion here. Ensure that 'type' is the constructor for Node.
      var proto = type.prototype;

      /**
       * These properties and methods are put directly on the prototype of Node.
       */
      extend( proto, {

        /**
         * {Array.<string>} - String keys for all of the allowed options that will be set by node.mutate( options ), in
         * the order they will be evaluated.  Beware that order matters for accessibility options, changing the order
         * of ACCESSIBILITY_OPTION_KEYS could break the trait.
         * @protected
         *
         * NOTE: See Node's _mutatorKeys documentation for more information on how this operates, and potential special
         *       cases that may apply.
         */
        _mutatorKeys: ACCESSIBILITY_OPTION_KEYS.concat( proto._mutatorKeys ),

        /**
         * This should be called in the constructor to initialize the accessibility-specific parts of Node.
         * @protected
         */
        initializeAccessibility: function() {

          // @private {string|null} - the HTML tag name of the element representing this node in the DOM
          this._tagName = null;

          // @private {string|null} - the HTML tag name for a container parent element for this node in the DOM. This
          // container parent will contain the node's DOM element, as well as peer elements for any label or description
          // content. See setContainerTagName() for more documentation. If this option is needed (like to
          // contain multiple siblings with the primary sibling), it will default to the value of DEFAULT_CONTAINER_TAG_NAME.
          this._containerTagName = null;

          // @private {string|null} - the HTML tag name for the label element that will contain the label content for
          // this dom element. There are ways in which you can have a label without specifying a label tag name,
          // see setLabelContent() for the list of ways.
          this._labelTagName = null;

          // @private {string|null} - the HTML tag name for the description element that will contain descsription content
          // for this dom element. If a description is set before a tag name is defined, a paragraph element
          // will be created for the description.
          this._descriptionTagName = null;

          // @private {string|null} - the type for an element with tag name of INPUT.  This should only be used
          // if the element has a tag name INPUT.
          this._inputType = null;

          // @private {string|number|null} - the value of the input, only relevant if the tag name is of type "INPUT". Is a
          // string because the `value` attribute is a DOMString. null value indicates no value.
          this._inputValue = null;

          // @private {boolean} - whether or not the accessible input is considered 'checked', only useful for inputs of
          // type 'radio' and 'checkbox'
          this._accessibleChecked = false;

          // @private {boolean} - By default the label will be prepended before the primary sibling in the PDOM. This
          // option allows you to instead have the label added after the primary sibling. Note: The label will always
          // be in front of the description sibling. If this flag is set with `appendDescription: true`, the order will be
          // (1) primary sibling, (2) label sibling, (3) description sibling. All siblings will be placed within the
          // containerParent.
          this._appendLabel = false;

          // @private {boolean} - By default the description will be prepended before the primary sibling in the PDOM. This
          // option allows you to instead have the description added after the primary sibling. Note: The description
          // will always be after the label sibling. If this flag is set with `appendLabel: true`, the order will be
          // (1) primary sibling, (2) label sibling, (3) description sibling. All siblings will be placed within the
          // containerParent.
          this._appendDescription = false;

          // @private {Array.<Object> - array of attributes that are on the node's DOM element.  Objects will have the
          // form { attribute:{string}, value:{*}, namespace:{string|null} }
          this._accessibleAttributes = [];

          // @private {string|null} - the label content for this node's DOM element.  There are multiple ways that a label
          // can be associated with a node's dom element, see setLabelContent() for more documentation
          this._labelContent = null;

          // @private {string|null} - the inner label content for this node's primary sibling. Set as inner HTML
          // or text content of the actual DOM element. If this is used, the node should not have children.
          this._innerContent = null;

          // @private {string|null} - the description content for this node's DOM element.
          this._descriptionContent = null;

          // @private {string|null} - If provided, it will create the primary DOM element with the specified namespace.
          // This may be needed, for example, with MathML/SVG/etc.
          this._accessibleNamespace = null;

          // @private {string|null} - if provided, "aria-label" will be added as an inline attribute on the node's DOM
          // element and set to this value. This will determine how the Accessible Name is provided for the DOM element.
          this._ariaLabel = null;

          // @private {string|null} - the ARIA role for this node's DOM element, added as an HTML attribute.  For a complete
          // list of ARIA roles, see https://www.w3.org/TR/wai-aria/roles.  Beware that many roles are not supported
          // by browsers or assistive technologies, so use vanilla HTML for accessibility semantics where possible.
          this._ariaRole = null;

          // @private {string|null} - the ARIA role for the container parent element, added as an HTML attribute. For a
          // complete list of ARIA roles, see https://www.w3.org/TR/wai-aria/roles. Beware that many roles are not
          // supported by browsers or assistive technologies, so use vanilla HTML for accessibility semantics where
          // possible.
          this._containerAriaRole = null;

          // @private {Array.<Object>} - Keep track of what this Node is aria-labelledby via "associationObjects"
          // see addAriaLabelledbyAssociation for why we support more than one association.
          this._ariaLabelledbyAssociations = [];

          // Keep a reference to all nodes that are aria-labelledby this node, i.e. that have store one of this Node's
          // peer HTMLElement's id in their peer HTMLElement's aria-labelledby attribute. This way we can tell other
          // nodes to update their aria-labelledby associations when this Node rebuilds its accessible content.
          // @public (scenery-internal) - only used by Accessibility.js and invalidateAccessibleContent.js
          // {Array.<Node>}
          this._nodesThatAreAriaLabelledbyThisNode = [];

          // @private {Array.<Object>} - Keep track of what this Node is aria-descripbedby via "associationObjects"
          // see addAriaDescribedbyAssociation for why we support more than one association.
          this._ariaDescribedbyAssociations = [];

          // Keep a reference to all nodes that are aria-describedby this node, i.e. that have store one of this Node's
          // peer HTMLElement's id in their peer HTMLElement's aria-describedby attribute. This way we can tell other
          // nodes to update their aria-describedby associations when this Node rebuilds its accessible content.
          // @public (scenery-internal) - only used by Accessibility.js and invalidateAccessibleContent.js
          // {Array.<Node>}
          this._nodesThatAreAriaDescribedbyThisNode = [];

          // @private {?boolean} - whether or not this node's DOM element has been explicitly set to receive focus from
          // tab navigation. Sets the tabIndex attribute on the node's DOM element. Setting to false will not remove the
          // node's DOM from the document, but will ensure that it cannot receive focus by pressing 'tab'.  Several
          // HTMLElements (such as HTML form elements) can be focusable by default, without setting this property. The
          // native HTML function from these form elements can be overridden with this property.
          this._focusableOverride = null;

          // @private {Shape|Node|string.<'invisible'>|null} - the focus highlight that will surround this node when it
          // is focused.  By default, the focus highlight will be a pink rectangle that surrounds the Node's local
          // bounds.
          this._focusHighlight = null;

          // @private {boolean} - A flag that allows prevents focus highlight from being displayed in the FocusOverlay.
          // If true, the focus highlight for this node will be layerable in the scene graph.  Client is responsible
          // for placement of the focus highlight in the scene graph.
          this._focusHighlightLayerable = false;

          // @private {boolean|Node} - Adds a group focus highlight that surrounds this node when a descendant has
          // focus. Typically useful to indicate focus if focus enters a group of elements. If 'true', group
          // highlight will go around local bounds of this node. Otherwise the custom node will be used as the highlight/
          this._groupFocusHighlight = false;

          // @private {boolean} - Whether or not the accessible content will be visible from the browser and assistive
          // technologies.  When accessibleVisible is false, the node's DOM element will not be focusable, and it cannot
          // be found by the assistive technology virtual cursor. For more information on how assistive technologies
          // read with the virtual cursor see
          // http://www.ssbbartgroup.com/blog/how-windows-screen-readers-work-on-the-web/
          this._accessibleVisible = true;

          // @private {boolean} - Whether or not the accessible content will be visible from the browser and assistive
          // technologies.  When accessible content is not displayed, the node will not be focusable, and it cannot
          // be found by assistive technology with the virtual cursor.  Content should almost always be set invisible with
          // setAccessibleVisible(), see that function and setAccessibleContentDisplayed() for more information.
          this._accessibleContentDisplayed = true;

          // @private {Array.<Function>} - For accessibility input handling {keyboard/click/HTML form}
          this._accessibleInputListeners = [];

          // @public - emits when focus changes. This will trigger with the 'focus' event and the 'blur' event.
          // Listener receives 1 parameter, {boolean} - isFocused. see Display.focus
          this.focusChangedEmitter = new Emitter();

          // @private {Array.<Node|null>|null} - (a11y) If provided, it will override the focus order between children
          // (and optionally aribitrary subtrees). If not provided, the focus order will default to the rendering order
          // (first children first, last children last) determined by the children array.
          // See setAccessibleOrder() for more documentation.
          this._accessibleOrder = null;

          // @public (scenery-internal) {Node|null} - (a11y) If this node is specified in another node's
          // accessibleOrder, then this will have the value of that other (accessible parent) node. Otherwise it's null.
          this._accessibleParent = null;

          // @public (scenery-internal) {AccessibleDisplaysInfo} - Contains information about what accessible displays
          // this node is "visible" for, see AccessibleDisplaysInfo.js for more information.
          this._accessibleDisplaysInfo = new AccessibleDisplaysInfo( this );

          // @private {Object|null} - If non-null, this node will be represented in the parallel DOM by the accessible content.
          // The accessibleContent object will be of the form:
          // {
          //   createPeer: function( {AccessibleInstance} ): {AccessiblePeer},
          //   [focusHighlight]: {Bounds2|Shape|Node|string.<'invisible'>}
          // }
          // The focus highlight can be a custom Shape, Node, contain the Node's local bounds, or be invisible.
          this._accessibleContent = null;

          // @protected {Array.<AccessibleInstance>} - Empty unless the node contains some accessible instance.
          this._accessibleInstances = [];

          // HIGHER LEVEL API INITIALIZATION\

          // {string|null} - sets the "Accessible Name" of the Node, as defined by the Browser's Accessibility Tree
          this._accessibleName = null;

          // {string|null} - sets the help text of the Node, this most often corresponds to description text.
          this._helpText = null;
        },


        /***********************************************************************************************************/
        // PUBLIC METHODS
        /***********************************************************************************************************/

        /**
         * Adds an accessible input listener. The listener's keys should be DOM event names, and the values should be
         * functions to be called when that event is fired on the DOM element.
         * @public
         *
         * @param {Object} accessibleInput
         * @returns {Object} - the listener, so it can be easily removed via removeAccessibleInputListener
         */
        addAccessibleInputListener: function( accessibleInput ) {
          var listenerAlreadyAdded = ( _.indexOf( this._accessibleInputListeners, accessibleInput ) > 0 );
          assert && assert( !listenerAlreadyAdded, 'accessibleInput listener already added' );

          this._accessibleInputListeners.push( accessibleInput );

          // add the listener directly to any AccessiblePeers that are representing this node
          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.addDOMEventListeners( accessibleInput );
          }

          return accessibleInput;
        },

        /**
         * Removes an input listener that was previously added with addAccessibleInputListener.
         * @public
         *
         * @param {Object} accessibleInput - to be removed
         * @returns {Node} - Returns 'this' reference, for chaining
         */
        removeAccessibleInputListener: function( accessibleInput ) {

          // ensure the listener is in our list, or will be added in invalidation
          var addedIndex = _.indexOf( this._accessibleInputListeners, accessibleInput );
          assert && assert( addedIndex > -1, 'accessibleInput listener was not added' );

          this._accessibleInputListeners.splice( addedIndex, 1 );

          // remove the event listeners from any peers
          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.removeDOMEventListeners( accessibleInput );
          }

          return this;
        },

        /**
         * Returns whether this listener is currently listening to accessible input on this node. More efficient
         * than directly checking getAccessibleInputListeners, as that includes a defensive copy.
         * @public
         *
         * @param {Object} listener
         * @return {boolean}
         */
        hasAccessibleInputListener: function( listener ) {
          for ( var i = 0; i < this._accessibleInputListeners.length; i++ ) {
            if ( this._accessibleInputListeners[ i ] === listener ) {
              return true;
            }
          }
          return false;
        },

        /**
         * Returns a copy of all input listeners related to accessibility.
         * @public
         *
         * @returns {Array.<Object>}
         */
        getAccessibleInputListeners: function() {
          return this._accessibleInputListeners.slice( 0 ); // defensive copy
        },
        get accessibleInputListeners() { return this.getAccessibleInputListeners(); },

        /**
         * Remove all listeners on the node observing accessible input.
         * @public
         */
        removeAllAccessibleInputListeners: function() {
          while ( this._accessibleInputListeners.length > 0 ) {
            this.removeAccessibleInputListener( this._accessibleInputListeners[ 0 ] );
          }
        },

        /**
         * Interrupt all accessibility related input listeners that are attached to this Node.
         * @public
         *
         * @returns {Node} - For chaining
         */
        interruptAccessibleInput: function() {
          var listenersCopy = this.accessibleInputListeners;

          for ( var i = 0; i < listenersCopy.length; i++ ) {
            var listener = listenersCopy[ i ];

            listener.interrupt && listener.interrupt();
          }

          return this;
        },

        /**
         * Dispose accessibility by removing all listeners on this node for accessible input. Accessibility is disposed
         * by calling Node.dispose(), so this function is scenery-internal.
         * @public (scenery-internal)
         */
        disposeAccessibility: function() {
          // To prevent memory leaks, we want to clear our order (since otherwise nodes in our order will reference
          // this node).
          this.accessibleOrder = null;

          // Clear out aria association attributes, which hold references to other nodes.
          this.setAriaLabelledbyAssociations( [] );
          this.setAriaDescribedbyAssociations( [] );

          this.removeAllAccessibleInputListeners();
        },

        /**
         * Get whether this node's primary DOM element currently has focus.
         * @public
         *
         * @returns {boolean}
         */
        isFocused: function() {
          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            if ( peer.isFocused() ) {
              return true;
            }
          }
          return false;
        },
        get focused() { return this.isFocused(); },

        /**
         * Focus this node's primary dom element. The element must not be hidden, and it must be focusable. If the node
         * has more than one instance, this will fail because the DOM element is not uniquely defined. If accessibility
         * is not enabled, this will be a no op. When Accessibility is more widely used, the no op can be replaced
         * with an assertion that checks for accessible content.
         *
         * @public
         */
        focus: function() {
          if ( this._accessibleInstances.length > 0 ) {

            // when accessibility is widely used, this assertion can be added back in
            // assert && assert( this._accessibleInstances.length > 0, 'there must be accessible content for the node to receive focus' );
            assert && assert( this.focusable, 'trying to set focus on a node that is not focusable' );
            assert && assert( this._accessibleVisible, 'trying to set focus on a node with invisible accessible content' );
            assert && assert( this._accessibleInstances.length === 1, 'focus() unsupported for Nodes using DAG, accessible content is not unique' );

            var peer = this._accessibleInstances[ 0 ].peer;
            assert && assert( peer, 'must have a peer to focus' );
            peer.focus();
          }
        },

        /**
         * Remove focus from this node's primary DOM element.  The focus highlight will disappear, and the element will not receive
         * keyboard events when it doesn't have focus.
         * @public
         */
        blur: function() {
          if ( this._accessibleInstances.length > 0 ) {
            assert && assert( this._accessibleInstances.length === 1, 'blur() unsupported for Nodes using DAG, accessible content is not unique' );
            var peer = this._accessibleInstances[ 0 ].peer;
            assert && assert( peer, 'must have a peer to blur' );
            peer.blur();
            this.interruptAccessibleInput(); // interrupt any a11y listeners that attached to this Node
          }
        },

        /***********************************************************************************************************/
        // HIGHER LEVEL API: GETTERS AND SETTERS FOR A11Y API OPTIONS
        //
        // These functions utilize the lower level API to achieve a consistence, and convenient API for adding
        // accessible content to the PDOM. See https://github.com/phetsims/scenery/issues/795
        /***********************************************************************************************************/

        /**
         * Set the Node's accessible content in a way that will define the Accessible Name for the browser. Different
         * HTML components and code situations require different methods of setting the Accessible Name.
         *
         * This method does the best it can to create a general method to set the Accessible Name for a variety of
         * different Node types and configurations, but if a Node is more complicated, then this method will not
         * properly set the Accessible Name for the Node's HTML content. In this situation this setter needs to be
         * overridden by the subtype to meet its specific constraints. When doing this make sure that the Accessible
         * Name is properly being set and conveyed to AT.
         *
         * NOTE: By Accessible Name (capitalized), we mean the proper title of the HTML element that will be set in
         * the browser Accessibility Tree and then interpreted by AT. This is necessily different from scenery internal
         * names of HTML elements like "label sibling" (even though, in certain circumstances, an Accessible Name could
         * be set by using the "label sibling" with tag name "label" and a "for" attribute).
         *
         * For more information about setting an Accessible Name on HTML see the scenery docs for accessibility,
         * and see https://developer.paciellogroup.com/blog/2017/04/what-is-an-accessible-name/
         *
         * @param {string|null} accessibleName
         */
        setAccessibleName: function( accessibleName ) {
          assert && assert( accessibleName === null || typeof accessibleName === 'string' );

          if ( this._accessibleName !== accessibleName ) {
            this._accessibleName = accessibleName;

            this.setAccessibleNameImplementation( accessibleName );

          }
        },
        set accessibleName( accessibleName ) { this.setAccessibleName( accessibleName ); },

        /**
         * This function is to manage the public accessiblName setter and invalidateAccessibleContent wanting to do the
         * same accessibleName setting work, but setAccessibleName wants to do a few more Client side error checks first
         * that causes an infinite loop if called from invalidateAccessibleContent.
         * @public (scenery-internal) - should only be called from setAccessibleName and invalidateAccessibleContent
         * @param {string} accessibleName
         */
        setAccessibleNameImplementation: function( accessibleName ) {
          assert && assert( accessibleName === null || typeof accessibleName === 'string' );

          if ( this._tagName ) {

            // input tag with a label tag that has a "for" attribute
            if ( this._tagName === 'input' ) {
              this.labelTagName = 'label';
              this.labelContent = accessibleName;
            }

            // if you can put inner content on the element, then do so
            else if ( AccessibilityUtil.tagNameSupportsContent( this._tagName ) ) {
              this.innerContent = accessibleName;

            }
            else {
              this.ariaLabel = accessibleName;
            }
          }
        },

        /**
         * Get the tag name of the DOM element representing this node for accessibility.
         * @public
         *
         * @returns {string|null}
         */
        getAccessibleName: function() {
          return this._accessibleName;
        },
        get accessibleName() { return this.getAccessibleName(); },


        /**
         * Set the help text for a Node
         * @param {string|null} helpText
         */
        setHelpText: function( helpText ) {
          assert && assert( helpText === null || typeof helpText === 'string' );

          if ( this._helpText !== helpText ) {

            // TODO: helptext should only be set on interactive Elements? see https://github.com/phetsims/scenery/issues/795

            this._helpText = helpText;

            this.setHelpTextImplementation( helpText );

          }
        },
        set helpText( helpText ) { this.setHelpText( helpText ); },

        /**
         * This function is to manage the public helpText setter and invalidateAccessibleContent both wanting to do the
         * same helpText setting work, but setHelpText wants to do a few more client side error checks first
         * that causes an infinite loop if called from invalidateAccessibleContent.
         * @public (scenery-internal) - should only be called from setHelpText and invalidateAccessibleContent
         * @param {string} helpText
         */
        setHelpTextImplementation: function( helpText ) {
          assert && assert( helpText === null || typeof helpText === 'string' );

          // no-op if there is no tagName
          if ( this._tagName ) {

            this.descriptionContent = helpText;
          }
        },

        /**
         * Get the help text of the interactive element.
         * @public
         *
         * @returns {string|null}
         */
        getHelpText: function() {
          return this._helpText;
        },
        get helpText() { return this.getHelpText(); },


        /***********************************************************************************************************/
        // LOWER LEVEL GETTERS AND SETTERS FOR A11Y API OPTIONS
        /***********************************************************************************************************/

        /**
         * Set the tag name for the primary sibling in the PDOM. DOM element tag names are read-only, so this
         * function will create a new DOM element each time it is called for the Node's AccessiblePeer and
         * reset the accessible content.
         *
         * @param {string|null} tagName
         */
        setTagName: function( tagName ) {
          assert && assert( tagName === null || typeof tagName === 'string' );

          if ( tagName !== this._tagName ) {
            this._tagName = tagName;

            // TODO: this could be setting a11y content twice
            this.onAccessibleContentChange();
            if ( this._accessibleInstances.length > 0 ) {
              for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
                var peer = this._accessibleInstances[ i ].peer;
                peer.onTagNameChange();
              }
            }

          }
        },
        set tagName( tagName ) { this.setTagName( tagName ); },

        /**
         * Get the tag name of the DOM element representing this node for accessibility.
         * @public
         *
         * @returns {string|null}
         */
        getTagName: function() {
          return this._tagName;
        },
        get tagName() { return this.getTagName(); },

        /**
         * Set the tag name for the accessible label sibling for this Node. DOM element tag names are read-only,
         * so this will require creating a new AccessiblePeer for this Node (reconstructing all DOM Elements). If
         * labelContent is specified without calling this method, then the DEFAULT_LABEL_TAG_NAME will be used as the
         * tag name for the label sibling.
         *
         * Use null to clear the label sibling element from the PDOM.
         *
         * NOTE: This method will create a container parent tagName if none has been specified, because all sibling
         * elements must be children of the container. If you clear the labelTagName and no longer want any
         * content save the primary sibling (this means the container parent as well), then you must manually null out
         * the containerTagName option as well. Although this isn't the greatest strategy, it works for now, and
         * @zepumph and @jessegreenberg can't think of another way to handle this. See for details: https://github.com/phetsims/scenery/issues/761
         *
         *
         * @param {string|null} tagName
         */
        setLabelTagName: function( tagName ) {
          assert && assert( tagName === null || typeof tagName === 'string' );

          if ( tagName !== this._labelTagName ) {
            this._labelTagName = tagName;

            this.onAccessibleContentChange();

            // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            //   var peer = this._accessibleInstances[ i ].peer;
            //   peer.onLabelTagNameChange();
            // }
          }
        },
        set labelTagName( tagName ) { this.setLabelTagName( tagName ); },

        /**
         * Get the label sibling HTML tag name.
         * @public
         *
         * @returns {string|null}
         */
        getLabelTagName: function() {
          return this._labelTagName;
        },
        get labelTagName() { return this.getLabelTagName(); },

        /**
         * Set the tag name for the description sibling. HTML element tag names are read-only, so this will require creating
         * a new HTML element, and inserting it into the DOM. The tag name provided must support
         * innerHTML and textContent. If descriptionContent is specified without this option,
         * then descriptionTagName will be set to DEFAULT_DESCRIPTION_TAG_NAME.
         *
         * Passing 'null' will clear away the description sibling.
         *
         * NOTE: This method will create a container parent tagName if none has been specified. This is because all
         * siblings must be children of the parent container element to appear in the DOM. If you clear
         * the descriptionTagName and no longer want any content other than the primary sibling, you must manually
         * null out the containerTagName option. Although this isn't the greatest strategy, it works for now, and
         * @zepumph and @jessegreenberg can't think of another way to handle this. See for
         * details: https://github.com/phetsims/scenery/issues/761
         *
         * @public
         * @param {string|null} tagName
         */
        setDescriptionTagName: function( tagName ) {
          assert && assert( tagName === null || typeof tagName === 'string' );

          if ( tagName !== this._descriptionTagName ) {

            this._descriptionTagName = tagName;

            this.onAccessibleContentChange();

            // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            //   var peer = this._accessibleInstances[ i ].peer;
            //   peer.onDescriptionTagNameChange();
            // }
          }
        },
        set descriptionTagName( tagName ) { this.setDescriptionTagName( tagName ); },

        /**
         * Get the HTML tag name for the description sibling.
         * @public
         *
         * @returns {string|null}
         */
        getDescriptionTagName: function() {
          return this._descriptionTagName;
        },
        get descriptionTagName() { return this.getDescriptionTagName(); },

        /**
         * Sets the type for an input element.  Element must have the INPUT tag name. The input attribute is not
         * specified as readonly, so invalidating accessible content is not necessary.
         *
         * @param {string|null} inputType
         */
        setInputType: function( inputType ) {
          assert && assert( this._tagName.toUpperCase() === INPUT_TAG, 'tag name must be INPUT to support inputType' );

          this._inputType = inputType;
          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.setAttributeToElement( 'type', inputType );
          }
        },
        set inputType( inputType ) { this.setInputType( inputType ); },

        /**
         * Get the input type. Input type is only relevant if this node's DOM element has tag name "INPUT".
         * @public
         *
         * @returns {string|null}
         */
        getInputType: function() {
          return this._inputType;
        },
        get inputType() { return this.getInputType(); },

        /**
         * By default the label will be prepended before the primary sibling in the PDOM. This
         * option allows you to instead have the label added after the primary sibling. Note: The label will always
         * be in front of the description sibling. If this flag is set with `appendDescription`, the order will be
         *
         * <container>
         *   <primary sibling/>
         *   <label sibling/>
         *   <description sibling/>
         * </container>
         * @public
         *
         * @param {boolean} appendLabel
         */
        setAppendLabel: function( appendLabel ) {
          this._appendLabel = appendLabel;

          // TODO: can we do this without recomputing everything?
          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onAppendLabelChange();
          // }
        },
        set appendLabel( appendLabel ) { this.setAppendLabel( appendLabel ); },

        /**
         * Get whether the label sibling should be appended after the primary sibling.
         * @returns {boolean}
         */
        getAppendLabel: function() {
          return this._appendLabel;
        },
        get appendLabel() { this.getAppendLabel(); },

        /**
         * By default the label will be prepended before the primary sibling in the PDOM. This
         * option allows you to instead have the label added after the primary sibling. Note: The label will always
         * be in front of the description sibling. If this flag is set with `appendLabel`, the order will be
         *
         * <container>
         *   <primary sibling/>
         *   <label sibling/>
         *   <description sibling/>
         * </container>
         * @public
         *
         * @param {boolean} appendDescription
         */
        setAppendDescription: function( appendDescription ) {
          this._appendDescription = appendDescription;

          // TODO: can we do this without recomputing everything?
          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onAppendDescriptionChange();
          // }
        },
        set appendDescription( appendDescription ) { this.setAppendDescription( appendDescription ); },

        /**
         * Get whether the description sibling should be appended after the primary sibling.
         * @returns {boolean}
         */
        getAppendDescription: function() {
          return this._appendDescription;
        },
        get appendDescription() { this.getAppendDescription(); },


        /**
         * Set the container parent tag name. By specifying this container parent, an element will be created that
         * acts as a container for this Node's primary sibling DOM Element and its label and description siblings.
         * This containerTagName will default to DEFAULT_LABEL_TAG_NAME, and be added to the PDOM automatically if
         * more than just the primary sibling is created.
         *
         *
         * For instance, a button element with a label and description will be contained like the following
         * if the containerTagName is specified as 'section'.
         *
         * <section id='parent-container-trail-id'>
         *   <button>Press me!</button>
         *   <p>Button label</p>
         *   <p>Button description</p>
         * </section>
         *
         * Setting the containerTagName to null directly will result in a no-op if there are still siblings defined for
         * the peer. This is because labelTagName and descriptionTagName will create a parent automatically if one isn't
         * specified. This can result in some weird logic, and @zepumph and @jessegreenberg aren't sure if this is the
         * best way, but it is the way it works for now. See https://github.com/phetsims/scenery/issues/761 for details
         * and if you have opinions to share.
         *
         * @param {string|null} tagName
         */
        setContainerTagName: function( tagName ) {
          assert && assert( tagName === null || typeof tagName === 'string', 'invalid tagName argument: ' + tagName );

          this._containerTagName = tagName;
          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onContainerTagNameChange();
          // }
        },
        set containerTagName( tagName ) { this.setContainerTagName( tagName ); },

        /**
         * Get the tag name for the container parent element.
         *
         * @returns {string|null}
         */
        getContainerTagName: function() {
          return this._containerTagName;
        },
        get containerTagName() { return this.getContainerTagName(); },

        /**
         * Set the content of the label sibling for the this node.  The label sibling will default to the value of
         * DEFAULT_LABEL_TAG_NAME if no `labelTagName` is provided. If the label sibling is a `LABEL` html element,
         * then the `for` attribute will automatically be added, pointing to the node's primary sibling DOM Element.
         *
         * This method supports adding content in two ways, with HTMLElement.textContent and HTMLElement.innerHTML.
         * The DOM setter is chosen based on if the label passes the `usesExclusivelyFormattingTags`.
         *
         * Passing a null label value will not clear the whole label sibling, just the inner content of the DOM Element.
         * @param {string|null} label
         */
        setLabelContent: function( label ) {
          assert && assert( label === null || typeof label === 'string' );

          this._labelContent = label;

          var self = this;

          // if trying to set labelContent, make sure that there is a labelTagName default
          if ( !this._labelTagName ) {
            this.setLabelTagName( DEFAULT_LABEL_TAG_NAME );
          }

          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.setLabelSiblingContent( self._labelContent );
          }
        },
        set labelContent( label ) { this.setLabelContent( label ); },

        /**
         * Get the content for this Node's label sibling DOM element.
         *
         * @returns {string|null}
         */
        getLabelContent: function() {
          return this._labelContent;
        },
        get labelContent() { return this.getLabelContent(); },

        /**
         * Set the inner content for the primary sibling of the AccessiblePeers of this node. Will be set as textContent
         * unless content is html which uses exclusively formatting tags. A node with inner content cannot
         * have accessible descendants because this content will override the the HTML of descendants of this node.
         *
         * @param {string|null} content
         * @public
         */
        setInnerContent: function( content ) {
          assert && assert( content === null || typeof content === 'string' );

          this._innerContent = content;

          var self = this;

          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.setPrimarySiblingContent( self._innerContent );
          }
        },
        set innerContent( content ) { this.setInnerContent( content ); },

        /**
         * Get the inner content, the string that is the innerHTML or innerText for the node's primary sibling element.
         *
         * @return {string|null}
         * @public
         */
        getInnerContent: function() {
          return this._innerContent;
        },
        get innerContent() { return this.getInnerContent(); },

        /**
         * Set the description content for this node's DOM element. The description sibling tag name must support
         * innerHTML and textContent. If a description element does not exist yet, a default
         * DEFAULT_LABEL_TAG_NAME will be assigned to the descriptionTagName.
         *
         * @param {string|null} descriptionContent
         */
        setDescriptionContent: function( descriptionContent ) {
          assert && assert( descriptionContent === null || typeof descriptionContent === 'string' );

          var self = this;

          this._descriptionContent = descriptionContent;

          // if there is no description element, assume that a paragraph element should be used
          if ( !this._descriptionTagName ) {
            this.setDescriptionTagName( DEFAULT_DESCRIPTION_TAG_NAME );
          }

          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.setDescriptionSiblingContent( self._descriptionContent );
          }
        },
        set descriptionContent( textContent ) { this.setDescriptionContent( textContent ); },

        /**
         * Get the content for this Node's description sibling DOM Element.
         *
         * @returns {string|null}
         */
        getDescriptionContent: function() {
          return this._descriptionContent;
        },
        get descriptionContent() { return this.getDescriptionContent(); },

        /**
         * Set the ARIA role for this node's DOM element. According to the W3C, the ARIA role is read-only for a DOM
         * element.  So this will create a new DOM element for this Node with the desired role, and replace the old
         * element in the DOM.
         * @public
         *
         * @param {string|null} ariaRole - role for the element, see
         *                            https://www.w3.org/TR/html-aria/#allowed-aria-roles-states-and-properties
         *                            for a list of roles, states, and properties.
         */
        setAriaRole: function( ariaRole ) {
          assert && assert( ariaRole === null || typeof ariaRole === 'string' );
          this._ariaRole = ariaRole;
          this.setAccessibleAttribute( 'role', ariaRole );

          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onAriaRoleChange();
          // }
        },
        set ariaRole( ariaRole ) { this.setAriaRole( ariaRole ); },

        /**
         * Get the ARIA role representing this node.
         * @public
         *
         * @returns {string|null}
         */
        getAriaRole: function() {
          return this._ariaRole;
        },
        get ariaRole() { return this.getAriaRole(); },

        /**
         * Set the ARIA role for this node's container parent element.  According to the W3C, the ARIA role is read-only
         * for a DOM element. This will create a new DOM element for the container parent with the desired role, and
         * replace it in the DOM.
         * @public
         *
         * @param {string|null} ariaRole - role for the element, see
         *                            https://www.w3.org/TR/html-aria/#allowed-aria-roles-states-and-properties
         *                            for a lsit of roles, states, and properties.
         */
        setContainerAriaRole: function( ariaRole ) {
          assert && assert( ariaRole === null || typeof ariaRole === 'string' );
          this._containerAriaRole = ariaRole;

          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onContainerAriaRoleChange();
          // }
        },
        set containerAriaRole( ariaRole ) { this.setContainerAriaRole( ariaRole ); },

        /**
         * Get the ARIA role assigned to the container parent element.
         * @public
         * @returns {string|null}
         */
        getContainerAriaRole: function() {
          return this._containerAriaRole;
        },
        get containerAriaRole() { return this.getContainerAriaRole(); },

        /**
         * Sets the namespace for the primary element (relevant for MathML/SVG/etc.)
         * @public
         *
         * For example, to create a MathML element:
         * { tagName: 'math', accessibleNamespace: 'http://www.w3.org/1998/Math/MathML' }
         *
         * or for SVG:
         * { tagName: 'svg', accessibleNamespace: 'http://www.w3.org/2000/svg' }
         *
         * @param {string|null} accessibleNamespace - Null indicates no namespace.
         * @returns {Node} - For chaining
         */
        setAccessibleNamespace: function( accessibleNamespace ) {
          assert && assert( accessibleNamespace === null || typeof accessibleNamespace === 'string' );

          if ( this._accessibleNamespace !== accessibleNamespace ) {
            this._accessibleNamespace = accessibleNamespace;

            this.onAccessibleContentChange();
            // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            //   var peer = this._accessibleInstances[ i ].peer;
            //   peer.onAccessibleNamespaceChange();
            // }
          }

          return this;
        },
        set accessibleNamespace( value ) { this.setAccessibleNamespace( value ); },

        /**
         * Returns the accessible namespace (see setAccessibleNamespace for more information).
         * @public
         *
         * @returns {string|null}
         */
        getAccessibleNamespace: function() {
          return this._accessibleNamespace;
        },
        get accessibleNamespace() { return this.getAccessibleNamespace(); },

        /**
         * Sets the 'aria-label' attribute for labelling the node's DOM element. By using the
         * 'aria-label' attribute, the label will be read on focus, but can not be found with the
         * virtual cursor. This is one way to set a DOM Element's Accessible Name.
         * @public
         *
         * @param {string|null} ariaLabel - the text for the aria label attribute
         */
        setAriaLabel: function( ariaLabel ) {
          assert && assert( ariaLabel === null || typeof ariaLabel === 'string' );

          this._ariaLabel = ariaLabel;

          this.setAccessibleAttribute( 'aria-label', ariaLabel );
        },
        set ariaLabel( ariaLabel ) { this.setAriaLabel( ariaLabel ); },

        /**
         * Get the value of the aria-label attribute for this node's DOM element.
         *
         * @returns {string|null}
         */
        getAriaLabel: function() {
          return this._ariaLabel;
        },
        get ariaLabel() { return this.getAriaLabel(); },

        /**
         * Set the focus highlight for this node. By default, the focus highlight will be a pink rectangle that
         * surrounds the node's local bounds.  If focus highlight is set to 'invisible', the node will not have
         * any highlighting when it receives focus.
         * @public
         *
         * @param {Node|Shape|string.<'invisible'>} focusHighlight
         */
        setFocusHighlight: function( focusHighlight ) {
          assert && assert( focusHighlight === null ||
                            focusHighlight instanceof phet.scenery.Node ||
                            focusHighlight instanceof phet.kite.Shape ||
                            focusHighlight === 'invisible' );

          this._focusHighlight = focusHighlight;

          var isFocused = false;
          if ( this.isFocused() ) {
            isFocused = true;
          }

          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onFocusHighlightChange();
          // }

          // if the focus highlight is layerable in the scene graph, update visibility so that it is only
          // visible when associated node has focus
          if ( this._focusHighlightLayerable ) {

            // if focus highlight is layerable, it must be a node in the scene graph
            assert && assert( focusHighlight instanceof phet.scenery.Node );
            focusHighlight.visible = this.focused;
          }

          // Reset the focus after invalidating the content.
          isFocused && this.focus();

        },
        set focusHighlight( focusHighlight ) { this.setFocusHighlight( focusHighlight ); },

        /**
         * Get the focus highlight for this node.
         * @public
         *
         * @returns {Node|Shape|string<'invisible'>}
         */
        getFocusHighlight: function() {
          return this._focusHighlight;
        },
        get focusHighlight() { return this.getFocusHighlight(); },

        /**
         * Setting a flag to break default and allow the focus highlight to be (z) layered into the scene graph.
         * This will set the visibility of the layered focus highlight, it will always be invisible until this node has
         * focus.
         *
         * @param {Boolean} focusHighlightLayerable
         */
        setFocusHighlightLayerable: function( focusHighlightLayerable ) {
          this._focusHighlightLayerable = focusHighlightLayerable;

          // if a focus highlight is defined (it must be a node), update its visibility so it is linked to focus
          // of the associated node
          if ( this._focusHighlight ) {
            assert && assert( this._focusHighlight instanceof phet.scenery.Node );
            this._focusHighlight.visible = this.focused;
          }

          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onFocusHighlightLayerableChange();
          // }
        },
        set focusHighlightLayerable( focusHighlightLayerable ) { this.setFocusHighlightLayerable( focusHighlightLayerable ); },

        /**
         * Get the flag for if this node is layerable in the scene graph (or if it is always on top, like the default).
         * @public
         *
         * @returns {Boolean}
         */
        getFocusHighlightLayerable: function() {
          return this._focusHighlightLayerable;
        },
        get focusHighlightLayerable() { return this.getFocusHighlightLayerable(); },

        /**
         * Set whether or not this node has a group focus highlight. If this node has a group focus highlight, an extra
         * focus highlight will surround this node whenever a descendant node has focus. Generally
         * useful to indicate nested keyboard navigation. If true, the group focus highlight will surround
         * this node's local bounds. Otherwise, the Node will be used.
         *
         * TODO: Support more than one group focus highlight (multiple ancestors could have groupFocusHighlight)
         *
         * @public
         * @param {boolean|Node} groupHighlight
         */
        setGroupFocusHighlight: function( groupHighlight ) {
          this._groupFocusHighlight = groupHighlight;
        },
        set groupFocusHighlight( groupHighlight ) { this.setGroupFocusHighlight( groupHighlight ); },

        /**
         * Get whether or not this node has a 'group' focus highlight, see setter for more information.
         * @public
         *
         * @returns {Boolean}
         */
        getGroupFocusHighlight: function() {
          return this._groupFocusHighlight;
        },
        get groupFocusHighlight() { return this.getGroupFocusHighlight(); },


        /**
         * Very similar algorithm to setChildren in Node.js
         * @public
         * @param {Array.<Object>} ariaLabelledbyAssociations - list of associationObjects, see this._ariaLabelledbyAssociations.
         */
        setAriaLabelledbyAssociations: function( ariaLabelledbyAssociations ) {
          var associationObject;
          var i;

          // validation if assert is enabled
          if ( assert ) {
            for ( i = 0; i < ariaLabelledbyAssociations.length; i++ ) {
              associationObject = ariaLabelledbyAssociations[ i ];
              assert && AccessibilityUtil.validateAssociationObject( associationObject );
            }
          }

          // if the list isn't the same, TODO: make order in the list not matter
          if ( !_.isEqual( ariaLabelledbyAssociations, this._ariaLabelledbyAssociations ) ) {


            var beforeOnly = []; // Will hold all nodes that will be removed.
            var afterOnly = []; // Will hold all nodes that will be "new" children (added)
            var inBoth = []; // Child nodes that "stay". Will be ordered for the "after" case.

            // get a difference of the desired new list, and the old
            arrayDifference( ariaLabelledbyAssociations, this._ariaLabelledbyAssociations, afterOnly, beforeOnly, inBoth );


            // remove each current associationObject that isn't in the new list
            for ( i = 0; i < beforeOnly.length; i++ ) {
              associationObject = beforeOnly[ i ];
              this.removeAriaLabelledbyAssociation( associationObject );
            }

            assert && assert( this._ariaLabelledbyAssociations.length === inBoth.length,
              'Removing associations should not have triggered other association changes' );


            // add each association from the new list that hasn't been added yet
            for ( i = 0; i < afterOnly.length; i++ ) {
              var ariaLabelledbyAssociation = ariaLabelledbyAssociations[ i ];
              this.addAriaLabelledbyAssociation( ariaLabelledbyAssociation );
            }

            // TODO maybe reorder them, but right now order doesn't seem to matter
          }
        },
        set ariaLabelledbyAssociations( ariaLabelledbyAssociations ) { return this.setAriaLabelledbyAssociations( ariaLabelledbyAssociations ); },

        /**
         * @public
         * @returns {Array.<Object>} - the list of current association objects
         */
        getAriaLabelledbyAssociations: function() {
          return this._ariaLabelledbyAssociations;
        },
        get ariaLabelledbyAssociations() { return this.getAriaLabelledbyAssociations(); },

        /**
         * Add an aria-labelledby association to this node. The data in the associationObject will be implemented like
         * "a peer's HTMLElement of this Node (specified with the string constant stored in `thisElementName`) will have an
         * aria-labelledby attribute with a value that includes the `otherNode`'s peer HTMLElement's id (specified with
         * `otherElementName`)."
         *
         * There can be more than one association because an aria-labelledby attribute's value can be a space separated
         * list of HTML ids, and not just a single id, see https://www.w3.org/WAI/GL/wiki/Using_aria-labelledby_to_concatenate_a_label_from_several_text_nodes
         *
         * @param {Object} associationObject - with key value pairs like
         *                               { otherNode: {Node}, otherElementName: {string}, thisElementName: {string } }
         *                               see AccessiblePeer for valid element names.
         */
        addAriaLabelledbyAssociation: function( associationObject ) {
          assert && AccessibilityUtil.validateAssociationObject( associationObject );

          this._ariaLabelledbyAssociations.push( associationObject ); // Keep track of this association.

          // Flag that this node is is being labelled by the other node, so that if the other node changes it can tell
          // this node to restore the association appropriately, see invalidateAccessibleContent for implementation.
          associationObject.otherNode._nodesThatAreAriaLabelledbyThisNode.push( this );

          // update the accessiblePeers with this aria-labelledby association
          this.addAssociationImplementationForAttribute( 'aria-labelledby', associationObject );
        },

        /**
         * Remove an aria-labelledby association object, see addAriaLabelledbyAssociation for more details
         * @public
         */
        removeAriaLabelledbyAssociation: function( associationObject ) {
          assert && assert( _.includes( this._ariaLabelledbyAssociations, associationObject ) );

          // remove the
          var removedObject = this._ariaLabelledbyAssociations.splice( _.indexOf( this._ariaLabelledbyAssociations, associationObject ), 1 );

          // remove the reference from the other node back to this node because we don't need it anymore
          removedObject[ 0 ].otherNode.removeNodeThatIsAriaLabelledByThisNode( this );
        },

        /**
         * Remove the reference to the node that is using this Node's ID as an aria-labelledby value
         * @param {Node} node
         * @public (scenery-internal)
         */
        removeNodeThatIsAriaLabelledByThisNode: function( node ) {
          assert && phet && phet.scenery && assert( node instanceof phet.scenery.Node );
          var indexOfNode = _.indexOf( this._nodesThatAreAriaLabelledbyThisNode, node );
          assert && assert( indexOfNode >= 0 );
          this._nodesThatAreAriaLabelledbyThisNode.splice( indexOfNode, 1 );
        },

        /**
         * @public
         * @param {Array.<Object>} ariaDescribedbyAssociations - list of associationObjects, see this._ariaDescribedbyAssociations.
         */
        setAriaDescribedbyAssociations: function( ariaDescribedbyAssociations ) {
          var associationObject;
          if ( assert ) {
            for ( var j = 0; j < ariaDescribedbyAssociations.length; j++ ) {
              associationObject = ariaDescribedbyAssociations[ j ];
              assert && AccessibilityUtil.validateAssociationObject( associationObject );
            }
          }

          // if the list isn't the same, TODO: make order in the list not matter
          if ( !_.isEqual( ariaDescribedbyAssociations, this._ariaDescribedbyAssociations ) ) {


            var beforeOnly = []; // Will hold all nodes that will be removed.
            var afterOnly = []; // Will hold all nodes that will be "new" children (added)
            var inBoth = []; // Child nodes that "stay". Will be ordered for the "after" case.
            var i;

            // get a difference of the desired new list, and the old
            arrayDifference( ariaDescribedbyAssociations, this._ariaDescribedbyAssociations, afterOnly, beforeOnly, inBoth );


            // remove each current associationObject that isn't in the new list
            for ( i = 0; i < beforeOnly.length; i++ ) {
              associationObject = beforeOnly[ i ];
              this.removeAriaDescribedbyAssociation( associationObject );
            }

            assert && assert( this._ariaDescribedbyAssociations.length === inBoth.length,
              'Removing associations should not have triggered other association changes' );


            // add each association from the new list that hasn't been added yet
            for ( i = 0; i < afterOnly.length; i++ ) {
              var ariaDescribedbyAssociation = ariaDescribedbyAssociations[ i ];
              this.addAriaDescribedbyAssociation( ariaDescribedbyAssociation );
            }

            // TODO maybe reorder them, but right now order doesn't seem to matter
          }
        },
        set ariaDescribedbyAssociations( ariaDescribedbyAssociations ) { return this.setAriaDescribedbyAssociations( ariaDescribedbyAssociations ); },

        /**
         * @public
         * @returns {Array.<Object>} - the list of current association objects
         */
        getAriaDescribedbyAssociations: function() {
          return this._ariaDescribedbyAssociations;
        },
        get ariaDescribedbyAssociations() { return this.getAriaDescribedbyAssociations(); },

        /**
         * Add an aria-describedby association to this node. The data in the associationObject will be implemented like
         * "a peer's HTMLElement of this Node (specified with the string constant stored in `thisElementName`) will have an
         * aria-describedby attribute with a value that includes the `otherNode`'s peer HTMLElement's id (specified with
         * `otherElementName`)."
         *
         * There can be more than one association because an aria-describedby attribute's value can be a space separated
         * list of HTML ids, and not just a single id, see https://www.w3.org/WAI/GL/wiki/Using_aria-labelledby_to_concatenate_a_label_from_several_text_nodes
         *
         * @param {Object} associationObject - with key value pairs like
         *                               { otherNode: {Node}, otherElementName: {string}, thisElementName: {string } }
         *                               see AccessiblePeer for valid element names.
         */
        addAriaDescribedbyAssociation: function( associationObject ) {
          assert && AccessibilityUtil.validateAssociationObject( associationObject );

          this._ariaDescribedbyAssociations.push( associationObject ); // Keep track of this association.

          // Flag that this node is is being described by the other node, so that if the other node changes it can tell
          // this node to restore the association appropriately, see invalidateAccessibleContent for implementation.
          associationObject.otherNode._nodesThatAreAriaDescribedbyThisNode.push( this );

          // update the accessiblePeers with this aria-describedby association
          this.addAssociationImplementationForAttribute( 'aria-describedby', associationObject );
        },


        /**
         * Remove an aria-describedby association object, see addAriaDescribedbyAssociation for more details
         * @public
         */
        removeAriaDescribedbyAssociation: function( associationObject ) {
          assert && assert( _.includes( this._ariaDescribedbyAssociations, associationObject ) );

          // remove the
          var removedObject = this._ariaDescribedbyAssociations.splice( _.indexOf( this._ariaDescribedbyAssociations, associationObject ), 1 );

          // remove the reference from the other node back to this node because we don't need it anymore
          removedObject[ 0 ].otherNode.removeNodeThatIsAriaDescribedByThisNode( this );
        },

        /**
         * Remove the reference to the node that is using this Node's ID as an aria-describedby value
         * @param {Node} node
         * @public (scenery-internal)
         */
        removeNodeThatIsAriaDescribedByThisNode: function( node ) {
          assert && phet && phet.scenery && assert( node instanceof phet.scenery.Node );
          var indexOfNode = _.indexOf( this._nodesThatAreAriaDescribedbyThisNode, node );
          assert && assert( indexOfNode >= 0 );
          this._nodesThatAreAriaDescribedbyThisNode.splice( indexOfNode, 1 );

        },

        /**
         * Update all of the aria-*edby associations for this Node. Depending on the parameter, either aria-labelledby
         * or aria-describedby. This involves clearing out the current values of the attribute in the AccessiblePeer,
         * to be restored to the value of the state stored by this Node
         *
         * @param {string} attribute - "aria-labelledby"|"aria-describedby"
         * @public (scenery-internal) only used by invalidateAccessibleContent.js
         */
        updateAssociationsForAttribute: function( attribute ) {
          assert && assert( attribute === 'aria-describedby' || attribute === 'aria-labelledby', 'unsupported attribute name: ' + attribute );

          // get the proper list of associations depending on what attribute we are updating
          var associationList = attribute === 'aria-labelledby' ? this._ariaLabelledbyAssociations :
                                attribute === 'aria-describedby' ? this._ariaDescribedbyAssociations : null;

          assert && assert( associationList ); // extra safe

          // no-op if there are no associations
          if ( associationList.length === 0 ) {
            return;
          }

          // clear the current aria-labelledby attribute and recreate it from stored associations
          // TODO: make this more efficient
          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.removeAttributeFromAllElements( attribute );
          }

          for ( var j = 0; j < associationList.length; j++ ) {
            var associationObject = associationList[ j ];

            this.addAssociationImplementationForAttribute( attribute, associationObject );
          }
        },

        /**
         * Implementation for aria-labelledby and aria-describedby associations. Called in a11y api setters , as well as
         * invalidateAccessibleContent when we recreate the accessible content for a Node.
         *
         * Update accessible peers with this specific attribute association object reference.
         *
         * @param {string} attribute - "aria-labelledby"|"aria-describedby"
         * @param {Object} associationObject - see addAriaLabelledbyAssociation() doc
         * @private
         */
        addAssociationImplementationForAttribute: function( attribute, associationObject ) {
          assert && assert( attribute === 'aria-describedby' || attribute === 'aria-labelledby', 'unsupported attribute name: ' + attribute );

          var otherNodeAccessibleInstances = associationObject.otherNode.getAccessibleInstances();

          // if the other node hasn't been added to the scene graph yet, it won't have any accessible instances, so no op.
          // This will be recalculated when that node is added to the scene graph
          if ( otherNodeAccessibleInstances.length > 0 ) {

            // We are just using the first AccessibleInstance for simplicity, but it is OK because the accessible
            // content for all AccessibleInstances will be the same, so the Accessible Names (in the browser's
            // accessibility tree) of elements that are referenced by the attribute value id will all have the same content
            var firstAccessibleInstance = otherNodeAccessibleInstances[ 0 ];

            // we can use the same element's id to update all of this Node's peers
            var otherPeerElement = firstAccessibleInstance.peer.getElementByName( associationObject.otherElementName );

            // be flexible enough if the other Node has not been created yet.
            if ( otherPeerElement ) {
              for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
                var peer = this._accessibleInstances[ i ].peer;

                peer.setAssociationAttribute( attribute, associationObject, otherPeerElement.id );
              }
            }
          }
        },

        /**
         * Update the associations for aria-labelledby
         * @private
         */
        updateAriaLabelledbyAssociations: function() {
          // restore this nodes aria-labelledby associations
          var ariaLabelledbyAtrributeName = 'aria-labelledby';
          this.updateAssociationsForAttribute( ariaLabelledbyAtrributeName );

          // if any other nodes are aria-labelledby this Node, update those associations too. Since this node's
          // accessible content needs to be recreated, they need to update their aria-labelledby associations accordingly.
          for ( var i = 0; i < this._nodesThatAreAriaLabelledbyThisNode.length; i++ ) {
            this._nodesThatAreAriaLabelledbyThisNode[ i ].updateAssociationsForAttribute( ariaLabelledbyAtrributeName );
          }
        },

        /**
         *
         * Update the associations for aria-describedby
         * @private
         */
        updateAriaDescribedbyAssociations: function() {

          // restore this nodes aria-describedby associations
          var ariaDescribedbyAttributeName = 'aria-describedby';
          this.updateAssociationsForAttribute( ariaDescribedbyAttributeName );

          // if any other nodes are aria-describedby this Node, update those associations too. Since this node's
          // accessible content needs to be recreated, they need to update their aria-describedby associations accordingly.
          for ( var i = 0; i < this._nodesThatAreAriaDescribedbyThisNode.length; i++ ) {
            this._nodesThatAreAriaDescribedbyThisNode[ i ].updateAssociationsForAttribute( ariaDescribedbyAttributeName );
          }
        },

        /**
         * Update the associations for aria-labelledby and aria-describedby. This needs to be done when we re-create
         * the accessible content (invalidateAccessibleContent), but also when we remove a Node from the scene graph
         * because we need to make sure that when the Node's accessible content is no longer in the PDOM, other Nodes
         * that are associated with the removed Node have their associations updated correctly.
         *
         * @public (scenery-internal)
         */
        updateLabelledbyDescribebyAssociations: function() {

          this.updateAriaLabelledbyAssociations();
          this.updateAriaDescribedbyAssociations();
        },

        /**
         * Sets the accessible focus order for this node. This includes not only focused items, but elements that can be
         * placed in the parallel DOM. If provided, it will override the focus order between children (and
         * optionally arbitrary subtrees). If not provided, the focus order will default to the rendering order
         * (first children first, last children last), determined by the children array.
         * @public
         *
         * In the general case, when an accessible order is specified, it's an array of nodes, with optionally one
         * element being a placeholder for "the rest of the children", signified by null. This means that, for
         * accessibility, it will act as if the children for this node WERE the accessibleOrder (potentially
         * supplemented with other children via the placeholder).
         *
         * For example, if you have the tree:
         *   a
         *     b
         *       d
         *       e
         *     c
         *       g
         *       f
         *         h
         *
         * and we specify b.accessibleOrder = [ e, f, d, c ], then the accessible structure will act as if the tree is:
         *  a
         *    b
         *      e
         *      f <--- the entire subtree of `f` gets placed here under `b`, pulling it out from where it was before.
         *        h
         *      d
         *      c <--- note that `g` is NOT under `c` anymore, because it got pulled out under b directly
         *        g
         *
         * The placeholder (`null`) will get filled in with all direct children that are NOT in any accessibleOrder.
         * If there is no placeholder specified, it will act as if the placeholder is at the end of the order.
         * The value `null` (the default) and the empty array (`[]`) both act as if the only order is the placeholder,
         * i.e. `[null]`.
         *
         * Some general constraints for the orders are:
         * - You can't specify a node in more than one accessibleOrder, and you can't specify duplicates of a value
         *   in an accessibleOrder.
         * - You can't specify an ancestor of a node in that node's accessibleOrder
         *   (e.g. this.accessibleOrder = this.parents ).
         *
         * Note that specifying something in an accessibleOrder will effectively remove it from all of its parents for
         * the accessible tree (so if you create `tmpNode.accessibleOrder = [ a ]` then toss the tmpNode without
         * disposing it, `a` won't show up in the parallel DOM). If there is a need for that, disposing a Node
         * effectively removes its accessibleOrder.
         *
         * See https://github.com/phetsims/scenery-phet/issues/365#issuecomment-381302583 for more information on the
         * decisions and design for this feature.
         *
         * @param {Array.<Node|null>|null} accessibleOrder
         */
        setAccessibleOrder: function( accessibleOrder ) {
          assert && assert( Array.isArray( accessibleOrder ) || accessibleOrder === null,
            'Array or null expected, received: ' + accessibleOrder );
          assert && accessibleOrder && accessibleOrder.forEach( function( node, index ) {
            assert( node === null || node instanceof scenery.Node,
              'Elements of accessibleOrder should be either a Node or null. Element at index ' + index + ' is: ' + node );
          } );
          assert && accessibleOrder && assert( this.getTrails( function( node ) {
            return _.includes( accessibleOrder, node );
          } ).length === 0, 'accessibleOrder should not include any ancestors or the node itself' );

          // Only update if it has changed
          if ( this._accessibleOrder !== accessibleOrder ) {
            var oldAccessibleOrder = this._accessibleOrder;

            // Store our own reference to this, so client modifications to the input array won't silently break things.
            // See https://github.com/phetsims/scenery/issues/786
            this._accessibleOrder = accessibleOrder === null ? null : accessibleOrder.slice();

            AccessibilityTree.accessibleOrderChange( this, oldAccessibleOrder, accessibleOrder );

            this.trigger0( 'accessibleOrder' );
          }
        },
        set accessibleOrder( value ) { this.setAccessibleOrder( value ); },

        /**
         * Returns the accessible (focus) order for this node.
         * @public
         *
         * @returns {Array.<Node|null>|null}
         */
        getAccessibleOrder: function() {
          return this._accessibleOrder;
        },
        get accessibleOrder() { return this.getAccessibleOrder(); },

        /**
         * Returns whether this node has an accessibleOrder that is effectively different than the default.
         * @public
         *
         * NOTE: `null`, `[]` and `[null]` are all effectively the same thing, so this will return true for any of
         * those. Usage of `null` is recommended, as it doesn't create the extra object reference (but some code
         * that generates arrays may be more convenient).
         *
         * @returns {boolean}
         */
        hasAccessibleOrder: function() {
          return this._accessibleOrder !== null &&
                 this._accessibleOrder.length !== 0 &&
                 ( this._accessibleOrder.length > 1 || this._accessibleOrder[ 0 ] !== null );
        },

        /**
         * Returns our "accessible parent" if available: the node that specifies this node in its accessibleOrder.
         * @public
         *
         * @returns {Node|null}
         */
        getAccessibleParent: function() {
          return this._accessibleParent;
        },
        get accessibleParent() { return this.getAccessibleParent(); },

        /**
         * Returns the "effective" a11y children for the node (which may be different based on the order or other
         * excluded subtrees).
         * @public
         *
         * If there is no accessibleOrder specified, this is basically "all children that don't have accessible panrets"
         * (a node has an "accessible parent" if it is specified in an accessibleOrder).
         *
         * Otherwise (if it has an accessibleOrder), it is the accessibleOrder, with the above list of nodes placed
         * in at the location of the placeholder. If there is no placeholder, it acts like a placeholder was the last
         * element of the accessibleOrder (see setAccessibleOrder for more documentation information).
         *
         * NOTE: If you specify a child in the accessibleOrder, it will NOT be double-included (since it will have an
         * accessible parent).
         *
         * @returns {Array.<Node>}
         */
        getEffectiveChildren: function() {
          // Find all children without accessible parents.
          var nonOrderedChildren = [];
          for ( var i = 0; i < this._children.length; i++ ) {
            var child = this._children[ i ];

            if ( !child._accessibleParent ) {
              nonOrderedChildren.push( child );
            }
          }

          // Override the order, and replace the placeholder if it exists.
          if ( this.hasAccessibleOrder() ) {
            var effectiveChildren = this.accessibleOrder.slice();

            var placeholderIndex = effectiveChildren.indexOf( null );

            // If we have a placeholder, replace its content with the children
            if ( placeholderIndex >= 0 ) {
              // for efficiency
              nonOrderedChildren.unshift( placeholderIndex, 1 );
              Array.prototype.splice.apply( effectiveChildren, nonOrderedChildren );
            }
            // Otherwise, just add the normal things at the end
            else {
              Array.prototype.push.apply( effectiveChildren, nonOrderedChildren );
            }

            return effectiveChildren;
          }
          else {
            return nonOrderedChildren;
          }
        },

        /**
         * Hide completely from a screen reader and the browser by setting the hidden attribute on the node's
         * representative DOM element. If the sibling DOM Elements have a container parent, the container
         * should be hidden so that all peers are hidden as well.  Hiding the element will remove it from the focus
         * order.
         *
         * @public
         *
         * @param {boolean} visible
         */
        setAccessibleVisible: function( visible ) {
          assert && assert( typeof visible === 'boolean' );
          if ( this._accessibleVisible !== visible ) {
            this._accessibleVisible = visible;

            this._accessibleDisplaysInfo.onAccessibleVisibilityChange( visible );
          }
        },
        set accessibleVisible( visible ) { this.setAccessibleVisible( visible ); },

        /**
         * Get whether or not this node's representative DOM element is visible.
         * @public
         * TODO: rename isAccessibleVisible()
         *
         * @returns {boolean}
         */
        getAccessibleVisible: function() {
          return this._accessibleVisible;
        },
        get accessibleVisible() { return this.getAccessibleVisible(); },

        /**
         * Sets whether or not the accessible content should be displayed in the DOM. Almost always, setAccessibleVisible
         * should be used instead of this function.  This should behave exactly like setAccessibleVisible. If removed
         * from display, content will be removed from focus order and undiscoverable with the virtual cursor. Sometimes,
         * hidden attribute is not handled the same way across screen readers, so this function can be used to
         * completely remove the content from the DOM.
         * @public
         *
         * @param {boolean} contentDisplayed
         */
        setAccessibleContentDisplayed: function( contentDisplayed ) {
          this._accessibleContentDisplayed = contentDisplayed;

          //TODO: we shouldn't need to set our children too, would it be better to have getters keep track of parents' values too???
          // for ( var j = 0; j < this._children.length; j++ ) {
          //   var child = this._children[ j ];
          //   child.setAccessibleContentDisplayed( contentDisplayed );
          // }

          this.onAccessibleContentChange();
          // for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
          //   var peer = this._accessibleInstances[ i ].peer;
          //   peer.onAccessibleContentDisplayedChange();
          // }
        },
        set accessibleContentDisplayed( contentDisplayed ) { this.setAccessibleContentDisplayed( contentDisplayed ); },

        /**
         * Get whether or not this Node is displayed in the PDOM, NOT just its this._accessibleContentDisplayed boolean value
         * @returns {boolean|*}
         */
        getAccessibleContentDisplayed: function() {
          // {boolean} if any parents are flagged as removed from the accessibility tree, set content to null
          var contentDisplayed = this._accessibleContentDisplayed;
          for ( var i = 0; i < this._parents.length; i++ ) {
            if ( !this._parents[ i ].accessibleContentDisplayed ) {
              contentDisplayed = false;
            }
          }

          return contentDisplayed;
        },
        get accessibleContentDisplayed() { return this.getAccessibleContentDisplayed(); },

        /**
         * Set the value of an input element.  Element must be a form element to support the value attribute. The input
         * value is converted to string since input values are generally string for HTML.
         * @public
         *
         * @param {string|number} value
         */
        setInputValue: function( value ) {
          assert && assert( value === null || typeof value === 'string' || typeof value === 'number' );

          if ( this._tagName ) {
            assert && assert( _.includes( FORM_ELEMENTS, this._tagName.toUpperCase() ), 'dom element must be a form element to support value' );
          }

          value = '' + value;
          this._inputValue = value;

          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.setAttributeToElement( 'value', value );
          }
        },
        set inputValue( value ) { this.setInputValue( value ); },

        /**
         * Get the value of the element. Element must be a form element to support the value attribute.
         * @public
         *
         * @returns {string}
         */
        getInputValue: function() {
          return this._inputValue;
        },
        get inputValue() { return this.getInputValue(); },

        /**
         * Set whether or not the checked attribute appears on the dom elements associated with this Node's
         * accessible content.  This is only useful for inputs of type 'radio' and 'checkbox'. A 'checked' input
         * is considered selected to the browser and assistive technology.
         *
         * @public
         * @param {boolean} checked
         */
        setAccessibleChecked: function( checked ) {
          assert && assert( typeof checked === 'boolean' );

          this._accessibleChecked = checked;

          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.setAttributeToElement( 'checked', checked );
          }
        },
        set accessibleChecked( checked ) { this.setAccessibleChecked( checked ); },

        /**
         * Get whether or not the accessible input is 'checked'.
         *
         * @public
         * @return {boolean}
         */
        getAccessibleChecked: function() {
          return this._accessibleChecked;
        },
        get accessibleChecked() { return this.getAccessibleChecked(); },

        /**
         * Get an array containing all accessible attributes that have been added to this node's DOM element.
         * @public
         *
         * @returns {Array.<Object>} - Returns objects with: {
         *   attribute: {string} // the name of the attribute
         *   value: {*} // the value of the attribute
         *   namespace: {string|null} // the (optional) namespace of the attribute
         * }
         */
        getAccessibleAttributes: function() {
          return this._accessibleAttributes.slice( 0 ); // defensive copy
        },
        get accessibleAttributes() { return this.getAccessibleAttributes(); },

        /**
         * Set a particular attribute for this node's DOM element, generally to provide extra semantic information for
         * a screen reader.
         *
         * @param {string} attribute - string naming the attribute
         * @param {string|boolean} value - the value for the attribute
         * @param {Object} [options]
         * @public
         */
        setAccessibleAttribute: function( attribute, value, options ) {
          options = _.extend( {
            // {string|null} - If non-null, will set the attribute with the specified namespace. This can be required
            // for setting certain attributes (e.g. MathML).
            namespace: null
          }, options );

          // if the accessible attribute already exists in the list, remove it - no need
          // to remove from the peers, existing attributes will simply be replaced in the DOM
          for ( var i = 0; i < this._accessibleAttributes.length; i++ ) {
            if ( this._accessibleAttributes[ i ].attribute === attribute &&
                 this._accessibleAttributes[ i ].namespace === options.namespace ) {
              this._accessibleAttributes.splice( i, 1 );
            }
          }

          this._accessibleAttributes.push( {
            attribute: attribute,
            value: value,
            namespace: options.namespace
          } );

          for ( var j = 0; j < this._accessibleInstances.length; j++ ) {
            var peer = this._accessibleInstances[ j ].peer;
            peer.setAttributeToElement( attribute, value, options );
          }
        },

        /**
         * Remove a particular attribute, removing the associated semantic information from the DOM element.
         *
         * @param {string} attribute - name of the attribute to remove
         * @param {Object} [options]
         * @public
         */
        removeAccessibleAttribute: function( attribute, options ) {
          assert && assert( typeof attribute === 'string' );

          options = _.extend( {

            // {string|null} - If non-null, will remove the attribute with the specified namespace. This can be required
            // for removing certain attributes (e.g. MathML).
            namespace: null
          }, options );

          var attributeRemoved = false;
          for ( var i = 0; i < this._accessibleAttributes.length; i++ ) {
            if ( this._accessibleAttributes[ i ].attribute === attribute &&
                 this._accessibleAttributes[ i ].namespace === options.namespace ) {
              this._accessibleAttributes.splice( i, 1 );
              attributeRemoved = true;
            }
          }
          assert && assert( attributeRemoved, 'Node does not have accessible attribute ' + attribute );

          for ( var j = 0; j < this._accessibleInstances.length; j++ ) {
            var peer = this._accessibleInstances[ j ].peer;
            peer.removeAttributeFromElement( attribute, options );
          }
        },

        /**
         * Remove all attributes from this node's dom element.
         * @public
         */
        removeAccessibleAttributes: function() {

          // all attributes currently on this node's DOM element
          var attributes = this.getAccessibleAttributes();

          for ( var i = 0; i < attributes.length; i++ ) {
            var attribute = attributes[ i ].attribute;
            this.removeAccessibleAttribute( attribute );
          }
        },

        /**
         * Make the DOM element explicitly focusable with a tab index. Native HTML form elements will generally be in
         * the navigation order without explicitly setting focusable.  If these need to be removed from the navigation
         * order, call setFocusable( false ).  Removing an element from the focus order does not hide the element from
         * assistive technology.
         * @public
         *
         * @param {?boolean} focusable - null to use the default browser focus for the primary element
         */
        setFocusable: function( focusable ) {
          assert && assert( focusable === null || typeof focusable === 'boolean' );

          var self = this;

          this._focusableOverride = focusable;

          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            var peer = this._accessibleInstances[ i ].peer;
            peer.setAttributeToElement( 'tabIndex', self.focusable ? 0 : -1 );
          }
        },
        set focusable( isFocusable ) { this.setFocusable( isFocusable ); },

        /**
         * Get whether or not the node is focusable. Use the focusOverride, and then default to browser defined
         * focusable elements.
         * @public
         *
         * @returns {boolean}
         */
        isFocusable: function() {
          if ( this._focusableOverride !== null ) {
            return this._focusableOverride;
          }

          // if there isn't a tagName yet, then there isn't an element, so we aren't focusable. To support option order.
          else if ( this._tagName === null ) {
            return false;
          }
          else {
            return AccessibilityUtil.tagIsDefaultFocusable( this._tagName );
          }
        },
        get focusable() { return this.isFocusable(); },

        /***********************************************************************************************************/
        // SCENERY-INTERNAL AND PRIVATE METHODS
        /***********************************************************************************************************/


        /**
         * Returns a recursive data structure that represents the nested ordering of accessible content for this Node's
         * subtree. Each "Item" will have the type { trail: {Trail}, children: {Array.<Item>} }, forming a tree-like
         * structure.
         * @public (scenery-internal)
         *
         * @returns {Array.<Item>}
         */
        getNestedAccessibleOrder: function() {
          var currentTrail = new scenery.Trail( this );
          var pruneStack = []; // {Array.<Node>} - A list of nodes to prune

          // {Array.<Item>} - The main result we will be returning. It is the top-level array where child items will be
          // inserted.
          var result = [];

          // {Array.<Array.<Item>>} A stack of children arrays, where we should be inserting items into the top array.
          // We will start out with the result, and as nested levels are added, the children arrays of those items will be
          // pushed and poppped, so that the top array on this stack is where we should insert our next child item.
          var nestedChildStack = [ result ];

          function addTrailsForNode( node, overridePruning ) {
            // If subtrees were specified with accessibleOrder, they should be skipped from the ordering of ancestor subtrees,
            // otherwise we could end up having multiple references to the same trail (which should be disallowed).
            var pruneCount = 0;
            // count the number of times our node appears in the pruneStack
            _.each( pruneStack, function( pruneNode ) {
              if ( node === pruneNode ) {
                pruneCount++;
              }
            } );

            // If overridePruning is set, we ignore one reference to our node in the prune stack. If there are two copies,
            // however, it means a node was specified in a accessibleOrder that already needs to be pruned (so we skip it instead
            // of creating duplicate references in the tab order).
            if ( pruneCount > 1 || ( pruneCount === 1 && !overridePruning ) ) {
              return;
            }

            // Pushing item and its children array, if accessible
            if ( node.accessibleContent ) {
              var item = {
                trail: currentTrail.copy(),
                children: []
              };
              nestedChildStack[ nestedChildStack.length - 1 ].push( item );
              nestedChildStack.push( item.children );
            }

            var arrayAccessibleOrder = node._accessibleOrder === null ? [] : node._accessibleOrder;

            // push specific focused nodes to the stack
            pruneStack = pruneStack.concat( arrayAccessibleOrder );

            // Visiting trails to ordered nodes.
            _.each( arrayAccessibleOrder, function( descendant ) {
              // Find all descendant references to the node.
              // NOTE: We are not reordering trails (due to descendant constraints) if there is more than one instance for
              // this descendant node.
              _.each( node.getLeafTrailsTo( descendant ), function( descendantTrail ) {
                descendantTrail.removeAncestor(); // strip off 'node', so that we handle only children

                // same as the normal order, but adding a full trail (since we may be referencing a descendant node)
                currentTrail.addDescendantTrail( descendantTrail );
                addTrailsForNode( descendant, true ); // 'true' overrides one reference in the prune stack (added above)
                currentTrail.removeDescendantTrail( descendantTrail );
              } );
            } );

            // Visit everything. If there is an accessibleOrder, those trails were already visited, and will be excluded.
            var numChildren = node._children.length;
            for ( var i = 0; i < numChildren; i++ ) {
              var child = node._children[ i ];

              currentTrail.addDescendant( child, i );
              addTrailsForNode( child, false );
              currentTrail.removeDescendant();
            }

            // pop focused nodes from the stack (that were added above)
            _.each( arrayAccessibleOrder, function( descendant ) {
              pruneStack.pop();
            } );

            // Popping children array if accessible
            if ( node.accessibleContent ) {
              nestedChildStack.pop();
            }
          }

          addTrailsForNode( this, false );

          return result;
        },

        /**
         * Sets the accessible content for a Node. See constructor for more information. Not part of the Accessibility
         * API
         * @public (scenery-internal)
         */
        onAccessibleContentChange: function() {

          AccessibilityTree.accessibleContentChange( this );

          this.trigger0( 'accessibleContent' );
        },
        set accessibleContent( value ) { this.onAccessibleContentChange( value ); },

        /**
         * Returns the accessible content for this node.
         * @public (scenery-internal)
         *
         * TODO: this should be better named
         * @returns {null|Object}
         */
        getAccessibleContent: function() {

          return this._accessibleContentDisplayed && !!this._tagName;

        },
        get accessibleContent() { return this.getAccessibleContent(); },


        /**
         * Called when the node is added as a child to this node AND the node's subtree contains accessible content.
         * We need to notify all Displays that can see this change, so that they can update the AccessibleInstance tree.
         * @private
         *
         * @param {Node} node
         */
        onAccessibleAddChild: function( node ) {
          sceneryLog && sceneryLog.Accessibility && sceneryLog.Accessibility( 'onAccessibleAddChild n#' + node.id + ' (parent:n#' + this.id + ')' );
          sceneryLog && sceneryLog.Accessibility && sceneryLog.push();

          // Find descendants with accessibleOrders and check them against all of their ancestors/self
          assert && ( function recur( descendant ) {
            // Prune the search (because milliseconds don't grow on trees, even if we do have assertions enabled)
            if ( descendant._rendererSummary.isNotAccessible() ) { return; }

            descendant.accessibleOrder && assert( descendant.getTrails( function( node ) {
              return _.includes( descendant.accessibleOrder, node );
            } ).length === 0, 'accessibleOrder should not include any ancestors or the node itself' );
          } )( node );

          assert && AccessibilityTree.auditNodeForAccessibleCycles( this );

          this._accessibleDisplaysInfo.onAddChild( node );

          AccessibilityTree.addChild( this, node );

          sceneryLog && sceneryLog.Accessibility && sceneryLog.pop();
        },

        /**
         * Called when the node is removed as a child from this node AND the node's subtree contains accessible content.
         * We need to notify all Displays that can see this change, so that they can update the AccessibleInstance tree.
         * @private
         *
         * @param {Node} node
         */
        onAccessibleRemoveChild: function( node ) {
          sceneryLog && sceneryLog.Accessibility && sceneryLog.Accessibility( 'onAccessibleRemoveChild n#' + node.id + ' (parent:n#' + this.id + ')' );
          sceneryLog && sceneryLog.Accessibility && sceneryLog.push();

          this._accessibleDisplaysInfo.onRemoveChild( node );

          AccessibilityTree.removeChild( this, node );

          // make sure that the associations for aria-labelledby and aria-describedby are updated when a child is
          // removed from the scene graph, see https://github.com/phetsims/scenery/issues/816
          node.updateLabelledbyDescribebyAssociations();

          sceneryLog && sceneryLog.Accessibility && sceneryLog.pop();
        },

        /**
         * Called when this node's children are reordered (with nothing added/removed).
         * @private
         */
        onAccessibleReorderedChildren: function() {
          sceneryLog && sceneryLog.Accessibility && sceneryLog.Accessibility( 'onAccessibleReorderedChildren (parent:n#' + this.id + ')' );
          sceneryLog && sceneryLog.Accessibility && sceneryLog.push();

          AccessibilityTree.childrenOrderChange( this );

          sceneryLog && sceneryLog.Accessibility && sceneryLog.pop();
        },

        /*---------------------------------------------------------------------------*/
        // Accessible Instance handling

        /**
         * Returns a reference to the accessible instances array.
         * @public (scenery-internal)
         *
         * @returns {Array.<AccessibleInstance>}
         */
        getAccessibleInstances: function() {
          return this._accessibleInstances;
        },
        get accessibleInstances() { return this.getAccessibleInstances(); },

        /**
         * Adds an AccessibleInstance reference to our array.
         * @public (scenery-internal)
         *
         * @param {AccessibleInstance} accessibleInstance
         */
        addAccessibleInstance: function( accessibleInstance ) {
          assert && assert( accessibleInstance instanceof scenery.AccessibleInstance );
          this._accessibleInstances.push( accessibleInstance );
        },

        /**
         * Removes an AccessibleInstance reference from our array.
         * @public (scenery-internal)
         *
         * @param {AccessibleInstance} accessibleInstance
         */
        removeAccessibleInstance: function( accessibleInstance ) {
          assert && assert( accessibleInstance instanceof scenery.AccessibleInstance );
          var index = _.indexOf( this._accessibleInstances, accessibleInstance );
          assert && assert( index !== -1, 'Cannot remove an AccessibleInstance from a Node if it was not there' );
          this._accessibleInstances.splice( index, 1 );
        }
      } );

      // Add invalidateAccessibleContent to the prototype. Patch in a sub-type call if it already exists on the prototype
      if ( proto.invalidateAccessibleContent ) {
        var subtypeInvalidateAccesssibleContent = proto.invalidateAccessibleContent;
        proto.invalidateAccessibleContent = function() {
          subtypeInvalidateAccesssibleContent.call( this );
          invalidateAccessibleContent.call( this );
        };
      }
      else {

        // assign a function from a separate file to this prototype. That file's exported function assumes this file's "this"
        proto.invalidateAccessibleContent = invalidateAccessibleContent;
      }
    }
  };

  scenery.register( 'Accessibility', Accessibility );

  return Accessibility;
} );