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

  const width = 800;
  const height = 400;
  const margin = { top: 20, right: 30, bottom: 40, left: 50 };

  const svg = d3.select("svg");

  const x = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.value)]).nice()
    .range([height - margin.bottom, margin.top]);

  const xAxis = svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x));

  const yAxis = svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

  const line = d3.line()
    .x(d => x(d.date))
    .y(d => y(d.value));

  const clip = svg.append("defs").append("SVG:clipPath")
    .attr("id", "clip")
    .append("SVG:rect")
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("x", margin.left)
    .attr("y", margin.top);

  const chartBody = svg.append("g")
    .attr("clip-path", "url(#clip)");

  const path = chartBody.append("path")
    .datum(data)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 2)
    .attr("d", line);

  const zoom = d3.zoom()
    .scaleExtent([1, 10]) // Zoom in/out limits
    .translateExtent([[margin.left, 0], [width - margin.right, height]])
    .extent([[margin.left, 0], [width - margin.right, height]])
    .on("zoom", zoomed);

  svg.call(zoom);

  function zoomed(event) {
    const newX = event.transform.rescaleX(x);
    xAxis.call(d3.axisBottom(newX).ticks(6));
    path.attr("d", d3.line()
      .x(d => newX(d.date))
      .y(d => y(d.value))
    );
  }
};
