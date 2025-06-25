window.onload = async function () {
  // Function to parse energy log data
  function parseEnergyData(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      const [timestamp, value] = line.split(': ');
      return {
        date: new Date(timestamp),
        value: +value
      };
    });
  }

  // Function to parse event data
  function parseEventData(text) {
    const lines = text.trim().split('\n');
    return lines.map(line => {
      const [timestamp, event] = line.split(': ');
      return {
        date: new Date(timestamp),
        event: event
      };
    });
  }

  // Load files from your GitHub Pages directory
  let data = [];
  let events = [];
  
  try {
    // Load energy data
    const energyResponse = await fetch('results/resnet34-exp1/energy_log.txt');
    const energyLogText = await energyResponse.text();
    data = parseEnergyData(energyLogText);
    
    // Load event data
    const eventResponse = await fetch('results/resnet34-exp1/event_log.txt');
    const eventLogText = await eventResponse.text();
    events = parseEventData(eventLogText);
    
    console.log(`Loaded ${data.length} energy readings and ${events.length} events`);
  } catch (error) {
    console.error('Error loading data files:', error);
    console.log('Files not found. Place energy_log.txt and event_log.txt in your repository root.');
    return; // Exit if files can't be loaded
  }

  // Convert data to relative time scale (milliseconds from start) and watts
  if (data.length === 0) return;
  
  const startTime = data[0].date;
  data.forEach(d => {
    d.milliseconds = d.date - startTime; // Convert to milliseconds from start
    d.watts = d.value / 1000000; // Convert microwatts to watts
  });
  
  events.forEach(e => {
    e.milliseconds = e.date - startTime;
  });

  const width = 1200;
  const height = 500;
  const margin = { top: 20, right: 30, bottom: 60, left: 80 };

  const svg = d3.select("svg");

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.milliseconds)])
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.watts)]).nice()
    .range([height - margin.bottom, margin.top]);

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(10).tickFormat(d => d.toFixed(0) + "ms"));

  const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d => d.toFixed(1) + "W"));

  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);

  // Add axis labels
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 15)
    .attr("x", -(height / 2))
    .attr("dy", "1em")
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Power (Watts)");

  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height - 10})`)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Time (milliseconds from start)");

  const line = d3.line()
    .x(d => x(d.milliseconds))
    .y(d => y(d.watts));

  const clip = svg.append("defs").append("clipPath")
    .attr("id", "clip")
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom);

  const chartArea = svg.append("g")
    .attr("clip-path", "url(#clip)");

  const path = chartArea.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  // Add event markers
  chartArea.selectAll(".event-line")
    .data(events)
    .enter()
    .append("line")
    .attr("class", "event-line")
    .attr("x1", d => x(d.milliseconds))
    .attr("x2", d => x(d.milliseconds))
    .attr("y1", 0)
    .attr("y2", height - margin.bottom - margin.top)
    .attr("stroke", d => d.event.includes('start') ? "green" : "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  // Add tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // Add invisible circles for hover detection
  chartArea.selectAll(".hover-circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("class", "hover-circle")
    .attr("cx", d => x(d.milliseconds))
    .attr("cy", d => y(d.watts))
    .attr("r", 3)
    .attr("fill", "transparent")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "steelblue");
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`Time: ${d.milliseconds.toFixed(0)}ms<br/>Power: ${d.watts.toFixed(3)}W`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "transparent");
      tooltip.transition().duration(200).style("opacity", 0);
    });

  const gx = svg.select("g");

  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[margin.left, 0], [width - margin.right, height]])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .on("zoom", (event) => {
      const newX = event.transform.rescaleX(x);
      gx.call(d3.axisBottom(newX).ticks(10).tickFormat(d => d.toFixed(0) + "ms"));
      path.attr("d", line.x(d => newX(d.milliseconds)));
      
      // Update event lines on zoom
      chartArea.selectAll(".event-line")
        .attr("x1", d => newX(d.milliseconds))
        .attr("x2", d => newX(d.milliseconds));

      // Update hover circles on zoom
      chartArea.selectAll(".hover-circle")
        .attr("cx", d => newX(d.milliseconds));
    });

  svg.call(zoom);
};