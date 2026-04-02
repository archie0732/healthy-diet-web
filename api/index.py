import os

import requests
from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 抓取環境變數，並把結尾可能多加的斜線去掉 (防呆機制)
TARGET_API_SERVER = os.environ.get(
    "TARGET_API_SERVER", "http://120.110.113.111:3000"
).rstrip("/")


@app.route(
    "/api/",
    defaults={"path": ""},
    methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
)
@app.route(
    "/api/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"]
)
def proxy(path):
    if request.method == "OPTIONS":
        return Response("", status=200)

    # 乖乖照你的 Rust router，不再亂加 /api/，並確保不會出現雙斜線 //
    target_url = f"{TARGET_API_SERVER}/{path.lstrip('/')}"

    headers = {
        key: value for key, value in request.headers.items() if key.lower() != "host"
    }

    # 💡 補充：如果你是用 ngrok 穿透，這行建議加上！
    # 可以繞過 ngrok 免費版的 HTML 警告畫面，防止 React 收到 HTML 導致 JSON.parse 報錯
    headers["ngrok-skip-browser-warning"] = "true"

    try:
        if request.files:
            files = {}
            for key, file in request.files.items():
                files[key] = (file.filename, file.stream.read(), file.content_type)

            if "Content-Type" in headers:
                del headers["Content-Type"]

            resp = requests.request(
                method=request.method,
                url=target_url,
                headers=headers,
                data=request.form,
                files=files,
                timeout=10,
            )
        else:
            resp = requests.request(
                method=request.method,
                url=target_url,
                headers=headers,
                data=request.get_data(),
                timeout=10,
            )

    except requests.exceptions.Timeout:
        return jsonify({"error": "代理伺服器連線逾時！"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "代理伺服器連線被拒絕！"}), 502
    except Exception as e:
        return jsonify({"error": f"Python 內部發生未預期的錯誤: {str(e)}"}), 500

    excluded_headers = [
        "content-encoding",
        "content-length",
        "transfer-encoding",
        "connection",
    ]
    resp_headers = [
        (name, value)
        for (name, value) in resp.headers.items()
        if name.lower() not in excluded_headers
    ]

    return Response(resp.content, resp.status_code, resp_headers)
