var map,
	tiles = {},
	base;
	visual = {},
	rasters = {},
	shown = {},
	highlight = {},
  probeZoom = .5,
	maxBounds = [ [ -23.10243406, -44.04944719  ], [ -22.63003187, -42.65988214 ] ];

function init_map()
{
	map_loading( true );
	map = L.map( 'map', {
		center: [ -22.9046, -43.1919 ],
		zoom: 15,
		minZoom : 13,
		maxZoom : 18,
		doubleClickZoom : false,
		zoomControl: false,
		maxBounds : maxBounds
	})
	.on( "click", probe )
  .on( "zoomend", function(){
    var zoom = map.getZoom();
    switch ( zoom ){
      case 15:
        probeZoom = .5;
        break;
      case 16:
        probeZoom = .35;
        break;
      case 17:
        probeZoom = .2;
        break;
      default:
        probeZoom = .6;
        break;
    }
  })
	.on( "locationfound", function(l){
		if( L.latLngBounds( maxBounds ).contains( l.latlng ) )
		{
			map.locate( { setView: true, maxZoom: 16, watch: true });
			yahIcon.setLatLng( l.latlng );
		}
		else
		{
			map.stopLocate();
			alert( lang === "pr" ? pr.locationOutsideBounds : en.locationOutsideBounds );
		}
	})
	.on( "locationerror", function(){
		map.stopLocate();
		alert( lang === "pr" ? pr.locationerror : en.locationerror );
	});

	if( $( "html" ).hasClass( "canvas" ) )
	{
		$( "#export" ).click( export_map );
	}
	else
	{
		$( "#export" ).hide();
	}

	// Set up controls
	if ( $( window ).width() > 650 )
	{
		map.addControl(L.control.zoom( { position: 'topleft' } ) );
	}
	// mobile with geolocation control
	else
	{
		map.addControl( L.control.zoom( { position: 'bottomright' } ) );

		var geo = L.control( { position: 'bottomright' } );
		geo.onAdd = function ( map ) {
			var $div = $( '<div>' )
				.addClass( 'geolocate leaflet-bar' )
				.html( '<i class="icon icon-target"></i>' );
			this._div = $div[0];

			L.DomEvent.addListener( this._div, 'click', function () {
				if( $( ".geolocate" ).hasClass( "selected" ) ) {
					map.stopLocate();
					$( ".geolocate" ).removeClass( "selected" );
				} else {
					map.locate();
				}
			});

			return this._div;
		}
		geo.addTo( map );
	}

	yahIcon = L.marker( [ -22.908695, -43.193135 ],
		{
			icon : L.divIcon(
			{
				className : 'you-are-here-icon',
				html: '<i class="icon icon-sort-up"></i>',
				iconAnchor: L.point(6, 6),
				rotationOrigin: 'center center'
			} )
		} ).addTo( map ); //TODO - hide the icon on first run, after testing


		/* Device Orientation Events */

		// For Chrome 50+
		if ('ondeviceorientationabsolute' in window) {
			console.log('chrome 50+');
			$( ".you-are-here-icon i" ).show();
			window.addEventListener('deviceorientationabsolute', function(event) {
				// console.log(event.alpha, event.beta, event.gamma);
				// alert(event.alpha);
				compassdir = compassHeading(event.alpha, event.beta, event.gamma);
				// alert(compassdir);
				yahIcon.setRotationAngle(compassdir);
			});
		// Other Browsers
		} else if (window.DeviceOrientationEvent) {
			console.log('safari or <50 Chrome');
		  window.addEventListener('deviceorientation', function(event) {
				$( ".you-are-here-icon i" ).hide();
				// Safari
				if( event.webkitCompassHeading )
				{
      		var compassdir = event.webkitCompassHeading;
    		}
				// Chrome <50
				else if ( event.absolute === true )
				{
    			compassdir = compassHeading(event.alpha, event.beta, event.gamma);
    		}
				else {
					console.log('here');
					return;
				}

				$( ".you-are-here-icon i" ).show();
				yahIcon.setRotationAngle(compassdir);
		  });
		} else {
			$( ".you-are-here-icon i" ).hide();
		}

	$( ".leaflet-control-zoom" ).addClass( 'open' );
}

function load_base()
{
	if( map.hasLayer( base ) ) map.removeLayer( base );

	base = L.tileLayer( tileserver + year + '/base/{z}/{x}/{y}.png' ).addTo( map );
}

function load_tiles()
{
	clear_highlight();
	map_loading( true );
	if( tiles[ year ] && off.length == 0 ){
		map.addLayer( tiles[ year ].setOpacity( 0 ) );
	}else{
    var layerstring = off.length == 0 ? 'all' : off.sort().join( "," );
		var t = L.tileLayer( tileserver  + year + '/' + layerstring + '/{z}/{x}/{y}.png'  )
					.addTo( map )
					.setOpacity( 0 )
					.on( "load", function()
					{
						show_tiles( this );
					});

		if( off.length == 0 ) tiles[ year ] = t;
	}
	load_visual();
}

function show_tiles( tile )
{
	if( !_.isEqual( shown.tiles, tile ) )
	{
		if( shown.tiles ) map.removeLayer( tile_fadeOut( shown.tiles ) );
		shown.tiles = tile_fadeIn( tile );
	}
}

function probe( e )
{
	cursor_loading( true, e.containerPoint );
	// clear_highlight();
	clear_results( "probe" );

	$.getJSON( server + "/probe/" + year + "/" + probeZoom + "/" + e.latlng.lng + "," + e.latlng.lat + "/" + off.join( "," ), function( json )
	{
		_.each( json, function( l ){ add_result( l.name, l.id, l.layer, $( "#results .probe" ) ); });

		if( $( ".result" ).length > 0 )	$( "#results, #wrapper" ).addClass( "open-probe" );
		else $( "#results, #wrapper" ).removeClass( "open-probe" );
		resize();
		map.invalidateSize();
		cursor_loading( false );
	})
}

