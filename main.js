
const width = 1500;
const height = 900;

const svg = d3.select("#map")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const projection = d3.geoMercator()
  .translate([width / 2, height / 1.5])
  .scale(200);

const path = d3.geoPath().projection(projection);

// tooltip div
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

let allData = [];

Promise.all([
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  d3.csv("cause_of_deaths.csv")
]).then(function([world, data]) {

  // convert numeric columns
  data.forEach(d => {
    d.Year = +d.Year;
    for (let key in d) {
      if (key !== "Country/Territory" && key !== "Code" && key !== "Year") {
        d[key] = +d[key];
      }
    }
  });
  // store the entire dataset for filtering by year
  allData = data;

  const allColumns = data.columns;
  const causeColumns = allColumns.filter(col => !["Country/Territory", "Code", "Year"].includes(col));

  // dropdown menu
  const dropdown = d3.select("#causeSelect");
  dropdown.selectAll("option")
    .data(causeColumns)
    .enter()
    .append("option")
    .attr("value", d => d)
    .text(d => d);

  // world map
  svg.append("g")
    .selectAll("path")
    .data(world.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#ccc")
    .attr("stroke", "#333");

  function updateBubbles(selectedCause, selectedYear) {
    // filter
    const yearData = allData.filter(d => d.Year === selectedYear);

    // max value for scaling the bubbles
    const maxValue = d3.max(yearData, d => d[selectedCause]);

    const radiusScale = d3.scaleSqrt()
      .domain([0, maxValue])
      .range([0, 40]);
    const bubbles = svg.selectAll(".bubble")
      .data(yearData, d => d.Code);

    bubbles.exit().remove();

    bubbles.enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", d => {
        const feature = world.features.find(f => f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code));
        if (feature) {
          const centroid = path.centroid(feature);
          return centroid[0];
        }
        return -100; // if no matching feature, position off-map
      })
      .attr("cy", d => {
        const feature = world.features.find(f => f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code));
        if (feature) {
          const centroid = path.centroid(feature);
          return centroid[1];
        }
        return -100;
      })
      .attr("r", d => radiusScale(d[selectedCause]))
      .attr("fill", "rgba(217,91,67,0.7)")
      .attr("stroke", "#fff")
      .on("mouseover", function(event, d) {
         d3.select(this).attr("stroke", "black");
         tooltip.transition().duration(200).style("opacity", 0.9);
         tooltip.html(`<strong>${d["Country/Territory"]}</strong><br>
                       ${selectedCause}: ${d[selectedCause]}<br>
                       Year: ${d.Year}`)
           .style("left", (event.pageX + 5) + "px")
           .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function() {
         d3.select(this).attr("stroke", "#fff");
         tooltip.transition().duration(500).style("opacity", 0);
      });

    // transitions
    bubbles.transition()
      .duration(750)
      .attr("r", d => radiusScale(d[selectedCause]))
      .attr("cx", d => {
        const feature = world.features.find(f => f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code));
        if (feature) {
          const centroid = path.centroid(feature);
          return centroid[0];
        }
        return -100;
      })
      .attr("cy", d => {
        const feature = world.features.find(f => f.id === d.Code || (f.properties && f.properties.iso_a3 === d.Code));
        if (feature) {
          const centroid = path.centroid(feature);
          return centroid[1];
        }
        return -100;
      });
  }

  // Get the current selections from the dropdown and slider,
  // and update the visualization initially with the default values.
  const initialYear = +d3.select("#yearSlider").property("value");
  updateBubbles(causeColumns[0], initialYear);

  // Update bubbles when the dropdown selection changes
  dropdown.on("change", function(event) {
    const selectedCause = event.target.value;
    const selectedYear = +d3.select("#yearSlider").property("value");
    updateBubbles(selectedCause, selectedYear);
  });

  // Update bubbles on slider
  d3.select("#yearSlider").on("input", function(event) {
    const selectedYear = +this.value;
    d3.select("#yearLabel").text(selectedYear);
    const selectedCause = d3.select("#causeSelect").property("value");
    updateBubbles(selectedCause, selectedYear);
  });

}).catch(function(error) {
  console.error("Error loading data: ", error);
});
