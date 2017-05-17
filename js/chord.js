class P2PConnectionsDiagram {
  constructor() {
  }

  setupDiagram() {

    var matrix = this.buildMatrix();

    var w = window,
      d = document,
      e = d.documentElement,
      g = d.getElementsByTagName('body')[0],
      x = w.innerWidth || e.clientWidth || g.clientWidth,
      y = w.innerHeight|| e.clientHeight|| g.clientHeight;
    
    var viswidth = x * 80 / 100;
    var visheight = y * 80 / 100;
    $("#chord-diagram").attr("width", viswidth);
    $("#chord-diagram").attr("height", visheight);
    var svg = d3.select("#chord-diagram"),
      width = +svg.attr("width"),
      height = +svg.attr("height"),
      outerRadius = Math.min(width, height) * 0.5 - 40,
      innerRadius = outerRadius - 30;


    var formatValue = d3.formatPrefix(",.0", 1e3);

    var chord = d3.chord()
    .padAngle(0.05)
    .sortSubgroups(d3.descending);


    var arc = d3.arc()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

    var ribbon = d3.ribbon()
    .radius(innerRadius)

    var color = d3.scaleOrdinal()
    .domain(d3.range(4))
    .range(["#000000", "#FFDD89", "#957244", "#F26223"]);

    var g = svg.append("g")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")")
    .datum(chord(matrix));


    var group = g.append("g")
      .attr("class", "groups")
      .selectAll("g")
      .data(function(chords) { return chords.groups; })
      .enter().append("g");
      

    group.append("path")
      .style("fill", function(d) { return color(d.index); })
      .style("stroke", function(d) { return d3.rgb(color(d.index)).darker(); })
      .attr("d", arc)
      .attr("id", function(d, i) { return "group" + d.index })
      .on("mouseover", fade(.1))
      .on("mouseout", fade(1));

    group.append("text")
        .attr("x", 6)
        .attr("dy", 15)
        //.attr("text-anchor", "end")
        //.attr("transform", function(d) { return "rotate(" + (d.angle * 180 / Math.PI - 90) + ") translate(" + outerRadius + ",0)"; })
        //.filter(function(d) { return d.value > 110; })
        .append("textPath")
        .attr("xlink:href", function(d) { return "#group" + d.index })
        //.text(function(d) { return "hallo"});
        .text(function(d) { return nodeShortLabel(visualisation.sources[d.index])});

    var self = this;

    var groupTick = group.selectAll(".group-tick")
      .data(function(d) { return self.groupTicks(d, 1e3); })
      .enter().append("g")
      .attr("class", "group-tick")
      //.attr("transform", function(d) { return "rotate(" + (d.angle * 180 / Math.PI - 90) + ") translate(" + outerRadius + ",0)"; });

    groupTick.append("line")
      .attr("x2", 6);

    groupTick
      .filter(function(d) { return d.value % 5e3 === 0; })
      .append("text")
      .attr("x", 8)
      .attr("dy", ".35em")
      .attr("transform", function(d) { return d.angle > Math.PI ? "rotate(180) translate(-16)" : null; })
      .style("text-anchor", function(d) { return d.angle > Math.PI ? "end" : null; })
      //.text(function(d) { return formatValue(d.value); });
      .text(function(d) { return "hallo"});

    g.append("g")
      .attr("class", "ribbons")
      .selectAll("path")
      .data(function(chords) { return chords; })
      .enter().append("path")
      .attr("d", ribbon)
      .style("fill", function(d) { return color(d.target.index); })
      .style("stroke", function(d) { return d3.rgb(color(d.target.index)).darker(); });

    // Returns an array of tick angles and values for a given group and step.
    }
    groupTicks(d, step) {
      var k = (d.endAngle - d.startAngle) / d.value;
      return d3.range(0, d.value, step).map(function(value) {
        //return {value: value, angle: value * k + d.startAngle};
        return 0;
      });
  }


  buildMatrix() {
    var matrix = [];
    visualisation.sources.sort();
    for (var i=0; i< visualisation.sources.length; i++) {
      matrix.push(Array(visualisation.sources.length).fill(0));
    }
    for (var id in visualisation.connCounter) {
      var src = visualisation.connsById[id].source;
      var tgt = visualisation.connsById[id].target;
      var i = visualisation.sources.indexOf(src);
      var j = visualisation.sources.indexOf(tgt);
      matrix[i][j] = visualisation.connCounter[id].connCount;
    }

    return matrix;
  }
}

/** Returns an event handler for fading a given chord group. */
function fade(opacity) {
  return function(g, i) {
    d3.select("#chord-diagram").selectAll("g.ribbons path")
        .filter(function(d) {
          return d.source.index != i && d.target.index != i;
        })
      .transition()
        .style("opacity", opacity);
  };
}

