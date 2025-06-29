
const margin = {top: 10, right: 50, bottom: 30, left: 60};
const width = 1200 - margin.left - margin.right;
const height = 800;
const plotHeight = height / 4;

const svg = d3.select("#chart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom);

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");

const metrics = [
  { key: "cpu", label: "CPU (%)", color: "steelblue" },
  { key: "memory", label: "Memory (%)", color: "orange" },
  { key: "energy_joules", label: "Energy (J)", color: "green" },
  { key: "temperature", label: "Temperature (°C)", color: "red" }
];

Promise.all([
  d3.csv("combined.csv", d3.autoType),
  d3.json("func_events.json")
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
    .translateExtent([[0, 0], [width, height]])
    .extent([[0, 0], [width, height]])
    .on("zoom", zoomed);

  svg.call(zoom);

  const chartGroups = [];

  metrics.forEach((metric, i) => {
    const y = d3.scaleLinear()
      .domain(d3.extent(data, d => d[metric.key])).nice()
      .range([plotHeight * (i + 1), plotHeight * i]);

    const line = d3.line()
      .x(d => x(d.timestamp))
      .y(d => y(d[metric.key]));

    const group = g.append("g");

    const path = group.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("stroke", metric.color)
      .attr("d", line);

    group.append("g")
      .attr("transform", `translate(0,0)`)
      .call(d3.axisLeft(y).ticks(5));

    if (i === metrics.length - 1) {
      group.append("g")
        .attr("transform", `translate(0,${plotHeight * (i + 1)})`)
        .attr("class", "x-axis")
        .call(xAxis);
    }

    group.append("text")
      .attr("x", 5)
      .attr("y", y.range()[1] + 15)
      .text(metric.label)
      .style("font-size", "12px");

    const funcLines = [];

    events.forEach(e => {
      const lineStart = group.append("line")
        .attr("x1", x(e.start)).attr("x2", x(e.start))
        .attr("y1", y.range()[1]).attr("y2", y.range()[0])
        .attr("stroke", "blue").attr("class", "func-line");

      const lineEnd = group.append("line")
        .attr("x1", x(e.end)).attr("x2", x(e.end))
        .attr("y1", y.range()[1]).attr("y2", y.range()[0])
        .attr("stroke", "red").attr("class", "func-line");

      funcLines.push({ start: lineStart, end: lineEnd, data: e });
    });

    const focus = group.append("g").style("display", "none");
    focus.append("circle").attr("r", 3.5).attr("fill", metric.color);

    group.append("rect")
      .attr("class", "overlay")
      .attr("width", width)
      .attr("height", y.range()[0] - y.range()[1])
      .attr("y", y.range()[1])
      .attr("fill", "transparent")
      .on("mouseover", () => focus.style("display", null))
      .on("mouseout", () => {
        focus.style("display", "none");
        tooltip.style("display", "none");
      })
      .on("mousemove", function(event) {
        const bisect = d3.bisector(d => d.timestamp).left;
        const mouseX = d3.pointer(event, this)[0];
        const x0 = x.invert(mouseX);
        const i = bisect(data, x0, 1);
        const d0 = data[i - 1], d1 = data[i];
        const d = (!d1 || x0 - d0.timestamp < d1.timestamp - x0) ? d0 : d1;
        focus.attr("transform", `translate(${x(d.timestamp)},${y(d[metric.key])})`);
        tooltip
          .style("display", "block")
          .style("left", (d3.pointer(event)[0] + 70) + "px")
          .style("top", (d3.pointer(event)[1] + 40) + "px")
          .html(`${metric.label}<br>${d[metric.key].toFixed(2)}<br>${d.timestamp.toLocaleString()}`);
      });

    chartGroups.push({ group, y, line, path, funcLines });
  });

  function zoomed(event) {
    const t = event.transform;
    const newX = t.rescaleX(x);
    chartGroups.forEach(({ line, path, funcLines }) => {
      path.attr("d", line.x(d => newX(d.timestamp)));
      funcLines.forEach(({ start, end, data }) => {
        start.attr("x1", newX(data.start)).attr("x2", newX(data.start));
        end.attr("x1", newX(data.end)).attr("x2", newX(data.end));
      });
    });
    g.selectAll(".x-axis").call(d3.axisBottom(newX).ticks(6));
  }
});
