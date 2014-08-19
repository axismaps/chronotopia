var pg = require( 'pg' ),
	_ = require( 'underscore' ),
	conn = "postgres://pg_query_user:U6glEdd0igS2@localhost/rio";
	
_.mixin({
  // ### _.objMap
  // _.map for objects, keeps key/value associations
  objMap: function (input, mapper, context) {
    return _.reduce(input, function (obj, v, k) {
             obj[k] = mapper.call(context, v, k, input);
             return obj;
           }, {}, context);
  },
  // ### _.objFilter
  // _.filter for objects, keeps key/value associations
  // but only includes the properties that pass test().
  objFilter: function (input, test, context) {
    return _.reduce(input, function (obj, v, k) {
             if (test.call(context, v, k, input)) {
               obj[k] = v;
             }
             return obj;
           }, {}, context);
  }
});
	
exports.timeline = function( req, res )
{
	var client = new pg.Client( conn );
	client.connect();
	
	var years = [];
	
	var query = client.query( "SELECT * FROM ( SELECT firstdispl  AS year FROM basepoint UNION SELECT lastdispla AS year FROM basepoint UNION SELECT firstdispl AS year FROM baseline UNION SELECT lastdispla AS year FROM baseline UNION SELECT firstdispl AS year FROM basepoly UNION SELECT lastdispla AS year FROM basepoly UNION SELECT earliestda AS year FROM visualpoly UNION SELECT latestdate AS year FROM visualpoly ) as q ORDER BY year" );
	
	query.on( 'row', function( result )
	{
		years.push( result.year );
	});
	
	query.on( 'end', function()
	{
		years.pop();
		res.send( years );
		client.end();
	});
}

exports.layers = function( req, res )
{
	var client = new pg.Client( conn );
	client.connect();

	var year = req.params.year;	
	var q = "SELECT * FROM ( SELECT q.*, l.fill, l.stroke, l.shape, l. ID FROM ( SELECT folder, geodatabas, layer, featuretyp FROM baseline WHERE firstdispl <= " + year + " AND lastdispla >= " + year + " GROUP BY folder, geodatabas, layer, featuretyp UNION SELECT folder, geodatabas, layer, featuretyp FROM basepoint WHERE firstdispl <= " + year + " AND lastdispla >= " + year + " GROUP BY folder, geodatabas, layer, featuretyp UNION SELECT folder, geodatabas, layer, featuretyp FROM basepoly WHERE firstdispl <= " + year + " AND lastdispla >= " + year + " GROUP BY folder, geodatabas, layer, featuretyp ) AS q LEFT OUTER JOIN legend AS l ON q.layer = l.layer AND ( q.featuretyp = l.featuretyp OR ( l.featuretyp IS NULL AND q.featuretyp IS NULL ) ) ) AS q2 WHERE fill IS NOT NULL OR folder = 'VisualDocuments' OR stroke IS NOT NULL OR shape IS NOT NULL ORDER BY folder, geodatabas, layer, featuretyp";
	
	var query = client.query( q ),
		arr = [],
		layers = {};
	query.on( 'row', function( result )
	{
		arr.push( result );
	});
	
	query.on( 'end', function()
	{
		_.each( arr, function( val )
		{
			if( !layers[ val.folder ] ) layers[ val.folder ] = {};
			if( !layers[ val.folder ][ val.geodatabas ] ) layers[ val.folder ][ val.geodatabas ] = {};
			if( !layers[ val.folder ][ val.geodatabas ][ val.layer ] )
			{
				layers[ val.folder ][ val.geodatabas ][ val.layer ] = {};
				layers[ val.folder ][ val.geodatabas ][ val.layer ].id = val.id;
				layers[ val.folder ][ val.geodatabas ][ val.layer ].features = [];
			}
			
			if( val.shape ) layers[ val.folder ][ val.geodatabas ][ val.layer ].style = { fill : val.fill, stroke : val.stroke, shape : val.shape };
			if( val.featuretyp ) layers[ val.folder ][ val.geodatabas ][ val.layer ].features.push( val.featuretyp );
		});
		
		res.send( layers );
		client.end();
	});
}

