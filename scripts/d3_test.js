window.onload = function () {
  const data = [
    { date: "2024-01-01", value: 100 },
    { date: "2024-02-01", value: 120 },
    { date: "2024-03-01", value: 90 },
    { date: "2024-04-01", value: 140 },
    { date: "2024-05-01", value: 160 },
    { date: "2024-06-01", value: 130 }
  ];

  const parseDate = d3.timeParse("%Y-%m-%d");
  data.forEach(d => {
    d.date = parseDate(d.date);
    d.value = +d.value;
  });

  const width = 1200;
  const height = 500;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  const svg = d3.select("svg");

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top]);

  const xAxis = g => g
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")));

  const yAxis = g => g
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

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

  const gx = svg.select("g");

  const zoom = d3.zoom()
    .scaleExtent([1, 10])
    .translateExtent([[margin.left, 0], [width - margin.right, height]])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .on("zoom", (event) => {
      const newX = event.transform.rescaleX(x);
      gx.call(d3.axisBottom(newX).ticks(6).tickFormat(d3.timeFormat("%b %Y")));
      path.attr("d", line.x(d => newX(d.date)));
    });

  svg.call(zoom);
};
