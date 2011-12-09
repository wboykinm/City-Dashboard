/* Author: Tobin Bradley

*/

$(document).ready(function() {
	
	// Dialogs
	$("#report-dialog").dialog({ width: 360, autoOpen: false, show: 'fade', hide: 'fade', modal: true });
	$("#tutorial-dialog").dialog({ width: 510, autoOpen: false, show: 'fade', hide: 'fade', modal: true	});
	
	// Click events
	$("#report").click(function(){ $('#report-dialog').dialog('open') });
	$("#translate").click(function(){ $('#google_translate_element').toggle() });
	$(".submit").click(function(){ $('#submit-dialog').dialog('open') });
	$("#tutorial").click(function(){ $('#tutorial-dialog').dialog('open') });
	$("#searchbox").click(function() { $(this).select(); });
	
	// Add elements to mapIndicie
    writebuffer = "";    
    $.each(FTmeta, function(index) {
       writebuffer += '<option value="' + this.field + '">' + capitaliseFirstLetter(this.category) + ': ' + this.title + '</option>';
    });
    $("#mapIndicie").append(writebuffer);
    
    // Select first element of mapIndicie
    $("#mapIndicie option").first().attr('selected', 'selected');
	
	// return to initial layout
	$("#selectNone").click(function(){
        $("#selected-summary").hide();          
        $("#welcome").show();
	});
	
	
	// Map measure drop down list
	$("#mapIndicie").change(function(){
        measure = FTmeta[$("#mapIndicie option:selected").val()];
		// Change map style
		styleFusionTable(measure);
		// update data
		if (!$("#selected-summary").is(':hidden'))  updateData(measure);
	});
	
	// Autocomplete
	$("#searchbox").autocomplete({
		 minLength: 4,
		 delay: 300,
		 source: function(request, response) {
		   
			  $.ajax({
				   url: wsbase + "v2/ws_geo_ubersearch.php",
				   dataType: "jsonp",
				   data: {
						searchtypes: "Address,Library,School,Park,GeoName,Road,CATS,Intersection,PID",
						query: request.term
				   },
				   success: function(data) {
						if (data.total_rows > 0) {
							 response($.map(data.rows, function(item) {
								  return {
									   label: urldecode(item.row.displaytext),
									   value: item.row.displaytext,
									   responsetype: item.row.responsetype,
									   responsetable: item.row.responsetable,
									   getfield: item.row.getfield,
									   getid: item.row.getid
								  }
							 }));
							
						}
						else if  (data.total_rows == 0) {
							 response($.map([{}], function(item) {
								  return {
									   // Message indicating nothing is found
									   label: "No records found."
								  }
							 }))
						}
						else if  (data.total_rows == -1) {
							 response($.map([{}], function(item) {
								  return {
									   // Message indicating no search performed
									   label: "More information needed for search."
								  }
							 }))
						}
				   }
			  })
		 },
		 select: function(event, ui) {
			  // Run function on selected record
			  if (ui.item.responsetype) {
				   locationFinder(ui.item.responsetype, ui.item.responsetable, ui.item.getfield, ui.item.getid, ui.item.label, ui.item.value);
			  }
		 }
	}).keypress(function(e) {
          if (e.keyCode === 13) $(this).autocomplete( "search");
     }).data("autocomplete")._renderMenu = function (ul, items) {
		 var self = this, currentCategory = "";
		 $.each( items, function( index, item ) {
			  if ( item.responsetype != currentCategory && item.responsetype != undefined) {
				   ul.append( "<li class='ui-autocomplete-category'>" + item.responsetype + "</li>" );
				   currentCategory = item.responsetype;
			  }
			  self._renderItem( ul, item );
		 });
	};
    
    // get county averages
	url = "https://www.google.com/fusiontables/api/query/?sql=SELECT AVERAGE(character_1), AVERAGE(character_2), AVERAGE(character_3), AVERAGE(engagement_1), AVERAGE(engagement_2), AVERAGE(engagement_3), AVERAGE(green_1), AVERAGE(green_2), AVERAGE(green_3), AVERAGE(health_1), AVERAGE(health_2), AVERAGE(health_3), AVERAGE(education_1), AVERAGE(education_2), AVERAGE(education_3), AVERAGE(safety_1), AVERAGE(safety_2), AVERAGE(safety_3), AVERAGE(housing_1), AVERAGE(housing_2), AVERAGE(housing_3), AVERAGE(economics_1), AVERAGE(economics_2), AVERAGE(economics_3) FROM 1844838&jsonCallback=?";
	$.getJSON(url, function(data) {					  						 
		if (data.table.rows.length > 0) {
			$.each(data.table.cols, function(i, item){
				countyAverage[item] = Math.round(data.table.rows[0][i]);
			});			
		}
		else {
			console.log("Unable to get county averages from Fusion Tables.");
		}
	});
  
});


