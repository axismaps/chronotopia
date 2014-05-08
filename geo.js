var mapnik = require( 'mapnik' );

exports.mapnik_test = function( req, res )
{
	res.writeHead( 500, { 'Content-Type': 'text/plain' } );
	var map = new mapnik.Map( 256, 256 );
	map.load( stylesheet,
    	function( err, map )
    	{
			if( err ) res.end( err.message );
			map.zoomAll();
			var im = new mapnik.Image( 256, 256 );
			map.render( im, function( err, im )
			{
	        	if( err )
	        	{
	            	res.end( err.message );
				}
				else
				{
	            	im.encode( 'png', function( err, buffer )
	            	{
	                	if( err )
	                	{
	                    	res.end( err.message );
						}
						else
						{
	                    	res.writeHead( 200, { 'Content-Type' : 'image/png' } );
							res.end(buffer);
						}
					});
				}
			});
		}
	);
}