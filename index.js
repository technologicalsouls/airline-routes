let store = {}

function loadData() {
    return Promise.all([
        d3.csv("routes.csv"),
        d3.json("countries.geo.json"),
    ]).then(datasets => {
        store.routes = datasets[0];
        store.geoJSON = datasets[1]
        //console.log(store)
        return store;
    })
}


function groupByAirline(data) {
    let result = data.reduce((result, d) => {
        let currentData = result[d.AirlineID] || {
            "AirlineID": d.AirlineID,
            "AirlineName": d.AirlineName,
            "Count": 0
        }
        currentData.Count += 1 // Increment the count (number of routes) of ariline.
        result[d.AirlineID] =
            currentData //Save the updated information in the dictionary using the airline id as key.
        return result;
    }, {})
    console.log(result);

    result = Object.keys(result).map(key => result[key]);
    console.log(result);
    result = result.sort((a, b) => {
        return d3.descending(a.Count, b.Count)
    })
    return result
}

function getAirlinesChartConfig() {
    let width = 350;
    let height = 400;
    let margin = {
        top: 10,
        bottom: 50,
        left: 130,
        right: 10
    }
    let bodyHeight = height - margin.top - margin.bottom
    let bodyWidth = width - margin.left - margin
        .right //Width of the body by subtracting the left and right margins from the width.
    //The container is the SVG where we will draw the chart.
    let container = d3.select(
        "#AirlinesChart")
    container
        .attr("width", width)
        .attr("height", height)
    return {
        width,
        height,
        margin,
        bodyHeight,
        bodyWidth,
        container
    }
}

function getAirlinesChartScales(airlines, config) {
    let {
        bodyWidth,
        bodyHeight
    } = config;
    let maximunCount = d3.max(airlines, a => a.Count)
    let xScale = d3.scaleLinear()
        .range([0, bodyWidth])
        .domain([0, maximunCount])

    let yScale = d3.scaleBand()
        .range([0, bodyHeight])
        .domain(airlines.map(a => a.AirlineName)) //The domain is the list of ailines names
        .padding(0.2)
    return {
        xScale,
        yScale
    }
}

function drawBarsAirlinesChart(airlines, scales, config) {
    let {
        margin,
        container
    } = config; // this is equivalent to 'let margin = config.margin; let container = config.container'
    let {
        xScale,
        yScale
    } = scales
    let body = container.append("g")
        .style("transform",
            `translate(${margin.left}px,${margin.top}px)`
        )

    let bars = body.selectAll(".bar")
        .data(airlines)
    //Bind the airlines to the bars (elements with class bar)
    //Adding a rect tag for each airline
    bars.enter().append("rect")
        .attr("height", yScale.bandwidth())
        .attr("y", d => yScale(d.AirlineName))
        .attr("width", d => xScale(d.Count))
        .attr("fill", "#2a5599")
        .on("mouseenter", function(d) { // <- this is the new code
            drawRoutes(d.AirlineID)
            d3.select(this)
                .style("fill", "#992a5b").style("cursor", "pointer")
          })
          .on("mouseleave", function(d){
            drawRoutes(null)
            d3.select(this)
                .style("fill", "#2a5599")
          })
}

function drawAxesAirlinesChart(airlines, scales, config) {
    let {
        xScale,
        yScale
    } = scales
    let {
        container,
        margin,
        height
    } = config;
    let axisX = d3.axisBottom(xScale)
        .ticks(5)
    container.append("g")
        .style("transform",
            `translate(${margin.left}px,${height - margin.bottom}px)`
        )
        .call(axisX)

    let axisY = d3.axisLeft(yScale)
    container.append("g")
        .style("transform",
            `translate(${margin.left}px,${margin.top}px)`
        )
        .call(axisY)
}

function drawAirlinesChart(airlines) {
    let config = getAirlinesChartConfig()
    let scales = getAirlinesChartScales(airlines, config);
    drawBarsAirlinesChart(airlines, scales, config);
    drawAxesAirlinesChart(airlines, scales, config);
}

