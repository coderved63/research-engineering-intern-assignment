"""
Network analysis endpoints - graph data, centrality metrics, node removal.
"""

import json
import copy
from flask import Blueprint, request, jsonify, current_app
import networkx as nx
from community import community_louvain

network_bp = Blueprint('network', __name__)


def graph_from_data(graph_data):
    """Reconstruct NetworkX graph from node-link JSON."""
    G = nx.Graph()
    for node in graph_data.get('nodes', []):
        node_id = node.get('id')
        attrs = {k: v for k, v in node.items() if k != 'id'}
        G.add_node(node_id, **attrs)

    edge_key = 'links' if 'links' in graph_data else 'edges'
    for edge in graph_data.get(edge_key, []):
        G.add_edge(edge['source'], edge['target'],
                   weight=edge.get('weight', 1.0),
                   edge_type=edge.get('edge_type', 'unknown'))
    return G


@network_bp.route('/graph')
def get_graph():
    min_degree = request.args.get('min_degree', 1, type=int)
    graph_data = current_app.config['graph_data']

    if min_degree <= 1:
        from services.llm_service import generate_network_summary
        graph_data['summary'] = generate_network_summary(graph_data.get('stats', {}))
        return jsonify(graph_data)

    # Filter nodes by minimum degree
    G = graph_from_data(graph_data)
    nodes_to_keep = [n for n in G.nodes() if G.degree(n) >= min_degree]
    subgraph = G.subgraph(nodes_to_keep).copy()

    edge_key = 'links'
    result = {
        'nodes': [{'id': n, **subgraph.nodes[n]} for n in subgraph.nodes()],
        edge_key: [{'source': u, 'target': v, **d} for u, v, d in subgraph.edges(data=True)],
        'stats': {
            'num_nodes': subgraph.number_of_nodes(),
            'num_edges': subgraph.number_of_edges(),
            'num_components': nx.number_connected_components(subgraph),
            'density': round(nx.density(subgraph), 6) if subgraph.number_of_nodes() > 1 else 0
        }
    }

    return jsonify(result)


@network_bp.route('/remove-node/<author>')
def remove_node(author):
    graph_data = current_app.config['graph_data']
    G = graph_from_data(graph_data)

    if author not in G:
        return jsonify({
            'error': True,
            'message': f'Author "{author}" not found in the network.'
        }), 404

    # Stats before removal
    components_before = nx.number_connected_components(G)
    nodes_before = G.number_of_nodes()
    edges_before = G.number_of_edges()

    # Find which component the author belongs to
    for comp in nx.connected_components(G):
        if author in comp:
            original_component_size = len(comp)
            break

    # Remove the node
    removed_degree = G.degree(author)
    removed_pagerank = G.nodes[author].get('pagerank', 0)
    G.remove_node(author)

    # Stats after removal
    components_after = nx.number_connected_components(G)
    nodes_after = G.number_of_nodes()
    edges_after = G.number_of_edges()

    # Build impact message
    comp_diff = components_after - components_before
    if comp_diff > 0:
        impact = (
            f"Removing {author} (degree={removed_degree}, "
            f"PageRank={removed_pagerank:.6f}) fragmented the network: "
            f"components increased from {components_before} to {components_after} "
            f"(+{comp_diff}). {edges_before - edges_after} edges were removed."
        )
    else:
        impact = (
            f"Removing {author} (degree={removed_degree}, "
            f"PageRank={removed_pagerank:.6f}) did not fragment the network. "
            f"Components: {components_after}. {edges_before - edges_after} edges removed."
        )

    # Return updated graph
    edge_key = 'links'
    result = {
        'nodes': [{'id': n, **G.nodes[n]} for n in G.nodes()],
        edge_key: [{'source': u, 'target': v, **d} for u, v, d in G.edges(data=True)],
        'stats_before': {
            'num_nodes': nodes_before,
            'num_edges': edges_before,
            'num_components': components_before
        },
        'stats_after': {
            'num_nodes': nodes_after,
            'num_edges': edges_after,
            'num_components': components_after
        },
        'impact': impact,
        'removed': {
            'author': author,
            'degree': removed_degree,
            'pagerank': removed_pagerank
        }
    }

    return jsonify(result)
