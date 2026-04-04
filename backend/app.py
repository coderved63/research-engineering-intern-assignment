"""
Flask application - serves API endpoints and React static build.
"""

import os
import json
import numpy as np
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from config import (
    DATA_DIR, STATIC_DIR, EMBEDDINGS_NPY, POST_IDS_JSON,
    GRAPH_JSON, POSTS_DB, EMBEDDING_MODEL
)


def create_app():
    app = Flask(__name__, static_folder=None)
    CORS(app)

    # Load .env file if present
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ.setdefault(key.strip(), val.strip())

    # Load pre-computed data into app config
    print("Loading pre-computed data...")

    app.config['embeddings'] = np.load(EMBEDDINGS_NPY)
    print(f"  Embeddings: {app.config['embeddings'].shape}")

    with open(POST_IDS_JSON, 'r') as f:
        app.config['post_ids'] = json.load(f)
    print(f"  Post IDs: {len(app.config['post_ids'])}")

    with open(GRAPH_JSON, 'r') as f:
        app.config['graph_data'] = json.load(f)
    print(f"  Graph loaded")

    app.config['db_path'] = POSTS_DB
    app.config['data_dir'] = DATA_DIR

    # Load sentence transformer model for query embedding
    from sentence_transformers import SentenceTransformer
    app.config['embed_model'] = SentenceTransformer(EMBEDDING_MODEL)
    print(f"  Embedding model loaded: {EMBEDDING_MODEL}")

    # Register blueprints
    from routes.timeseries import timeseries_bp
    from routes.search import search_bp
    from routes.network import network_bp
    from routes.clusters import clusters_bp
    from routes.overview import overview_bp

    app.register_blueprint(timeseries_bp, url_prefix='/api/v1/timeseries')
    app.register_blueprint(search_bp, url_prefix='/api/v1')
    app.register_blueprint(network_bp, url_prefix='/api/v1/network')
    app.register_blueprint(clusters_bp, url_prefix='/api/v1')
    app.register_blueprint(overview_bp, url_prefix='/api/v1')

    # Serve static files (datamapplot HTML etc.)
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        return send_from_directory(STATIC_DIR, filename)

    # Serve React build (production)
    frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'frontend', 'dist')
    if os.path.exists(frontend_dist):
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_frontend(path):
            file_path = os.path.join(frontend_dist, path)
            if path and os.path.exists(file_path):
                return send_from_directory(frontend_dist, path)
            return send_from_directory(frontend_dist, 'index.html')

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': True, 'message': 'Endpoint not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': True, 'message': 'Internal server error'}), 500

    print("App ready!")
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