function getMapConfig() {
    let width = 600;
    let height = 400;
    let container = d3.select("#Map")
        .attr("width", width)
        .attr("height", height)
    return {
        width,
        height,
        container
    }
}

function getMapProjection(config) {
    let {
        width,
        height
    } = config;
    let projection = d3.geoMercator()
    projection.scale(97)
        .translate([width/2, height/2 + 20])
    store.mapProjection = projection;
    return projection;
}

function drawBaseMap(container, countries, projection) {
    let path = d3.geoPath().projection(projection)
    container.selectAll("path").data(countries)
        .enter().append("path")
        .attr("d", d => path(d))
        .attr("stroke", "#ccc")
        .attr("fill", "#eee")
}

function drawMap(geoJson) {
    let config = getMapConfig();
    let projection = getMapProjection(config)
    drawBaseMap(config.container, geoJson.features, projection)
}

function groupByAirport(data) {
    let result = data.reduce((result, d) => {

        let currentDest = result[d.DestAirportID] || {
            "AirportID": d.DestAirportID,
            "Airport": d.DestAirport,
            "Latitude": +d.DestLatitude,
            "Longitude": +d.DestLongitude,
            "City": d.DestCity,
            "Country": d.DestCountry,
            "Count": 0
        }
        currentDest.Count += 1
        result[d.DestAirportID] = currentDest

        let currentSource = result[d.SourceAirportID] || {
            "AirportID": d.SourceAirportID,
            "Airport": d.SourceAirport,
            "Latitude": +d.SourceLatitude,
            "Longitude": +d.SourceLongitude,
            "City": d.SourceCity,
            "Country": d.SourceCountry,
            "Count": 0
        }
        currentSource.Count += 1
        result[d.SourceAirportID] = currentSource

        return result
    }, {})

    //We map the keys to the actual ariorts, this is an way to transform the object we got in the previous step into a list.
    result = Object.keys(result).map(key => result[key])
    return result
}
function drawAirports(airports) {
    let config = getMapConfig(); //get the config
    let projection = getMapProjection(config) //get the projection
    let container = config.container; //get the container
    let circles = container.selectAll("circle");
    circles.data(airports)
        .enter()
        .append("circle")
        .attr("r", 1)
        .attr("cx", d => projection([+d.Longitude, +d.Latitude])[0])
        .attr("cy", d => projection([+d.Longitude, +d.Latitude])[1])
        .attr("fill", "#2a5599")
  }

function drawRoutes(airlineID) {
    let routes = store.routes
    let projection = store.mapProjection
    let container = d3.select("#Map")
    let selectedRoutes = routes.filter(d => {
        return d.AirlineID === airlineID
    })//filter the routes to keep only the routes which AirlineID is equal to the parameter airlineID received by the function

    //console.log(routes)
    let bindedData = container.selectAll("line")
        .data(selectedRoutes, d => d.ID)  //This seconf parameter -- what to use to identify the routes, this hepls D3 to correctly find which routes have been added or removed.
    bindedData.enter()
        .append("line")
        .attr("x1", d => projection([+d.SourceLongitude, +d.SourceLatitude])[0])
        .attr("y1", d => projection([+d.SourceLongitude, +d.SourceLatitude])[1])
        .attr("x2", d => projection([+d.DestLongitude, +d.DestLatitude])[0])
        .attr("y2", d => projection([+d.DestLongitude, +d.DestLatitude])[1])
        .style("stroke", "#992a2a")
        .style("opacity", "0.1")
    bindedData.exit().remove()
}

  function showData() {
    //Get the routes from our store variable
    let routes = store.routes
    // Compute the number of routes per airline.
    let airlines = groupByAirline(store.routes);
    let airports = groupByAirport(store.routes);
 //   console.log(airlines)
    drawAirlinesChart(airlines)
    drawMap(store.geoJSON) //Using the data saved on loadData
    drawAirports(airports)
    drawRoutes("24")
}
//loadData();
loadData().then(showData);