function draw( id, route, el, callback )
{
	clear_highlight();

	route = route ? route : "draw";
	var styles = get_styles( "#1a1a1a" );

	highlight.bottom = omnivore.geojson( server + "/" + route + "/" + year + "/" + encodeURIComponent( id ), null, styles.bottom )
				.on( 'ready', function(){
  				var intersect = false;
  				this.eachLayer( function( layer ){
    				if( map.getBounds().intersects( layer.getBounds() ) ) intersect = true;
          })

          if( intersect === false ){
            if( map.getBoundsZoom( this.getBounds() ) <= map.getMinZoom() ) {
              map.setZoom( map.getMinZoom() );
            } else {
              map.fitBounds( this.getBounds(), { paddingTopLeft : [ 265, 165 ] } );
            }
          }
          if( callback ) callback( el );
				})
				.addTo( map );
	highlight.top = omnivore.geojson( server + "/" + route + "/" + year + "/" + encodeURIComponent( id ), null, styles.top ).addTo( map );
}

function load_raster( id )
{
	if( map.hasLayer( shown.raster ) )
	{
		map.removeLayer( shown.raster );
		shown.tiles.setOpacity( 1 );
	}
	if( id !== false )
	{
		if( rasters[ id ] )
		{
			map.addLayer( rasters[ id ] );
      rasters[ id ].bringToFront();
		}
		else
		{
			rasters[ id ] = L.tileLayer( rasterserver + id + '/{z}/{x}/{y}.png' ).addTo( map ).setOpacity( 0.75 );
			rasters[ id ].bringToBack();
			base.bringToBack();
		}
		shown.tiles.setOpacity( 0.75 );
		shown.raster = rasters[ id ];
	}
}

function tile_fadeOut( tile_out )
{
	var i = 1;
	var timer = setInterval( function()
	{
		i -= 0.1;
		if( i <= 0 ) clearInterval( timer );
		tile_out.setOpacity( Math.max( 0, i ) );
	}, 50 );

	return tile_out;
}

function tile_fadeIn( tile_in )
{
	var i = 0;
	var timer = setInterval( function()
	{
		i += 0.1;
		if( i >= 1 )
		{
			clearInterval( timer );
			map_loading( false );
		}
		tile_in.setOpacity( Math.min( 1, i ) );
	}, 50 );

	return tile_in;
}

function clear_highlight()
{
	if( !map.hasLayer( highlight.top ) ) return false;
	map.removeLayer( highlight.top );
	map.removeLayer( highlight.bottom );
}

function get_styles( color )
{
	var topStyle = {
      		color: color,
      		fillColor: color,
      		fillOpacity : 0.2,
      		weight : 2,
      		radius : 4
      },
      bottomStyle = {
      		color: color,
      		fillColor: color,
      		fillOpacity : 0,
      		opacity : 0.2,
      		weight : 6,
      		radius : 4
      	};

	var topLayer = L.geoJson( null, {
	    style : function( feature )
	    {
        	return topStyle;
		  },
		  pointToLayer: function( feature, latlng )
		  {
        return L.circleMarker( latlng, topStyle );
      },
      onEachFeature: function( feature, layer )
      {
        layer.on( 'click', probe );
      }
	});

	var bottomLayer = L.geoJson( null, {
	    style : function( feature )
	    {
        	return bottomStyle;
		  },
		  pointToLayer: function( feature, latlng )
		  {
        return L.circleMarker( latlng, bottomStyle );
      },
      onEachFeature: function( feature, layer )
      {
        layer.on( 'click', probe );
      }
	});

	return { top : topLayer, bottom : bottomLayer };
}

function export_map()
{
  $( "#export" ).addClass( "loading" );
	var layerstring = off.length == 0 ? 'all' : off.sort().join( "," );
	var raster = map.hasLayer( shown.raster ) ? shown.raster._url.replace( /.*raster\/(.*?)\/.*/g, "$1" ) : 'null';
	var url = server + "/export/" + lang + "/" + year + "/" + layerstring + "/" + raster + "/" + map.getBounds().toBBoxString() + "/";
	document.getElementById( 'download_iframe' ).src = url;
	window.setTimeout( function(){ $( "#export" ).removeClass( "loading" ); }, 2000 );
}

function compassHeading( alpha, beta, gamma )
{
	var degtorad = Math.PI / 180; // Degree-to-Radian conversion

  var _x = beta  ? beta  * degtorad : 0; // beta value
  var _y = gamma ? gamma * degtorad : 0; // gamma value
  var _z = alpha ? alpha * degtorad : 0; // alpha value

  var cX = Math.cos( _x );
  var cY = Math.cos( _y );
  var cZ = Math.cos( _z );
  var sX = Math.sin( _x );
  var sY = Math.sin( _y );
  var sZ = Math.sin( _z );

  // Calculate Vx and Vy components
  var Vx = - cZ * sY - sZ * sX * cY;
  var Vy = - sZ * sY + cZ * sX * cY;

  // Calculate compass heading
  var compassHeading = Math.atan( Vx / Vy );

  // Convert compass heading to use whole unit circle
  if( Vy < 0 ) {
    compassHeading += Math.PI;
  } else if( Vx < 0 ) {
    compassHeading += 2 * Math.PI;
  }

  return compassHeading * ( 180 / Math.PI ); // Compass Heading (in degrees)
}