exports.raster = function( req, res )
{
	var client = new pg.Client( conn );
	client.connect();

	var year = req.params.year,
		q = "SELECT imageid AS id, 'SSID' || ssid AS file, imageviewd AS description FROM visualpoly WHERE earliestda <= " + year + " AND latestdate >= " + year + " AND layer = 'MapsAndPlansPoly'";
	
	var query = client.query( q ),
		arr = [];
	
	query.on( 'row', function( result )
	{
		arr.push( result );
	});
	
	query.on( 'end', function()
	{
		res.send( arr );
		client.end();
	});
}

exports.search = function( req, res )
{
	var client = new pg.Client( conn );
	client.connect();

	var year = req.params.year,
		word = req.params.word;
		
	var q = "SELECT array_agg( id ) as gid, namecomple, layer FROM ( SELECT globalidco AS id, namecomple, layer FROM basepoint WHERE namecomple ILIKE '%" + word + "%' AND firstdispl <= " + year + " AND lastdispla >= " + year + " UNION SELECT globalidco AS id, namecomple, layer FROM baseline WHERE namecomple ILIKE '%" + word + "%' AND firstdispl <= " + year + " AND lastdispla >= " + year + " UNION SELECT globalidco AS id, namecomple, layer FROM basepoly WHERE namecomple ILIKE '%" + word + "%' AND firstdispl <= " + year + " AND lastdispla >= " + year + " ) as q GROUP BY namecomple, layer LIMIT 5";
	
	var query = client.query( q ),
		names = {};
	
	query.on( 'row', function( result )
	{
		names[ result.namecomple ] = { id : result.gid, layer : result.layer };
	});
	
	query.on( 'end', function()
	{
		res.send( names );
		client.end();
	});
}

exports.plans = function( req, res )
{
	var client = new pg.Client( conn );
	client.connect();
	
	var plans = [];
	
	var query = client.query( "SELECT planyear, planname FROM plannedline UNION SELECT planyear, planname FROM plannedpoly" );
	
	query.on( 'row', function( result )
	{
		plans.push( result );
	});
	
	query.on( 'end', function()
	{
		plans = _.sortBy( plans, function( n ){ return parseInt( n.planyear.replace( /[^0-9].*/gi, "" ) ) } ); 
		res.send( plans );
		client.end();
	});
}

exports.details = function( req, res )
{
	var client = new pg.Client( conn );
	client.connect();
		
	var id = _.reduce( req.params.id.split( "," ), function( memo, i ){ return memo += "'" + i + "',"; }, "ANY(ARRAY[" ).replace( /,$/, "])" ),
		details = [];
	
	var query = client.query( "SELECT * FROM ( SELECT yearfirstd, yearlastdo, globalidco FROM basepoint WHERE globalidco = " + id + " UNION SELECT yearfirstd, yearlastdo, globalidco FROM baseline WHERE globalidco = " + id + " UNION SELECT yearfirstd, yearlastdo, globalidco FROM basepoly WHERE globalidco = " + id + ") AS q LEFT OUTER JOIN details AS d ON q.globalidco = d.globalidco" );
	
	query.on( 'row', function( result )
	{
		result.year = result.yearfirstd + " - " + result.yearlastdo;
		result = _.objFilter( _.omit( result, [ "globalidco", "yearfirstd", "yearlastdo" ] ), function( value )
		{
			return value != null;
		});
		details.push( result );
	});
	
	query.on( 'end', function()
	{
		res.send( details );
		client.end();
	});
}
exports.names = function( req, res )
{
	var client = new pg.Client( conn );
	client.connect();
	
	var names = {},
		lang = req.params.lang;
	
	var query = client.query( "SELECT * FROM names" );
	
	query.on( 'row', function( result )
	{
		names[ result.layer ] = result[ "name_" + lang ];
	});
	
	query.on( 'end', function()
	{
		res.send( names );
		client.end();
	});
}

exports.save = function( req, res )
{
	var b64string = req.body.imgdata.replace( " ", "+" );
	var buf = new Buffer( b64string, 'base64' );
	
	res.setHeader( 'Content-type', 'image/png' );
	res.setHeader( 'Content-Disposition', 'attachment; filename="' + req.body.name + '"' );
	res.send( buf );
}