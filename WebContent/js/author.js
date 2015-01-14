/**
 * Object to control authors detail view.
 * 
 * AuthorView is implemented as singleton (==> there can only be one dialog
 * opened at a time).
 */
var AuthorView = (function() {

	// Instance stores a reference to the Singleton
	var instance;
	
	var authors = null,
		publications = null;
		proxyPath = "http://pubdbproxy-ivsz.rhcloud.com/",
		colabView = null;
	
	function init() {
		
		// --- Create dialog --- //
		
		var d3_details = d3.select("body").append("div")
				.attr("id", "author")
				.attr("class", "dialog")
				.append("div")
				.attr("class", "details");
				
		var d3_tabs = d3_details.append("ul");
		
		d3_tabs.append("li")
			.append("a")
			.attr("href", "#general")
			.html("General");
		
		d3_tabs.append("li")
			.append("a")
			.attr("href", "#publications")
			.html("Publications");
		
		d3_tabs.append("li")
			.append("a")
			.attr("href", "#coauthors")
			.html("Coauthors");
		
		d3_tabs.append("li")
			.append("a")
			.attr("href", "#activity")
			.html("Activity");
		
		d3_details.append("div").attr("id", "general");
		d3_details.append("div").attr("id", "publications").attr("class", "accordion");
		d3_details.append("div").attr("id", "coauthors");
		d3_details.append("div").attr("id", "activity");
		
		$("#author").dialog({
			autoOpen: false,
			width: "80%",
			minWidth: "300",
			maxWidth: "750",
			height: $(window).height()*0.8,
			show: {
				effect: "fade",
		        duration: 500
			},
			hide: {
				effect: "fade",
		        duration: 500
			},
		});
		
		$(".details").tabs({
			show : {
				effect : "fade",
				duration : 500
			}
		});

		$(".accordion").accordion({
			heightStyle : "content",
			collapsible : true
		});
		
		
		
		// --- Define private methods --- //
		
		function getAuthor (authorName, onready) {
			for (var i = 0; i < authors.length; i++) {
				if (authors[i].hasOwnProperty("name")) {
					
					// That's our guy
					if (authors[i]["name"] === authorName) {
						
						// If this guy is member of the LMU media informatics chair
						if (authors[i].hasOwnProperty("url") && 
								authors[i].url.indexOf("medien.ifi.lmu") > -1) {
							
							// Get the image url
							$.get(proxyPath, {url: authors[i].url}, function (data) {
								
								var imgName = $(data).find(".floatright img").attr("src"); 
								
								if (typeof imgName === "string") {
									authors[i]["imgUrl"] = authors[i].url + imgName;
								}
								
								// callback
								onready(authors[i]);
							});
							
						} else {
							
							// Set imgUrl to default pic
							authors[i]["imgUrl"] = "img/anonymous.png";
							
							// callback
							onready(authors[i]);
							
						}
						
						// Tell callee, we found someone and leave method (and for loop)
						return true;
					}
				}
			}
			return null;
		}

		function createCoauthorsChart(authorName, parentNodeId, data) {

			var width = $("#author").width()*.8,
				barHeight = 35;

			var x = d3.scale.linear().range([0, width*.8 ]);

			var chart = d3.select("#" + parentNodeId).append("svg")
					.attr("class", "chart").attr("id", "#coauthorsChart")
					.attr("width", width);

			x.domain([ 0, d3.max(data, function(d) {
				return d.numColab;
			}) ]);

			chart.attr("height", barHeight * data.length);

			var bar = chart.selectAll("g").data(data).enter().append("g").attr(
					"transform", function(d, i) {
						return "translate(" + width*.2 + "," + i * barHeight + ")";
					});

			bar.append("rect").attr("width", function(d) {
				return x(d.numColab);
			}).attr("height", barHeight - 1)
			.on("click", function () {
				colabView.show([authorName, this.__data__.name], this.__data__.publications);
			});

			bar.append("text").attr("x", function(d) {
				return x(d.numColab) - 3;
			}).attr("y", barHeight / 2).attr("dy", ".35em").text(function(d) {
				return d.numColab;
			}).attr("class", "num");
			
			bar.append("text").attr("x", function(d) {
				return -5;
			}).attr("y", barHeight / 2).attr("dy", ".35em").text(function(d) {
				return d.name;
			}).attr("class", "name")
			.on("click", function () {
				AuthorView.getInstance().show(this.innerHTML);
			});
			
			function type(d) {
				d.numColab = +d.numColab;
				return d;
			}

		}
		
		return {

			/**
			 * Displays the detail view for a specific author.
			 * 
			 * @param {string} authorName Name of the author
			 */
			show : function (authorName) {
				
				var authorsPublications = [], // List of publication objects for this author
					href = "", // Link to authors view
					pubStats = null, // Publications statistics for this author
					d3_info = null; // Refernce to d3 selection for general info on author
				
				$("#loadingContainer").fadeIn();
				
				getAuthor(authorName, function (author) {
					
					$(".dialog").css("display", "block");
					$("#loadingContainer").fadeOut();
					
					if (author !== null) {
						
						// Filter info
						if (author.hasOwnProperty("publications")) {
							authorsPublications = Util.getPublications(publications, author.publications);
						}
						pubStats = Util.getPubLicationStatistics (authorsPublications, authorName);
						
						// Remove old info from view
						$("#general, #publications, #coauthors, #activity").empty(); 
						
						
						
						// --- TAB: "General" --- //
						
						// Show author name
						$("#author").dialog("option", "title", authorName);
						
						if (author.hasOwnProperty("imgUrl")) {
							
							// Show photo
							$("#general").append("<div class='author_img_container'><img src='" + author.imgUrl + "' alt='No image available'/></div>");
						
						} 
						
						// Show author info
						d3_info = d3.select("#general").append("div").attr("id", "generalInfo").append("ul");
						d3_info.append("li").html("Active since: " + pubStats.activeSince);
						d3_info.append("li").html("Number of publications: " + pubStats.numPub);
						d3_info.append("li").html("Rank: " + "... TODO ..."); // TODO Compute rank (Quartile)
						
						if (author.hasOwnProperty("url")) {
							
							// Show web site link
							d3_info.append("li").html("Website: ").append("a")
								.attr("href", author.url)
								.attr("target", "_blank")
								.html(author.url);
							
						}
						
						
						
						// --- TAB: Publications --- //
						Util.showPublications("publications", authorsPublications);
						
						
						
						// Refresh View
						$(".accordion").accordion("refresh");
						$(".details").tabs("option", "active", 0);
						$("#author").dialog("open");
						
						
						
						// --- TAB: Coauthors --- //
						// (Needs to be done after the refresh, since createCoauthorsChart uses the elements width)			
						createCoauthorsChart(authorName, "coauthors", pubStats.coauthors);
						
						
						
						// --- TAB: Activity --- //
						// (Needs to be done after the refresh, since createActivityChart uses the elements width)
						Util.createActivityChart("author", "activity", pubStats.activity);
											
					} else {
						// TODO Throw/ handle author not found error.
					}
					
				});
				
			}
		};

	};

	return {

		/**
		 * Get instance of AuthorsView, if one exists, else create one.
		 * @param {JSONObject} authorsJSON OPTIONAL
		 * @param {JSONObject} publicationsJSON OPTIONAL
		 */
		getInstance : function(authorsJSON, publicationsJSON) {
			
			if (!((typeof authorsJSON === "undefined") || (typeof publicationsJSON === "undefined"))) {
				authors = authorsJSON;
				publications = publicationsJSON;
				
				// (Re-)init colabView
				colabView = ColabView.getInstance(publications);
			}
			
			if (!instance) {
				instance = init();
			}

			return instance;
		}

	};

})();