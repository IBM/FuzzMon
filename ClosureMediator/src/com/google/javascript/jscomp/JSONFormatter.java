package com.google.javascript.jscomp;

import com.google.javascript.jscomp.graph.DiGraph;
import com.google.javascript.jscomp.graph.GraphvizGraph;
import com.google.javascript.rhino.Node;
import com.google.javascript.rhino.Token;
import com.google.javascript.rhino.jstype.JSType;

import java.io.IOException;
import java.util.*;

public class JSONFormatter {
    private static final String INDENT = "  ";

    // stores the current assignment of node to keys
    private final HashMap<Node, String> assignments = new HashMap<>();

    // key count in order to assign a unique key to each node
    private int keyCount = 0;

    // the builder used to generate the json diagram
    private final Appendable builder;

    private final ControlFlowGraph<Node> cfg;

    private final boolean printAnnotations;

    private List<String> outNodes;
    private List<String> outEdges;
    private String returnNodeUid;

    private JSONFormatter(Node n, ControlFlowGraph<Node> cfg,
                          Appendable builder, boolean printAnnotations) throws Exception {
        this.cfg = cfg;
        this.builder = builder;
        this.printAnnotations = printAnnotations;
        this.outNodes = new ArrayList<>();
        this.outEdges = new ArrayList<>();

        String returnNodeStr = formatNode("RETURN", "-1", "-1", "", "");
        this.returnNodeUid = createUidForNode("RETURN", "-1", "-1", "");
        this.outNodes.add(returnNodeStr);

        formatPreamble();
        traverseNodes(n);
//        traverseCFG();
        formatBody();
        formatConclusion();
    }

    /**
     * Converts an AST to dot representation.
     *
     * @param n     the root of the AST described in the dot formatted string
     * @param inCFG Control Flow Graph.
     * @return the dot representation of the AST
     */
    static String toJSON(Node n, ControlFlowGraph<Node> inCFG)
            throws Exception {
        StringBuilder builder = new StringBuilder();
        new JSONFormatter(n, inCFG, builder, false);
        return builder.toString();
    }

    private String formatEdge(String srcNodeUid, String dstNodeUid, String label) {
        StringBuilder b = new StringBuilder();
        String edgeValue = "{ \"label\": \""+ label +"\" }";
        b.append(INDENT);
        b.append("{ \"v\": \"" + srcNodeUid + "\", " +
                "\"w\": \"" + dstNodeUid + "\", " +
                "\"value\": {\"label\" : \"" + label + "\" }}");
        return b.toString();
    }

    private String formatNode(Node n) {
        Token token = n.getToken();
        String label = n.getToken().toString();
        String value = ((Token.STRING == token) || (Token.NAME == token)) ? n.getString() : "";
        String filename = n.getSourceFileName();
        String lineNo = String.valueOf(n.getLineno());
        String charNo = String.valueOf(n.getCharno());
        return formatNode(label, lineNo, charNo, value, filename);
    }

    private String formatNode(String label, String lineNo, String charNo, String value, String filename) {
        StringBuilder b = new StringBuilder();
        String nodeUid = createUidForNode(label, lineNo, charNo, filename);
        String loc = "{\"line\":" + lineNo + ", \"col\":" + charNo + "}";
        value =  value.trim()
                .replace("\r", "")
                .replace("\n", "")
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");

        String nodeVal = "{ \"label\": \"" + label + "\", \n" +
                "\"loc\": " + loc + ",\n" +
                "\"uid\": \"" + nodeUid + "\",\n" +
                "\"nodeValue\": \"" + value + "\",\n" +
                "\"filename\":\"" + filename + "\"}";
        b.append(INDENT);
        b.append(" { \"v\": \"" + nodeUid + "\", \"value\": " + nodeVal + "}");
        return b.toString();
    }

    private void traverseNodes(Node parent) throws IOException {
        // key
        String keyParent = key(parent);

        // edges
        for (Node child = parent.getFirstChild(); child != null;
             child = child.getNext()) {

            String keyChild = key(child);
            String edgeStr = formatEdge(keyParent, keyChild, "");
            outEdges.add(edgeStr);

            traverseNodes(child);
        }

        // Flow Edges
        if (cfg != null && cfg.hasNode(parent)) {
            List<DiGraph.DiGraphEdge<Node, ControlFlowGraph.Branch>> outEdges =
                    cfg.getOutEdges(parent);
            String[] edgeList = new String[outEdges.size()];
            for (int i = 0; i < edgeList.length; i++) {
                DiGraph.DiGraphEdge<Node, ControlFlowGraph.Branch> edge = outEdges.get(i);
                DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch> succ = edge.getDestination();

                String toNode = null;
                if (succ == cfg.getImplicitReturn()) {
                    toNode = this.returnNodeUid;
                } else {
                    toNode = key(succ.getValue());
                }

                String edgeStr = formatEdge(keyParent, toNode, edge.getValue().name());
                this.outEdges.add(edgeStr);
            }
        }
    }

    String key(Node n) throws IOException {
        String key = assignments.get(n);
        if (key == null) {
            key = createUidForNode(n);
            assignments.put(n, key);
            String nodeStr = formatNode(n);
            outNodes.add(nodeStr);
        }
        return key;
    }

