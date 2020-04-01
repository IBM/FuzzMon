const Graph = require('../static_analysis/graph').Graph;

var g = new Graph(6);
var vertices = [ 'A', 'B', 'C', 'D', 'E', 'F' ];

for (var i = 0; i < vertices.length; i++) {
    g.addNewVertex(vertices[i]);
}

g.addEdgeBetween('A', 'B');
g.addEdgeBetween('A', 'D');
g.addEdgeBetween('A', 'E');
g.addEdgeBetween('B', 'C');
g.addEdgeBetween('D', 'E');
g.addEdgeBetween('E', 'F');
g.addEdgeBetween('E', 'C');
g.addEdgeBetween('C', 'F');

g.print();
