

$().ready(function() {
	$('th').each( function() {
		var sTitle="fuck you";
		this.setAttribute( "title", "You can sort the results" );
		this.setAttribute("data-toggle","tooltip");
	} );
} );
