import os

import requests
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

TARGET_API_SERVER = os.environ.get(
    "TARGET_API_SERVER", "https://daily-fezzed-larisa.ngrok-free.dev"
).rstrip("/")


def build_target_url(path: str) -> str:
    normalized_path = path.lstrip("/")
    return f"{TARGET_API_SERVER}/{normalized_path}"


def _build_proxy_response(upstream_response):
    excluded_headers = [
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
    ]
    response_headers = [
        (name, value)
        for (name, value) in upstream_response.headers.items()
        if name.lower() not in excluded_headers
    ]

    response_content_type = upstream_response.headers.get("Content-Type", "")
    if "text/event-stream" in response_content_type.lower():

        def generate():
            try:
                for chunk in upstream_response.iter_content(chunk_size=None):
                    if chunk:
                        yield chunk
            finally:
                close_method = getattr(upstream_response, "close", None)
                if callable(close_method):
                    close_method()

        return Response(generate(), upstream_response.status_code, response_headers)

    return Response(upstream_response.content, upstream_response.status_code, response_headers)


@app.route(
    "/backend/",
    defaults={"path": ""},
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
)
@app.route(
    "/backend/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
)
def proxy(path):
    if request.method == "OPTIONS":
        return Response("", status=200)

    target_url = build_target_url(path)
    headers = {
        key: value for key, value in request.headers.items() if key.lower() != "host"
    }
    headers["ngrok-skip-browser-warning"] = "true"

    try:
        request_kwargs = {
            "method": request.method,
            "url": target_url,
            "headers": headers,
            "stream": True,
            "timeout": 60,
        }

        if request.files:
            files = {}
            for key, file in request.files.items():
                files[key] = (file.filename, file.stream.read(), file.content_type)

            if "Content-Type" in headers:
                del headers["Content-Type"]

            request_kwargs["data"] = request.form
            request_kwargs["files"] = files
        else:
            request_kwargs["data"] = request.get_data()

        resp = requests.request(**request_kwargs)

    except requests.exceptions.Timeout:
        return jsonify({"error": "Proxy request timed out after 60 seconds."}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Proxy could not connect to the upstream API server."}), 502
    except Exception as e:
        return jsonify({"error": f"Python proxy request failed: {str(e)}"}), 500

    return _build_proxy_response(resp)


if __name__ == "__main__":
    print("Starting Python proxy server...")
    print("Proxy target:", TARGET_API_SERVER)
    app.run(host="127.0.0.1", port=5000, debug=True)
