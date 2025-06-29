const margin = {top: 30, right: 50, bottom: 30, left: 60};
const width = 1200 - margin.left - margin.right;
const height = 200;

const tooltip = d3.select(".tooltip");

const metrics = [
  { key: "cpu", label: "CPU (%)", color: "steelblue" },
  { key: "memory", label: "Memory (%)", color: "orange" },
  { key: "energy_joules", label: "Energy (J)", color: "green" },
  { key: "temperature", label: "Temperature (°C)", color: "red" }
];

Promise.all([
  d3.csv("results/resnet34-exp1/combined.csv", d3.autoType),
  d3.json("results/resnet34-exp1/model_profile_processed.json")
]).then(([data, events]) => {
  data.forEach(d => d.timestamp = new Date(d.timestamp));
  events.forEach(e => {
    e.start = new Date(e.start);
    e.end = new Date(e.end);
  });

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.timestamp))
    .range([0, width]);

  const xAxis = d3.axisBottom(x).ticks(6);

  const zoom = d3.zoom()
    .scaleExtent([1, 20])
    .translateExtent([[0, 0], [width, height * metrics.length]])
    .extent([[0, 0], [width, height]])
    .on("zoom", zoomed);

  const chartContainer = d3.select("#chart-container");
  const charts = [];

  metrics.forEach((metric, i) => {
    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d[metric.key])).nice()
      .range([height - margin.bottom, margin.top]);

    const line = d3.line()
      .x(d => x(d.timestamp))
      .y(d => y(d[metric.key]));

    const svg = chartContainer.append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height);

    const g = svg.append("g").attr("transform", `translate(${margin.left},0)`);

    const path = g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", metric.color)
      .attr("stroke-width", 1.5)
      .attr("d", line);

    g.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .attr("class", "x-axis")
      .call(xAxis);

    g.append("g")
      .attr("transform", `translate(0,0)`)
      .call(d3.axisLeft(y));

    g.append("text")
      .attr("x", 5)
      .attr("y", margin.top - 10)
      .text(metric.label)
      .style("font-size", "12px");

    const funcLines = [];
    events.forEach(e => {
      const duration = ((e.end - e.start) / 1000).toFixed(2);
      const region = g.append("rect")
        .attr("x", x(e.start))
        .attr("y", y.range()[1])
        .attr("width", x(e.end) - x(e.start))
        .attr("height", y.range()[0] - y.range()[1])
        .attr("fill", "blue")
        .attr("opacity", 0.05)
        .attr("pointer-events", "all")
        .on("mouseover", function(event) {
          tooltip
            .style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 30}px`)
            .html(`
              <strong>${e.name}</strong><br>
              Start: ${e.start.toLocaleTimeString()}<br>
              End: ${e.end.toLocaleTimeString()}<br>
              Duration: ${duration} s
            `);
        })
        .on("mouseout", () => tooltip.style("display", "none"));

      const lineStart = g.append("line")
        .attr("x1", x(e.start)).attr("x2", x(e.start))
        .attr("y1", y.range()[1]).attr("y2", y.range()[0])
        .attr("stroke", "blue")
        .attr("stroke-dasharray", "4,2")
        .attr("opacity", 0.4);

      const lineEnd = g.append("line")
        .attr("x1", x(e.end)).attr("x2", x(e.end))
        .attr("y1", y.range()[1]).attr("y2", y.range()[0])
        .attr("stroke", "red")
        .attr("stroke-dasharray", "4,2")
        .attr("opacity", 0.4);

      funcLines.push({ start: lineStart, end: lineEnd, region: region, data: e });
    });

    const focus = g.append("g").style("display", "none");
    focus.append("circle").attr("r", 3.5).attr("fill", metric.color);

    path
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => {
        focus.style("display", "none");
        tooltip.style("display", "none");
      })
      .on("mousemove", function(event) {
        const t = d3.zoomTransform(svg.node());
        const newX = t.rescaleX(x);
        const bisect = d3.bisector(d => d.timestamp).left;
        const [mouseX, mouseY] = d3.pointer(event, g.node());
        const x0 = newX.invert(mouseX);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1], d1 = data[i];
        const d = (!d1 || x0 - d0.timestamp < d1.timestamp - x0) ? d0 : d1;

        const xPos = newX(d.timestamp);
        const yPos = y(d[metric.key]);

        if (Math.abs(mouseY - yPos) < 10) {
          focus.attr("transform", `translate(${xPos},${yPos})`);
          tooltip
            .style("display", "block")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 30}px`)
            .html(`
              <strong>${metric.label}</strong><br>
              Value: ${d[metric.key].toFixed(2)}<br>
              Time: ${d.timestamp.toLocaleTimeString()}
            `);
        } else {
          focus.style("display", "none");
          tooltip.style("display", "none");
        }
      });

    charts.push({ svg, g, y, line, path, funcLines });
  });

  d3.selectAll("svg").call(zoom);

  function zoomed(event) {
    const t = event.transform;
    const newX = t.rescaleX(x);
    charts.forEach(({ line, path, funcLines, g }) => {
      path.attr("d", line.x(d => newX(d.timestamp)));
      funcLines.forEach(({ start, end, region, data }) => {
        start.attr("x1", newX(data.start)).attr("x2", newX(data.start));
        end.attr("x1", newX(data.end)).attr("x2", newX(data.end));
        region
          .attr("x", newX(data.start))
          .attr("width", newX(data.end) - newX(data.start));
      });
      g.select(".x-axis").call(d3.axisBottom(newX).ticks(6));
    });
  }
});
