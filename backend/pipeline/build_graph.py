"""
Build author interaction network from three edge types:
1. Crosspost edges (weight=3.0) - who crossposted from whom
2. Shared URL edges (weight=2.0) - authors sharing the same external URL
3. Co-subreddit edges (weight=1.0) - authors active in 2+ same subreddits
"""

import json
import sqlite3
import os
import sys
from collections import defaultdict
from itertools import combinations

import networkx as nx
from community import community_louvain

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import POSTS_DB, GRAPH_JSON


def build_graph():
    print(f"Loading data from: {POSTS_DB}")
    conn = sqlite3.connect(POSTS_DB)
    conn.row_factory = sqlite3.Row

    G = nx.Graph()

    # Track author subreddits for co-subreddit edges and node metadata
    author_subs = defaultdict(set)
    author_post_counts = defaultdict(int)

    all_posts = conn.execute("SELECT * FROM posts").fetchall()
    for post in all_posts:
        author = post['author']
        if author == '[deleted]':
            continue
        author_subs[author].add(post['subreddit'])
        author_post_counts[author] += 1

    # Add all non-deleted authors as nodes
    for author in author_subs:
        G.add_node(author, subreddits=list(author_subs[author]), post_count=author_post_counts[author])

    # --- Edge Type 1: Crosspost edges (weight=3.0) ---
    crosspost_count = 0
    crossposts = conn.execute("""
        SELECT author, crosspost_parent_author
        FROM posts
        WHERE is_crosspost = 1
        AND author != '[deleted]'
        AND crosspost_parent_author != '[deleted]'
        AND crosspost_parent_author IS NOT NULL
    """).fetchall()

    for cp in crossposts:
        child = cp['author']
        parent = cp['crosspost_parent_author']
        if child == parent:
            continue
        # Add parent node if not already in graph
        if parent not in G:
            G.add_node(parent, subreddits=list(author_subs.get(parent, set())),
                       post_count=author_post_counts.get(parent, 0))
        if G.has_edge(child, parent):
            G[child][parent]['weight'] += 3.0
        else:
            G.add_edge(child, parent, weight=3.0, edge_type='crosspost')
        crosspost_count += 1

    print(f"  Crosspost edges: {crosspost_count}")

    # --- Edge Type 2: Shared URL edges (weight=2.0) ---
    shared_url_edges = 0
    url_authors = defaultdict(set)

    external_posts = conn.execute("""
        SELECT url, author FROM posts
        WHERE author != '[deleted]'
        AND domain NOT LIKE 'self.%'
        AND domain != 'reddit.com'
        AND domain != 'i.redd.it'
        AND domain != 'v.redd.it'
        AND url IS NOT NULL AND url != ''
    """).fetchall()

    for post in external_posts:
        url_authors[post['url']].add(post['author'])

    for url, authors in url_authors.items():
        if len(authors) < 2:
            continue
        for a1, a2 in combinations(authors, 2):
            if G.has_edge(a1, a2):
                G[a1][a2]['weight'] += 2.0
            else:
                G.add_edge(a1, a2, weight=2.0, edge_type='shared_url')
            shared_url_edges += 1

    print(f"  Shared URL edges: {shared_url_edges}")

    # --- Edge Type 3: Co-subreddit edges (weight=1.0) ---
    co_sub_edges = 0
    multi_sub_authors = [a for a, subs in author_subs.items() if len(subs) >= 2]

    for a1, a2 in combinations(multi_sub_authors, 2):
        shared = author_subs[a1] & author_subs[a2]
        if len(shared) >= 2:
            weight = len(shared) * 1.0
            if G.has_edge(a1, a2):
                G[a1][a2]['weight'] += weight
            else:
                G.add_edge(a1, a2, weight=weight, edge_type='co_subreddit')
            co_sub_edges += 1

    print(f"  Co-subreddit edges: {co_sub_edges}")

    # Remove isolated nodes (no edges)
    isolates = list(nx.isolates(G))
    G.remove_nodes_from(isolates)
    print(f"  Removed {len(isolates)} isolated nodes")
    print(f"  Graph: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges")

    # --- Compute metrics ---
    print("Computing PageRank...")
    pagerank = nx.pagerank(G, weight='weight')

    print("Computing betweenness centrality...")
    betweenness = nx.betweenness_centrality(G, weight='weight')

    print("Detecting communities (Louvain)...")
    communities = community_louvain.best_partition(G, weight='weight', random_state=42)

    # Connected components
    components = list(nx.connected_components(G))
    component_map = {}
    for i, comp in enumerate(components):
        for node in comp:
            component_map[node] = i

    print(f"  Communities: {len(set(communities.values()))}")
    print(f"  Connected components: {len(components)}")

    # --- Store metrics on nodes ---
    for node in G.nodes():
        G.nodes[node]['pagerank'] = round(pagerank.get(node, 0), 6)
        G.nodes[node]['betweenness'] = round(betweenness.get(node, 0), 6)
        G.nodes[node]['community'] = communities.get(node, -1)
        G.nodes[node]['component'] = component_map.get(node, -1)
        G.nodes[node]['degree'] = G.degree(node)

    # --- Export ---
    graph_data = nx.node_link_data(G)

    # Add summary stats
    graph_data['stats'] = {
        'num_nodes': G.number_of_nodes(),
        'num_edges': G.number_of_edges(),
        'num_communities': len(set(communities.values())),
        'num_components': len(components),
        'density': round(nx.density(G), 6),
        'largest_component_size': max(len(c) for c in components) if components else 0
    }

    os.makedirs(os.path.dirname(GRAPH_JSON), exist_ok=True)
    with open(GRAPH_JSON, 'w') as f:
        json.dump(graph_data, f)

    print(f"\nSaved graph to: {GRAPH_JSON}")

    # Print top accounts
    top_pr = sorted(pagerank.items(), key=lambda x: -x[1])[:10]
    print("\nTop 10 by PageRank:")
    for author, pr in top_pr:
        print(f"  {author}: {pr:.6f} (community={communities[author]}, subs={author_subs.get(author, set())})")

    top_bt = sorted(betweenness.items(), key=lambda x: -x[1])[:10]
    print("\nTop 10 by Betweenness:")
    for author, bt in top_bt:
        print(f"  {author}: {bt:.6f}")

    conn.close()
    print("\nDone!")


if __name__ == '__main__':
    build_graph()
