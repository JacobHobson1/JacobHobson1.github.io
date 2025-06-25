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

  // Your existing code with minimal changes:
  const parseDate = d3.timeParse("%Y-%m-%d %H:%M:%S");
  // Remove the parseDate forEach loop since dates are already parsed

  const width = 1200;
  const height = 500;
  const margin = { top: 20, right: 30, bottom: 40, left: 80 }; // Increased left margin for larger numbers

  const svg = d3.select("svg");

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top]);

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%H:%M:%S")));

  const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).tickFormat(d => (d/1000000).toFixed(1) + "M")); // Format as megawatts

  svg.append("g").call(xAxis);
  svg.append("g").call(yAxis);

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

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
    .attr("x1", d => x(d.date))
    .attr("x2", d => x(d.date))
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .attr("stroke", d => d.event.includes('start') ? "green" : "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5,5");

  const gx = svg.select("g");

  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[margin.left, 0], [width - margin.right, height]])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .on("zoom", (event) => {
      const newX = event.transform.rescaleX(x);
      gx.call(d3.axisBottom(newX).ticks(6).tickFormat(d3.timeFormat("%H:%M:%S")));
      path.attr("d", line.x(d => newX(d.date)));
      
      // Update event lines on zoom
      chartArea.selectAll(".event-line")
        .attr("x1", d => newX(d.date))
        .attr("x2", d => newX(d.date));
    });

  svg.call(zoom);
};