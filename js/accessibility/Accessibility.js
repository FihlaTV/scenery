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
 * The above operations will create the following pDOM structure (note that actual ids will be different):
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
 * pDOM. Here is an example of how a Node may use these features:
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
 *    so the following will yield the same pDOM structure:
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
 * pDOM more, see AccessiblePeer, which manages the DOM Elements for a node. For more documentation on Scenery, Nodes,
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
  var AccessiblePeer = require( 'SCENERY/accessibility/AccessiblePeer' );
  var Emitter = require( 'AXON/Emitter' );
  var extend = require( 'PHET_CORE/extend' );
  var invalidateAccessibleContent = require( 'SCENERY/accessibility/invalidateAccessibleContent' );
  var Renderer = require( 'SCENERY/display/Renderer' );
  var scenery = require( 'SCENERY/scenery' );

  var INPUT_TAG = AccessibilityUtil.TAGS.INPUT;
  var LABEL_TAG = AccessibilityUtil.TAGS.LABEL;
  var DIV_TAG = AccessibilityUtil.TAGS.DIV;
  var P_TAG = AccessibilityUtil.TAGS.P;

  // default tag names for siblings
  var DEFAULT_CONTAINER_TAG_NAME = DIV_TAG;
  var DEFAULT_DESCRIPTION_TAG_NAME = P_TAG;
  var DEFAULT_LABEL_TAG_NAME = P_TAG;

  // these elements are typically associated with forms, and support certain attributes
  var FORM_ELEMENTS = AccessibilityUtil.FORM_ELEMENTS;

  // The options for the Accessibility API. In general, most default to null; to clear, set back to null.
  var ACCESSIBILITY_OPTION_KEYS = [
    'tagName', // Sets the tag name for the primary sibling DOM element in the parallel DOM
    'inputType', // Sets the input type for the primary sibling DOM element, only relevant if tagName is 'input'
    'inputValue', // Sets the input value for the primary sibling DOM element, only relevant if tagName is 'input'
    'accessibleChecked', // Sets the 'checked' state for inputs of type 'radio' and 'checkbox', see setAccessibleChecked()
    'containerTagName', // Sets the tag name for an element that contains this Node's siblings, see setContainerTagName()
    'labelTagName', // Sets the tag name for the DOM element sibling labelling this node, see setLabelTagName()
    'descriptionTagName', // Sets the tag name for the DOM element sibling describing this node, see setDescriptionTagName()
    'innerContent', // Sets the inner text or HTML for a node's primary sibling element, see setInnerContent()
    'labelContent', // Sets the label content for the node, see setLabelContent()
    'descriptionContent', // Sets the description content for the node, see setDescriptionContent()
    'appendLabel', // Sets the label sibling to come after the primary sibling in the pDOM, see setAppendLabel()
    'appendDescription', // Sets the description sibling to come after the primary sibling in the pDOM, see setAppendDescription()
    'focusHighlight', // Sets the focus highlight for the node, see setFocusHighlight()
    'focusHighlightLayerable', // Flag to determine if the focus highlight node can be layered in the scene graph, see setFocusHighlightLayerable()
    'groupFocusHighlight', // Sets the outer focus highlight for this node when a descendant has focus, see setGroupFocusHighlight()
    'accessibleVisible', // Sets whether or not the node's DOM element is visible in the parallel DOM, see setAccessibleVisible()
    'accessibleContentDisplayed', // Sets whether or not the accessible content of the node (and its subtree) is displayed, see setAccessibleContentDisplayed()
    'focusable', // Sets whether or not the node can receive keyboard focus, see setFocusable()
    'ariaLabel', // Sets the value of the 'aria-label' attribute on the primary sibling of this Node, see setAriaLabel()
    'ariaRole', // Sets the ARIA role for the primary sibling of this Node, see setAriaRole()
    'containerAriaRole', // Sets the ARIA role for the container parent DOM element, see setContainerAriaRole()
    'ariaDescriptionContent', // Sets the content that will describe another node through aria-describedby, see setAriaDescriptionContent()
    'ariaLabelContent', // Sets the content that will label another node through aria-labelledby, see setAriaLabelledByContent()
    'ariaDescribedContent', // Sets the content that will be described by another node through aria-describedby, see setAriaDescribedContent()
    'ariaLabelledContent', // sets the content that will be labelled by another node through aria-labelledby, see setAriaLabelledContent()
    'accessibleOrder', // Modifies the order of accessible  navigation, see setAccessibleOrder()
    'accessibleContent' // Sets up accessibility handling (probably don't need to use this), see setAccessibleContent()
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

          // @private {string|null} - the value of the input, only relevant if the tag name is of type "INPUT". Is a
          // string because the `value` attribute is a DOMString. null value indicates no value.
          this._inputValue = null;

          // @private {boolean} - whether or not the accessible input is considered 'checked', only useful for inputs of
          // type 'radio' and 'checkbox'
          this._accessibleChecked = false;

          // @private {boolean} - By default the label will be prepended before the primary sibling in the pDOM. This
          // option allows you to instead have the label added after the primary sibling. Note: The label will always
          // be in front of the description sibling. If this flag is set with `appendDescription: true`, the order will be
          // (1) primary sibling, (2) label sibling, (3) description sibling. All siblings will be placed within the
          // containerParent.
          this._appendLabel = false;

          // @private {boolean} - By default the description will be prepended before the primary sibling in the pDOM. This
          // option allows you to instead have the description added after the primary sibling. Note: The description
          // will always be after the label sibling. If this flag is set with `appendLabel: true`, the order will be
          // (1) primary sibling, (2) label sibling, (3) description sibling. All siblings will be placed within the
          // containerParent.
          this._appendDescription = false;

          // @private {array.<Object> - array of attributes that are on the node's DOM element.  Objects will have the
          // form { attribute:{string}, value:{string|number} }
          this._accessibleAttributes = [];

          // @private {string|null} - the label content for this node's DOM element.  There are multiple ways that a label
          // can be associated with a node's dom element, see setLabelContent() for more documentation
          this._labelContent = null;

          // @private {string|null} - the inner label content for this node's primary sibling. Set as inner HTML
          // or text content of the actual DOM element. If this is used, the node should not have children.
          this._innerContent = null;

          // @private {string|null} - the description content for this node's DOM element.
          this._descriptionContent = null;

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

          // @private {Node|null} - A node with accessible content that labels this node through the aria-labelledby
          // ARIA attribute.  The other node can be anywhere in the scene graph.  The behavior for aria-labelledby
          // is such that when this node receives focus, the accessible content under the other node will be read
          // (before any description content). Use with ariaLabelledContent to specify what portion of this node's
          // acccessible content is labelled (DOM element, label element, description element or container parent
          // element).
          this._ariaLabelledByNode = null;

          // @private {string} - A string referenceing which portion of this node's accessible content will receive
          // the aria-labelledby attribute.  Can be the DOM element, the label element, the description element,
          // or the container parent element. By default, points to this node's DOM element.
          this._ariaLabelledContent = AccessiblePeer.PRIMARY_SIBLING;

          // @private {Node|null} - The Node this node labels through the aria-labelledby association. See
          // _ariaLabelledByNode for more information.
          this._ariaLabelsNode = null;

          // @private {string} - The content on this node that is used to label another node through the
          // aria-labelledby ARIA attribute.  Can be the node's label, description, container parent, or DOM
          // element.  See setAriaLabelContent()
          this._ariaLabelContent = AccessiblePeer.PRIMARY_SIBLING; // element associated with the other node's content

          // @private {Node|null} - A node with accessible content that describes this node through the aria-describedby
          // ARIA attribute. The other node can be anywhere in the scene graph.  The behavior for aria-describedby
          // is such that when this node receives focus, the accessible content under the other node will be read
          // (after any label content). Use with ariaDescribedContent to specify what portion of this node's
          // acccessible content is described (DOM element, label element, description element or container parent
          // element).
          this._ariaDescribedByNode = null;

          // @private {string} - A string referenceing which portion of this node's accessible content will receive
          // the aria-describedby attribute.  Can be the DOM element, the label element, the description element,
          // or the container parent element. By default, points to this node's DOM element.
          this._ariaDescribedContent = AccessiblePeer.PRIMARY_SIBLING;

          // @private {Node|null} - The Node this node describes through the aria-describedby association. See
          // _ariaLabelledByNode for more information.
          this._ariaDescribesNode = null;

          // @private {string} - The description content on this node that is used to describe another node through the
          // aria-describedby ARIA attribute. Can be the node's label, description, container parent, or DOM
          // element.  See ariaDescribessNodoe for more information
          this._ariaDescriptionContent = AccessiblePeer.PRIMARY_SIBLING;

          // @private {boolean} - whether or not this node's DOM element can receive focus from tab navigation.
          // Sets the tabIndex attribute on the node's DOM element.  Setting to false will not remove the node's DOM
          // from the document, but will ensure that it cannot receive focus by pressing 'tab'.  Several HTMLElements
          // (such as HTML form elements) can be focusable by default, without setting this property.
          this._focusable = null;

          // @private {Shape|Node} - the focus highlight that will surround this node when it
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

          // @public (scenery-internal) - emitters for when state properties change
          this.accessibleVisibilityChangedEmitter = new Emitter();

          // @public - emits when focus changes. This will trigger with the 'focus' event and the 'blur' event.
          // Listener receives 1 parameter, {boolean} - isFocused. see Display.focus
          this.focusChangedEmitter = new Emitter();

          // @private {Array.<Node>} - (a11y) If provided, it will override the focus order between children (and optionally
          // descendants). If not provided, the focus order will default to the rendering order (first children first, last
          // children last) determined by the children array.
          this._accessibleOrder = [];

          // @public (scenery-internal) {Node|null} - (a11y) If this node is specified in another node's
          // accessibleOrder, then this will have the value of that other (accessible parent) node. Otherwise it's null.
          this._accessibleParent = null;

          // @public (scenery-internal) {Array.<Display>} - (duplicates allowed) - There is one copy of each accessible
          // Display for each trail (from its root node to this node) that is fully visible (assuming this subtree is
          // accessible).
          // Thus, the value of this is:
          // - If this node is invisible OR the subtree has no accessibleContent/accessibleOrder: []
          // - Otherwise, it is the concatenation of our parents' accessibleDisplays (AND any accessible displays rooted
          //   at this node).
          // This value is synchronously updated, and supports accessibleInstances by letting them know when certain
          // nodes are visible on the display.
          this._accessibleDisplays = [];

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
          this.updateAccessiblePeers( function( accessiblePeer ) {
            AccessibilityUtil.addDOMEventListeners( accessibleInput, accessiblePeer.primarySibling );
          } );

          return accessibleInput;
        },

        /**
         * Removes an input listener that was previously added with addAccessibleInputListener.
         * @public
         *
         * @param {Object} accessibleInput
         * @returns {Node} - Returns 'this' reference, for chaining
         */
        removeAccessibleInputListener: function( accessibleInput ) {

          // ensure the listener is in our list, or will be added in invalidation
          var addedIndex = _.indexOf( this._accessibleInputListeners, accessibleInput );
          assert && assert( addedIndex > -1, 'accessibleInput listener was not added' );

          this._accessibleInputListeners.splice( addedIndex, 1 );

          // remove the event listeners from any peers
          this.updateAccessiblePeers( function( accessiblePeer ) {
            AccessibilityUtil.removeDOMEventListeners( accessibleInput, accessiblePeer.primarySibling );
          } );

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
              return  true;
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
         * Dispose accessibility by removing all listeners on this node for accessible input. Accessibility is disposed
         * by calling Node.dispose(), so this function is scenery-internal.
         * @public (scenery-internal)
         */
        disposeAccessibility: function() {
          this.accessibleOrder = [];

          this.removeAllAccessibleInputListeners();
        },

        /**
         * Get whether this node's primary DOM element currently has focus.
         * @public
         *
         * @returns {boolean}
         */
        isFocused: function() {
          var isFocused = false;
          if ( this._accessibleInstances.length > 0 ) {
            isFocused = document.activeElement === this._accessibleInstances[ 0 ].peer.primarySibling;
          }

          return isFocused;
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
            assert && assert( this._focusable, 'trying to set focus on a node that is not focusable' );
            assert && assert( this._accessibleVisible, 'trying to set focus on a node with invisible accessible content' );
            assert && assert( this._accessibleInstances.length === 1, 'focus() unsupported for Nodes using DAG, accessible content is not unique' );

            this._accessibleInstances[ 0 ].peer.primarySibling.focus();
          }
        },

        /**
         * Remove focus from this node's primary DOM element.  The focus highlight will disappear, and the element will not receive
         * keyboard events when it doesn't have focus.
         * @public
         */
        blur: function() {
          if ( this._accessibleInstances.length > 0 ) {
            this._accessibleInstances[ 0 ].peer.primarySibling.blur();
          }
        },


        /***********************************************************************************************************/
        // GETTERS AND SETTERS FOR A11y API OPTIONS
        /***********************************************************************************************************/

        /**
         * Set the tag name for the primary sibling in the pDOM. DOM element tag names are read-only, so this
         * function will create a new DOM element each time it is called for the Node's AccessiblePeer and
         * reset the accessible content.
         *
         * @param {string} tagName
         */
        setTagName: function( tagName ) {
          assert && assert( tagName === null || typeof tagName === 'string' );

          this._tagName = tagName;
          this.invalidateAccessibleContent();
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
         * Use null to clear the label sibling element from the pDOM.
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

          this._labelTagName = tagName;

          // to have a label sibling, you need a container
          if ( !this._containerTagName ) {
            this.setContainerTagName( DEFAULT_CONTAINER_TAG_NAME );
          }

          this.invalidateAccessibleContent();
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

          this._descriptionTagName = tagName;

          // to have a description sibling, you need a container
          if ( !this._containerTagName ) {
            this.setContainerTagName( DEFAULT_CONTAINER_TAG_NAME );
          }

          this.invalidateAccessibleContent();
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
          this.updateAccessiblePeers( function( accessiblePeer ) {
            accessiblePeer.primarySibling.type = inputType;
          } );
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
         * By default the label will be prepended before the primary sibling in the pDOM. This
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
          this.invalidateAccessibleContent();
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
         * By default the label will be prepended before the primary sibling in the pDOM. This
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
          this.invalidateAccessibleContent();
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
         * This containerTagName will default to DEFAULT_LABEL_TAG_NAME, and be added to the pDOM automatically if
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
          this.invalidateAccessibleContent();
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
          this._labelContent = label;

          // If there
          var useHTML = AccessibilityUtil.usesExclusivelyFormattingTags( label );

          var self = this;

          // if trying to set labelContent, make sure that there is a labelTagName default
          if ( !this._labelTagName ) {
            this.setLabelTagName( DEFAULT_LABEL_TAG_NAME );
          }

          this.updateAccessiblePeers( function( accessiblePeer ) {
            if ( accessiblePeer.labelSibling ) {
              AccessibilityUtil.setTextContent( accessiblePeer.labelSibling, self._labelContent, useHTML );

              // if the label element happens to be a 'label', associate with 'for' attribute
              if ( self._labelTagName.toUpperCase() === LABEL_TAG ) {
                accessiblePeer.labelSibling.setAttribute( 'for', accessiblePeer.primarySibling.id );
              }
            }
          } );

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
          this._innerContent = content;

          // make sure HTML is exclusively text or formatting tags
          var useHTML = AccessibilityUtil.usesExclusivelyFormattingTags( content );

          var self = this;

          // guard against option order, but if there is a tagName, validate that it accepts inner content.
          if ( this._tagName ) {
            assert && assert( AccessibilityUtil.tagNameSupportsContent( this._tagName ),
              'tagName: ' + this._tagName + ' does not support inner content' );
          }

          this.updateAccessiblePeers( function( accessiblePeer ) {
            assert && assert( accessiblePeer.accessibleInstance.children.length === 0, 'descendants exist with accessible content, innerContent cannot be used' );
            AccessibilityUtil.setTextContent( accessiblePeer.primarySibling, self._innerContent, useHTML );
          } );
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
          var useHTML = AccessibilityUtil.usesExclusivelyFormattingTags( descriptionContent );

          this._descriptionContent = descriptionContent;

          // if there is no description element, assume that a paragraph element should be used
          if ( !this._descriptionTagName ) {
            this.setDescriptionTagName( DEFAULT_DESCRIPTION_TAG_NAME );
          }

          this.updateAccessiblePeers( function( accessiblePeer ) {
            AccessibilityUtil.setTextContent( accessiblePeer.descriptionSibling, descriptionContent, useHTML );
          } );

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
          this._ariaRole = ariaRole;
          this.setAccessibleAttribute( 'role', ariaRole );

          this.invalidateAccessibleContent();
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
          this._containerAriaRole = ariaRole;
          this.invalidateAccessibleContent();
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
         * Sets the 'aria-label' attribute for labelling the node's DOM element. By using the
         * 'aria-label' attribute, the label will be read on focus, but can not be found with the
         * virtual cursor. This is one way to set a DOM Element's Accessible Name.
         * @public
         *
         * @param {string|null} ariaLabel - the text for the aria label attribute
         */
        setAriaLabel: function( ariaLabel ) {
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
          this._focusHighlight = focusHighlight;

          var isFocused = false;
          if ( this.isFocused() ) {
            isFocused = true;
          }

          this.invalidateAccessibleContent();

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

          this.invalidateAccessibleContent();
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
         * Sets the node that labels this node through the ARIA attribute aria-labelledby. The value of the
         * 'aria-labelledby' attribute  is a string id that references another HTMLElement in the DOM.
         * Upon focus, a screen reader should read the content under the HTML element referenced by the id,
         * before any description content. Exact behavior will depend on user agent. The specific content
         * used for the label can be specified by using setAriaLabelledContent, see that function for more info.
         * This is one way to set this Node's primary sibling's Accessible Name.
         *
         * @public
         * @param {Node} node - the node with accessible content that labels this one.
         */
        setAriaLabelledByNode: function( node ) {
          assert && assert( node._accessibleInstances.length < 2, 'cannot be labelled by a node using DAG' );

          this._ariaLabelledByNode = node;

          // needs to track what node it labels so when that node changes, it can trigger invalidation of this node
          node._ariaLabelsNode = this;

          //  accessible content required for both nodes
          var thisHasContent = this._accessibleInstances.length > 0;
          var otherHasContent = node._accessibleInstances.length > 0;
          if ( thisHasContent && otherHasContent ) {
            var self = this;
            this.updateAccessiblePeers( function( accessiblePeer ) {
              var otherPeer = node._accessibleInstances[ 0 ].peer;

              var labelledElement = accessiblePeer.getElementByAssociation( self._ariaLabelledContent );
              var labelSibling = otherPeer.getElementByAssociation( node._ariaLabelContent );

              // if both associated elements defined, set up the attribute, otherwise remove the attribute
              if ( labelledElement && labelSibling ) {
                labelledElement.setAttribute( 'aria-labelledby', labelSibling.id );
              }
              else if ( labelledElement ) {
                labelledElement.removeAttribute( 'aria-labelledby' );
              }
            } );
          }
        },
        set ariaLabelledByNode( node ) { this.setAriaLabelledByNode( node ); },

        /**
         * Get the node that labels this node through  the aria-labelledby relation. See setAriaLabelledByNode
         * for documentation on the behavior of aria-labelledby.
         *
         * @return {Node}
         */
        getAriaLabelledByNode: function() {
          return this._ariaLabelledByNode;
        },
        get ariaLabelledByNode() { return this.getAriaLabelledByNode(); },

        /**
         * Set the accessible content on this node that is labelled through aria-labelledby. Can be the node's
         * DOM element, label element, description element, or container parent element. This will determine
         * which element of this node's accessible content will hold the aria-labelledby attribute.
         *
         * @public
         * @param {string} content - 'LABEL|NODE|DESCRIPTION|CONTAINER_PARENT'
         */
        setAriaLabelledContent: function( content ) {
          this._ariaLabelledContent = content;
          this._ariaLabelledByNode && this.setAriaLabelledByNode( this._ariaLabelledByNode );
        },
        set ariaLabelledContent( content ) { this.setAriaLabelledContent( content ); },


        /**
         * Get a string the determines what element on this node has the aria-labelledby attribute. Does not return
         * a label string. See setAriaLabelledContent for more information.
         *
         * @public
         * @return {string} - one of 'LABEL'|'DESCRIPTION'|'NODE'|'CONTAINER_PARENT'
         */
        getAriaLabelledContent: function() {
          return this._ariaLabelledContent;
        },
        get ariaLabelledContent() { return this.getAriaLabelledContent(); },

        /**
         * Set the aria label content on this node which labels another node through the aria-labelledby
         * association. Can be the node's DOM element, label element, description element, or container parent
         * element. See setAriaLabelledBy for more information on aria-labelledby. This will determine the
         * value of the aria-labelledby attribute for another node when it is labelled by this one.
         *
         * @public
         * @param {string} content - 'LABEL'|'DESCRIPTION'|'NODE'|'CONTAINER_PARENT'
         */
        setAriaLabelContent: function( content ) {
          this._ariaLabelContent = content;
          this._ariaLabelsNode && this._ariaLabelsNode.setAriaLabelledByNode( this );
        },
        set ariaLabelContent( content ) { this.setAriaLabelContent( content ); },

        /**
         * Sets the node that describes this node through the ARIA attribute aria-describedby. The value of the
         * 'aria-describedby' attribute  is a string id that references another HTMLElement in the DOM.
         * Upon focus, a screen reader should read the content under the HTML element referenced by the id,
         * after any label content. Exact behavior will depend on user agent. The specific content
         * used for the description can be specified by using setAriaDescribedContent, see that function for more info.
         *
         * @public
         * @param {Node} node - the node with accessible content that labels this one.
         */
        setAriaDescribedByNode: function( node ) {
          assert && assert( node._accessibleInstances.length < 2, 'cannot be described by a node using DAG' );

          this._ariaDescribedByNode = node;

          // the other node needs to track this one so that when it changes, it can trigger invalidation of this node
          node._ariaDescribesNode = this;

          // accessible content required for both nodes
          var thisHasContent = this._accessibleInstances.length > 0;
          var otherHasContent = node._accessibleInstances.length > 0;
          if ( thisHasContent && otherHasContent ) {
            var self = this;
            this.updateAccessiblePeers( function( accessiblePeer ) {
              var otherPeer = node._accessibleInstances[ 0 ].peer;

              var describedElement = accessiblePeer.getElementByAssociation( self._ariaDescribedContent );
              var descriptionSibling = otherPeer.getElementByAssociation( node._ariaDescriptionContent );

              // if both associated elements exist, set the attribute, otherwise make sure attribute is removed
              if ( describedElement && descriptionSibling ) {
                describedElement.setAttribute( 'aria-describedby', descriptionSibling.id );
              }
              else if ( describedElement ) {
                describedElement.removeAttribute( 'aria-describedby' );
              }
            } );
          }
        },
        set ariaDescribedByNode( node ) { this.setAriaDescribedByNode( node ); },

        /**
         * Set the accessible content on this node that is described through aria-describedby. Can be the node's
         * DOM element, label element, description element, or container parent element. This will determine
         * which element of this node's accessible content has the aria-describedby attribute.
         *
         * @public
         * @param {string} content - 'LABEL|NODE|DESCRIPTION|CONTAINER_PARENT'
         */
        setAriaDescribedContent: function( content ) {
          this._ariaDescribedContent = content;
          this._ariaDescribedByNode && this.setAriaDescribedByNode( this._ariaDescribedByNode );
        },
        set ariaDescribedContent( content ) { this.setAriaDescribedContent( content ); },

        /**
         * Get the described content of this node's accessible content that is described through an aria-describedby
         * association.  Doesn't return a description, but a string describing wich of this node's accessible elements
         * are described.
         *
         * @return {string} -'LABEL|NODE|DESCRIPTION|CONTAINER_PARENT'
         */
        getAriaDescribedContent: function() {
          return this._ariaDescribedContent;
        },
        get ariaDescribedContent() { return this.getAriaDescribedContent; },

        /**
         * Set the aria description content on this node which describes another node through the aria-describedby
         * association. Can be the node's DOM element, label element, description element, or container parent
         * element. This will determine the value for aria-describedby when another node
         * is described by this one.  See setAriaLabelledBy for more information on aria-labelledby.
         *
         * @public
         * @param {string} content - one of 'LABEL'|'DESCRIPTION'|'NODE'|'CONTAINER_PARENT'
         */
        setAriaDescriptionContent: function( content ) {
          this._ariaDescriptionContent = content;
          this._ariaDescribesNode && this._ariaDescribesNode.setAriaDescribedByNode( this );
        },
        set ariaDescriptionContent( content ) { this.setAriaDescriptionContent( content ); },

        getAriaDescriptionContent: function() {
          return this._ariaDescriptionContent;
        },
        get ariaDescriptionContent() { return this.getAriaDescriptionContent(); },

        /**
         * Sets the accessible focus order for this node. This includes not only focused items, but elements that can be
         * placed in the parallel DOM. If provided, it will override the focus order between children (and
         * optionally descendants). If not provided, the focus order will default to the rendering order (first children
         * first, last children last), determined by the children array.
         * @public
         *
         * @param {Array.<Node|null>} accessibleOrder
         */
        setAccessibleOrder: function( accessibleOrder ) {
          assert && assert( Array.isArray( accessibleOrder ), 'Array expected, received: ' + typeof accessibleOrder );
          assert && accessibleOrder.forEach( function( node ) {
            assert( node === null || node instanceof scenery.Node );
          } );

          // Only update if it has changed
          if ( this._accessibleOrder !== accessibleOrder ) {
            var oldAccessibleOrder = this._accessibleOrder;
            this._accessibleOrder = accessibleOrder;

            AccessibilityTree.accessibleOrderChange( this, oldAccessibleOrder, accessibleOrder );

            this.trigger0( 'accessibleOrder' );
          }
        },
        set accessibleOrder( value ) { this.setAccessibleOrder( value ); },

        /**
         * Returns the accessible (focus) order for this node.
         * @public
         *
         * @returns {Array.<Node>|null}
         */
        getAccessibleOrder: function() {
          return this._accessibleOrder;
        },
        get accessibleOrder() { return this.getAccessibleOrder(); },

        /**
         * Returns the "effective" a11y children for the node (which may be different based on the order or other
         * excluded subtrees).
         * @public
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
          if ( this.accessibleOrder ) {
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
          this._accessibleVisible = visible;

          // accessible visibility updated in each AccessibleInstane
          this.accessibleVisibilityChangedEmitter.emit();
        },
        set accessibleVisible( visible ) { this.setAccessibleVisible( visible ); },

        /**
         * Get whether or not this node's representative DOM element is visible.
         * @public
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

          for ( var j = 0; j < this._children.length; j++ ) {
            var child = this._children[ j ];
            child.setAccessibleContentDisplayed( contentDisplayed );
          }
          this.invalidateAccessibleContent();
        },
        set accessibleContentDisplayed( contentDisplayed ) { this.setAccessibleContentDisplayed( contentDisplayed ); },

        getAccessibleContentDisplayed: function() {
          return this._accessibleContentDisplayed;
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
          if ( this._tagName ) {
            assert && assert( _.includes( FORM_ELEMENTS, this._tagName.toUpperCase() ), 'dom element must be a form element to support value' );
          }

          value = '' + value;
          this._inputValue = value;

          this.updateAccessiblePeers( function( accessiblePeer ) {
            accessiblePeer.primarySibling.value = value;
          } );
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
          this._accessibleChecked = checked;

          this.updateAccessiblePeers( function( accessiblePeer ) {
            accessiblePeer.primarySibling.checked = checked;
          } );
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
         * @returns {string[]}
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
         * @public
         */
        setAccessibleAttribute: function( attribute, value ) {

          // if the accessible attribute already exists in the list, remove it - no need
          // to remove from the peers, existing attributes will simply be replaced in the DOM
          for ( var i = 0; i < this._accessibleAttributes.length; i++ ) {
            if ( this._accessibleAttributes[ i ].attribute === attribute ) {
              this._accessibleAttributes.splice( i, 1 );
            }
          }

          this._accessibleAttributes.push( { attribute: attribute, value: value } );
          this.updateAccessiblePeers( function( accessiblePeer ) {
            accessiblePeer.primarySibling.setAttribute( attribute, value );
          } );
        },

        /**
         * Remove a particular attribute, removing the associated semantic information from the DOM element.
         *
         * @param {string} attribute - name of the attribute to remove
         * @public
         */
        removeAccessibleAttribute: function( attribute ) {

          var attributeRemoved = false;
          for ( var i = 0; i < this._accessibleAttributes.length; i++ ) {
            if ( this._accessibleAttributes[ i ].attribute === attribute ) {
              this._accessibleAttributes.splice( i, 1 );
              attributeRemoved = true;
            }
          }
          assert && assert( attributeRemoved, 'Node does not have accessible attribute ' + attribute );

          this.updateAccessiblePeers( function( accessiblePeer ) {
            accessiblePeer.primarySibling.removeAttribute( attribute );
          } );
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
         * @param {boolean} isFocusable
         */
        setFocusable: function( isFocusable ) {
          this._focusable = isFocusable;

          this.updateAccessiblePeers( function( accessiblePeer ) {
            if ( accessiblePeer.primarySibling ) {
              accessiblePeer.primarySibling.tabIndex = isFocusable ? 0 : -1;
            }
          } );
        },
        set focusable( isFocusable ) { this.setFocusable( isFocusable ); },

        /**
         * Get whether or not the node is focusable.
         * @public
         *
         * REVIEW: Usually boolean getters would be called something like isFocusable().
         *
         * @returns {boolean}
         */
        getFocusable: function() {
          return this._focusable;
        },
        get focusable() { return this.getFocusable(); },

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

            // push specific focused nodes to the stack
            pruneStack = pruneStack.concat( node._accessibleOrder );

            // Visiting trails to ordered nodes.
            _.each( node._accessibleOrder, function( descendant ) {
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
            _.each( node._accessibleOrder, function( descendant ) {
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
         *
         * @param {null|Object} accessibleContent
         */
        setAccessibleContent: function( accessibleContent ) {
          assert && assert( accessibleContent === null || accessibleContent instanceof Object );

          if ( this._accessibleContent !== accessibleContent ) {
            var oldAccessibleContent = this._accessibleContent;
            this._accessibleContent = accessibleContent;

            AccessibilityTree.accessibleContentChange( this, oldAccessibleContent, accessibleContent );

            this.trigger0( 'accessibleContent' );
          }
        },
        set accessibleContent( value ) { this.setAccessibleContent( value ); },

        /**
         * Returns the accessible content for this node.
         * @public (scenery-internal)
         *
         *
         * @returns {null|Object}
         */
        getAccessibleContent: function() {
          return this._accessibleContent;
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
          if ( node.canHaveAccessibleDisplays() ) {
            node.addAccessibleDisplays( this._accessibleDisplays );
          }

          AccessibilityTree.addChild( this, node );
        },

        /**
         * Called when the node is removed as a child from this node AND the node's subtree contains accessible content.
         * We need to notify all Displays that can see this change, so that they can update the AccessibleInstance tree.
         * @private
         *
         * @param {Node} node
         */
        onAccessibleRemoveChild: function( node ) {
          if ( node.canHaveAccessibleDisplays() ) {
            node.removeAccessibleDisplays( this._accessibleDisplays );
          }

          AccessibilityTree.removeChild( this, node );
        },

        /**
         * Called when our summary bitmask changes
         * @public (scenery-internal)
         *
         * @param {number} oldBitmask
         * @param {number} newBitmask
         */
        onAccessibleSummaryChange: function( oldBitmask, newBitmask ) {
          // If we are invisible, our accessibleDisplays would not have changed ([] => [])
          if ( this.visible ) {
            var wasAccessible = !( Renderer.bitmaskNotAccessible & oldBitmask );
            var isAccessible = !( Renderer.bitmaskNotAccessible & newBitmask );

            if ( isAccessible && !wasAccessible ) {
              this.addAllAccessibleDisplays();
            }
            if ( !isAccessible && wasAccessible ) {
              this.removeAllAccessibleDisplays();
            }
          }
        },

        /**
         * Called when our visibility changes.
         * @public (scenery-internal)
         *
         * @param {boolean} visible
         */
        onAccessibleVisibilityChange: function( visible ) {
          // If we are not accessible, our accessibleDisplays would not have changed ([] => [])
          if ( !this._rendererSummary.isNotAccessible() ) {
            if ( visible ) {
              this.addAllAccessibleDisplays();
            }
            else {
              this.removeAllAccessibleDisplays();
            }
          }
        },

        /**
         * Called when we have a rooted display added to this node.
         * @public (scenery-internal)
         *
         * @param {Display} display
         */
        onAccessibleAddedRootedDisplay: function( display ) {
          if ( display._accessible && this.canHaveAccessibleDisplays() ) {
            this.addAccessibleDisplays( [ display ] );
          }
        },

        /**
         * Called when we have a rooted display removed from this node.
         * @public (scenery-internal)
         *
         * @param {Display} display
         */
        onAccessibleRemovedRootedDisplay: function( display ) {
          if ( display._accessible && this.canHaveAccessibleDisplays() ) {
            this.removeAccessibleDisplays( [ display ] );
          }
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
        },

        /**
         * Update all AccessiblePeers representing this node with the callback, which takes the AccessiblePeer
         * as an argument.
         * @private
         * @param {function} callback
         */
        updateAccessiblePeers: function( callback ) {
          for ( var i = 0; i < this._accessibleInstances.length; i++ ) {
            this._accessibleInstances[ i ].peer && callback( this._accessibleInstances[ i ].peer );
          }
        },

        /**
         * Returns whether we can have accessibleDisplays specified in our array.
         * @public (scenery-internal)
         *
         * @returns {boolean}
         */
        canHaveAccessibleDisplays: function() {
          return this.visible && !this._rendererSummary.isNotAccessible();
        },

        /**
         * Adds all of our accessible displays to our array (and propagates).
         * @private
         */
        addAllAccessibleDisplays: function() {
          assert && assert( this._accessibleDisplays.length === 0, 'Should be empty before adding everything' );
          assert && assert( this.canHaveAccessibleDisplays(), 'Should happen when we can store accessibleDisplays' );

          var i;
          var displays = [];

          // Concatenation of our parents' accessibleDisplays
          for ( i = 0; i < this._parents.length; i++ ) {
            Array.prototype.push.apply( displays, this._parents._accessibleDisplays );
          }

          // AND any acessible displays rooted at this node
          for ( i = 0; i < this._rootedDisplays.length; i++ ) {
            var display = this._rootedDisplays[ i ];
            if ( display._accessible ) {
              displays.push( display );
            }
          }

          this.addAccessibleDisplays( displays );
        },

        /**
         * Removes all of our accessible displays from our array (and propagates).
         * @private
         */
        removeAllAccessibleDisplays: function() {
          assert && assert( !this.canHaveAccessibleDisplays(), 'Should happen when we cannot store accessibleDisplays' );

          // TODO: is there a way to avoid a copy?
          this.removeAccessibleDisplays( this._accessibleDisplays.slice() );

          assert && assert( this._accessibleDisplays.length === 0, 'Should be empty after removing everything' );
        },

        /**
         * Adds a list of accessible displays to our internal list. See _accessibleDisplays documentation.
         * @public (scenery-internal)
         *
         * @param {Array.<Display>} displays
         */
        addAccessibleDisplays: function( displays ) {
          assert && assert( Array.isArray( displays ) );

          if ( displays.length === 0 ) {
            return;
          }

          Array.prototype.push.apply( this._accessibleDisplays, displays );

          for ( var i = 0; i < this._children.length; i++ ) {
            var child = this._children[ i ];
            if ( child.canHaveAccessibleDisplays() ) {
              this._children[ i ].addAccessibleDisplays( displays );
            }
          }

          this.trigger0( 'accessibleDisplays' );
        },

        /**
         * Removes a list of accessible displays from our internal list. See _accessibleDisplays documentation.
         * @public (scenery-internal)
         *
         * @param {Array.<Display>} displays
         */
        removeAccessibleDisplays: function( displays ) {
          assert && assert( Array.isArray( displays ) );

          if ( displays.length === 0 ) {
            return;
          }

          var i;

          for ( i = displays.length - 1; i >= 0; i-- ) {
            var index = this._accessibleDisplays.lastIndexOf( displays[ i ] );
            assert && assert( index >= 0 );
            this._accessibleDisplays.splice( i, 1 );
          }

          for ( i = 0; i < this._children.length; i++ ) {
            var child = this._children[ i ];
            if ( child.canHaveAccessibleDisplays() ) {
              this._children[ i ].removeAccessibleDisplays( displays );
            }
          }

          this.trigger0( 'accessibleDisplays' );
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