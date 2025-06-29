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

  // Function to parse model profile data
  function parseProfileData(jsonData) {
    return jsonData
      .filter(d => d.ph === 'X' && d.cat === 'Node') // Only execution events for nodes
      .map(d => ({
        name: d.name,
        startTime: d.ts / 1000, // Convert microseconds to milliseconds
        duration: d.dur / 1000, // Convert microseconds to milliseconds
        endTime: (d.ts + d.dur) / 1000,
        category: d.cat,
        op_name: d.args?.op_name || 'Unknown'
      }));
  }

  // Load files from your GitHub Pages directory
  let data = [];
  let events = [];
  let profileEvents = [];
  let profileStartTime = null;
  
  try {
    // Load energy data
    const energyResponse = await fetch('results/resnet34-exp1/energy_log.txt');
    const energyLogText = await energyResponse.text();
    data = parseEnergyData(energyLogText);
    
    // Load event data
    const eventResponse = await fetch('results/resnet34-exp1/event_log.txt');
    const eventLogText = await eventResponse.text();
    events = parseEventData(eventLogText);
    
    // Load profile data
    const profileResponse = await fetch('results/resnet34-exp1/model_profile.json');
    const profileJson = await profileResponse.json();
    profileEvents = parseProfileData(profileJson);
    
    // Try to load performance log to get the start time reference
    try {
      const perfResponse = await fetch('results/resnet34-exp1/performance_log.json');
      const perfJson = await perfResponse.json();
      profileStartTime = new Date(perfJson.start_time);
      console.log('Profile start time found:', profileStartTime);
    } catch (e) {
      console.log('Performance log not found, using energy start time as reference');
      profileStartTime = data[0].date;
    }
    
    console.log(`Loaded ${data.length} energy readings, ${events.length} events, and ${profileEvents.length} profile events`);
  } catch (error) {
    console.error('Error loading data files:', error);
    console.log('Files not found. Place files in your repository results/resnet34-exp1/ directory.');
    return; // Exit if files can't be loaded
  }

  // Convert data to relative time scale (milliseconds from start) and watts
  if (data.length === 0) return;
  
  const startTime = data[0].date;
  const startTimeMs = startTime.getTime();
  
  data.forEach(d => {
    d.milliseconds = d.date - startTime; // Convert to milliseconds from start
    d.watts = d.value / 1000000; // Convert microwatts to watts
  });
  
  events.forEach(e => {
    e.milliseconds = e.date - startTime;
  });

  // Convert profile events to absolute timestamps (like the Python version)
  if (profileEvents.length > 0 && profileStartTime) {
    profileEvents.forEach(p => {
      // Convert microseconds to milliseconds and add to start time
      const startDate = new Date(profileStartTime.getTime() + (p.startTime / 1000));
      const endDate = new Date(profileStartTime.getTime() + (p.endTime / 1000));
      
      // Convert to relative milliseconds from energy start time
      p.relativeStart = startDate.getTime() - startTime.getTime();
      p.relativeEnd = endDate.getTime() - startTime.getTime();
    });
    
    console.log(`Profile events mapped using absolute timing`);
    console.log(`First profile event: ${profileEvents[0].relativeStart}ms`);
    console.log(`Last profile event: ${profileEvents[profileEvents.length-1].relativeEnd}ms`);
  }

  const width = 1200;
  const height = 400;
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
    .text("Power (W)");

  svg.append("text")
    .attr("transform", `translate(${width / 2}, ${height - 10})`)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .text("Time (ms)");

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

  // Add event markers (function start/end)
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
    .attr("stroke-width", 3)
    .attr("stroke-dasharray", "5,5");

  // Add model layer execution markers as vertical lines (like the reference image)
  const chartHeight = height - margin.bottom - margin.top;
  
  // Add start markers for each layer
  chartArea.selectAll(".profile-start-line")
    .data(profileEvents.slice(0, 15)) // Show first 15 layers for clarity
    .enter()
    .append("line")
    .attr("class", "profile-start-line")
    .attr("x1", d => x(d.relativeStart))
    .attr("x2", d => x(d.relativeStart))
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("stroke", d => {
      if (d.op_name.includes('Conv')) return '#ff7f0e';
      if (d.op_name.includes('MaxPool')) return '#2ca02c';
      if (d.op_name.includes('Gemm')) return '#d62728';
      if (d.op_name.includes('Reduce')) return '#9467bd';
      return '#1f77b4';
    })
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "2,3")
    .attr("opacity", 0.7);

  // Add end markers for longer operations (optional, for duration visualization)
  chartArea.selectAll(".profile-end-line")
    .data(profileEvents.filter(d => d.duration > 10).slice(0, 10)) // Only show end lines for longer operations
    .enter()
    .append("line")
    .attr("class", "profile-end-line")
    .attr("x1", d => x(d.relativeEnd))
    .attr("x2", d => x(d.relativeEnd))
    .attr("y1", 0)
    .attr("y2", chartHeight)
    .attr("stroke", d => {
      if (d.op_name.includes('Conv')) return '#ff7f0e';
      if (d.op_name.includes('MaxPool')) return '#2ca02c';
      if (d.op_name.includes('Gemm')) return '#d62728';
      if (d.op_name.includes('Reduce')) return '#9467bd';
      return '#1f77b4';
    })
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4,2")
    .attr("opacity", 0.5);

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

  // Add invisible circles for hover detection on energy data
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

  // Add hover for profile start lines
  chartArea.selectAll(".profile-start-line")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke-width", 3).attr("opacity", 1);
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <strong>${d.name}</strong><br/>
        Operation: ${d.op_name}<br/>
        Duration: ${d.duration.toFixed(2)}ms<br/>
        Start: ${d.relativeStart.toFixed(0)}ms
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke-width", 1).attr("opacity", 0.7);
      tooltip.transition().duration(200).style("opacity", 0);
    });

  // Add hover for profile end lines
  chartArea.selectAll(".profile-end-line")
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke-width", 3).attr("opacity", 1);
      tooltip.transition().duration(200).style("opacity", 1);
      tooltip.html(`
        <strong>${d.name} (END)</strong><br/>
        Operation: ${d.op_name}<br/>
        Duration: ${d.duration.toFixed(2)}ms<br/>
        End: ${d.relativeEnd.toFixed(0)}ms
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke-width", 1).attr("opacity", 0.5);
      tooltip.transition().duration(200).style("opacity", 0);
    });

  // Add legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 200}, 30)`);

  const legendData = [
    { color: "steelblue", label: "Energy Consumption", dash: "0" },
    { color: "green", label: "Function Start", dash: "5,5" },
    { color: "red", label: "Function End", dash: "5,5" },
    { color: "#ff7f0e", label: "Conv Layers", dash: "3,3" },
    { color: "#2ca02c", label: "MaxPool Layers", dash: "3,3" },
    { color: "#9467bd", label: "Reduce Layers", dash: "2,4" },
    { color: "#1f77b4", label: "Other Layers", dash: "2,4" }
  ];

  legend.selectAll(".legend-item")
    .data(legendData)
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * 15})`)
    .each(function(d) {
      const item = d3.select(this);
      item.append("line")
        .attr("x1", 0)
        .attr("x2", 15)
        .attr("y1", 0)
        .attr("y2", 0)
        .attr("stroke", d.color)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", d.dash);
      
      item.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .text(d.label);
    });

  const gx = svg.select("g");

  const zoom = d3.zoom()
    .scaleExtent([1, 50])
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

      // Update profile start lines on zoom
      chartArea.selectAll(".profile-start-line")
        .attr("x1", d => newX(d.relativeStart))
        .attr("x2", d => newX(d.relativeStart));

      // Update profile end lines on zoom
      chartArea.selectAll(".profile-end-line")
        .attr("x1", d => newX(d.relativeEnd))
        .attr("x2", d => newX(d.relativeEnd));

      // Update hover circles on zoom
      chartArea.selectAll(".hover-circle")
        .attr("cx", d => newX(d.milliseconds));
    });

  svg.call(zoom);
};