/**
 * Window load events
 */
$(window).load(function(){
	// load map
	mapInit();

	// Detect arguments
	if (getUrlVars()["n"]) {		
		selectNeighborhoodByID(getUrlVars()["n"]);
	}
	if (getUrlVars()["m"]) {		
        $("#mapIndicie").val(getUrlVars()["m"]).attr('selected', 'selected');
        styleFusionTable(FTmeta[getUrlVars()["m"]]);
	}
});


/**
 * Assign data to active record
 */
function assignData(data) {
	//myjson[feature.attributes.precno] = feature.attributes.cc;
	$.each(data.cols, function(i, item){
		activeRecord[item] = data.rows[0][i];
	});
	
}


/**
 * Update detailed data
 */
function updateData(measure) {
    // set neighborhood overview
	$("#selectedNeighborhood").html("Neighborhood " + activeRecord.ID);	
    
    // set details info
	$(".measureDetails h3").html(capitaliseFirstLetter(measure.category) + ': ' + measure.title);
    $("#indicator_description").html(measure.description);
    $("#indicator_why").html(measure.importance);
    $("#indicator_technical").html(measure.tech_notes);
    $("#indicator_source").html(measure.source);
    $("#indicator_resources").html(measure.links);
    
    // create permalink
	permalink();
    
    // Show
    $("#welcome").hide();
    $("#selected-summary").show('slow');    
    
	// update chart
    // summary needs to be visible before this runs or it causes rendering bugs on IE and Firefox
	drawVisualization([["Neighborhood", activeRecord[measure.field]], ["County Average", countyAverage["AVERAGE(" + measure.field + ")"]]], [2012], "details_chart");
	
}


/**
 * Draw detail charts
 */
function drawVisualization(raw_data, years, element) {
	// Create and populate the data table.
	var data = new google.visualization.DataTable();
		 
	data.addColumn('string', 'Year');
	for (var i = 0; i  < raw_data.length; ++i) {
	  data.addColumn('number', raw_data[i][0]);    
	}
	
	data.addRows(years.length);
   
	for (var j = 0; j < years.length; ++j) {    
	  data.setValue(j, 0, years[j].toString());    
	}
	for (var i = 0; i  < raw_data.length; ++i) {
	  for (var j = 1; j  < raw_data[i].length; ++j) {
	    data.setValue(j-1, i+1, raw_data[i][j]);    
	  }
	}
	
	 // Create and draw the visualization.
	new google.visualization.BarChart(document.getElementById(element)).
	    draw(data,
		    {
			width: $("aside").width() - 10, height:100,
			backgroundColor: "#fff",
			colors:['red','#004411'],
			legend: "top",
			 hAxis: {maxValue: 100, minValue: 0}
		    }
	    );
}


/**
 * Create permalink
 */
function permalink() {
	// get measure
	val = $("#mapIndicie option:selected").val();
	
	$("#permalink a").html("http://maps.co.mecklenburg.nc.us/qoldashboard/?n=" + activeRecord.ID + "&m=" + val);
	$("#permalink a").attr("href", "./?n=" + activeRecord.ID + "&m=" + val);
}


