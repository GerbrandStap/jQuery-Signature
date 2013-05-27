( function( $ ) {
	var currentContext;
	var stroke;
	
	function startLine( canvas, x, y ) {
		// Using integers may be faster than using floats.
		// A bitwise or with 0 is the fastest way to round a number.
		x = x | 0;
		y = y | 0;
		currentContext = canvas.getContext( '2d' );
		currentContext.beginPath();
		currentContext.moveTo( x, y );
		stroke = [ [ x, y ] ];
	}

	function drawLine( x, y ) {
		if( currentContext ) {
			// Using integers may be faster than using floats.
			// A bitwise or with 0 is the fastest way to round a number.
			x = x | 0;
			y = y | 0;
			currentContext.lineTo( x, y );
			currentContext.stroke();
			stroke.push( [ x, y ] );
		}
	}

	function endLine( canvas ) {
		if( currentContext ) {
			var scale = canvas.resultScale;

			if( stroke.length > 1 ) {
				// Add stroke to result canvas.
				var resultContext = canvas.resultCanvas.getContext( '2d' );
				resultContext.beginPath();
				resultContext.moveTo( stroke[ 0 ][ 0 ] / scale, stroke[ 0 ][ 1 ] / scale );
				for( var i = 1; i < stroke.length; i++ ) {
					resultContext.lineTo( stroke[ i ][ 0 ] / scale, stroke[ i ][ 1 ] / scale );
				}
				resultContext.stroke();
			}

			// Compute strokes to the right scale and round them.
			for( var i = 0; i < stroke.length; i++ ) {
				stroke[ i ][ 0 ] = ( stroke[ i ][ 0 ] / scale ) | 0;
				stroke[ i ][ 1 ] = ( stroke[ i ][ 1 ] / scale ) | 0;
			}

			// Remember stroke and reset variables.
			canvas.resultCoords.push( stroke );
			currentContext = undefined;
			stroke = undefined;
		}
	}
	
	var methods = {
		init : function( resultWidth, resultHeight ) {
			// Set resultWidth and resultHeight to default values if no value is provided.
			if( resultWidth === undefined ) {
				resultWidth = 320;
			}
			if( resultHeight === undefined ) {
				resultHeight = 160;
			}
			var ratio = resultWidth / resultHeight;
			
			this.filter( 'canvas' ).each( function() {
				p = $( this ).parent();
				// Determine maximum canvas size.
				maxWidth = p.width();
				maxWidth -= parseInt( $( this ).css( 'border-left-width' ) );
				maxWidth -= parseInt( $( this ).css( 'border-right-width' ) );
				maxHeight = p.height();
				maxHeight -= parseInt( $( this ).css( 'border-top-width' ) );
				maxHeight -= parseInt( $( this ).css( 'border-bottom-width' ) );
				// Set the size of the canvas to the maximum size within the parent with the given ratio.
				if( maxWidth > maxHeight * ratio ) {
					this.width = maxHeight * ratio;
					this.height = maxHeight;
				}
				else {
					this.width = maxWidth;
					this.height = maxWidth / ratio;
				}
				
				// Create and add a hidden result canvas.
				var resultCanvas = document.createElement( 'canvas' );
				resultCanvas.width = resultWidth;
				resultCanvas.height = resultHeight;
				this.resultCanvas = resultCanvas;
				this.resultScale = this.width / resultWidth;
				this.resultCoords = [];
				// Set styling for both canvasses. 
				var ctx = this.getContext( '2d' );
				ctx.lineWidth = this.resultScale * 2;
				ctx = this.resultCanvas.getContext( '2d' );
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
				ctx.font = 'bold 60px open_sans_semibold, arial';
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
			var result;
			this.filter( 'canvas' ).each( function() {
				if( this.resultCoords ) {
					result = this.resultCoords;
					return;
				}
			} );
			if( result ) {
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