    private void formatBody() throws IOException {
        builder.append("\n");
        builder.append("\"nodes\": [");
        for (int i = 0; i< this.outNodes.size(); ++i) {
            builder.append(this.outNodes.get(i));
            if (i == this.outNodes.size() - 1) {
                builder.append("\n");
            } else {
                builder.append(", \n");
            }
        }
        builder.append("],\n");
        builder.append("\"edges\": [\n");
        for (int i = 0; i< this.outEdges.size(); ++i) {
            builder.append(this.outEdges.get(i));
            if (i == this.outEdges.size() - 1) {
                builder.append("\n");
            } else {
                builder.append(", \n");
            }
        }
        builder.append("]\n");
    }










    private String createUidForNode(Node n) {
        return createUidForNode(n.getToken().toString(), String.valueOf(n.getLineno()),
                String.valueOf(n.getCharno()), n.getSourceFileName());
    }

    private String createUidForNode(String label, String lineNo, String charNo, String sourceFilename) {
        return label + lineNo + ":" + charNo + sourceFilename;
    }





    private boolean isValidNode(DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch> node) {
        return !(null == node || null == node.getValue()); // || (node.getValue().getToken().toString().equals("ROOT")));
    }

    private boolean isValidEdge(DiGraph.DiGraphEdge<Node, ControlFlowGraph.Branch> edge) {
        DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch> srcNodeRaw = edge.getSource();
        DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch> dstNodeRaw = edge.getDestination();
        return isValidNode(srcNodeRaw) && isValidNode(dstNodeRaw);
    }

    private void traverseCFG() throws Exception {
        Collection<DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch>> nodes = cfg.getNodes();
        List<DiGraph.DiGraphEdge<Node, ControlFlowGraph.Branch>> edges = cfg.getEdges();

        builder.append("\"nodes\": [");
        Iterator<DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch>> nodeIt = nodes.iterator();
        if (!nodeIt.hasNext()) {
            throw new Exception("No nodes found");
        }
        DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch> tmpNode = nodeIt.next();
        DiGraph.DiGraphNode<Node, ControlFlowGraph.Branch> node;
        boolean hasNext = nodeIt.hasNext();
        do {
            node = tmpNode;
            if (!isValidNode(node)) {
                tmpNode = nodeIt.next();
                continue;
            }

            Node n = node.getValue();
            String nodeUid = createUidForNode(n);

            String label = n.getToken().toString();
            String loc = "{\"line\":" + n.getLineno() + ", \"col\":" + n.getCharno() + "}";
            String value = (Token.STRING == n.getToken()) ? n.getString() : "";
            String filename = n.getSourceFileName();

            String nodeVal = "{ \"label\": \"" + label + "\", \n" +
                    "\"loc\": " + loc + ",\n" +
                    "\"nodeValue\": \"" + value + "\",\n" +
                    "\"filename\":\"" + filename + "\"}";
            builder.append(INDENT);
            builder.append(" { \"v\": \"" + nodeUid + "\", \"value\": " + nodeVal + "}");

            // the last item shouldn't have a comma at the end so nodeIt would be a valid json
            if (nodeIt.hasNext()) {
                tmpNode = nodeIt.next();
                if (isValidNode(tmpNode)) {
                    builder.append(", \n");
                }
                hasNext = true;
            } else {
                hasNext = false;
                builder.append("\n");
            }
        } while (hasNext);

        builder.append("],");
        builder.append("\"edges\": [");

        for (ListIterator<DiGraph.DiGraphEdge<Node, ControlFlowGraph.Branch>> edgeIt = edges.listIterator();
             edgeIt.hasNext(); ) {
            DiGraph.DiGraphEdge<Node, ControlFlowGraph.Branch> edge = edgeIt.next();
            if (!isValidEdge(edge)) {
                continue;
            }
            Node srcNode = edge.getSource().getValue();
            Node dstNode = edge.getDestination().getValue();

            String srcNodeUid = createUidForNode(srcNode);
            String dstNodeUid = createUidForNode(dstNode);
            String edgeValue = "{ \"label\": \"" + edge.getValue().name() + "\" }";

            builder.append(INDENT);
            builder.append("{ \"v\": \"" + srcNodeUid + "\", " +
                    "\"w\": \"" + dstNodeUid + "\", " +
                    "\"value\": " + edgeValue + " }");
            // the last item shouldn't have a comma at the end so nodeIt would be a valid json
            if (edgeIt.hasNext()) {
                DiGraph.DiGraphEdge<Node, ControlFlowGraph.Branch> nextEdge = edgeIt.next();
                if (isValidEdge(nextEdge)) {
                    builder.append(", \n");
                } else {
                    if (edgeIt.hasNext()) {
                        builder.append(", \n");
                    } else {
                        builder.append("\n");
                    }
                }
                edgeIt.previous();
            } else {
                builder.append("\n");
            }
        }
        builder.append("]");
    }

    private void formatPreamble() throws IOException {
        builder.append("{");
        builder.append("\"options\": {");

        builder.append("\"directed\": true,");
        builder.append("\"multigraph\": true,");
        builder.append("\"compound\": true");
        builder.append("},");
    }

    private void formatConclusion() throws IOException {
        builder.append("}\n");
    }
}