/**
 * Find locations
 * @param {string} findType  The type of find to perform
 * @param {string} findTable  The table to search on
 * @param {string} findField  The field to search in
 * @param {string} findID  The value to search for
 */
function locationFinder(findType, findTable, findField, findID, findLabel, findValue) {
	switch (findType) {
		case "Address": case "PID": case "API":
			url = wsbase + 'v1/ws_mat_addressnum.php?format=json&callback=?&jsonp=?&addressnum=' + findID;
			$.getJSON(url, function(data) {					  
				if (data.total_rows > 0) {
					$.each(data.rows, function(i, item){
						addMarker(item.row.longitude, item.row.latitude, 0, "<h3>Selected Property</h3><p>" + item.row.address + "</p>");
					});
				}
			});
			break; 
		case "Library": case "Park": case "School": case "GeoName": case "CATS": 
			// Set list of fields to retrieve from POI Layers
			poiFields = {
				"libraries" : "x(transform(the_geom, 4326)) as lon, y(transform(the_geom, 4326)) as lat, '<h5>' || name || '</h5><p>' || address || '</p>' AS label",
				"schools_1011" : "x(transform(the_geom, 4326)) as lon, y(transform(the_geom, 4326)) as lat, '<h5>' || coalesce(schlname,'') || '</h5><p>' || coalesce(type,'') || ' School</p><p>' || coalesce(address,'') || '</p>' AS label",
				"parks" : "x(transform(the_geom, 4326)) as lon, y(transform(the_geom, 4326)) as lat, '<h5>' || prkname || '</h5><p>Type: ' || prktype || '</p><p>' || prkaddr || '</p>' AS label",
				"geonames" : "longitude as lon, latitude as lat, '<h3>' || name || '</h3>'  as label",
				"cats_light_rail_stations" : "x(transform(the_geom, 4326)) as lon, y(transform(the_geom, 4326)) as lat, '<h5>' || name || '</h5><p></p>' as label",
				"cats_park_and_ride" : "x(transform(the_geom, 4326)) as lon, y(transform(the_geom, 4326)) as lat, '<h5>' || name || '</h5><p>Routes ' || routes || '</p><p>' || address || '</p>' AS label"
			};
			url = wsbase + "v1/ws_geo_attributequery.php?format=json&geotable=" + findTable + "&parameters=" + urlencode(findField + " = " + findID) + "&fields=" + urlencode(poiFields[findTable]) + '&callback=?';
			$.getJSON(url, function(data) {					  
				$.each(data.rows, function(i, item){
					addMarker(item.row.lon, item.row.lat, 1, item.row.label);
				});
			});
			break;
		case "Road": 
			url = wsbase + "v1/ws_geo_getcentroid.php?format=json&geotable=" + findTable + "&parameters=streetname='" + findValue + "' order by ll_add limit 1&forceonsurface=true&srid=4326&callback=?";
			$.getJSON(url, function(data) {					  
				$.each(data.rows, function(i, item){
					addMarker(item.row.x, item.row.y, 1, "<h3>Road</h3><p>" + findValue + "</p>");
				});
			});
			
			break;
		case "Intersection": 
			url = wsbase + "v1/ws_geo_centerlineintersection.php?format=json&callback=?";
			streetnameArray = findID.split("&");
			args = "&srid=4326&streetname1=" + urlencode(jQuery.trim(streetnameArray[0])) + "&streetname2=" + urlencode(jQuery.trim(streetnameArray[1]));
			$.getJSON(url + args, function(data) {
				if (data.total_rows > 0 ) {						  
					$.each(data.rows, function(i, item){
						addMarker(item.row.xcoord, item.row.ycoord, 1, "<h3>Intersection</h3><p>" + findID + "</p>");
					});
				}
			});
			break;
	}
}






