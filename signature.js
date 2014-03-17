( function( $ ) {
	var currentContext;
	var stroke;
	
	/*  Drawing during dragging is done using integers because that can be faster,
	 *  depending on the implementation of the canvas.
	 *  A bitwise or with 0 is the fastest way to round a number.
	 *  Coordinates are stored unrounded for greater precision when resizing the canvas.
	 */
	
	function startLine( canvas, x, y ) {
		currentContext = canvas.getContext( '2d' );
		currentContext.beginPath();
		currentContext.moveTo( x | 0, y | 0 );
		stroke = [ [ x, y ] ];
	}

	function drawLine( x, y ) {
		if( currentContext ) {
			currentContext.lineTo( x | 0, y | 0 );
			// Draw immediatly.
			currentContext.stroke();
			stroke.push( [ x, y ] );
		}
	}

	function endLine( canvas ) {
		if( currentContext ) {
			var scale = canvas.resultScale;
			var i;

			// Compute strokes to the right scale for the result canvas.
			for( i = 0; i < stroke.length; i++ ) {
				stroke[ i ][ 0 ] = stroke[ i ][ 0 ] / scale;
				stroke[ i ][ 1 ] = stroke[ i ][ 1 ] / scale;
			}

			// Add the entire stroke to result canvas.
			// Do this without rounding, to get a higher precision image.
			if( stroke.length > 1 ) {
				var resultContext = canvas.resultCanvas.getContext( '2d' );
				resultContext.beginPath();
				resultContext.moveTo( stroke[ 0 ][ 0 ], stroke[ 0 ][ 1 ] );
				for( i = 1; i < stroke.length; i++ ) {
					resultContext.lineTo( stroke[ i ][ 0 ], stroke[ i ][ 1 ] );
				}
				resultContext.stroke();
			}

			// Remember stroke and reset variables.
			canvas.resultCoords.push( stroke );
			currentContext = undefined;
			stroke = undefined;
		}
	}
	
	var methods = {
		init : function( resultWidth, resultHeight, initialCoords ) {
			// Set resultWidth and resultHeight to default values if no value is provided.
			if( resultWidth === undefined ) {
				resultWidth = 320;
			}
			if( resultHeight === undefined ) {
				resultHeight = 160;
			}
			var ratio = resultWidth / resultHeight;
			
			this.filter( 'canvas' ).each( function() {
				var sig = this;
				var $sig = $( this );
				var parent = $sig.parent();
				$( window ).one( 'resize', function( e ) {
					if( $.contains( document.documentElement, sig ) ) {
						// Re-initialize the signature control and redraw the signature.
						// This will also add this handler again.
						$sig.signature( 'init', resultWidth, resultHeight, sig.resultCoords );
					}
					// else: sognature is no longer in the DOM, doing nothing will remove this handler ('one').
				} );
				
				// Determine maximum canvas size.
				maxWidth = parent.width();
				maxWidth -= parseInt( $sig.css( 'border-left-width' ), 10 );
				maxWidth -= parseInt( $sig.css( 'border-right-width' ), 10 );
				maxHeight = parent.height();
				maxHeight -= parseInt( $sig.css( 'border-top-width' ), 10 );
				maxHeight -= parseInt( $sig.css( 'border-bottom-width' ), 10 );
				// Set the size of the canvas to the maximum size within the parent with the given ratio.
				if( maxWidth > maxHeight * ratio ) {
					sig.width = maxHeight * ratio;
					sig.height = maxHeight;
				}
				else {
					sig.width = maxWidth;
					sig.height = maxWidth / ratio;
				}
				
				// Create and add a hidden result canvas.
				var resultCanvas = document.createElement( 'canvas' );
				resultCanvas.width = resultWidth;
				resultCanvas.height = resultHeight;
				sig.resultCanvas = resultCanvas;
				sig.resultScale = sig.width / resultWidth;
				sig.resultCoords = [];

				// Set styling for both canvasses. 
				var ctx = sig.getContext( '2d' );
				ctx.lineWidth = sig.resultScale * 2;
				ctx = sig.resultCanvas.getContext( '2d' );
				// Change background to white transparent.
				var bg = ctx.createImageData( resultWidth, resultHeight );
				for( var i = 0; i < bg.data.length; i += 4 ) {
					bg.data[ i + 0 ] = 255; // R
					bg.data[ i + 1 ] = 255; // G
					bg.data[ i + 2 ] = 255; // B
					// Transparency, must be > 0 to display right in Crystal Reports.
					// bg.data[ i + 3 ] = 1;
					// Unfortunately this does not work well on Android, so make white.
					bg.data[ i + 3 ] = 255;
				}
				ctx.putImageData( bg, 0, 0 );
				// Put the current date in light gray on the background.
				ctx.font = 'bold 60px OpenSans, arial';
				ctx.textAlign = 'center';
				ctx.textBaseline = 'middle';
				ctx.fillStyle = '#ddd';
				var date = new Date();
				var d = date.getDate();
				var m = date.getMonth() + 1; // Months are zero based
				var y = date.getFullYear();
				ctx.fillText( d + '-' + m + '-' + y , 160, 80 );
				// Reset fill style and stroke style (some browsers need this).
				ctx.fillStyle = 'black';
				ctx.strokeStyle = 'black';
				ctx.lineWidth = 2;
				
				// If any coordinates are passed, redraw the signature.
				if( initialCoords !== undefined ) {
					$.each( initialCoords, function() {
						var first = true;
						$.each( this, function() {
							// Coordinates are scaled to the result canvas.
							var x = this[ 0 ] * sig.resultScale;
							var y = this[ 1 ] * sig.resultScale;
							if( first ) {
								startLine( sig, x, y );
								first = false;
							}
							else {
								drawLine( x, y );
							}
						} );
						endLine( sig );
					} );
				}
			} );

			if( this[ 0 ].ontouchmove === undefined || !$has.touch ) {
				// Mouse driven device.
				this.filter( 'canvas' ).on( 'mousedown', function( e ) {
					startLine( this, e.offsetX, e.offsetY );
				} );

				this.filter( 'canvas' ).on( 'mousemove', function( e ) {
					drawLine( e.offsetX, e.offsetY );
				} );

				this.filter( 'canvas' ).on( 'mouseup mouseout', function( e ) {
					endLine( this );
				} );
			}
			else {
				// Touch device.
				this.filter( 'canvas' ).on( 'touchstart', function( e ) {
					var org = e.originalEvent.touches[ 0 ];
					var offset = $( this ).offset();
					startLine( this, org.pageX - offset.left, org.pageY - offset.top );
				} );

				this.filter( 'canvas' ).on( 'touchmove', function( e ) {
					// Prevents scrolling.
					e.preventDefault();
					var org = e.originalEvent.touches[ 0 ];
					var offset = $( this ).offset();
					drawLine( org.pageX - offset.left, org.pageY - offset.top );
				} );

				this.filter( 'canvas' ).on( 'touchend', function( e ) {
					endLine( this );
				} );
			}
			
			return this;
		},
		
		reset : function() {
			this.filter( 'canvas' ).each( function() {
				if( this.resultCanvas ) {
					// This does not work on the RhoSimulator.
					// After reset the previous set signature will be redrawn.
					this.width = this.width;
					this.resultCanvas.width = this.resultCanvas.width;
					this.resultCoords = [];
				}
			} );
			return this;
		},
		
		dataUrl : function() {
			var canvas;
			this.filter( 'canvas' ).each( function() {
				if( this.resultCanvas ) {
					canvas = this.resultCanvas;
					return;
				}
			} );
			if( canvas ) {
				return canvas.toDataURL( 'image/png' );
			}
			else {
				// Return empty data.
				return 'data:image/png;base64,';
			}
		},
		
		pngData : function() {
			dataUrl = this.signature( 'dataUrl' ); 
			return dataUrl.substring( dataUrl.indexOf( ',' ) + 1 );
		},
		
		coordData : function() {
			var coords;
			// Find the first canvas with coordinates.
			this.filter( 'canvas' ).each( function() {
				if( this.resultCoords ) {
					coords = this.resultCoords;
					return;
				}
			} );
			// Make a rounded copy of all the coordinates.
			if( coords ) {
				var result = [];
				$.each( coords, function() {
					var stroke = [];
					$.each( this, function() {
						stroke.push( [ this[ 0 ] | 0, this[ 1 ] | 0 ] );
					} );
					result.push( stroke );
				} );
				return result;
			}
			else {
				// Return empty data.
				return [];
			}
		},
		
		coordString : function() {
			var resultStrokes = [];
			this.signature( 'coordData' ).forEach( function( stroke ) {
				resultStrokes.push( stroke.join( ',' ) );
			} );
			return resultStrokes.join( ':' );
		}
	};

	$.fn.signature = function( method ) {
		// Method calling logic.
		if( methods[ method ] ) {
			return methods[ method ].apply( this, Array.prototype.slice.call( arguments, 1 ) );
		} else if( typeof method === 'object' || !method ) {
			return methods.init.apply( this, arguments );
		} else {
			$.error( 'Method ' +  method + ' does not exist on jQuery.signature' );
		}    
	};
} ) ( jQuery );
