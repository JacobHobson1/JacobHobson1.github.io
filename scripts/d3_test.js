
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

const x = d3.scaleTime()
  .domain(d3.extent(data, d => d.date))
  .range([margin.left, width - margin.right]);

const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.value)]).nice()
  .range([height - margin.bottom, margin.top]);

const line = d3.line()
  .x(d => x(d.date))
  .y(d => y(d.value));

const svg = d3.select("svg");

svg.append("path")
  .datum(data)
  .attr("fill", "none")
  .attr("stroke", "steelblue")
  .attr("stroke-width", 2)
  .attr("d", line);

svg.append("g")
  .attr("transform", `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b %Y")))
  .selectAll("text")
  .attr("transform", "rotate(-40)")
  .style("text-anchor", "end");

svg.append("g")
  .attr("transform", `translate(${margin.left},0)`)
  .call(d3.axisLeft(y));
