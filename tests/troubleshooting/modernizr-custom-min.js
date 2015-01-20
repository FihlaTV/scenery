/* Modernizr 2.6.2 (Custom Build) | MIT & BSD
 * Build: http://modernizr.com/download/#-borderradius-boxshadow-flexbox-hsla-opacity-rgba-cssanimations-generatedcontent-cssgradients-csstransforms-csstransforms3d-applicationcache-canvas-canvastext-history-audio-video-input-inputtypes-localstorage-postmessage-websockets-webworkers-inlinesvg-svg-svgclippaths-touch-webgl-prefixed-teststyles-testprop-testallprops-prefixes-domprefixes-es5_strictmode-fullscreen_api-json-requestanimationframe-svg_filters-url_data_uri
 */
;
window.Modernizr = function( a, b, c ) {
  function A( a ) {i.cssText = a}

  function B( a, b ) {return A( m.join( a + ";" ) + (b || "") )}

  function C( a, b ) {return typeof a === b}

  function D( a, b ) {return !!~("" + a).indexOf( b )}

  function E( a, b ) {
    for ( var d in a ) {
      var e = a[ d ];
      if ( !D( e, "-" ) && i[ e ] !== c ) {
        return b == "pfx" ? e : !0
      }
    }
    return !1
  }

  function F( a, b, d ) {
    for ( var e in a ) {
      var f = b[ a[ e ] ];
      if ( f !== c ) {
        return d === !1 ? a[ e ] : C( f, "function" ) ? f.bind( d || b ) : f
      }
    }
    return !1
  }

  function G( a, b, c ) {
    var d = a.charAt( 0 ).toUpperCase() + a.slice( 1 ), e = (a + " " + o.join( d + " " ) + d).split( " " );
    return C( b, "string" ) || C( b, "undefined" ) ? E( e, b ) : (e = (a + " " + p.join( d + " " ) + d).split( " " ), F( e, b, c ))
  }

  function H() {
    e.input = function( c ) {
      for ( var d = 0, e = c.length; d < e; d++ ) {
        t[ c[ d ] ] = c[ d ]in j;
      }
      return t.list && (t.list = !!b.createElement( "datalist" ) && !!a.HTMLDataListElement), t
    }( "autocomplete autofocus list placeholder max min multiple pattern required step".split( " " ) ), e.inputtypes = function( a ) {
      for ( var d = 0, e, g, h, i = a.length; d < i; d++ ) {
        j.setAttribute( "type", g = a[ d ] ), e = j.type !== "text", e && (j.value = k, j.style.cssText = "position:absolute;visibility:hidden;", /^range$/.test( g ) && j.style.WebkitAppearance !== c ? (f.appendChild( j ), h = b.defaultView, e = h.getComputedStyle && h.getComputedStyle( j, null ).WebkitAppearance !== "textfield" && j.offsetHeight !== 0, f.removeChild( j )) : /^(search|tel)$/.test( g ) || (/^(url|email)$/.test( g ) ? e = j.checkValidity && j.checkValidity() === !1 : e = j.value != k)), s[ a[ d ] ] = !!e;
      }
      return s
    }( "search tel url email datetime date month week time datetime-local number range color".split( " " ) )
  }

  var d = "2.6.2", e = {}, f = b.documentElement, g = "modernizr", h = b.createElement( g ), i = h.style, j = b.createElement( "input" ), k = ":)", l = {}.toString, m = " -webkit- -moz- -o- -ms- ".split( " " ), n = "Webkit Moz O ms", o = n.split( " " ), p = n.toLowerCase().split( " " ), q = { svg: "http://www.w3.org/2000/svg" }, r = {}, s = {}, t = {}, u = [], v = u.slice, w, x = function( a, c, d, e ) {
    var h, i, j, k, l = b.createElement( "div" ), m = b.body, n = m || b.createElement( "body" );
    if ( parseInt( d, 10 ) ) {
      while ( d-- ) {
        j = b.createElement( "div" ), j.id = e ? e[ d ] : g + (d + 1), l.appendChild( j );
      }
    }
    return h = [ "&#173;", '<style id="s', g, '">', a, "</style>" ].join( "" ), l.id = g, (m ? l : n).innerHTML += h, n.appendChild( l ), m || (n.style.background = "", n.style.overflow = "hidden", k = f.style.overflow, f.style.overflow = "hidden", f.appendChild( n )), i = c( l, a ), m ? l.parentNode.removeChild( l ) : (n.parentNode.removeChild( n ), f.style.overflow = k), !!i
  }, y = {}.hasOwnProperty, z;
  !C( y, "undefined" ) && !C( y.call, "undefined" ) ? z = function( a, b ) {return y.call( a, b )} : z = function( a, b ) {return b in a && C( a.constructor.prototype[ b ], "undefined" )}, Function.prototype.bind || (Function.prototype.bind = function( b ) {
    var c = this;
    if ( typeof c != "function" ) {
      throw new TypeError;
    }
    var d = v.call( arguments, 1 ), e = function() {
      if ( this instanceof e ) {
        var a = function() {};
        a.prototype = c.prototype;
        var f = new a, g = c.apply( f, d.concat( v.call( arguments ) ) );
        return Object( g ) === g ? g : f
      }
      return c.apply( b, d.concat( v.call( arguments ) ) )
    };
    return e
  }), r.flexbox = function() {return G( "flexWrap" )}, r.canvas = function() {
    var a = b.createElement( "canvas" );
    return !!a.getContext && !!a.getContext( "2d" )
  }, r.canvastext = function() {return !!e.canvas && !!C( b.createElement( "canvas" ).getContext( "2d" ).fillText, "function" )}, r.webgl = function() {return !!a.WebGLRenderingContext}, r.touch = function() {
    var c;
    return "ontouchstart"in a || a.DocumentTouch && b instanceof DocumentTouch ? c = !0 : x( [ "@media (", m.join( "touch-enabled),(" ), g, ")", "{#modernizr{top:9px;position:absolute}}" ].join( "" ), function( a ) {c = a.offsetTop === 9} ), c
  }, r.postmessage = function() {return !!a.postMessage}, r.history = function() {return !!a.history && !!history.pushState}, r.websockets = function() {return "WebSocket"in a || "MozWebSocket"in a}, r.rgba = function() {return A( "background-color:rgba(150,255,150,.5)" ), D( i.backgroundColor, "rgba" )}, r.hsla = function() {return A( "background-color:hsla(120,40%,100%,.5)" ), D( i.backgroundColor, "rgba" ) || D( i.backgroundColor, "hsla" )}, r.borderradius = function() {return G( "borderRadius" )}, r.boxshadow = function() {return G( "boxShadow" )}, r.opacity = function() {return B( "opacity:.55" ), /^0.55$/.test( i.opacity )}, r.cssanimations = function() {return G( "animationName" )}, r.cssgradients = function() {
    var a = "background-image:", b = "gradient(linear,left top,right bottom,from(#9f9),to(white));", c = "linear-gradient(left top,#9f9, white);";
    return A( (a + "-webkit- ".split( " " ).join( b + a ) + m.join( c + a )).slice( 0, -a.length ) ), D( i.backgroundImage, "gradient" )
  }, r.csstransforms = function() {return !!G( "transform" )}, r.csstransforms3d = function() {
    var a = !!G( "perspective" );
    return a && "webkitPerspective"in f.style && x( "@media (transform-3d),(-webkit-transform-3d){#modernizr{left:9px;position:absolute;height:3px;}}", function( b, c ) {a = b.offsetLeft === 9 && b.offsetHeight === 3} ), a
  }, r.generatedcontent = function() {
    var a;
    return x( [ "#", g, "{font:0/0 a}#", g, ':after{content:"', k, '";visibility:hidden;font:3px/1 a}' ].join( "" ), function( b ) {a = b.offsetHeight >= 3} ), a
  }, r.video = function() {
    var a = b.createElement( "video" ), c = !1;
    try {
      if ( c = !!a.canPlayType ) {
        c = new Boolean( c ), c.ogg = a.canPlayType( 'video/ogg; codecs="theora"' ).replace( /^no$/, "" ), c.h264 = a.canPlayType( 'video/mp4; codecs="avc1.42E01E"' ).replace( /^no$/, "" ), c.webm = a.canPlayType( 'video/webm; codecs="vp8, vorbis"' ).replace( /^no$/, "" )
      }
    }
    catch( d ) {}
    return c
  }, r.audio = function() {
    var a = b.createElement( "audio" ), c = !1;
    try {
      if ( c = !!a.canPlayType ) {
        c = new Boolean( c ), c.ogg = a.canPlayType( 'audio/ogg; codecs="vorbis"' ).replace( /^no$/, "" ), c.mp3 = a.canPlayType( "audio/mpeg;" ).replace( /^no$/, "" ), c.wav = a.canPlayType( 'audio/wav; codecs="1"' ).replace( /^no$/, "" ), c.m4a = (a.canPlayType( "audio/x-m4a;" ) || a.canPlayType( "audio/aac;" )).replace( /^no$/, "" )
      }
    }
    catch( d ) {}
    return c
  }, r.localstorage = function() {
    try {return localStorage.setItem( g, g ), localStorage.removeItem( g ), !0}
    catch( a ) {return !1}
  }, r.webworkers = function() {return !!a.Worker}, r.applicationcache = function() {return !!a.applicationCache}, r.svg = function() {return !!b.createElementNS && !!b.createElementNS( q.svg, "svg" ).createSVGRect}, r.inlinesvg = function() {
    var a = b.createElement( "div" );
    return a.innerHTML = "<svg/>", (a.firstChild && a.firstChild.namespaceURI) == q.svg
  }, r.svgclippaths = function() {return !!b.createElementNS && /SVGClipPath/.test( l.call( b.createElementNS( q.svg, "clipPath" ) ) )};
  for ( var I in r ) {
    z( r, I ) && (w = I.toLowerCase(), e[ w ] = r[ I ](), u.push( (e[ w ] ? "" : "no-") + w ));
  }
  return e.input || H(), e.addTest = function( a, b ) {
    if ( typeof a == "object" ) {
      for ( var d in a ) {
        z( a, d ) && e.addTest( d, a[ d ] );
      }
    }
    else {
      a = a.toLowerCase();
      if ( e[ a ] !== c ) {
        return e;
      }
      b = typeof b == "function" ? b() : b, typeof enableClasses != "undefined" && enableClasses && (f.className += " " + (b ? "" : "no-") + a), e[ a ] = b
    }
    return e
  }, A( "" ), h = j = null, e._version = d, e._prefixes = m, e._domPrefixes = p, e._cssomPrefixes = o, e.testProp = function( a ) {return E( [ a ] )}, e.testAllProps = G, e.testStyles = x, e.prefixed = function( a, b, c ) {return b ? G( a, b, c ) : G( a, "pfx" )}, e
}( this, this.document ), Modernizr.addTest( "strictmode", function() {return function() {return "use strict", !this}()} ), Modernizr.addTest( "fullscreen", function() {
  for ( var a = 0; a < Modernizr._domPrefixes.length; a++ ) {
    if ( document[ Modernizr._domPrefixes[ a ].toLowerCase() + "CancelFullScreen" ] ) {
      return !0;
    }
  }
  return !!document.cancelFullScreen || !1
} ), Modernizr.addTest( "json", !!window.JSON && !!JSON.parse ), Modernizr.addTest( "raf", !!Modernizr.prefixed( "requestAnimationFrame", window ) ), Modernizr.addTest( "svgfilters", function() {
  var a = !1;
  try {a = typeof SVGFEColorMatrixElement !== undefined && SVGFEColorMatrixElement.SVG_FECOLORMATRIX_TYPE_SATURATE == 2}
  catch( b ) {}
  return a
} ), function() {
  var a = new Image;
  a.onerror = function() {Modernizr.addTest( "datauri", function() {return !1} )}, a.onload = function() {Modernizr.addTest( "datauri", function() {return a.width == 1 && a.height == 1} )}, a.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=="
}();
